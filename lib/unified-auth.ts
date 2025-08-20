import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { validateApiKey } from "@/lib/api-auth"

export interface UnifiedUser {
  id: string
  name: string
  email: string
  role: string
  authMethod: "session" | "api-key"
  scopes?: string[]
}

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ user: UnifiedUser | null; error?: string }> {
  const apiKeyResult = await validateApiKey(request)
  if (apiKeyResult.user) {
    return {
      user: {
        ...apiKeyResult.user,
        authMethod: "api-key" as const,
      }
    }
  }

  const authHeader = request.headers.get("authorization")
  const apiKeyHeader = request.headers.get("x-api-key")
  const hasApiKey = (authHeader?.startsWith("Bearer mk_") || apiKeyHeader?.startsWith("mk_"))

  if (apiKeyResult.error && hasApiKey) {
    return { user: null, error: apiKeyResult.error }
  }

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (session?.user) {
      return {
        user: {
          id: session.user.id,
          name: session.user.name || "",
          email: session.user.email || "",
          role: session.user.role || "user",
          authMethod: "session" as const,
        }
      }
    }
  } catch (error) {
    console.error("Session validation error:", error)
  }

  return { user: null }
}

export function requireAuth(user: UnifiedUser | null): void {
  if (!user) {
    throw new Error("Authentication required")
  }
}

export function requireAdmin(user: UnifiedUser | null): void {
  requireAuth(user)
  if (user?.role !== "admin") {
    throw new Error("Admin access required")
  }
}

export function requireScope(
  user: UnifiedUser | null,
  scope: "read" | "write"
): void {
  requireAuth(user)

  if (user?.authMethod === "api-key") {
    const scopes = user.scopes || []
    if (scope === "read") {
      if (!scopes.includes("read") && !scopes.includes("write")) {
        throw new Error(`API key requires '${scope}' scope`)
      }
    } else if (scope === "write") {
      if (!scopes.includes("write")) {
        throw new Error(`API key requires '${scope}' scope`)
      }
    }
  }
}