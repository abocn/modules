import { NextRequest, NextResponse } from 'next/server'
import { incrementReplyHelpful, checkUserHelpfulVote, addHelpfulVote } from '@/lib/db-utils'
import { auth } from '@/lib/auth'

/**
 * Mark reply as helpful
 * @description Mark a reply to a rating as helpful to highlight valuable community responses. Each user can only vote once per reply.
 * @tags Helpful Votes
 * @pathParams ReplyParams - Path parameters for reply identification
 * @response 200:HelpfulVoteResponse:Successfully marked reply as helpful and incremented counter
 * @response 400:ErrorResponse:Invalid reply ID or user has already voted on this reply
 * @response 401:ErrorResponse:Authentication required to mark replies as helpful
 * @response 500:ErrorResponse:Internal server error while processing helpful vote
 * @auth bearer
 * @rateLimit No additional rate limiting (relies on authentication requirements)
 * @example
 * // Request
 * POST /api/replies/15/helpful
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
    const resolvedParams = await params
    const replyId = parseInt(resolvedParams.id, 10)

    if (isNaN(replyId)) {
      return NextResponse.json(
        { error: 'Invalid reply ID' },
        { status: 400 }
      )
    }

    const session = await auth.api.getSession({
      headers: request.headers
    })
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const hasVoted = await checkUserHelpfulVote(session.user.id, undefined, replyId)
    if (hasVoted) {
      return NextResponse.json(
        { error: 'You have already marked this reply as helpful' },
        { status: 400 }
      )
    }

    await addHelpfulVote(session.user.id, undefined, replyId)
    await incrementReplyHelpful(replyId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[! /api/replies/[id]/helpful] Error marking reply as helpful:', error)
    return NextResponse.json(
      { error: 'Failed to mark reply as helpful' },
      { status: 500 }
    )
  }
}