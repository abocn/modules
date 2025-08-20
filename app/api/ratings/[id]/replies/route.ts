import { NextRequest, NextResponse } from 'next/server'
import { getRatingReplies, createReply } from '@/lib/db-utils'
import { validateTurnstileToken, getClientIP } from '@/lib/turnstile'
import { auth } from '@/lib/auth'

/**
 * Get rating replies
 * @description Get all replies for a specific rating/review
 * @pathParams RatingParams
 * @response 200:RepliesListResponse:List of replies for the rating
 * @response 400:ErrorResponse:Invalid rating ID
 * @response 500:ErrorResponse:Failed to fetch replies
 * @openapi
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const ratingId = parseInt(resolvedParams.id, 10)

    if (isNaN(ratingId)) {
      return NextResponse.json(
        { error: 'Invalid rating ID' },
        { status: 400 }
      )
    }

    const replies = await getRatingReplies(ratingId)
    return NextResponse.json({ replies })
  } catch (error) {
    console.error('[! /api/ratings/[id]/replies] Error fetching replies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch replies' },
      { status: 500 }
    )
  }
}

/**
 * Post reply to rating
 * @description Post a reply to a rating/review. Requires authentication.
 * @pathParams RatingParams
 * @body CreateReplyBody
 * @response 201:CreateReplyResponse:Reply created successfully
 * @response 400:ErrorResponse:Invalid data or captcha verification failed
 * @response 401:ErrorResponse:Authentication required
 * @response 500:ErrorResponse:Failed to create reply
 * @auth bearer
 * @openapi
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const ratingId = parseInt(resolvedParams.id, 10)

    if (isNaN(ratingId)) {
      return NextResponse.json(
        { error: 'Invalid rating ID' },
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

    const body = await request.json()
    const { comment, turnstileToken } = body

    const turnstileResult = await validateTurnstileToken(
      turnstileToken,
      { remoteip: getClientIP(request) }
    )

    if (!turnstileResult.success) {
      return NextResponse.json(
        {
          error: turnstileResult.error || 'Captcha verification failed',
          captchaError: true
        },
        { status: 400 }
      )
    }

    if (!comment || typeof comment !== 'string') {
      return NextResponse.json(
        { error: 'Comment is required and must be a string' },
        { status: 400 }
      )
    }

    if (comment.length > 1000) {
      return NextResponse.json(
        { error: 'Comment must be 1000 characters or less' },
        { status: 400 }
      )
    }

    if (comment.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment cannot be empty or only whitespace' },
        { status: 400 }
      )
    }

    const newReply = await createReply({
      ratingId,
      userId: session.user.id,
      comment,
    })

    return NextResponse.json({ reply: newReply }, { status: 201 })
  } catch (error) {
    console.error('[! /api/ratings/[id]/replies] Error creating reply:', error)
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    )
  }
}