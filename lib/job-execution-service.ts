import { db } from '../db'
import { adminJobs, modules, moduleGithubSync } from '../db/schema'
import { eq, and, isNull, lt, or, isNotNull } from 'drizzle-orm'
import { GitHubService } from './github-service'
import { getModulesForSync, createModuleGithubSync } from './db-utils'
import { logAdminAction } from './audit-utils'
import { generateSlug, resolveSlugConflict } from './slug-utils'

export interface JobExecutionResult {
  success: boolean
  processedCount: number
  errorCount: number
  errors: string[]
  summary: string
}

export class JobExecutionService {
  async executeJob(jobId: number): Promise<void> {
    const [job] = await db
      .select()
      .from(adminJobs)
      .where(eq(adminJobs.id, jobId))

    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    if (job.status !== 'pending') {
      throw new Error(`Job ${jobId} is not in pending status`)
    }

    try {
      await this.updateJobStatus(jobId, 'running', {
        startedAt: new Date(),
        logs: [
          ...(job.logs || []),
          {
            timestamp: new Date().toISOString(),
            level: 'info' as const,
            message: `Job execution started`
          }
        ]
      })

      let result: JobExecutionResult

      switch (job.type) {
        case 'scrape_releases':
          result = await this.executeScrapeReleasesJob(jobId, job.parameters || {})
          break
        case 'cleanup':
          result = await this.executeCleanupJob(jobId, job.parameters || {})
          break
        case 'sync_github_configs':
          result = await this.executeSyncGithubConfigsJob(jobId)
          break
        case 'generate_slugs':
          result = await this.executeGenerateSlugsJob(jobId)
          break
        default:
          throw new Error(`Unknown job type: ${job.type}`)
      }

      const completedAt = new Date()
      const duration = job.startedAt ? Math.floor((completedAt.getTime() - new Date(job.startedAt).getTime()) / 1000) : 0

      await this.updateJobStatus(jobId, 'completed', {
        completedAt,
        duration,
        progress: 100,
        results: result,
        logs: [
          ...(job.logs || []),
          {
            timestamp: completedAt.toISOString(),
            level: 'info' as const,
            message: `Job completed successfully. ${result.summary}`
          }
        ]
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const completedAt = new Date()
      const duration = job.startedAt ? Math.floor((completedAt.getTime() - new Date(job.startedAt).getTime()) / 1000) : 0

      await this.updateJobStatus(jobId, 'failed', {
        completedAt,
        duration,
        results: {
          success: false,
          processedCount: 0,
          errorCount: 1,
          errors: [errorMessage],
          summary: `Job failed: ${errorMessage}`
        },
        logs: [
          ...(job.logs || []),
          {
            timestamp: completedAt.toISOString(),
            level: 'error' as const,
            message: `Job failed: ${errorMessage}`
          }
        ]
      })

      throw error
    }
  }

  private async executeScrapeReleasesJob(jobId: number, parameters: Record<string, unknown>): Promise<JobExecutionResult> {
    const scope = parameters.scope as string || 'all'
    let modulesToProcess: Awaited<ReturnType<typeof getModulesForSync>> = []

    await this.addJobLog(jobId, 'info', `Starting scrape releases job with scope: ${scope}`)

    const [job] = await db
      .select()
      .from(adminJobs)
      .where(eq(adminJobs.id, jobId))

    const adminId = job?.startedBy === 'system' ? 'system' : (job?.startedBy || 'system')

    if (scope === 'all') {
      modulesToProcess = await getModulesForSync(1000)
    } else if (scope === 'outdated') {
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
      modulesToProcess = await db
        .select({
          module: modules,
          sync: moduleGithubSync
        })
        .from(modules)
        .innerJoin(moduleGithubSync, eq(moduleGithubSync.moduleId, modules.id))
        .where(
          and(
            eq(moduleGithubSync.enabled, true),
            or(
              isNull(moduleGithubSync.lastSyncAt),
              lt(moduleGithubSync.lastSyncAt, cutoffDate)
            )
          )
        )
    } else if (scope === 'single') {
      const moduleId = parameters.moduleId as string
      if (!moduleId) {
        throw new Error('moduleId parameter is required for single module sync')
      }

      await this.addJobLog(jobId, 'info', `Syncing single module: ${moduleId}`)

      modulesToProcess = await db
        .select({
          module: modules,
          sync: moduleGithubSync
        })
        .from(modules)
        .innerJoin(moduleGithubSync, eq(moduleGithubSync.moduleId, modules.id))
        .where(
          and(
            eq(modules.id, moduleId),
            eq(moduleGithubSync.enabled, true)
          )
        )

      if (modulesToProcess.length === 0) {
        throw new Error(`Module ${moduleId} not found or GitHub sync not enabled`)
      }
    }

    await this.addJobLog(jobId, 'info', `Found ${modulesToProcess.length} modules to process`)

    const result: JobExecutionResult = {
      success: true,
      processedCount: 0,
      errorCount: 0,
      errors: [],
      summary: ''
    }

    const githubService = new GitHubService()

    for (let i = 0; i < modulesToProcess.length; i++) {
      const { module, sync } = modulesToProcess[i]
      const progress = Math.floor((i / modulesToProcess.length) * 100)

      await this.updateJobProgress(jobId, progress)
      await this.addJobLog(jobId, 'info', `Processing module ${i + 1}/${modulesToProcess.length}: ${module.name}`)

      try {
        const syncResult = await githubService.syncModuleReleases(module.id, sync.githubRepo)

        if (syncResult.success) {
          result.processedCount++
          if (syncResult.newReleases > 0) {
            await this.addJobLog(jobId, 'info', `✓ ${module.name}: Added ${syncResult.newReleases} new releases`)

            await logAdminAction({
              adminId,
              action: "GitHub Scrape Successful",
              details: `Scraped ${syncResult.newReleases} new release${syncResult.newReleases > 1 ? 's' : ''} for module "${module.name}" from ${sync.githubRepo}`,
              targetType: "module",
              targetId: module.id,
              newValues: {
                newReleases: syncResult.newReleases,
                githubRepo: sync.githubRepo,
                lastSyncAt: new Date().toISOString()
              }
            })
          } else {
            await this.addJobLog(jobId, 'info', `✓ ${module.name}: No new releases`)
          }
        } else {
          result.errorCount++
          result.errors.push(`${module.name}: ${syncResult.errors.join(', ')}`)
          await this.addJobLog(jobId, 'warn', `⚠ ${module.name}: ${syncResult.errors.join(', ')}`)

          await logAdminAction({
            adminId,
            action: "GitHub Scrape Failed",
            details: `Failed to scrape releases for module "${module.name}" from ${sync.githubRepo}: ${syncResult.errors.join(', ')}`,
            targetType: "module",
            targetId: module.id,
            oldValues: {
              errors: syncResult.errors,
              githubRepo: sync.githubRepo
            }
          })
        }

        await db
          .update(moduleGithubSync)
          .set({
            lastSyncAt: new Date(),
            syncErrors: syncResult.success ? [] : syncResult.errors.map(error => ({
              error,
              timestamp: new Date().toISOString(),
              retryCount: 0
            }))
          })
          .where(eq(moduleGithubSync.moduleId, module.id))

      } catch (error) {
        result.errorCount++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`${module.name}: ${errorMessage}`)
        await this.addJobLog(jobId, 'error', `✗ ${module.name}: ${errorMessage}`)
      }

      if (i < modulesToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    result.success = result.errorCount === 0
    result.summary = `Processed ${result.processedCount} modules successfully${result.errorCount > 0 ? `, ${result.errorCount} failed` : ''}`

    if (modulesToProcess.length > 0) {
      await logAdminAction({
        adminId,
        action: "GitHub Scrape Job Completed",
        details: result.summary + ` (scope: ${scope})`,
        targetType: "system",
        targetId: `job-${jobId}`,
        newValues: {
          processedCount: result.processedCount,
          errorCount: result.errorCount,
          scope,
          totalModules: modulesToProcess.length
        }
      })
    }

    return result
  }

  private async executeCleanupJob(jobId: number, parameters: Record<string, unknown>): Promise<JobExecutionResult> {
    const target = parameters.target as string
    const days = (parameters.days as number) || 30

    await this.addJobLog(jobId, 'info', `Starting cleanup job for ${target}, older than ${days} days`)

    const result: JobExecutionResult = {
      success: true,
      processedCount: 0,
      errorCount: 0,
      errors: [],
      summary: ''
    }

    try {
      if (target === 'failed_jobs') {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

        const deletedJobs = await db
          .delete(adminJobs)
          .where(
            and(
              eq(adminJobs.status, 'failed'),
              lt(adminJobs.createdAt, cutoffDate)
            )
          )
          .returning({ id: adminJobs.id })

        result.processedCount = deletedJobs.length
        result.summary = `Cleaned up ${deletedJobs.length} failed jobs older than ${days} days`

        await this.addJobLog(jobId, 'info', result.summary)
      } else {
        throw new Error(`Unknown cleanup target: ${target}`)
      }
    } catch (error) {
      result.success = false
      result.errorCount = 1
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(errorMessage)
      result.summary = `Cleanup failed: ${errorMessage}`
    }

    return result
  }

  private async executeSyncGithubConfigsJob(jobId: number): Promise<JobExecutionResult> {
    await this.addJobLog(jobId, 'info', 'Starting GitHub sync configuration sync job')

    const [job] = await db
      .select()
      .from(adminJobs)
      .where(eq(adminJobs.id, jobId))

    const adminId = job?.startedBy === 'system' ? 'system' : (job?.startedBy || 'system')

    const result: JobExecutionResult = {
      success: true,
      processedCount: 0,
      errorCount: 0,
      errors: [],
      summary: ''
    }

    try {
      const publishedModulesWithGithub = await db
        .select()
        .from(modules)
        .where(
          and(
            eq(modules.isPublished, true),
            isNotNull(modules.sourceUrl)
          )
        )

      const modulesWithGithubRepos = publishedModulesWithGithub
        .filter(moduleData => {
          if (!moduleData.sourceUrl) return false
          try {
            const url = new URL(moduleData.sourceUrl)
            return url.hostname === 'github.com' && url.pathname.split('/').length >= 3
          } catch {
            return false
          }
        })
        .map(moduleData => ({
          ...moduleData,
          githubRepo: this.extractGithubRepo(moduleData.sourceUrl!)
        }))
        .filter(moduleData => moduleData.githubRepo)

      await this.addJobLog(jobId, 'info', `Found ${modulesWithGithubRepos.length} published modules with valid GitHub repos`)

      const existingSyncs = await db
        .select()
        .from(moduleGithubSync)

      const existingSyncModuleIds = new Set(existingSyncs.map(sync => sync.moduleId))

      let created = 0
      let updated = 0
      let errors = 0

      for (const moduleData of modulesWithGithubRepos) {
        try {
          if (!existingSyncModuleIds.has(moduleData.id)) {
            await createModuleGithubSync({
              moduleId: moduleData.id,
              githubRepo: moduleData.githubRepo!,
              enabled: true
            })
            created++
            await this.addJobLog(jobId, 'info', `✓ Created sync config for ${moduleData.name} (${moduleData.githubRepo})`)
          } else {
            const existingSync = existingSyncs.find(sync => sync.moduleId === moduleData.id)
            if (existingSync && (!existingSync.enabled || existingSync.githubRepo !== moduleData.githubRepo)) {
              await db
                .update(moduleGithubSync)
                .set({
                  githubRepo: moduleData.githubRepo!,
                  enabled: true,
                  updatedAt: new Date()
                })
                .where(eq(moduleGithubSync.moduleId, moduleData.id))
              updated++
              await this.addJobLog(jobId, 'info', `✓ Updated sync config for ${moduleData.name} (${moduleData.githubRepo})`)
            }
          }
        } catch (error) {
          errors++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          result.errors.push(`${moduleData.name}: ${errorMessage}`)
          await this.addJobLog(jobId, 'error', `✗ Failed to sync config for ${moduleData.name}: ${errorMessage}`)
        }
      }

      const publishedModuleIds = new Set(publishedModulesWithGithub.map(m => m.id))
      let disabled = 0

      for (const sync of existingSyncs) {
        if (sync.enabled && !publishedModuleIds.has(sync.moduleId)) {
          try {
            await db
              .update(moduleGithubSync)
              .set({ enabled: false, updatedAt: new Date() })
              .where(eq(moduleGithubSync.moduleId, sync.moduleId))
            disabled++
            await this.addJobLog(jobId, 'info', `✓ Disabled sync config for unpublished module ${sync.moduleId}`)
          } catch (error) {
            errors++
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            result.errors.push(`${sync.moduleId}: ${errorMessage}`)
            await this.addJobLog(jobId, 'error', `✗ Failed to disable sync config for ${sync.moduleId}: ${errorMessage}`)
          }
        }
      }

      result.processedCount = created + updated + disabled
      result.errorCount = errors
      result.success = errors === 0
      result.summary = `Synced GitHub configs: ${created} created, ${updated} updated, ${disabled} disabled${errors > 0 ? `, ${errors} errors` : ''}`

      await this.addJobLog(jobId, 'info', result.summary)

      await logAdminAction({
        adminId,
        action: "GitHub Config Sync Completed",
        details: result.summary,
        targetType: "system",
        targetId: `job-${jobId}`,
        newValues: {
          created,
          updated,
          disabled,
          errors,
          totalProcessed: result.processedCount
        }
      })

    } catch (error) {
      result.success = false
      result.errorCount = 1
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(errorMessage)
      result.summary = `GitHub sync config job failed: ${errorMessage}`
      await this.addJobLog(jobId, 'error', result.summary)
    }

    return result
  }

  private extractGithubRepo(sourceUrl: string): string | null {
    try {
      const url = new URL(sourceUrl)
      if (url.hostname !== 'github.com') return null

      const pathParts = url.pathname.split('/').filter(part => part.length > 0)
      if (pathParts.length < 2) return null

      return `${pathParts[0]}/${pathParts[1]}`
    } catch {
      return null
    }
  }

  private async executeGenerateSlugsJob(jobId: number): Promise<JobExecutionResult> {
    const result: JobExecutionResult = {
      success: true,
      processedCount: 0,
      errorCount: 0,
      errors: [],
      summary: ''
    }

    try {
      await this.addJobLog(jobId, 'info', 'Starting slug generation for modules without slugs')

      const modulesWithoutSlugs = await db
        .select({
          id: modules.id,
          name: modules.name,
          author: modules.author,
          slug: modules.slug
        })
        .from(modules)
        .where(or(isNull(modules.slug), eq(modules.slug, '')))

      await this.addJobLog(jobId, 'info', `Found ${modulesWithoutSlugs.length} modules without slugs`)

      if (modulesWithoutSlugs.length === 0) {
        result.summary = 'No modules found without slugs'
        return result
      }

      const existingSlugs = await db
        .select({ slug: modules.slug })
        .from(modules)
        .where(and(isNotNull(modules.slug), isNotNull(modules.slug)))

      const existingSlugSet = new Set(existingSlugs.map(s => s.slug).filter(Boolean))

      let processedCount = 0
      let errorCount = 0

      for (const moduleRecord of modulesWithoutSlugs) {
        try {
          const baseSlug = generateSlug(moduleRecord.name, moduleRecord.author)

          const finalSlug = resolveSlugConflict(baseSlug, Array.from(existingSlugSet))

          await db
            .update(modules)
            .set({
              slug: finalSlug,
              updatedAt: new Date()
            })
            .where(eq(modules.id, moduleRecord.id))

          existingSlugSet.add(finalSlug)

          processedCount++

          if (processedCount % 10 === 0) {
            await this.updateJobProgress(jobId, Math.floor((processedCount / modulesWithoutSlugs.length) * 100))
            await this.addJobLog(jobId, 'info', `Processed ${processedCount}/${modulesWithoutSlugs.length} modules`)
          }

        } catch (error) {
          errorCount++
          const errorMessage = `Failed to generate slug for module ${moduleRecord.id} (${moduleRecord.name}): ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMessage)
          await this.addJobLog(jobId, 'error', errorMessage)
        }
      }

      result.processedCount = processedCount
      result.errorCount = errorCount
      result.success = errorCount === 0
      result.summary = `Generated slugs for ${processedCount} modules${errorCount > 0 ? ` (${errorCount} errors)` : ''}`

      await this.addJobLog(jobId, 'info', result.summary)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      result.success = false
      result.errorCount++
      result.errors.push(errorMessage)
      result.summary = `Job failed: ${errorMessage}`
      await this.addJobLog(jobId, 'error', result.summary)
    }

    return result
  }

  private async updateJobStatus(jobId: number, status: string, updates: Partial<typeof adminJobs.$inferInsert> = {}) {
    await db
      .update(adminJobs)
      .set({
        status,
        updatedAt: new Date(),
        ...updates
      })
      .where(eq(adminJobs.id, jobId))
  }

  private async updateJobProgress(jobId: number, progress: number) {
    await db
      .update(adminJobs)
      .set({
        progress,
        updatedAt: new Date()
      })
      .where(eq(adminJobs.id, jobId))
  }

  private async addJobLog(jobId: number, level: 'info' | 'warn' | 'error', message: string) {
    const [job] = await db
      .select({ logs: adminJobs.logs })
      .from(adminJobs)
      .where(eq(adminJobs.id, jobId))

    if (job) {
      const newLog = {
        timestamp: new Date().toISOString(),
        level,
        message
      }

      await db
        .update(adminJobs)
        .set({
          logs: [...(job.logs || []), newLog],
          updatedAt: new Date()
        })
        .where(eq(adminJobs.id, jobId))
    }
  }

  async startPendingJobs(): Promise<void> {
    const pendingJobs = await db
      .select()
      .from(adminJobs)
      .where(eq(adminJobs.status, 'pending'))

    for (const job of pendingJobs) {
      try {
        this.executeJob(job.id).catch(error => {
          console.error(`Failed to execute job ${job.id}:`, error)
        })
      } catch (error) {
        console.error(`Failed to start job ${job.id}:`, error)
      }
    }
  }
}

export const jobExecutionService = new JobExecutionService()