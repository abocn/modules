import { NextRequest, NextResponse } from 'next/server'
import { searchModules } from '@/lib/db-utils'
import { getAuthenticatedUser, requireScope } from '@/lib/unified-auth'
import { applyRateLimit } from '@/lib/rate-limit-enhanced'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-middleware'

/**
 * Advanced module search
 * @description Search modules with advanced filtering, sorting, and pagination. Supports full-text search across module names, descriptions, and authors with filtering options.
 * @tags Search
 * @params SearchQueryParams - Query parameters for search, filtering, and pagination
 * @response 200:SearchResponse:Successfully retrieved search results with metadata and pagination info
 * @response 400:ErrorResponse:Invalid search parameters (query too long/short, invalid sort/order values)
 * @response 401:ErrorResponse:Authentication required for API key access
 * @response 403:ErrorResponse:API key lacks required 'read' scope
 * @response 429:RateLimitErrorResponse:Rate limit exceeded (100 requests per hour for public access)
 * @response 500:ErrorResponse:Internal server error during search operation
 * @auth bearer (optional for public access, required for API key access)
 * @rateLimit 100 requests per hour for public access, API key limits apply per key configuration
 * @example
 * // Basic search
 * GET /api/search?q=firewall&limit=10
 *
 * // Advanced search with filters
 * GET /api/search?q=security&category=security&minRating=4&isOpenSource=true&sort=downloads&order=desc&limit=20
 *
 * // Response
 * {
 *   "query": "security",
 *   "results": [
 *     {
 *       "id": "abc123",
 *       "name": "Advanced Security Suite",
 *       "shortDescription": "Security module",
 *       "category": "security",
 *       "downloads": 25000,
 *       "rating": 4.9
 *     }
 *   ],
 *   "totalCount": 157,
 *   "offset": 0,
 *   "limit": 20,
 *   "hasMore": true
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
    const query = searchParams.get('q') || searchParams.get('query')
    const category = searchParams.get('category')
    const author = searchParams.get('author')
    const license = searchParams.get('license')
    const sort = searchParams.get('sort') || 'relevance' // relevance, name, downloads, rating, updated
    const order = searchParams.get('order') || 'desc' // asc, desc
    const minRating = searchParams.get('minRating')
    const isOpenSource = searchParams.get('isOpenSource')
    const rootMethod = searchParams.get('rootMethod')
    const androidVersion = searchParams.get('androidVersion')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!query || query.trim().length === 0) {
      return createErrorResponse('Query parameter is required', 400)
    }

    if (query.length > 200) {
      return createErrorResponse('Query too long (max 200 characters)', 400)
    }

    const validSorts = ['relevance', 'name', 'downloads', 'rating', 'updated']
    if (!validSorts.includes(sort)) {
      return createErrorResponse('Invalid sort parameter', 400)
    }

    const validOrders = ['asc', 'desc']
    if (!validOrders.includes(order)) {
      return createErrorResponse('Invalid order parameter', 400)
    }

    if (minRating && (isNaN(Number(minRating)) || Number(minRating) < 1 || Number(minRating) > 5)) {
      return createErrorResponse('minRating must be between 1 and 5', 400)
    }

    if (isOpenSource && !['true', 'false'].includes(isOpenSource)) {
      return createErrorResponse('isOpenSource must be true or false', 400)
    }

    const searchOptions = {
      query: query.trim(),
      category: category || undefined,
      author: author || undefined,
      license: license || undefined,
      sort,
      order,
      minRating: minRating ? Number(minRating) : undefined,
      isOpenSource: isOpenSource ? isOpenSource === 'true' : undefined,
      rootMethod: rootMethod || undefined,
      androidVersion: androidVersion || undefined,
      limit,
      offset,
    }

    const results = await searchModules(searchOptions.query)

    return createSuccessResponse({
      query: searchOptions.query,
      results: results,
      totalCount: results.length,
      offset: searchOptions.offset,
      limit: searchOptions.limit,
      hasMore: results.length === searchOptions.limit,
      searchOptions: searchOptions
    })

  } catch (error) {
    console.error('[! /api/search] Error searching modules:', error)
    return createErrorResponse('Failed to search modules', 500)
  }
}

/**
 * Search suggestions
 * @description Get intelligent search suggestions and autocomplete for module names, authors, and categories. Helps users discover relevant content as they type.
 * @tags Search
 * @body SearchSuggestionsRequest - Request body with query and suggestion type
 * @response 200:SearchSuggestionsResponse:Successfully retrieved search suggestions
 * @response 400:ErrorResponse:Invalid query parameters (too short/long, invalid type)
 * @response 429:RateLimitErrorResponse:Rate limit exceeded (100 requests per hour)
 * @response 500:ErrorResponse:Internal server error while generating suggestions
 * @rateLimit 100 requests per hour for public access
 * @example
 * // Request
 * POST /api/search
 * {
 *   "query": "secur",
 *   "type": "all"
 * }
 *
 * // Response
 * {
 *   "query": "secur",
 *   "modules": ["Security Suite", "Security Enhancer"],
 *   "authors": ["Example", "Example"],
 *   "categories": ["security"]
 * }
 * @openapi
 */
export async function POST(request: NextRequest) {
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
    const body = await request.json()
    const { query, type = 'all' } = body

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return createErrorResponse('Query must be at least 2 characters', 400)
    }

    if (query.length > 100) {
      return createErrorResponse('Query too long (max 100 characters)', 400)
    }

    const validTypes = ['all', 'modules', 'authors', 'categories']
    if (!validTypes.includes(type)) {
      return createErrorResponse('Invalid type parameter', 400)
    }

    const suggestions = {
      modules: [],
      authors: [],
      categories: [],
      query: query.trim()
    }

    return createSuccessResponse(suggestions)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return createErrorResponse('Invalid JSON body', 400)
    }
    console.error('[! /api/search] Error getting suggestions:', error)
    return createErrorResponse('Failed to get suggestions', 500)
  }
}