import { Octokit } from "@octokit/rest"
import crypto from "crypto"

export interface GitHubRepo {
  owner: string
  repo: string
}

export function parseGitHubRepo(url: string): GitHubRepo | null {
  try {
    const patterns = [
      /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
      /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
      /^([^\/]+)\/([^\/]+)$/  // Just owner/repo format
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return {
          owner: match[1],
          repo: match[2]
        }
      }
    }

    return null
  } catch {
    return null
  }
}

export async function validateGitHubPAT(token: string): Promise<{ valid: boolean; user?: string; error?: string }> {
  try {
    const octokit = new Octokit({ auth: token })
    const { data: user } = await octokit.rest.users.getAuthenticated()

    return {
      valid: true,
      user: user.login
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid GitHub PAT'
    }
  }
}

export async function getGitHubReleases(token: string, owner: string, repo: string) {
  try {
    const octokit = new Octokit({ auth: token })

    const { data: releases } = await octokit.rest.repos.listReleases({
      owner,
      repo,
      per_page: 10
    })

    return releases
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch releases: ${message}`)
  }
}

export function hashGitHubPAT(token: string, salt: string): string {
  return crypto.pbkdf2Sync(token, salt, 100000, 64, 'sha512').toString('hex')
}

export function generateSalt(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function verifyGitHubPAT(token: string, hashedToken: string, salt: string): boolean {
  const hash = hashGitHubPAT(token, salt)
  return hash === hashedToken
}