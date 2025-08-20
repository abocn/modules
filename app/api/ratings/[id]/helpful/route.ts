import { NextRequest, NextResponse } from 'next/server'
import { incrementRatingHelpful, checkUserHelpfulVote, addHelpfulVote } from '@/lib/db-utils'
import { auth } from '@/lib/auth'

/**
 * Mark rating as helpful
 * @description Mark a rating/review as helpful to increase its visibility and credibility. Each user can only vote once per rating.
 * @tags Helpful Votes
 * @pathParams RatingParams - Path parameters for rating identification
 * @response 200:HelpfulVoteResponse:Successfully marked rating as helpful and incremented counter
 * @response 400:ErrorResponse:Invalid rating ID or user has already voted on this rating
 * @response 401:ErrorResponse:Authentication required to mark ratings as helpful
 * @response 500:ErrorResponse:Internal server error while processing helpful vote
 * @auth bearer
 * @rateLimit No additional rate limiting (relies on authentication requirements)
 * @example
 * // Request
 * POST /api/ratings/42/helpful
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
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const ratingId = parseInt(resolvedParams.id)

    if (isNaN(ratingId)) {
      return NextResponse.json(
        { error: 'Invalid rating ID' },
        { status: 400 }
      )
    }

    const hasVoted = await checkUserHelpfulVote(session.user.id, ratingId)
    if (hasVoted) {
      return NextResponse.json(
        { error: 'You have already marked this review as helpful' },
        { status: 400 }
      )
    }

    await addHelpfulVote(session.user.id, ratingId)
    await incrementRatingHelpful(ratingId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[! /api/ratings/[id]/helpful] Error incrementing helpful:', error)
    return NextResponse.json(
      { error: 'Failed to mark as helpful' },
      { status: 500 }
    )
  }
}