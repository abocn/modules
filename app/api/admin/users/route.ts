import { NextResponse } from 'next/server'
import { getAllUsers, searchUsersAdvanced, getUserStats } from '@/lib/db-utils'
import { db } from '@/db'
import { modules, ratings } from '@/db/schema'
import { eq, count } from 'drizzle-orm'
import type { UserQueryResult, UserWithStats } from '@/types/admin'
import { withAdminAuth } from '@/lib/middleware/admin-auth'
import { withErrorHandling } from '@/lib/middleware/error-handler'

/**
 * Get all users with advanced filtering
 * @description Retrieve a list of all users with statistics and filtering options. Admin access required.
 * @tags Admin - Users
 * @auth Admin role required
 */
export const GET = withErrorHandling(withAdminAuth(async (request) => {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query') || ''
  const roleFilter = searchParams.get('role') || 'all'
  const providerFilter = searchParams.get('provider') || 'all'
  const joinDateFrom = searchParams.get('joinDateFrom') || undefined
  const joinDateTo = searchParams.get('joinDateTo') || undefined
  const lastActiveFrom = searchParams.get('lastActiveFrom') || undefined
  const lastActiveTo = searchParams.get('lastActiveTo') || undefined
  const minModules = searchParams.get('minModules') ? parseInt(searchParams.get('minModules')!) : undefined
  const minReviews = searchParams.get('minReviews') ? parseInt(searchParams.get('minReviews')!) : undefined
  const emailVerified = searchParams.get('emailVerified')

  let users
  if (query.trim() || roleFilter !== 'all' || providerFilter !== 'all' || joinDateFrom || joinDateTo || 
      lastActiveFrom || lastActiveTo || minModules !== undefined || minReviews !== undefined || emailVerified) {
    users = await searchUsersAdvanced({
      query,
      roleFilter,
      providerFilter,
      joinDateFrom,
      joinDateTo,
      lastActiveFrom,
      lastActiveTo,
      minModules,
      minReviews,
      emailVerified: emailVerified === 'true' ? true : emailVerified === 'false' ? false : undefined
    })
  } else {
    users = await getAllUsers()
  }

  const stats = await getUserStats()

  const usersWithStats: UserWithStats[] = await Promise.all(
    users.map(async (userRow: UserQueryResult) => {
      const userData = userRow.user || userRow
      const provider = userRow.provider || null

      const moduleCount = await db
        .select({ count: count() })
        .from(modules)
        .where(eq(modules.author, userData.name))
      const reviewCount = await db
        .select({ count: count() })
        .from(ratings)
        .where(eq(ratings.userId, userData.id))

      return {
        ...userData,
        role: userData.role as "user" | "admin",
        image: userData.image || undefined,
        provider: provider || undefined,
        joinDate: userData.createdAt.toISOString().split('T')[0],
        lastActive: userData.updatedAt.toISOString().split('T')[0],
        modulesSubmitted: moduleCount[0]?.count || 0,
        reviewsWritten: reviewCount[0]?.count || 0,
      }
    })
  )

  return NextResponse.json({
    users: usersWithStats,
    stats
  })
}))