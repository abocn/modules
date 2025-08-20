import { NextRequest, NextResponse } from 'next/server'
import { getUserHelpfulVotes } from '@/lib/db-utils'
import { auth } from '@/lib/auth'

/**
 * Get user's helpful votes for module
 * @description Retrieve the authenticated user's helpful vote history for all ratings and replies on a specific module. Returns empty arrays for unauthenticated users.
 * @tags Helpful Votes
 * @pathParams ModuleParams - Path parameters for module identification
 * @response 200:HelpfulVotesResponse:Successfully retrieved user's helpful votes (empty if not authenticated)
 * @response 500:ErrorResponse:Internal server error while fetching helpful vote history
 * @rateLimit No rate limit applied
 * @example
 * // Request (authenticated)
 * GET /api/modules/abc123/helpful-votes
 *
 * // Response (authenticated user)
 * {
 *   "ratings": [15, 23, 47],
 *   "replies": [8, 12]
 * }
 *
 * // Response (unauthenticated user)
 * {
 *   "ratings": [],
 *   "replies": []
 * }
 * @openapi
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user?.id) {
      return NextResponse.json(
        { ratings: [], replies: [] }
      )
    }

    const resolvedParams = await params
    const moduleId = resolvedParams.id

    const helpfulVotes = await getUserHelpfulVotes(session.user.id, moduleId)

    return NextResponse.json(helpfulVotes)
  } catch (error) {
    console.error('[! /api/modules/[id]/helpful-votes] Error fetching helpful votes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch helpful votes' },
      { status: 500 }
    )
  }
}