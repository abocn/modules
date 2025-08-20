import { NextRequest } from "next/server"
import {
  getTotalModulesCount,
  getModulesUpdatedThisWeek,
  getFeaturedModulesCount,
  getRecommendedModulesCount,
  getTotalDownloads,
  getModulesByCategoryCount,
  getNewModulesThisMonth
} from "@/lib/db-utils"
import { createSuccessResponse, createErrorResponse } from "@/lib/api-middleware"
import { applyRateLimit } from "@/lib/rate-limit-enhanced"

/**
 * Get platform statistics
 * @description Retrieve platform statistics including total modules, downloads, activity metrics, and category breakdowns.
 * @tags Statistics
 * @response 200:StatsResponse:Successfully retrieved platform statistics with current metrics
 * @response 429:RateLimitErrorResponse:Rate limit exceeded (100 requests per hour)
 * @response 500:ErrorResponse:Internal server error while calculating statistics
 * @rateLimit 100 requests per hour for public access
 * @example
 * // Request
 * GET /api/stats
 *
 * // Response
 * {
 *   "totalModules": 1247,
 *   "modulesUpdatedThisWeek": 89,
 *   "featuredCount": 42,
 *   "recommendedCount": 156,
 *   "totalDownloads": 2841063,
 *   "securityModules": 387,
 *   "performanceModules": 203,
 *   "newThisMonth": 67,
 *   "currentTime": "1/15/2024, 10:30:00 AM"
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

  try {
    const [
      totalModules,
      modulesUpdatedThisWeek,
      featuredCount,
      recommendedCount,
      totalDownloads,
      securityModules,
      performanceModules,
      newThisMonth
    ] = await Promise.all([
      getTotalModulesCount(),
      getModulesUpdatedThisWeek(),
      getFeaturedModulesCount(),
      getRecommendedModulesCount(),
      getTotalDownloads(),
      getModulesByCategoryCount('security'),
      getModulesByCategoryCount('performance'),
      getNewModulesThisMonth()
    ])

    return createSuccessResponse({
      totalModules,
      modulesUpdatedThisWeek,
      featuredCount,
      recommendedCount,
      totalDownloads,
      securityModules,
      performanceModules,
      newThisMonth,
      currentTime: new Date().toLocaleString()
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return createErrorResponse('Failed to fetch stats', 500)
  }
}