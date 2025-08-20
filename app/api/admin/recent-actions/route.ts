import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { adminActions, user } from "@/db/schema"
import { desc, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { isUserAdmin } from "@/lib/admin-utils"

/**
 * Get recent admin actions
 * @description Get audit log of recent administrative actions. Requires admin role.
 * @tags Admin, Audit
 * @params RecentActionsQueryParams - Query parameters for filtering and pagination
 * @response 200:AdminActionsResponse:Successfully retrieved admin actions
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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '5')
    const offset = parseInt(searchParams.get('offset') || '0')

    const recentActions = await db
      .select({
        id: adminActions.id,
        action: adminActions.action,
        details: adminActions.details,
        targetType: adminActions.targetType,
        targetId: adminActions.targetId,
        createdAt: adminActions.createdAt,
        adminName: user.name,
      })
      .from(adminActions)
      .leftJoin(user, eq(adminActions.adminId, user.id))
      .orderBy(desc(adminActions.createdAt))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({ actions: recentActions })
  } catch (error) {
    console.error("[! /api/admin/recent-actions] Error fetching recent admin actions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}