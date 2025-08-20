import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../auth'
import { headers } from 'next/headers'
import { db } from '../../db'
import { user } from '../../db/schema'
import { eq } from 'drizzle-orm'

/**
 * Unified admin authorization result
 * @interface AdminAuthResult
 */
export interface AdminAuthResult {
  isAdmin: boolean
  user?: {
    id: string
    email: string
    name: string
    role: string
  }
  error?: string
}

/**
 * Verify admin authorization using both session and database checks
 * \
 * This function provides a unified, secure way to check admin authorization.
 * It performs both session validation and database verification to prevent
 * authorization bypass attacks.
 * \
 * @param request - The incoming NextRequest object
 * @returns Promise<AdminAuthResult> - Result containing admin status and user info
 *
 * @example
 * ```typescript
 * const authResult = await verifyAdminAuth(request)
 * if (!authResult.isAdmin) {
 *   return NextResponse.json({ error: authResult.error }, { status: 401 })
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function verifyAdminAuth(_request: NextRequest): Promise<AdminAuthResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user) {
      return {
        isAdmin: false,
        error: 'Authentication required'
      }
    }

    if (session.user.role !== 'admin') {
      return {
        isAdmin: false,
        error: 'Admin access required'
      }
    }

    const userRecord = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1)

    if (!userRecord[0]) {
      console.error(`[Admin Auth] User not found in database: ${session.user.id}`)
      return {
        isAdmin: false,
        error: 'User not found'
      }
    }

    if (userRecord[0].role !== 'admin') {
      console.warn(`[Admin Auth] Session role mismatch for user ${session.user.id}: session=${session.user.role}, db=${userRecord[0].role}`)
      return {
        isAdmin: false,
        error: 'Insufficient privileges'
      }
    }

    // All checks passed
    return {
      isAdmin: true,
      user: userRecord[0]
    }
  } catch (error) {
    console.error('[Admin Auth] Error during authorization check:', error)
    return {
      isAdmin: false,
      error: 'Authorization check failed'
    }
  }
}

/**
 * Create a standardized admin-only API route handler
 *
 * This wrapper ensures consistent admin authorization across all admin endpoints.
 * It automatically handles authentication, authorization, and error responses.
 *
 * @param handler - The actual route handler function
 * @returns Wrapped handler with admin authorization
 *
 * @example
 * ```typescript
 * export const GET = withAdminAuth(async (request, context, user) => {
 *   // User is guaranteed to be an admin here
 *   const data = await fetchAdminData()
 *   return NextResponse.json(data)
 * })
 * ```
 */
export function withAdminAuth<T extends Record<string, unknown>>(
  handler: (
    request: NextRequest,
    context: { params: Promise<T> },
    user: NonNullable<AdminAuthResult['user']>
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: { params: Promise<T> }) => {
    const authResult = await verifyAdminAuth(request)

    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.error === 'Authentication required' ? 401 : 403 }
      )
    }

    if (!authResult.user) {
      return NextResponse.json(
        { error: 'User data not available' },
        { status: 500 }
      )
    }

    try {
      return await handler(request, context, authResult.user)
    } catch (error) {
      console.error('[Admin Route] Handler error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Check if a user ID has admin privileges
 *
 * Direct database check for admin role. Use this for background jobs
 * or when you only have a user ID without a full session.
 *
 * @param userId - The user ID to check
 * @returns Promise<boolean> - True if user is admin, false otherwise
 *
 * @example
 * ```typescript
 * const isAdmin = await isUserAdmin('user123')
 * if (!isAdmin) {
 *   throw new Error('Admin access required')
 * }
 * ```
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const userResult = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    return userResult[0]?.role === 'admin'
  } catch (error) {
    console.error('[Admin Auth] Error checking admin status:', error)
    return false
  }
}