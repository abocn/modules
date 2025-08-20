import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { modules, ratings, releases } from '@/db/schema'
import { sql, eq, and, desc } from 'drizzle-orm'
import { getAuthenticatedUser, requireScope } from '@/lib/unified-auth'
import { applyRateLimit } from '@/lib/rate-limit-enhanced'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-middleware'

/**
 * Get detailed module statistics
 * @description Get statistics for a specific module including downloads, ratings, and trends
 * @pathParams ModuleParams
 * @response 200:Detailed module statistics
 * @response 404:ErrorResponse:Module not found
 * @response 500:ErrorResponse:Failed to fetch module statistics
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
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30d' // 7d, 30d, 90d, all
    const includeHistory = searchParams.get('includeHistory') === 'true'

    const validTimeframes = ['7d', '30d', '90d', 'all']
    if (!validTimeframes.includes(timeframe)) {
      return createErrorResponse('Invalid timeframe. Must be one of: 7d, 30d, 90d, all', 400)
    }

    const moduleExists = await db
      .select({ id: modules.id })
      .from(modules)
      .where(
        and(
          eq(modules.id, id),
          eq(modules.isPublished, true)
        )
      )
      .limit(1)

    if (moduleExists.length === 0) {
      return createErrorResponse('Module not found', 404)
    }

    let dateThreshold: Date | null = null
    if (timeframe !== 'all') {
      const daysAgo = parseInt(timeframe.replace('d', ''))
      dateThreshold = new Date()
      dateThreshold.setDate(dateThreshold.getDate() - daysAgo)
    }

    const basicStatsQuery = db
      .select({
        totalDownloads: sql<number>`COALESCE(SUM(${releases.downloads}), 0)`,
        releaseCount: sql<number>`COUNT(DISTINCT ${releases.id})`,
        latestVersion: sql<string>`
          (SELECT version FROM releases r WHERE r.module_id = ${id} AND r.is_latest = true LIMIT 1)
        `,
        latestReleaseDate: sql<string>`
          (SELECT created_at FROM releases r WHERE r.module_id = ${id} AND r.is_latest = true LIMIT 1)
        `,
        firstReleaseDate: sql<string>`
          (SELECT MIN(created_at) FROM releases r WHERE r.module_id = ${id})
        `,
      })
      .from(releases)
      .where(eq(releases.moduleId, id))

    const ratingStatsQuery = db
      .select({
        avgRating: sql<number>`COALESCE(AVG(${ratings.rating}::NUMERIC), 0)`,
        totalRatings: sql<number>`COUNT(*)`,
        ratingDistribution: sql<string>`
          JSON_OBJECT(
            '1', SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END),
            '2', SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END),
            '3', SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END),
            '4', SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END),
            '5', SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END)
          )
        `,
        totalHelpfulVotes: sql<number>`COALESCE(SUM(${ratings.helpful}), 0)`,
        reviewsWithComments: sql<number>`COUNT(CASE WHEN ${ratings.comment} IS NOT NULL THEN 1 END)`,
      })
      .from(ratings)
      .where(eq(ratings.moduleId, id))

    let timeFilteredStats = null
    if (dateThreshold) {
      const timeFilteredStatsQuery = db
        .select({
          downloadsInPeriod: sql<number>`
            COALESCE(SUM(CASE
              WHEN ${releases.createdAt} >= ${dateThreshold.toISOString()}
              THEN ${releases.downloads}
              ELSE 0
            END), 0)
          `,
          ratingsInPeriod: sql<number>`
            COUNT(CASE
              WHEN ${ratings.createdAt} >= ${dateThreshold.toISOString()}
              THEN 1
            END)
          `,
          avgRatingInPeriod: sql<number>`
            COALESCE(AVG(CASE
              WHEN ${ratings.createdAt} >= ${dateThreshold.toISOString()}
              THEN ${ratings.rating}::NUMERIC
            END), 0)
          `,
          releasesInPeriod: sql<number>`
            COUNT(CASE
              WHEN ${releases.createdAt} >= ${dateThreshold.toISOString()}
              THEN 1
            END)
          `,
        })
        .from(releases)
        .leftJoin(ratings, eq(releases.moduleId, ratings.moduleId))
        .where(eq(releases.moduleId, id))

      timeFilteredStats = await timeFilteredStatsQuery
    }

    let downloadHistory = null
    if (includeHistory) {
      downloadHistory = await db
        .select({
          version: releases.version,
          downloads: releases.downloads,
          releaseDate: releases.createdAt,
          isLatest: releases.isLatest,
        })
        .from(releases)
        .where(eq(releases.moduleId, id))
        .orderBy(desc(releases.createdAt))
    }

    let ratingHistory = null
    if (includeHistory) {
      const ratingHistoryQuery = db
        .select({
          date: sql<string>`DATE(${ratings.createdAt})`,
          avgRating: sql<number>`AVG(${ratings.rating}::NUMERIC)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(ratings)
        .where(eq(ratings.moduleId, id))
        .groupBy(sql`DATE(${ratings.createdAt})`)
        .orderBy(sql`DATE(${ratings.createdAt}) DESC`)
        .limit(90)

      ratingHistory = await ratingHistoryQuery
    }

    const categoryStats = await db
      .select({
        categoryAvgRating: sql<number>`COALESCE(AVG(${ratings.rating}::NUMERIC), 0)`,
        categoryAvgDownloads: sql<number>`COALESCE(AVG(total_downloads.downloads), 0)`,
        categoryModuleCount: sql<number>`COUNT(DISTINCT ${modules.id})`,
      })
      .from(modules)
      .leftJoin(ratings, eq(ratings.moduleId, modules.id))
      .leftJoin(
        sql`(
          SELECT module_id, SUM(downloads) as downloads
          FROM releases
          GROUP BY module_id
        ) as total_downloads`,
        sql`total_downloads.module_id = ${modules.id}`
      )
      .where(
        and(
          sql`${modules.category} = (SELECT category FROM modules WHERE id = ${id})`,
          eq(modules.isPublished, true)
        )
      )

    const [basicStats, ratingStats, categoryComparison] = await Promise.all([
      basicStatsQuery,
      ratingStatsQuery,
      categoryStats
    ])

    const stats = {
      moduleId: id,
      timeframe,
      downloads: {
        total: Number(basicStats[0]?.totalDownloads || 0),
        inPeriod: timeFilteredStats ? Number(timeFilteredStats[0]?.downloadsInPeriod || 0) : null,
        history: downloadHistory?.map(h => ({
          version: h.version,
          downloads: Number(h.downloads),
          releaseDate: h.releaseDate,
          isLatest: h.isLatest,
        })) || null,
      },
      ratings: {
        average: Number(ratingStats[0]?.avgRating || 0),
        total: Number(ratingStats[0]?.totalRatings || 0),
        inPeriod: timeFilteredStats ? Number(timeFilteredStats[0]?.ratingsInPeriod || 0) : null,
        averageInPeriod: timeFilteredStats ? Number(timeFilteredStats[0]?.avgRatingInPeriod || 0) : null,
        distribution: JSON.parse(ratingStats[0]?.ratingDistribution || '{"1":0,"2":0,"3":0,"4":0,"5":0}'),
        totalHelpfulVotes: Number(ratingStats[0]?.totalHelpfulVotes || 0),
        reviewsWithComments: Number(ratingStats[0]?.reviewsWithComments || 0),
        history: ratingHistory?.map(h => ({
          date: h.date,
          averageRating: Number(h.avgRating || 0),
          count: Number(h.count),
        })) || null,
      },
      releases: {
        total: Number(basicStats[0]?.releaseCount || 0),
        inPeriod: timeFilteredStats ? Number(timeFilteredStats[0]?.releasesInPeriod || 0) : null,
        latestVersion: basicStats[0]?.latestVersion || null,
        latestReleaseDate: basicStats[0]?.latestReleaseDate || null,
        firstReleaseDate: basicStats[0]?.firstReleaseDate || null,
      },
      categoryComparison: {
        avgRating: Number(categoryComparison[0]?.categoryAvgRating || 0),
        avgDownloads: Number(categoryComparison[0]?.categoryAvgDownloads || 0),
        moduleCount: Number(categoryComparison[0]?.categoryModuleCount || 0),
      },
      performance: {
        ratingsToDownloadsRatio: basicStats[0]?.totalDownloads 
          ? Number(ratingStats[0]?.totalRatings || 0) / Number(basicStats[0].totalDownloads) 
          : 0,
        helpfulnessRatio: ratingStats[0]?.totalRatings
          ? Number(ratingStats[0].totalHelpfulVotes) / Number(ratingStats[0].totalRatings)
          : 0,
        commentEngagement: ratingStats[0]?.totalRatings
          ? Number(ratingStats[0].reviewsWithComments) / Number(ratingStats[0].totalRatings)
          : 0,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        includeHistory,
        timeframe,
      }
    }

    return createSuccessResponse(stats)

  } catch (error) {
    console.error('[! /api/modules/[id]/stats] Error fetching module stats:', error)
    return createErrorResponse('Failed to fetch module statistics', 500)
  }
}