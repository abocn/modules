import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from '@/db'
import { modules, moduleGithubSync } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/admin/module-sync
 *
 * Fetches all module GitHub sync configurations with their current status.
 * Includes module details, sync history, and error information.
 *
 * @requires Admin role
 *
 * @returns {Array<Object>} List of module sync configurations
 * @returns {number} returns[].id - Sync configuration ID
 * @returns {string} returns[].moduleId - Module ID
 * @returns {string} returns[].githubRepo - GitHub repository (owner/repo format)
 * @returns {boolean} returns[].enabled - Whether sync is enabled for this module
 * @returns {Date} [returns[].lastSyncAt] - Last successful sync timestamp
 * @returns {string} [returns[].lastReleaseId] - Last synced release ID
 * @returns {Array} returns[].syncErrors - Array of recent sync errors
 * @returns {Object} returns[].module - Module details
 * @returns {string} returns[].module.id - Module ID
 * @returns {string} returns[].module.name - Module name
 * @returns {string} returns[].module.author - Module author
 * @returns {string} returns[].module.status - Module status (approved/pending/rejected)
 *
 * @throws {401} If user is not authenticated or not an admin
 * @throws {500} If there's a database error
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const moduleSyncs = await db
      .select({
        id: moduleGithubSync.id,
        moduleId: moduleGithubSync.moduleId,
        githubRepo: moduleGithubSync.githubRepo,
        enabled: moduleGithubSync.enabled,
        lastSyncAt: moduleGithubSync.lastSyncAt,
        lastReleaseId: moduleGithubSync.lastReleaseId,
        syncErrors: moduleGithubSync.syncErrors,
        module: {
          id: modules.id,
          name: modules.name,
          author: modules.author,
          status: modules.status,
        }
      })
      .from(moduleGithubSync)
      .innerJoin(modules, eq(moduleGithubSync.moduleId, modules.id))
      .orderBy(modules.name)

    return NextResponse.json(moduleSyncs)
  } catch (error) {
    console.error("[! /api/admin/module-sync] Error fetching module syncs:", error)
    return NextResponse.json(
      { error: "Failed to fetch module syncs" },
      { status: 500 }
    )
  }
}