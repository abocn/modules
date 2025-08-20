import { NextRequest, NextResponse } from 'next/server'
import { getModuleById } from '@/lib/db-utils'
import { getAuthenticatedUser, requireScope } from '@/lib/unified-auth'

/**
 * Get module details
 * @description Retrieve information about a specific module including metadata, compatibility, features, and optionally releases. Supports both session-based and API key authentication.
 * @tags Modules
 * @pathParams ModuleParams - Path parameters for module identification
 * @params ModuleQueryParams - Optional query parameters to include additional data
 * @response 200:ModuleDetailResponse:Successfully retrieved module details with full metadata
 * @response 401:ErrorResponse:Authentication required for API key access
 * @response 403:ErrorResponse:API key lacks required 'read' scope
 * @response 404:ErrorResponse:Module not found or not published
 * @response 500:ErrorResponse:Internal server error while fetching module details
 * @auth bearer (optional for public access, required for API key access)
 * @rateLimit No rate limit applied
 * @example
 * // Get basic module details
 * GET /api/modules/abc123
 *
 * // Get module with releases included
 * GET /api/modules/abc123?includeReleases=true
 *
 * // Response
 * {
 *   "module": {
 *     "id": "abc123",
 *     "name": "Example Module",
 *     "description": "Description of the module",
 *     "shortDescription": "Short description of the module",
 *     "author": "Example",
 *     "category": "security",
 *     "version": "2.1.0",
 *     "downloads": 15420,
 *     "rating": 4.8,
 *     "reviewCount": 89,
 *     "size": "2.4 MB",
 *     "lastUpdated": "2024-01-15",
 *     "compatibility": {
 *       "androidVersions": ["11+", "12+", "13+", "14+"],
 *       "rootMethods": ["Magisk", "KernelSU"]
 *     },
 *     "features": ["Example", "Example", "Example"],
 *     "isOpenSource": true,
 *     "license": "GPL-3.0",
 *     "sourceUrl": "https://github.com/example/security-module"
 *   }
 * }
 * @openapi
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request)

    if (error) {
      return NextResponse.json({ error }, { status: 401 })
    }

    if (user) {
      try {
        requireScope(user, "read")
      } catch (scopeError) {
        return NextResponse.json(
          { error: scopeError instanceof Error ? scopeError.message : "Insufficient permissions" },
          { status: 403 }
        )
      }
    }

    const url = new URL(request.url)
    const includeReleases = url.searchParams.get('includeReleases') === 'true'

    const { id } = await params
    const mod = await getModuleById(id, includeReleases)

    if (!mod || !mod.isPublished) {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ module: mod })
  } catch (error) {
    console.error('[! /api/modules/[id]] Error fetching module:', error)
    return NextResponse.json(
      { error: 'Failed to fetch module' },
      { status: 500 }
    )
  }
}