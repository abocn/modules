import { NextRequest, NextResponse } from 'next/server'
import { incrementReleaseDownloads, getLatestRelease } from '@/lib/db-utils'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-middleware'
import { applyRateLimit } from '@/lib/rate-limit-enhanced'
import { getAuthenticatedUser, requireScope } from '@/lib/unified-auth'

/**
 * Download module (redirect)
 * @description Initiate download of the latest module release. Automatically tracks download statistics and redirects to the actual file. Rate limited. Supports both public access and API key authentication.
 * @tags Downloads
 * @pathParams ModuleParams - Path parameters for module identification
 * @response 302:Redirect to download URL with automatic tracking
 * @response 401:ErrorResponse:Authentication required for API key access
 * @response 403:ErrorResponse:API key lacks required 'read' scope
 * @response 404:ErrorResponse:Module not found or no releases available
 * @response 429:RateLimitErrorResponse:Rate limit exceeded (50 downloads per hour)
 * @response 500:ErrorResponse:Internal server error while processing download
 * @auth bearer (optional for public access, required for API key access)
 * @rateLimit 50 downloads per hour per IP address
 * @example
 * // Request
 * GET /api/modules/abc123/download
 *
 * // Response: 302 Redirect to actual download URL
 * // Location: https://github.com/user/repo/releases/download/v1.0.0/module.zip
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

    const rateLimitResult = await applyRateLimit(request, 'DOWNLOAD_TRACKING')

    if (!rateLimitResult.success) {
      return createErrorResponse(
        'Rate limit exceeded',
        429,
        {
          "X-RateLimit-Limit": "50",
          "X-RateLimit-Remaining": "0",
          "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
        }
      )
    }

    const { id } = await params
    const latestRelease = await getLatestRelease(id)

    if (!latestRelease) {
      return createErrorResponse('No releases found for this module', 404)
    }

    try {
      const downloadUrl = new URL(latestRelease.downloadUrl)
      const allowedHosts = [
        'github.com',
        'raw.githubusercontent.com',
        'releases.githubusercontent.com',
        'gitlab.com',
        'bitbucket.org',
        'sourceforge.net'
      ]

      if (!allowedHosts.some(host => downloadUrl.hostname === host || downloadUrl.hostname.endsWith(`.${host}`))) {
        console.error(`Blocked redirect to untrusted host: ${downloadUrl.hostname}`)
        return createErrorResponse('Download URL points to an untrusted source', 400)
      }

      if (!['http:', 'https:'].includes(downloadUrl.protocol)) {
        return createErrorResponse('Invalid download URL protocol', 400)
      }
    } catch (error) {
      console.error('Invalid download URL:', error)
      return createErrorResponse('Invalid download URL', 400)
    }

    await incrementReleaseDownloads(latestRelease.id)

    return NextResponse.redirect(latestRelease.downloadUrl, 302)
  } catch (error) {
    console.error('[! /api/modules/[id]/download] Error processing download:', error)
    return createErrorResponse('Failed to process download', 500)
  }
}

/**
 * Track download (internal)
 * @description Internal endpoint for analytics tracking of downloads. Used by frontend applications to track specific release downloads before initiating the actual download. Supports both public access and API key authentication.
 * @tags Downloads
 * @pathParams ModuleParams - Path parameters for module identification
 * @body DownloadTrackingBody - Optional tracking data for specific releases or assets
 * @response 200:SuccessResponse:Download event tracked successfully in analytics
 * @response 400:ErrorResponse:Invalid release ID or tracking data format
 * @response 401:ErrorResponse:Authentication required for API key access
 * @response 403:ErrorResponse:API key lacks required 'read' scope
 * @response 404:ErrorResponse:Specified release not found for tracking
 * @response 429:RateLimitErrorResponse:Rate limit exceeded (50 tracking requests per hour)
 * @response 500:ErrorResponse:Internal server error while recording download analytics
 * @auth bearer (optional for public access, required for API key access)
 * @rateLimit 50 tracking requests per hour per IP address
 * @example
 * // Request - Track specific release download
 * POST /api/modules/abc123/download
 * {
 *   "releaseId": 42,
 *   "assetName": "module-v1.0.0.zip"
 * }
 *
 * // Request - Track latest release download
 * POST /api/modules/abc123/download
 * {}
 *
 * // Response
 * {
 *   "success": true
 * }
 * @openapi
 */
export async function POST(
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

    const rateLimitResult = await applyRateLimit(request, 'DOWNLOAD_TRACKING')

    if (!rateLimitResult.success) {
      return createErrorResponse(
        'Rate limit exceeded',
        429,
        {
          "X-RateLimit-Limit": "50",
          "X-RateLimit-Remaining": "0",
          "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
        }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { releaseId, assetName } = body

    if (releaseId) {
      if (typeof releaseId !== 'number' || releaseId <= 0) {
        return createErrorResponse('Invalid release ID', 400)
      }

      await incrementReleaseDownloads(releaseId)

      if (assetName) {
        console.log(`[/api/modules/[id]/download] Asset download: ${assetName} from release ${releaseId}`)
      }
    } else {
      const latestRelease = await getLatestRelease(id)
      if (!latestRelease) {
        return createErrorResponse('No releases found for this module', 404)
      }
      await incrementReleaseDownloads(latestRelease.id)
    }

    return createSuccessResponse({ success: true })
  } catch (error) {
    console.error('[! /api/modules/[id]/download] Error tracking download:', error)
    return createErrorResponse('Failed to track download', 500)
  }
}