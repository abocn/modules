import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, requireAdmin, requireScope } from "@/lib/unified-auth"

type ApiHandler = (
  request: NextRequest,
  context: {
    params: Record<string, string>
    user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>["user"]>
  }
) => Promise<NextResponse>

export function withAuth(
  handler: ApiHandler,
  options?: {
    requireAdmin?: boolean
    requireScope?: "read" | "write"
  }
): (request: NextRequest, context: unknown) => Promise<NextResponse> {
  return async (
    request: NextRequest,
    context: unknown
  ): Promise<NextResponse> => {
    try {
      const { user, error } = await getAuthenticatedUser(request)

      if (error) {
        return NextResponse.json({ error }, { status: 401 })
      }

      if (!user) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        )
      }

      if (options?.requireAdmin) {
        try {
          requireAdmin(user)
        } catch {
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 }
          )
        }
      }

      if (options?.requireScope) {
        try {
          requireScope(user, options.requireScope)
        } catch (err) {
          return NextResponse.json(
            { error: err instanceof Error ? err.message : "Insufficient permissions" },
            { status: 403 }
          )
        }
      }

      const params = typeof context === "object" && context && "params" in context
        ? (context as { params?: Record<string, string> }).params || {}
        : {}
      return handler(request, { params, user })
    } catch (error) {
      console.error("API handler error:", error)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    }
  }
}