import { NextRequest, NextResponse } from 'next/server'
import { getModuleReleases, getLatestRelease } from '@/lib/db-utils'

/**
 * Get module releases
 * @description Retrieve version history and release information for a specific module. Can return all releases or just the latest release with metadata.
 * @tags Releases
 * @pathParams ModuleParams - Path parameters for module identification
 * @params ModuleReleasesQueryParams - Optional query parameters to filter release data
 * @response 200:ReleasesListResponse:Successfully retrieved module releases with version history
 * @response 404:ErrorResponse:Module not found or no releases available for this module
 * @response 500:ErrorResponse:Internal server error while fetching release information
 * @rateLimit No rate limit applied
 * @example
 * // Get all releases for a module
 * GET /api/modules/abc123/releases
 *
 * // Get only the latest release
 * GET /api/modules/abc123/releases?latest=true
 *
 * // Response (all releases)
 * {
 *   "releases": [
 *     {
 *       "id": 42,
 *       "moduleId": "abc123",
 *       "version": "2.1.0",
 *       "downloadUrl": "https://github.com/user/repo/releases/download/v2.1.0/module.zip",
 *       "size": "2.4 MB",
 *       "changelog": "Added new security features and bug fixes",
 *       "downloads": 1250,
 *       "isLatest": true,
 *       "createdAt": "2024-01-15T10:30:00Z"
 *     }
 *   ]
 * }
 * @openapi
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { searchParams } = new URL(request.url)
    const latest = searchParams.get('latest')

    if (latest === 'true') {
      const release = await getLatestRelease(id)
      if (!release) {
        return NextResponse.json(
          { error: 'No releases found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ release })
    } else {
      const releases = await getModuleReleases(id)
      return NextResponse.json({ releases })
    }
  } catch (error) {
    console.error('[! /api/modules/[id]/releases] Error fetching releases:', error)
    return NextResponse.json(
      { error: 'Failed to fetch releases' },
      { status: 500 }
    )
  }
}