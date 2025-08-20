import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser, requireAuth, requireAdmin, requireScope, type UnifiedUser } from "@/lib/unified-auth"
import { rateLimit } from "@/lib/rate-limit-enhanced"

export interface AuthOptions {
  requireAuth?: boolean
  requireAdmin?: boolean
  requireScope?: "read" | "write"
  rateLimit?: {
    identifier?: string
    limit: number
    window: number // ms
  }
  allowedOrigins?: string[]
  securityHeaders?: Record<string, string>
}

export interface AuthenticatedRequest extends NextRequest {
  user?: UnifiedUser
}

export interface AuthContext {
  user: UnifiedUser | null
  isAuthenticated: boolean
  isAdmin: boolean
  authMethod: "session" | "api-key" | null
}

export function withAuth(options: AuthOptions = {}) {
  return function (handler: (request: AuthenticatedRequest, context: AuthContext) => Promise<NextResponse>) {
    return async function (request: NextRequest): Promise<NextResponse> {
      try {
        if (options.rateLimit) {
          const rateLimitResult = await rateLimit({
            request,
            identifier: options.rateLimit.identifier,
            limit: options.rateLimit.limit,
            window: options.rateLimit.window,
          })

          if (!rateLimitResult.success) {
            return NextResponse.json(
              {
                error: "Rate limit exceeded",
                retryAfter: rateLimitResult.retryAfter
              },
              {
                status: 429,
                headers: {
                  "X-RateLimit-Limit": options.rateLimit.limit.toString(),
                  "X-RateLimit-Remaining": "0",
                  "X-RateLimit-Reset": rateLimitResult.reset?.toString() || "",
                  "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
                }
              }
            )
          }
        }

        const { user, error } = await getAuthenticatedUser(request)

        const context: AuthContext = {
          user,
          isAuthenticated: !!user,
          isAdmin: user?.role === "admin",
          authMethod: user?.authMethod || null,
        }

        if (options.requireAuth) {
          try {
            requireAuth(user)
          } catch {
            return NextResponse.json(
              { error: error || "Authentication required" },
              { status: 401 }
            )
          }
        }

        if (options.requireAdmin) {
          try {
            requireAdmin(user)
          } catch (err) {
            return NextResponse.json(
              { error: err instanceof Error ? err.message : "Admin access required" },
              { status: 403 }
            )
          }
        }

        if (options.requireScope && user?.authMethod === "api-key") {
          try {
            requireScope(user, options.requireScope)
          } catch (err) {
            return NextResponse.json(
              { error: err instanceof Error ? err.message : "Insufficient permissions" },
              { status: 403 }
            )
          }
        }

        const authenticatedRequest = request as AuthenticatedRequest
        authenticatedRequest.user = user || undefined

        const response = await handler(authenticatedRequest, context)

        const securityHeaders = {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "X-XSS-Protection": "1; mode=block",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          ...options.securityHeaders,
        }

        Object.entries(securityHeaders).forEach(([key, value]) => {
          response.headers.set(key, value)
        })

        if (options.allowedOrigins) {
          const origin = request.headers.get("origin")
          if (origin && options.allowedOrigins.includes(origin)) {
            response.headers.set("Access-Control-Allow-Origin", origin)
            response.headers.set("Access-Control-Allow-Credentials", "true")
          }
        }

        return response

      } catch (error) {
        console.error("Authentication middleware error:", error)
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        )
      }
    }
  }
}

export function withOptionalAuth(options: Omit<AuthOptions, 'requireAuth' | 'requireAdmin' | 'requireScope'> = {}) {
  return withAuth({
    ...options,
    requireAuth: false,
  })
}

export function withAdminAuth(options: Omit<AuthOptions, 'requireAuth' | 'requireAdmin'> = {}) {
  return withAuth({
    ...options,
    requireAuth: true,
    requireAdmin: true,
  })
}

export function withApiKeyAuth(scope: "read" | "write", options: Omit<AuthOptions, 'requireAuth' | 'requireScope'> = {}) {
  return withAuth({
    ...options,
    requireAuth: true,
    requireScope: scope,
  })
}

export function handleCORS(allowedOrigins: string[] = [], allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
  return function (request: NextRequest) {
    const origin = request.headers.get("origin")
    const method = request.method

    if (method === "OPTIONS") {
      const headers = new Headers()

      if (origin && allowedOrigins.includes(origin)) {
        headers.set("Access-Control-Allow-Origin", origin)
      }

      headers.set("Access-Control-Allow-Methods", allowedMethods.join(", "))
      headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
      headers.set("Access-Control-Allow-Credentials", "true")
      headers.set("Access-Control-Max-Age", "86400")

      return new NextResponse(null, { status: 200, headers })
    }

    return null
  }
}

export function createErrorResponse(message: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json(
    {
      error: message,
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      }
    }
  )
}

export function createSuccessResponse<T = unknown>(data: T, status: number = 200, headers?: Record<string, string>) {
  return NextResponse.json(
    {
      ...data,
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      }
    }
  )
}