import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { modules } from '@/db/schema'
import { sql, eq, and } from 'drizzle-orm'
import { getAuthenticatedUser, requireScope } from '@/lib/unified-auth'
import { applyRateLimit } from '@/lib/rate-limit-enhanced'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-middleware'

/**
 * List module categories
ssss * @description Get a list of all available module categories with detailed statistics, module counts, and metadata.
 * @tags Categories
 * @params CategoriesQueryParams - Query parameters for sorting and filtering categories
 * @response 200:CategoriesResponse:Successfully retrieved categories with detailed statistics and metadata
 * @response 400:ErrorResponse:Invalid sort or order parameters
 * @response 401:ErrorResponse:Authentication required for API key access
 * @response 403:ErrorResponse:API key lacks required 'read' scope
 * @response 429:RateLimitErrorResponse:Rate limit exceeded (100 requests per hour)
 * @response 500:ErrorResponse:Internal server error while fetching categories
 * @auth bearer (optional for public access, required for API key access)
 * @rateLimit 100 requests per hour for public access, API key limits apply per key configuration
 * @example
 * // Get categories sorted by popularity
 * GET /api/categories?sort=count&order=desc
 *
 * // Response
 * {
 *   "categories": [
 *     {
 *       "name": "security",
 *       "count": 127,
 *       "featuredCount": 8,
 *       "recommendedCount": 15,
 *       "recentCount": 23,
 *       "avgRating": 4.6,
 *       "percentage": 35,
 *       "slug": "security",
 *       "description": "Security-focused modules for privacy and protection"
 *     }
 *   ],
 *   "totalStats": {
 *     "totalCategories": 8,
 *     "totalModules": 365,
 *     "avgModulesPerCategory": 46,
 *     "mostPopularCategory": "security"
 *   }
 * }
 * @openapi
 */
export async function GET(request: NextRequest) {
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

  const { user, error } = await getAuthenticatedUser(request)

  if (error && request.headers.get('authorization')) {
    return NextResponse.json({ error }, { status: 401 })
  }

  if (user?.authMethod === "api-key") {
    try {
      requireScope(user, "read")
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Insufficient permissions" },
        { status: 403 }
      )
    }
  }

  try {
    const { searchParams } = new URL(request.url)
    const includeEmpty = searchParams.get('includeEmpty') === 'true'
    const sort = searchParams.get('sort') || 'name' // name, count
    const order = searchParams.get('order') || 'asc' // asc, desc

    const validSorts = ['name', 'count']
    if (!validSorts.includes(sort)) {
      return createErrorResponse('Invalid sort parameter', 400)
    }

    const validOrders = ['asc', 'desc']
    if (!validOrders.includes(order)) {
      return createErrorResponse('Invalid order parameter', 400)
    }

    const categoryCountsQuery = db
      .select({
        category: modules.category,
        count: sql<number>`COUNT(*)`,
        featuredCount: sql<number>`SUM(CASE WHEN ${modules.isFeatured} THEN 1 ELSE 0 END)`,
        recommendedCount: sql<number>`SUM(CASE WHEN ${modules.isRecommended} THEN 1 ELSE 0 END)`,
        recentCount: sql<number>`SUM(CASE WHEN ${modules.lastUpdated} > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END)`,
        avgRating: sql<number>`
          COALESCE((
            SELECT AVG(r.rating)::NUMERIC(3,2)
            FROM ratings r
            WHERE r.module_id IN (
              SELECT m2.id
              FROM modules m2
              WHERE m2.category = modules.category
              AND m2.is_published = true
            )
          ), 0)
        `,
      })
      .from(modules)
      .where(
        and(
          eq(modules.isPublished, true),
          eq(modules.status, 'approved')
        )
      )
      .groupBy(modules.category)

    if (!includeEmpty) {
      categoryCountsQuery.having(sql`COUNT(*) > 0`)
    }

    if (sort === 'name') {
      if (order === 'asc') {
        categoryCountsQuery.orderBy(modules.category)
      } else {
        categoryCountsQuery.orderBy(sql`${modules.category} DESC`)
      }
    } else if (sort === 'count') {
      if (order === 'asc') {
        categoryCountsQuery.orderBy(sql`COUNT(*)`)
      } else {
        categoryCountsQuery.orderBy(sql`COUNT(*) DESC`)
      }
    }

    const categoryCounts = await categoryCountsQuery

    const totalModulesResult = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(modules)
      .where(
        and(
          eq(modules.isPublished, true),
          eq(modules.status, 'approved')
        )
      )

    const totalModules = totalModulesResult[0]?.total || 0

    const categories = categoryCounts.map(cat => ({
      name: cat.category,
      count: Number(cat.count),
      featuredCount: Number(cat.featuredCount),
      recommendedCount: Number(cat.recommendedCount), 
      recentCount: Number(cat.recentCount),
      avgRating: Number(cat.avgRating),
      percentage: totalModules > 0 ? Math.round((Number(cat.count) / totalModules) * 100) : 0,
      slug: cat.category.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: getCategoryDescription(cat.category),
    }))

    const totalStats = {
      totalCategories: categories.length,
      totalModules,
      avgModulesPerCategory: categories.length > 0 ? Math.round(totalModules / categories.length) : 0,
      mostPopularCategory: categories.length > 0 ? categories.reduce((prev, current) => 
        (prev.count > current.count) ? prev : current
      ).name : null,
    }

    return createSuccessResponse({
      categories,
      totalStats,
      meta: {
        sort,
        order,
        includeEmpty,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('[! /api/categories] Error fetching categories:', error)
    return createErrorResponse('Failed to fetch categories', 500)
  }
}

function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    'security': 'Security-focused modules for privacy and protection',
    'performance': 'Modules to optimize device performance and battery life',
    'customization': 'UI/UX customization and theming modules',
    'audio': 'Audio enhancement and modification modules',
    'camera': 'Camera improvements and modifications',
    'connectivity': 'Network and connectivity enhancements',
    'gaming': 'Gaming performance and enhancement modules',
    'productivity': 'Tools and utilities for productivity',
    'system': 'Core system modifications and tweaks',
    'development': 'Developer tools and debugging modules',
    'utility': 'General utility and helper modules',
    'other': 'Miscellaneous modules not fitting other categories'
  }
  return descriptions[category.toLowerCase()] || 'No description available'
}