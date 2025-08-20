import { NextResponse, type NextRequest } from "next/server"
import { getReleaseSchedule, updateReleaseSchedule } from "@/lib/db-utils"
import { logAdminAction } from "@/lib/audit-utils"
import { withAuth } from "@/lib/api-wrapper"

/**
 * GET /api/admin/release-schedule
 *
 * Fetches the current release schedule configuration for automated GitHub release syncing.
 * Creates a default schedule if none exists.
 *
 * @requires Admin role or API key with read scope
 *
 * @returns {Object} The release schedule configuration
 * @returns {number} returns.id - Schedule ID
 * @returns {boolean} returns.enabled - Whether the schedule is active
 * @returns {number} returns.intervalHours - Hours between sync runs
 * @returns {number} returns.batchSize - Number of modules to process per run
 * @returns {Date} returns.nextRunAt - Next scheduled run time
 * @returns {Date} [returns.lastRunAt] - Last run time if available
 *
 * @throws {401} If user is not authenticated or not an admin
 * @throws {500} If there's a database error
 */
const _wrappedGet = withAuth(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_request, _context) => {
  try {
    const schedule = await getReleaseSchedule()

    if (!schedule) {
      const defaultSchedule = await updateReleaseSchedule({
        enabled: false,
        intervalHours: 1,
        batchSize: 10,
        nextRunAt: new Date(Date.now() + 60 * 60 * 1000)
      })
      return NextResponse.json(defaultSchedule)
    }

    return NextResponse.json(schedule)
  } catch (error) {
    console.error("[! /api/admin/release-schedule] Error fetching release schedule:", error)
    return NextResponse.json(
      { error: "Failed to fetch release schedule" },
      { status: 500 }
    )
  }
}, { requireAdmin: true, requireScope: "read" })

/**
 * PUT /api/admin/release-schedule
 *
 * Updates the release schedule configuration for automated GitHub release syncing.
 * Automatically recalculates the next run time when interval is changed.
 *
 * @requires Admin role or API key with write scope
 *
 * @body {Object} Schedule update data
 * @body {boolean} [data.enabled] - Whether to enable/disable the schedule
 * @body {number} [data.intervalHours] - Hours between sync runs (1-24)
 * @body {number} [data.batchSize] - Number of modules to process per run (1-100)
 *
 * @returns {Object} The updated release schedule configuration
 *
 * @throws {401} If user is not authenticated or not an admin
 * @throws {500} If there's a database error
 */
const _wrappedPut = withAuth(async (request, context) => {
  const { user } = context
  try {
    const data = await request.json()
    const existingSchedule = await getReleaseSchedule()

    let nextRunAt: Date | undefined
    if (data.intervalHours) {
      nextRunAt = new Date(Date.now() + data.intervalHours * 60 * 60 * 1000)
    }

    const updatedSchedule = await updateReleaseSchedule({
      ...data,
      nextRunAt
    })

    await logAdminAction({
      adminId: user.id,
      action: "Release Schedule Updated",
      details: `Updated release schedule - ${Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
      targetType: "system",
      targetId: updatedSchedule?.id?.toString() || "schedule",
      oldValues: existingSchedule,
      newValues: updatedSchedule
    })

    return NextResponse.json(updatedSchedule)
  } catch (error) {
    console.error("[! /api/admin/release-schedule] Error updating release schedule:", error)
    return NextResponse.json(
      { error: "Failed to update release schedule" },
      { status: 500 }
    )
  }
}, { requireAdmin: true, requireScope: "write" })

export async function GET(request: NextRequest) {
  return _wrappedGet(request, {})
}

export async function PUT(request: NextRequest) {
  return _wrappedPut(request, {})
}