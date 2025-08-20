import { NextResponse, type NextRequest } from "next/server"
import { db } from "@/db"
import { adminJobs } from "@/db/schema"
import { jobExecutionService } from "@/lib/job-execution-service"
import { logAdminAction } from "@/lib/audit-utils"
import { withAuth } from "@/lib/api-wrapper"

/**
 * POST /api/admin/release-schedule/manual-run
 *
 * Triggers a manual run of the GitHub release sync process.
 * Creates a job in the admin jobs queue for immediate processing.
 *
 * @requires Admin role or API key with write scope
 *
 * @returns {Object} The created job details
 * @returns {number} returns.id - Job ID
 * @returns {string} returns.type - Job type (always "scrape_releases")
 * @returns {string} returns.name - Job name
 * @returns {string} returns.status - Job status (initially "pending")
 *
 * @throws {401} If user is not authenticated or not an admin
 * @throws {500} If there's a database error or job creation fails
 */
const _wrappedPost = withAuth(async (_request, context) => {
  const { user } = context
  try {
    const [job] = await db
      .insert(adminJobs)
      .values({
        type: "scrape_releases",
        name: "Manual Release Sync",
        description: "Manually triggered GitHub release sync for all enabled modules",
        status: "pending",
        progress: 0,
        startedBy: user.id,
        parameters: {
          scope: "enabled",
          manual: true
        },
        logs: []
      })
      .returning()

    await logAdminAction({
      adminId: user.id,
      action: "Manual Release Sync Started",
      details: "Manually triggered GitHub release sync for all enabled modules",
      targetType: "system",
      targetId: job.id.toString(),
      newValues: {
        type: job.type,
        name: job.name,
        parameters: job.parameters
      }
    })

    jobExecutionService.executeJob(job.id).catch(error => {
      console.error(`[! /api/admin/release-schedule/manual-run] Failed to execute job ${job.id}:`, error)
    })

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        name: job.name,
        status: job.status
      }
    })
  } catch (error) {
    console.error("[! /api/admin/release-schedule/manual-run] Error starting manual sync:", error)
    return NextResponse.json(
      { error: "Failed to start manual sync" },
      { status: 500 }
    )
  }
}, { requireAdmin: true, requireScope: "write" })

export async function POST(request: NextRequest) {
  return _wrappedPost(request, {})
}