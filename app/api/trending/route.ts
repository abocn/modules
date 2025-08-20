import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { modules, ratings, releases } from '@/db/schema'
import { sql, eq, and, desc, gte } from 'drizzle-orm'
import { transformDbModuleToModule } from '@/lib/db-utils'
import { getAuthenticatedUser, requireScope } from '@/lib/unified-auth'
import { applyRateLimit } from '@/lib/rate-limit-enhanced'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-middleware'
import type { DbModule } from '@/types/module'

/**
 * Get trending modules
 * @description Discover trending modules using sophisticated algorithms based on recent downloads, ratings, and updates. Multiple algorithms available.
 * @tags Trending
 * @params TrendingQueryParams - Query parameters for timeframe, category filtering, and algorithm selection
 * @response 200:TrendingResponse:Successfully retrieved trending modules with detailed trend analysis
 * @response 400:ErrorResponse:Invalid timeframe, algorithm, or other query parameters
 * @response 401:ErrorResponse:Authentication required for API key access
 * @response 403:ErrorResponse:API key lacks required 'read' scope
 * @response 429:RateLimitErrorResponse:Rate limit exceeded (100 requests per hour)
 * @response 500:ErrorResponse:Internal server error while calculating trending modules
 * @auth bearer (optional for public access, required for API key access)
 * @rateLimit 100 requests per hour for public access, API key limits apply per key configuration
 * @example
 * // Get trending modules using balanced algorithm for past week
 * GET /api/trending?timeframe=7d&algorithm=balanced&limit=20
 *
 * // Get new modules in security category
 * GET /api/trending?timeframe=30d&algorithm=new&category=security
 *
 * // Response
 * {
 *   "trending": [
 *     {
 *       "id": "abc123",
 *       "name": "Security Enhancement",
 *       "category": "security",
 *       "downloads": 15420,
 *       "rating": 4.8,
 *       "trendScore": 892.5,
 *       "trendData": {
 *         "recentDownloads": 1250,
 *         "recentRatings": 18,
 *         "avgRecentRating": 4.9,
 *         "wasRecentlyUpdated": true
 *       }
 *     }
 *   ],
 *   "meta": {
 *     "algorithm": "balanced",
 *     "timeframe": "7d",
 *     "explanation": "Modules trending based on a balanced score of recent downloads (40%), ratings (30%), and updates (30%) in the past week"
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
    const timeframe = searchParams.get('timeframe') || '7d' // 1d, 7d, 30d
    const category = searchParams.get('category')
    const algorithm = searchParams.get('algorithm') || 'balanced' // downloads, ratings, balanced, new
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    const validTimeframes = ['1d', '7d', '30d']
    if (!validTimeframes.includes(timeframe)) {
      return createErrorResponse('Invalid timeframe. Must be one of: 1d, 7d, 30d', 400)
    }

    const validAlgorithms = ['downloads', 'ratings', 'balanced', 'new']
    if (!validAlgorithms.includes(algorithm)) {
      return createErrorResponse('Invalid algorithm. Must be one of: downloads, ratings, balanced, new', 400)
    }

    const daysAgo = parseInt(timeframe.replace('d', ''))
    const dateThreshold = new Date()
    dateThreshold.setDate(dateThreshold.getDate() - daysAgo)

    let trendingQuery

    if (algorithm === 'downloads') {
      trendingQuery = db
        .select({
          ...getModuleSelectFields(),
          trendScore: sql<number>`
            COALESCE(SUM(CASE
              WHEN ${releases.createdAt} > ${dateThreshold.toISOString()}
              THEN ${releases.downloads}
              ELSE 0
            END), 0)
          `,
          recentDownloads: sql<number>`
            COALESCE(SUM(CASE
              WHEN ${releases.createdAt} > ${dateThreshold.toISOString()}
              THEN ${releases.downloads}
              ELSE 0
            END), 0)
          `,
          totalDownloads: sql<number>`COALESCE(SUM(${releases.downloads}), 0)`,
        })
        .from(modules)
        .leftJoin(releases, eq(modules.id, releases.moduleId))
        .where(getBaseWhereCondition(category))
        .groupBy(...getModuleGroupByFields())
        .having(sql`SUM(CASE WHEN ${releases.createdAt} > ${dateThreshold.toISOString()} THEN ${releases.downloads} ELSE 0 END) > 0`)
        .orderBy(desc(sql`COALESCE(SUM(CASE WHEN ${releases.createdAt} > ${dateThreshold.toISOString()} THEN ${releases.downloads} ELSE 0 END), 0)`))
        .limit(limit)

    } else if (algorithm === 'ratings') {
      trendingQuery = db
        .select({
          ...getModuleSelectFields(),
          trendScore: sql<number>`
            COALESCE(COUNT(CASE
              WHEN ${ratings.createdAt} > ${dateThreshold.toISOString()}
              THEN ${ratings.id}
              ELSE NULL
            END), 0)
          `,
          recentRatings: sql<number>`
            COALESCE(COUNT(CASE
              WHEN ${ratings.createdAt} > ${dateThreshold.toISOString()}
              THEN ${ratings.id}
              ELSE NULL
            END), 0)
          `,
          avgRecentRating: sql<number>`
            COALESCE(AVG(CASE
              WHEN ${ratings.createdAt} > ${dateThreshold.toISOString()}
              THEN ${ratings.rating}::NUMERIC
              ELSE NULL
            END), 0)
          `,
        })
        .from(modules)
        .leftJoin(ratings, eq(modules.id, ratings.moduleId))
        .where(getBaseWhereCondition(category))
        .groupBy(...getModuleGroupByFields())
        .having(sql`COUNT(CASE WHEN ${ratings.createdAt} > ${dateThreshold.toISOString()} THEN ${ratings.id} ELSE NULL END) > 0`)
        .orderBy(desc(sql`COUNT(CASE WHEN ${ratings.createdAt} > ${dateThreshold.toISOString()} THEN ${ratings.id} ELSE NULL END)`))
        .limit(limit)

    } else if (algorithm === 'new') {
      trendingQuery = db
        .select({
          ...getModuleSelectFields(),
          trendScore: sql<number>`
            EXTRACT(EPOCH FROM (NOW() - ${modules.createdAt})) / 86400
          `,
          daysSinceCreated: sql<number>`
            EXTRACT(EPOCH FROM (NOW() - ${modules.createdAt})) / 86400
          `,
        })
        .from(modules)
        .where(
          and(
            getBaseWhereCondition(category),
            gte(modules.createdAt, dateThreshold)
          )
        )
        .groupBy(...getModuleGroupByFields())
        .orderBy(desc(modules.createdAt))
        .limit(limit)

    } else {
      trendingQuery = db
        .select({
          ...getModuleSelectFields(),
          trendScore: sql<number>`
            (
              COALESCE(SUM(CASE
                WHEN ${releases.createdAt} > ${dateThreshold.toISOString()}
                THEN ${releases.downloads}
                ELSE 0
              END), 0) * 0.4 +
              COALESCE(COUNT(CASE
                WHEN ${ratings.createdAt} > ${dateThreshold.toISOString()}
                THEN ${ratings.id}
                ELSE NULL
              END), 0) * 10 * 0.3 +
              CASE
                WHEN MAX(${releases.createdAt}) > ${dateThreshold.toISOString()}
                THEN 50
                ELSE 0
              END * 0.3
            )
          `,
          recentDownloads: sql<number>`
            COALESCE(SUM(CASE
              WHEN ${releases.createdAt} > ${dateThreshold.toISOString()}
              THEN ${releases.downloads}
              ELSE 0
            END), 0)
          `,
          recentRatings: sql<number>`
            COALESCE(COUNT(CASE
              WHEN ${ratings.createdAt} > ${dateThreshold.toISOString()}
              THEN ${ratings.id}
              ELSE NULL
            END), 0)
          `,
          wasRecentlyUpdated: sql<boolean>`MAX(${releases.createdAt}) > ${dateThreshold.toISOString()}`,
        })
        .from(modules)
        .leftJoin(releases, eq(modules.id, releases.moduleId))
        .leftJoin(ratings, eq(modules.id, ratings.moduleId))
        .where(getBaseWhereCondition(category))
        .groupBy(...getModuleGroupByFields())
        .having(sql`
          (
            COALESCE(SUM(CASE
              WHEN ${releases.createdAt} > ${dateThreshold.toISOString()}
              THEN ${releases.downloads}
              ELSE 0
            END), 0) * 0.4 +
            COALESCE(COUNT(CASE
              WHEN ${ratings.createdAt} > ${dateThreshold.toISOString()}
              THEN ${ratings.id}
              ELSE NULL
            END), 0) * 10 * 0.3 +
            CASE
              WHEN MAX(${releases.createdAt}) > ${dateThreshold.toISOString()}
              THEN 50
              ELSE 0
            END * 0.3
          ) > 0
        `)
        .orderBy(desc(sql`
          (
            COALESCE(SUM(CASE
              WHEN ${releases.createdAt} > ${dateThreshold.toISOString()}
              THEN ${releases.downloads}
              ELSE 0 
            END), 0) * 0.4 +
            COALESCE(COUNT(CASE
              WHEN ${ratings.createdAt} > ${dateThreshold.toISOString()}
              THEN ${ratings.id}
              ELSE NULL
            END), 0) * 10 * 0.3 +
            CASE
              WHEN MAX(${releases.createdAt}) > ${dateThreshold.toISOString()}
              THEN 50
              ELSE 0
            END * 0.3
          )
        `))
        .limit(limit)
    }

    const trendingModules = await trendingQuery

    const transformedModules = await Promise.all(
      trendingModules.map(async (dbModule) => {
        const transformedModule = await transformDbModuleToModule(dbModule as DbModule)
        const trendData = {
          recentDownloads: 0,
          recentRatings: 0,
          avgRecentRating: 0,
          totalDownloads: 0,
          daysSinceCreated: 0,
          wasRecentlyUpdated: false,
        }

        if ('recentDownloads' in dbModule) trendData.recentDownloads = Number(dbModule.recentDownloads || 0)
        if ('recentRatings' in dbModule) trendData.recentRatings = Number(dbModule.recentRatings || 0)
        if ('avgRecentRating' in dbModule) trendData.avgRecentRating = Number(dbModule.avgRecentRating || 0)
        if ('totalDownloads' in dbModule) trendData.totalDownloads = Number(dbModule.totalDownloads || 0)
        if ('daysSinceCreated' in dbModule) trendData.daysSinceCreated = Number(dbModule.daysSinceCreated || 0)
        if ('wasRecentlyUpdated' in dbModule) trendData.wasRecentlyUpdated = Boolean(dbModule.wasRecentlyUpdated || false)

        return {
          ...transformedModule,
          trendScore: Number(dbModule.trendScore),
          trendData
        }
      })
    )

    return createSuccessResponse({
      trending: transformedModules,
      meta: {
        algorithm,
        timeframe,
        category: category || 'all',
        limit,
        generatedAt: new Date().toISOString(),
        explanation: getAlgorithmExplanation(algorithm, timeframe)
      }
    })

  } catch (error) {
    console.error('[! /api/trending] Error fetching trending modules:', error)
    return createErrorResponse('Failed to fetch trending modules', 500)
  }
}

function getModuleSelectFields() {
  return {
    id: modules.id,
    name: modules.name,
    slug: modules.slug,
    description: modules.description,
    shortDescription: modules.shortDescription,
    author: modules.author,
    category: modules.category,
    lastUpdated: modules.lastUpdated,
    icon: modules.icon,
    images: modules.images,
    isOpenSource: modules.isOpenSource,
    license: modules.license,
    compatibility: modules.compatibility,
    warnings: modules.warnings,
    reviewNotes: modules.reviewNotes,
    features: modules.features,
    sourceUrl: modules.sourceUrl,
    communityUrl: modules.communityUrl,
    isFeatured: modules.isFeatured,
    githubRepo: modules.githubRepo,
    isRecommended: modules.isRecommended,
    isPublished: modules.isPublished,
    status: modules.status,
    createdAt: modules.createdAt,
    updatedAt: modules.updatedAt,
    submittedBy: modules.submittedBy,
  }
}

function getModuleGroupByFields() {
  return [
    modules.id,
    modules.name,
    modules.slug,
    modules.description,
    modules.shortDescription,
    modules.author,
    modules.category,
    modules.lastUpdated,
    modules.icon,
    modules.images,
    modules.isOpenSource,
    modules.license,
    modules.compatibility,
    modules.warnings,
    modules.reviewNotes,
    modules.features,
    modules.sourceUrl,
    modules.communityUrl,
    modules.isFeatured,
    modules.githubRepo,
    modules.isRecommended,
    modules.isPublished,
    modules.status,
    modules.createdAt,
    modules.updatedAt,
    modules.submittedBy,
  ]
}

function getBaseWhereCondition(category?: string | null) {
  if (category) {
    return and(
      eq(modules.isPublished, true),
      eq(modules.status, 'approved'),
      eq(modules.category, category)
    )
  }
  return and(
    eq(modules.isPublished, true),
    eq(modules.status, 'approved')
  )
}

function getAlgorithmExplanation(algorithm: string, timeframe: string): string {
  const timeFrameText = timeframe === '1d' ? 'past day' : timeframe === '7d' ? 'past week' : 'past month'

  switch (algorithm) {
    case 'downloads':
      return `Modules with the most downloads in the ${timeFrameText}`
    case 'ratings':
      return `Modules with the most ratings received in the ${timeFrameText}`
    case 'new':
      return `Newest modules created in the ${timeFrameText}`
    case 'balanced':
      return `Modules trending based on a balanced score of recent downloads (40%), ratings (30%), and updates (30%) in the ${timeFrameText}`
    default:
      return `Trending modules in the ${timeFrameText}`
  }
}