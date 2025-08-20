import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { modules, user, releases } from "@/db/schema"
import { count, sum, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { isUserAdmin } from "@/lib/admin-utils"

/**
 * Get admin statistics
 * @description Get platform statistics including module, user, and download counts. Requires admin role.
 * @tags Admin, Statistics
 * @response 200:AdminStatsResponse:Successfully retrieved statistics
 * @response 401:ErrorResponse:Authentication required
 * @response 403:ErrorResponse:Admin access required
 * @response 500:ErrorResponse:Internal server error
 * @auth bearer
 * @openapi
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!(await isUserAdmin(session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const totalModulesResult = await db
      .select({ count: count() })
      .from(modules)
    const totalUsersResult = await db
      .select({ count: count() })
      .from(user)
    const totalDownloadsResult = await db
      .select({ total: sum(releases.downloads) })
      .from(releases)
    const pendingModulesResult = await db
      .select({ count: count() })
      .from(modules)
      .where(eq(modules.status, 'pending'))

    const declinedModulesResult = await db
      .select({ count: count() })
      .from(modules)
      .where(eq(modules.status, 'declined'))

    const stats = {
      totalModules: totalModulesResult[0]?.count || 0,
      totalUsers: totalUsersResult[0]?.count || 0,
      totalDownloads: Number(totalDownloadsResult[0]?.total) || 0,
      pendingModules: pendingModulesResult[0]?.count || 0,
      declinedModules: declinedModulesResult[0]?.count || 0,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("[! /api/admin/stats] Error fetching admin stats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}