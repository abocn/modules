import { NextRequest, NextResponse } from 'next/server'
import {
  getAllModules,
  searchModules,
  getFeaturedModules,
  getRecommendedModules,
  getRecentlyUpdatedModules,
  getModulesByCategory,
  getTrendingModules
} from '@/lib/db-utils'
import { getAuthenticatedUser, requireScope } from '@/lib/unified-auth'

/**
 * List modules
 * @description Get a list of published modules with optional filtering, search, and sorting. Supports both session-based and API key authentication.
 * @tags Modules
 * @params ModulesQueryParams - Query parameters for filtering and pagination
 * @response 200:ModulesListResponse:Successfully retrieved list of modules
 * @response 401:ErrorResponse:Authentication required for API key access
 * @response 403:ErrorResponse:API key lacks required 'read' scope
 * @response 500:ErrorResponse:Internal server error while fetching modules
 * @auth bearer (optional for public access, required for API key access)
 * @rateLimit No rate limit for session-based access, API key limits apply per key configuration
 * @example
 * // Get featured modules
 * GET /api/modules?filter=featured&limit=10

 * // Search modules in security category
 * GET /api/modules?search=firewall&category=security&sort=downloads&order=desc

 * // Response
 * {
 *   "modules": [
 *     {
 *       "id": "abc123",
 *       "name": "Advanced Firewall",
 *       "shortDescription": "Enhanced security module with firewall capabilities",
 *       "category": "security",
 *       "author": "SecurityDev",
 *       "downloads": 15420,
 *       "rating": 4.8,
 *       "version": "2.1.0",
 *       "isOpenSource": true,
 *       "isFeatured": true
 *     }
 *   ]
 * }
 * @openapi
 */
export async function GET(request: NextRequest) {
  const { user } = await getAuthenticatedUser(request)

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
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const filter = searchParams.get('filter') // featured, recommended, recent, trending

    let modules

    if (search) {
      modules = await searchModules(search)
    } else if (filter === 'featured') {
      modules = await getFeaturedModules()
    } else if (filter === 'recommended') {
      modules = await getRecommendedModules()
    } else if (filter === 'recent') {
      modules = await getRecentlyUpdatedModules()
    } else if (filter === 'trending') {
      const algorithm = searchParams.get('algorithm') as 'downloads' | 'rating' | 'recent' | 'combined' | null
      const range = searchParams.get('range') as '7d' | '30d' | 'all' | null
      modules = await getTrendingModules({
        algorithm: algorithm || 'downloads',
        range: range || '7d'
      })
    } else if (category) {
      modules = await getModulesByCategory(category)
    } else {
      modules = await getAllModules()
    }

    return NextResponse.json({ modules })
  } catch (error) {
    console.error('[! /api/modules] Error fetching modules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch modules' },
      { status: 500 }
    )
  }
}
