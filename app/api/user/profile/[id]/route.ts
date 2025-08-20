import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { user, modules, ratings } from '@/db/schema'
import { sql, eq, and, desc } from 'drizzle-orm'
import { getAuthenticatedUser, requireScope } from '@/lib/unified-auth'
import { applyRateLimit } from '@/lib/rate-limit-enhanced'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-middleware'

/**
 * Get authenticated user profile
 * @description Retrieve profile information for the authenticated user only, including their published modules, statistics, recent activity, and achievements. Requires authentication and users can only access their own profile.
 *
 * The achievements system includes the following unlockable badges:
 * - Module Author: Published your first module (unlocked when publishedModules >= 1)
 * - Featured Creator: Had a module featured (unlocked when featuredModules >= 1)
 * - Popular Developer: Reached 1000+ total downloads (unlocked when totalDownloads >= 1000)
 * - Active Reviewer: Left 10+ module reviews (unlocked when totalRatings >= 10)
 * - Quality Reviewer: Maintain high-quality reviews (unlocked when avgRating >= 4.5 and totalRatings >= 5)
 * @tags User Profiles
 * @pathParams UserProfileParams - Path parameters for user identification
 * @params UserProfileQueryParams - Optional parameters to include additional profile data
 * @response 200:UserProfileResponse:Successfully retrieved user profile with statistics and activity
 * @response 401:ErrorResponse:Authentication required
 * @response 403:ErrorResponse:Access denied - users can only view their own profile or insufficient permissions
 * @response 404:ErrorResponse:User not found or profile not available
 * @response 429:RateLimitErrorResponse:Rate limit exceeded (100 requests per hour)
 * @response 500:ErrorResponse:Internal server error while fetching user profile
 * @auth bearer (required for all access)
 * @rateLimit 100 requests per hour for authenticated users, API key limits apply per key configuration
 * @example
 * // Get your own profile with modules and activity (must be authenticated)
 * GET /api/user/profile/your-user-id?includeModules=true&includeActivity=true&limit=10
 * Authorization: Bearer your-auth-token
 *
 * // Response
 * {
 *   "user": {
 *     "id": "user123",
 *     "name": "ModuleDev",
 *     "image": "https://example.com/avatar.png",
 *     "role": "user",
 *     "joinedAt": "2023-05-15T10:30:00Z",
 *     "isOwnProfile": true
 *   },
 *   "stats": {
 *     "totalModules": 12,
 *     "publishedModules": 8,
 *     "featuredModules": 2,
 *     "totalDownloads": 45230,
 *     "totalRatings": 156,
 *     "avgRatingGiven": 4.3
 *   },
 *   "achievements": [
 *     {
 *       "id": "first_module",
 *       "name": "Module Author",
 *       "description": "Published your first module",
 *       "unlockedAt": "2023-05-15T10:30:00Z"
 *     },
 *     {
 *       "id": "featured_module",
 *       "name": "Featured Creator",
 *       "description": "Had a module featured",
 *       "unlockedAt": "2023-06-20T14:45:00Z"
 *     },
 *     {
 *       "id": "thousand_downloads",
 *       "name": "Popular Developer",
 *       "description": "Reached 1000+ total downloads",
 *       "unlockedAt": "2023-07-10T09:15:00Z"
 *     },
 *     {
 *       "id": "active_reviewer",
 *       "name": "Active Reviewer",
 *       "description": "Left 10+ module reviews",
 *       "unlockedAt": "2023-08-05T16:30:00Z"
 *     },
 *     {
 *       "id": "highly_rated",
 *       "name": "Quality Reviewer",
 *       "description": "Maintain high-quality reviews",
 *       "unlockedAt": "2023-09-12T11:20:00Z"
 *     }
 *   ]
 * }
 * @openapi
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResult = await applyRateLimit(request, 'PUBLIC_READ')

  if (!rateLimitResult.success) {
    return createErrorResponse(
      'Rate limit exceeded',
      429,
      {
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": "0",
        "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
      }
    )
  }

  const { user: currentUser, error } = await getAuthenticatedUser(request)

  if (error || !currentUser) {
    return NextResponse.json({ error: error || 'Authentication required' }, { status: 401 })
  }

  if (currentUser?.authMethod === "api-key") {
    try {
      requireScope(currentUser, "read")
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Insufficient permissions" },
        { status: 403 }
      )
    }
  }

  try {
    const { id } = await params

    if (currentUser.id !== id) {
      return NextResponse.json({ error: 'Access denied: You can only view your own profile' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const includeModules = searchParams.get('includeModules') !== 'false' // default true
    const includeActivity = searchParams.get('includeActivity') !== 'false' // default true
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    const userProfile = await db
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
        createdAt: user.createdAt,
        role: user.role,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1)

    if (userProfile.length === 0) {
      return createErrorResponse('User not found', 404)
    }

    const profile = userProfile[0]
    const isOwnProfile = currentUser?.id === id

    const userStats = await db
      .select({
        totalModules: sql<number>`COUNT(DISTINCT ${modules.id})`,
        publishedModules: sql<number>`COUNT(DISTINCT CASE WHEN ${modules.isPublished} THEN ${modules.id} END)`,
        featuredModules: sql<number>`COUNT(DISTINCT CASE WHEN ${modules.isFeatured} THEN ${modules.id} END)`,
        totalDownloads: sql<number>`
          COALESCE((
            SELECT SUM(r.downloads)
            FROM releases r
            JOIN modules m ON r.module_id = m.id
            WHERE m.submitted_by = ${id}
          ), 0)
        `,
        totalRatings: sql<number>`COUNT(DISTINCT ${ratings.id})`,
        avgRating: sql<number>`COALESCE(AVG(${ratings.rating}::NUMERIC), 0)`,
        joinedDate: sql<string>`${user.createdAt}`,
      })
      .from(user)
      .leftJoin(modules, eq(modules.submittedBy, user.id))
      .leftJoin(ratings, eq(ratings.userId, user.id))
      .where(eq(user.id, id))
      .groupBy(user.id, user.createdAt)

    const stats = userStats[0] || {
      totalModules: 0,
      publishedModules: 0,
      featuredModules: 0,
      totalDownloads: 0,
      totalRatings: 0,
      avgRating: 0,
      joinedDate: profile.createdAt,
    }

    let userModules = null
    if (includeModules) {
      const modulesQuery = db
        .select({
          id: modules.id,
          name: modules.name,
          shortDescription: modules.shortDescription,
          category: modules.category,
          icon: modules.icon,
          isFeatured: modules.isFeatured,
          isRecommended: modules.isRecommended,
          lastUpdated: modules.lastUpdated,
          createdAt: modules.createdAt,
          totalDownloads: sql<number>`
            COALESCE((
              SELECT SUM(r.downloads)
              FROM releases r
              WHERE r.module_id = modules.id
            ), 0)
          `,
          avgRating: sql<number>`
            COALESCE((
              SELECT AVG(rt.rating::NUMERIC)
              FROM ratings rt
              WHERE rt.module_id = modules.id
            ), 0)
          `,
          reviewCount: sql<number>`
            COALESCE((
              SELECT COUNT(*)
              FROM ratings rt
              WHERE rt.module_id = modules.id
            ), 0)
          `,
        })
        .from(modules)
        .where(
          and(
            eq(modules.submittedBy, id),
            eq(modules.isPublished, true)
          )
        )
        .orderBy(desc(modules.lastUpdated))
        .limit(limit)

      userModules = await modulesQuery
    }

    let recentActivity = null
    if (includeActivity) {
      const recentRatings = await db
        .select({
          type: sql<string>`'rating'`,
          moduleId: ratings.moduleId,
          moduleName: sql<string>`
            (SELECT name FROM modules WHERE id = ratings.module_id)
          `,
          rating: ratings.rating,
          comment: ratings.comment,
          createdAt: ratings.createdAt,
        })
        .from(ratings)
        .where(eq(ratings.userId, id))
        .orderBy(desc(ratings.createdAt))
        .limit(Math.floor(limit / 2))

      const recentModuleActivity: Array<{
        type: string
        moduleId: string
        moduleName: string
        action: string
        createdAt: Date
      }> = []

      if (isOwnProfile) {
        const moduleActivity = await db
          .select({
            type: sql<string>`'module_update'`,
            moduleId: modules.id,
            moduleName: modules.name,
            action: sql<string>`
              CASE 
                WHEN ${modules.createdAt} > NOW() - INTERVAL '7 days' THEN 'created'
                ELSE 'updated'
              END
            `,
            createdAt: modules.updatedAt,
          })
          .from(modules)
          .where(eq(modules.submittedBy, id))
          .orderBy(desc(modules.updatedAt))
          .limit(Math.floor(limit / 2))

        recentModuleActivity.push(...moduleActivity)
      }

      recentActivity = [...recentRatings, ...recentModuleActivity]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit)
    }

    const achievements = []

    if (Number(stats.publishedModules) >= 1) {
      achievements.push({
        id: 'first_module',
        name: 'Module Author',
        description: 'Published your first module',
        unlockedAt: new Date(stats.joinedDate).toISOString(),
      })
    }

    if (Number(stats.featuredModules) >= 1) {
      achievements.push({
        id: 'featured_module',
        name: 'Featured Creator',
        description: 'Had a module featured',
        unlockedAt: new Date(stats.joinedDate).toISOString(),
      })
    }

    if (Number(stats.totalDownloads) >= 1000) {
      achievements.push({
        id: 'thousand_downloads',
        name: 'Popular Developer',
        description: 'Reached 1000+ total downloads',
        unlockedAt: new Date(stats.joinedDate).toISOString(),
      })
    }

    if (Number(stats.totalRatings) >= 10) {
      achievements.push({
        id: 'active_reviewer',
        name: 'Active Reviewer',
        description: 'Left 10+ module reviews',
        unlockedAt: new Date(stats.joinedDate).toISOString(),
      })
    }

    if (Number(stats.avgRating) >= 4.5 && Number(stats.totalRatings) >= 5) {
      achievements.push({
        id: 'highly_rated',
        name: 'Quality Reviewer',
        description: 'Maintain high-quality reviews',
        unlockedAt: new Date(stats.joinedDate).toISOString(),
      })
    }

    const profileData = {
      user: {
        id: profile.id,
        name: profile.name,
        image: profile.image,
        role: profile.role,
        joinedAt: profile.createdAt,
        isOwnProfile,
      },
      stats: {
        totalModules: Number(stats.totalModules),
        publishedModules: Number(stats.publishedModules),
        featuredModules: Number(stats.featuredModules),
        totalDownloads: Number(stats.totalDownloads),
        totalRatings: Number(stats.totalRatings),
        avgRatingGiven: Number(stats.avgRating),
      },
      modules: userModules?.map(mod => ({
        id: mod.id,
        name: mod.name,
        shortDescription: mod.shortDescription,
        category: mod.category,
        icon: mod.icon,
        isFeatured: mod.isFeatured,
        isRecommended: mod.isRecommended,
        lastUpdated: mod.lastUpdated,
        createdAt: mod.createdAt,
        totalDownloads: Number(mod.totalDownloads),
        avgRating: Number(mod.avgRating),
        reviewCount: Number(mod.reviewCount),
      })) || null,
      recentActivity: recentActivity?.map(activity => {
        const baseActivity = {
          type: activity.type,
          moduleId: activity.moduleId,
          moduleName: activity.moduleName,
          createdAt: activity.createdAt,
        }

        if (activity.type === 'rating' && 'rating' in activity) {
          return {
            ...baseActivity,
            rating: activity.rating,
            comment: activity.comment,
          }
        }

        if (activity.type === 'module_update' && 'action' in activity) {
          return {
            ...baseActivity,
            action: activity.action,
          }
        }

        return baseActivity
      }) || null,
      achievements,
      meta: {
        generatedAt: new Date().toISOString(),
        includeModules,
        includeActivity,
        limit,
      }
    }

    return createSuccessResponse(profileData)

  } catch (error) {
    console.error('[! /api/user/profile/[id]] Error fetching user profile:', error)
    return createErrorResponse('Failed to fetch user profile', 500)
  }
}