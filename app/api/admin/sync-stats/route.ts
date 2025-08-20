import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from '@/db'
import { modules, moduleGithubSync, releaseSchedule } from '@/db/schema'
import { eq, count, sql } from 'drizzle-orm'

/**
 * GET /api/admin/sync-stats
 *
 * Fetches statistics about the GitHub release sync system.
 * Includes module counts, sync performance metrics, and recent activity.
 *
 * @requires Admin role
 *
 * @returns {Object} Sync statistics and activity
 * @returns {number} returns.totalModules - Total modules with sync configured
 * @returns {number} returns.enabledModules - Number of modules with sync enabled
 * @returns {number} returns.successfulSyncs - Total successful syncs
 * @returns {number} returns.failedSyncs - Total failed syncs
 * @returns {string} [returns.lastRunTime] - Last sync run timestamp
 * @returns {string} [returns.nextRunTime] - Next scheduled sync run
 * @returns {number} returns.averageSyncTime - Average sync duration in seconds
 * @returns {Array<Object>} returns.recentActivity - Recent sync activities
 * @returns {string} returns.recentActivity[].moduleId - Module ID
 * @returns {string} returns.recentActivity[].moduleName - Module name
 * @returns {string} returns.recentActivity[].status - Sync status (success/error)
 * @returns {string} returns.recentActivity[].timestamp - Activity timestamp
 * @returns {string} [returns.recentActivity[].error] - Error message if failed
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

    const totalModulesResult = await db
      .select({ count: count() })
      .from(moduleGithubSync)
    const enabledModulesResult = await db
      .select({ count: count() })
      .from(moduleGithubSync)
      .where(eq(moduleGithubSync.enabled, true))
    const failedSyncsResult = await db
      .select({ count: count() })
      .from(moduleGithubSync)
      .where(sql`jsonb_array_length(${moduleGithubSync.syncErrors}) > 0`)
    const schedule = await db
      .select()
      .from(releaseSchedule)
      .limit(1)
    const recentActivity = await db
      .select({
        moduleId: moduleGithubSync.moduleId,
        moduleName: modules.name,
        lastSyncAt: moduleGithubSync.lastSyncAt,
        syncErrors: moduleGithubSync.syncErrors,
      })
      .from(moduleGithubSync)
      .innerJoin(modules, eq(moduleGithubSync.moduleId, modules.id))
      .where(eq(moduleGithubSync.enabled, true))
      .orderBy(sql`${moduleGithubSync.lastSyncAt} DESC NULLS LAST`)
      .limit(10)

    const totalModules = totalModulesResult[0]?.count || 0
    const enabledModules = enabledModulesResult[0]?.count || 0
    const failedSyncs = failedSyncsResult[0]?.count || 0
    const successfulSyncs = Math.max(0, enabledModules - failedSyncs)

    const syncTimesResult = await db
      .select({
        duration: sql<number>`EXTRACT(EPOCH FROM (${moduleGithubSync.updatedAt} - ${moduleGithubSync.lastSyncAt}))`
      })
      .from(moduleGithubSync)
      .where(sql`${moduleGithubSync.lastSyncAt} IS NOT NULL AND ${moduleGithubSync.updatedAt} > ${moduleGithubSync.lastSyncAt}`)
      .limit(100)

    const averageSyncTime = syncTimesResult.length > 0
      ? Math.round(syncTimesResult.reduce((sum, sync) => sum + (sync.duration || 0), 0) / syncTimesResult.length)
      : 0

    const stats = {
      totalModules,
      enabledModules,
      successfulSyncs,
      failedSyncs,
      lastRunTime: schedule[0]?.lastRunAt?.toISOString(),
      nextRunTime: schedule[0]?.nextRunAt?.toISOString(),
      averageSyncTime,
      recentActivity: recentActivity.map(activity => ({
        moduleId: activity.moduleId,
        moduleName: activity.moduleName,
        status: (activity.syncErrors as { error: string; timestamp: string; retryCount: number }[])?.length > 0 ? 'error' as const : 'success' as const,
        timestamp: activity.lastSyncAt?.toISOString() || new Date().toISOString(),
        error: (activity.syncErrors as { error: string; timestamp: string; retryCount: number }[])?.[0]?.error
      }))
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("[! /api/admin/sync-stats] Error fetching sync stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch sync stats" },
      { status: 500 }
    )
  }
}