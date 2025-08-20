import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, requireScope } from "@/lib/unified-auth"
import { getUserRole } from "@/lib/admin-utils"

/**
 * Get user role
 * @description Get the role of the authenticated user (user or admin)
 * @response 200:UserRoleResponse:User role retrieved successfully
 * @response 401:ErrorResponse:Authentication required
 * @response 500:ErrorResponse:Failed to fetch user role
 * @auth bearer
 * @openapi
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request)
    
    if (error || !user) {
      return NextResponse.json({ error: error || "Authentication required" }, { status: 401 })
    }
    
    requireScope(user, "read")

    const role = await getUserRole(user.id)

    return NextResponse.json({ role })
  } catch (error) {
    console.error("Error fetching user role:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}