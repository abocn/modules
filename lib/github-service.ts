import { Octokit } from "@octokit/rest"
import { parseGitHubRepo } from "./github-utils"
import { getUserGitHubPAT } from "./db-utils"
import { db } from '../db'
import { releases, modules } from '../db/schema'
import { eq, and } from 'drizzle-orm'

export interface GitHubRelease {
  id: number
  tag_name: string
  name: string
  body: string
  created_at: string
  published_at: string
  assets: Array<{
    id: number
    name: string
    browser_download_url: string
    size: number
    content_type: string
  }>
}

export interface SyncResult {
  success: boolean
  newReleases: number
  errors: string[]
}

export class GitHubService {
  private octokit: Octokit

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token,
      userAgent: 'modules-app/1.0.0',
    })
  }

  async getReleases(owner: string, repo: string, perPage = 10): Promise<GitHubRelease[]> {
    try {
      console.log(`[GitHub Service] Fetching releases for ${owner}/${repo} (limit: ${perPage})`)

      const { data } = await this.octokit.rest.repos.listReleases({
        owner,
        repo,
        per_page: perPage,
      })

      console.log(`[GitHub Service] Successfully fetched ${data.length} releases from ${owner}/${repo}`)

      return data.map(release => ({
        id: release.id,
        tag_name: release.tag_name,
        name: release.name || release.tag_name,
        body: release.body || '',
        created_at: release.created_at,
        published_at: release.published_at || release.created_at,
        assets: release.assets.map(asset => ({
          id: asset.id,
          name: asset.name,
          browser_download_url: asset.browser_download_url,
          size: asset.size,
          content_type: asset.content_type || 'application/octet-stream',
        }))
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[GitHub Service] Failed to fetch releases for ${owner}/${repo}:`, message)
      throw new Error(`Failed to fetch releases for ${owner}/${repo}: ${message}`)
    }
  }

  async syncModuleReleases(moduleId: string, githubRepo: string, userToken?: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      newReleases: 0,
      errors: []
    }

    console.log(`[GitHub Service] Starting sync for module ${moduleId} from repo ${githubRepo}`)

    try {
      const repoInfo = parseGitHubRepo(githubRepo)
      if (!repoInfo) {
        const error = `Invalid GitHub repository format: ${githubRepo}`
        console.error(`[GitHub Service] ${error}`)
        result.errors.push(error)
        return result
      }

      const service = userToken ? new GitHubService(userToken) : this

      const githubReleases = await service.getReleases(repoInfo.owner, repoInfo.repo)

      const existingReleases = await db
        .select({ githubReleaseId: releases.githubReleaseId })
        .from(releases)
        .where(eq(releases.moduleId, moduleId))

      const existingGitHubIds = new Set(
        existingReleases
          .map(r => r.githubReleaseId)
          .filter(id => id !== null)
      )

      console.log(`[GitHub Service] Found ${githubReleases.length} total releases, ${existingGitHubIds.size} already synced`)

      const newReleases: Array<{
        moduleId: string
        version: string
        downloadUrl: string
        size: string
        changelog: string | null
        githubReleaseId: string
        githubTagName: string
        isLatest: boolean
        assets: Array<{
          name: string
          downloadUrl: string
          size: string
          contentType: string
        }>
      }> = []

      for (const githubRelease of githubReleases) {
        if (existingGitHubIds.has(githubRelease.id.toString())) {
          continue
        }

        try {
          const mainAsset = this.findMainAsset(githubRelease.assets)
          if (!mainAsset) {
            result.errors.push(`No suitable assets found for release ${githubRelease.tag_name}`)
            continue
          }

          const totalSize = githubRelease.assets.reduce((sum, asset) => sum + asset.size, 0)

          newReleases.push({
            moduleId,
            version: githubRelease.tag_name.replace(/^v/, ''), // Remove v prefix
            downloadUrl: mainAsset.browser_download_url,
            size: this.formatFileSize(totalSize),
            changelog: githubRelease.body,
            githubReleaseId: githubRelease.id.toString(),
            githubTagName: githubRelease.tag_name,
            isLatest: false,
            assets: githubRelease.assets.map(asset => ({
              name: asset.name,
              downloadUrl: asset.browser_download_url,
              size: this.formatFileSize(asset.size),
              contentType: asset.content_type,
            })),
          })

          console.log(`[GitHub Service] Prepared release ${githubRelease.tag_name} for module ${moduleId}`)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          console.error(`[GitHub Service] Failed to prepare release ${githubRelease.tag_name}:`, message)
          result.errors.push(`Failed to prepare release ${githubRelease.tag_name}: ${message}`)
        }
      }

      if (newReleases.length > 0) {
        const allExistingReleases = await db
          .select({ version: releases.version })
          .from(releases)
          .where(eq(releases.moduleId, moduleId))

        const allVersions = [
          ...allExistingReleases.map(r => r.version),
          ...newReleases.map(r => r.version)
        ]
        const sortedVersions = [...allVersions].sort((a, b) => -this.compareVersions(a, b))
        const latestVersion = sortedVersions[0]

        const latestNewRelease = newReleases.find(r => r.version === latestVersion)
        if (latestNewRelease) {
          latestNewRelease.isLatest = true
        }

        await db
          .update(releases)
          .set({ isLatest: false })
          .where(eq(releases.moduleId, moduleId))

        for (const releaseData of newReleases) {
          try {
            await db.insert(releases).values(releaseData)
            result.newReleases++
            console.log(`[GitHub Service] Successfully added release ${releaseData.githubTagName} for module ${moduleId}${releaseData.isLatest ? ' (marked as latest)' : ''}`)
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            console.error(`[GitHub Service] Failed to insert release ${releaseData.githubTagName}:`, message)
            result.errors.push(`Failed to insert release ${releaseData.githubTagName}: ${message}`)
          }
        }

        if (!latestNewRelease && latestVersion) {
          await db
            .update(releases)
            .set({ isLatest: true })
            .where(
              and(
                eq(releases.moduleId, moduleId),
                eq(releases.version, latestVersion)
              )
            )
        }
      }

      if (result.newReleases > 0) {
        await db
          .update(modules)
          .set({
            lastUpdated: new Date(),
            lastSyncAt: new Date()
          })
          .where(eq(modules.id, moduleId))
      } else {
        await db
          .update(modules)
          .set({ lastSyncAt: new Date() })
          .where(eq(modules.id, moduleId))
      }

      result.success = result.errors.length === 0

      console.log(`[GitHub Service] Sync completed for module ${moduleId}: ${result.newReleases} new releases, ${result.errors.length} errors`)

      return result

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[GitHub Service] Sync failed for module ${moduleId}:`, message)
      result.errors.push(`Sync failed: ${message}`)
      return result
    }
  }

  private findMainAsset(assets: Array<{ name: string; browser_download_url: string; size: number; content_type: string }>) {
    const priorities = [
      /\.zip$/i,
      /\.apk$/i,
      /\.jar$/i,
      /module\.prop$/i,
      /\.tar\.gz$/i,
      /\.tgz$/i,
    ]

    for (const pattern of priorities) {
      const asset = assets.find(a => pattern.test(a.name))
      if (asset) return asset
    }

    return assets[0] || null
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  private compareVersions(a: string, b: string): number {
    const cleanA = a.replace(/^v/, '').toLowerCase()
    const cleanB = b.replace(/^v/, '').toLowerCase()
    const partsA = cleanA.split(/[.-]/)
    const partsB = cleanB.split(/[.-]/)
    const isNumeric = (str: string) => /^\d+$/.test(str)
    const maxLength = Math.max(partsA.length, partsB.length)

    for (let i = 0; i < maxLength; i++) {
      const partA = partsA[i] || '0'
      const partB = partsB[i] || '0'

      if (isNumeric(partA) && isNumeric(partB)) {
        const numA = parseInt(partA, 10)
        const numB = parseInt(partB, 10)
        if (numA !== numB) {
          return numA - numB
        }
      } else {
        const preReleaseOrder = { alpha: 1, beta: 2, rc: 3 }
        const orderA = preReleaseOrder[partA as keyof typeof preReleaseOrder] || (isNumeric(partA) ? parseInt(partA, 10) + 1000 : 999)
        const orderB = preReleaseOrder[partB as keyof typeof preReleaseOrder] || (isNumeric(partB) ? parseInt(partB, 10) + 1000 : 999)

        if (orderA !== orderB) {
          return orderA - orderB
        }

        if (partA !== partB) {
          return partA.localeCompare(partB)
        }
      }
    }

    return 0
  }

  async validateRepository(owner: string, repo: string): Promise<boolean> {
    try {
      console.log(`[GitHub Service] Validating repository ${owner}/${repo}`)
      await this.octokit.rest.repos.get({ owner, repo })
      console.log(`[GitHub Service] Repository ${owner}/${repo} is valid`)
      return true
    } catch (error) {
      console.error(`[GitHub Service] Repository ${owner}/${repo} validation failed:`, error instanceof Error ? error.message : 'Unknown error')
      return false
    }
  }

  static async createFromUserPAT(userId: string): Promise<GitHubService | null> {
    try {
      const tokenData = await getUserGitHubPAT(userId)
      if (!tokenData) return null

      return new GitHubService()
    } catch (error) {
      console.error('Failed to create GitHub service from user PAT:', error)
      return null
    }
  }
}