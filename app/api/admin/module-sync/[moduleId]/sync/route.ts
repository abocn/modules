import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/db"
import { adminJobs, moduleGithubSync } from "@/db/schema"
import { eq } from "drizzle-orm"
import { jobExecutionService } from "@/lib/job-execution-service"
import { logAdminAction } from "@/lib/audit-utils"

/**
 * POST /api/admin/module-sync/[moduleId]/sync
 *
 * Triggers a manual GitHub release sync for a specific module.
 * Creates a job in the admin jobs queue for immediate processing.
 *
 * @requires Admin role
 *
 * @param {string} moduleId - The module ID to sync
 *
 * @returns {Object} Success response with job details
 * @returns {boolean} returns.success - Always true on success
 * @returns {string} returns.message - Success message
 * @returns {Object} returns.job - Created job details
 * @returns {number} returns.job.id - Job ID
 * @returns {string} returns.job.type - Job type
 * 
 * @throws {401} If user is not authenticated or not an admin
 * @throws {404} If module sync configuration not found
 * @throws {400} If module sync is disabled
 * @throws {500} If there's a database error or job creation fails
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { moduleId } = await params

    const [moduleSync] = await db
      .select()
      .from(moduleGithubSync)
      .where(eq(moduleGithubSync.moduleId, moduleId))
      .limit(1)

    if (!moduleSync) {
      return NextResponse.json(
        { error: "Module sync not configured" },
        { status: 404 }
      )
    }

    if (!moduleSync.enabled) {
      return NextResponse.json(
        { error: "Module sync is disabled" },
        { status: 400 }
      )
    }

    const [job] = await db
      .insert(adminJobs)
      .values({
        type: "scrape_releases",
        name: `Manual Sync - Module ${moduleId}`,
        description: `Manually triggered GitHub release sync for module ${moduleId}`,
        status: "pending",
        progress: 0,
        startedBy: session.user.id,
        parameters: {
          moduleId,
          scope: "single",
          manual: true
        },
        logs: []
      })
      .returning()

    await logAdminAction({
      adminId: session.user.id,
      action: "Module Sync Triggered",
      details: `Manually triggered sync for module ${moduleId}`,
      targetType: "module",
      targetId: moduleId,
      newValues: {
        jobId: job.id
      }
    })

    jobExecutionService.executeJob(job.id).catch(error => {
      console.error(`[! /api/admin/module-sync/[moduleId]/sync] Failed to execute job ${job.id}:`, error)
    })

    return NextResponse.json({
      success: true,
      message: "Manual sync triggered for module",
      job: {
        id: job.id,
        type: job.type
      }
    })
  } catch (error) {
    console.error("[! /api/admin/module-sync/[moduleId]/sync] Error triggering module sync:", error)
    return NextResponse.json(
      { error: "Failed to trigger module sync" },
      { status: 500 }
    )
  }
}