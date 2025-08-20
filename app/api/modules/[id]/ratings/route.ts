import { NextRequest, NextResponse } from 'next/server'
import { getModuleRatings, createRating, getUserRating } from '@/lib/db-utils'
import { validateTurnstileToken, getClientIP } from '@/lib/turnstile'
import { getAuthenticatedUser, requireScope } from '@/lib/unified-auth'

/**
 * Get module ratings
 * @description Retrieve all ratings and reviews for a specific module, including the authenticated user's own rating if available. Returns rating data with user information.
 * @tags Ratings
 * @pathParams ModuleParams - Path parameters for module identification
 * @response 200:RatingsListResponse:Successfully retrieved ratings with user information and own rating
 * @response 500:ErrorResponse:Internal server error while fetching ratings
 * @rateLimit No rate limit applied
 * @example
 * // Request
 * GET /api/modules/abc123/ratings
 *
 * // Response
 * {
 *   "ratings": [
 *     {
 *       "id": 1,
 *       "moduleId": "abc123",
 *       "userId": "user456",
 *       "rating": 5,
 *       "comment": "Excellent module, works perfectly!",
 *       "helpful": 12,
 *       "createdAt": "2024-01-15T10:30:00Z",
 *       "userName": "ExampleUser",
 *       "userImage": "https://example.com/avatar.png"
 *     }
 *   ],
 *   "userRating": null
 * }
 * @openapi
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const ratings = await getModuleRatings(resolvedParams.id)

    const { user } = await getAuthenticatedUser(request)
    let userRating = null
    if (user) {
      userRating = await getUserRating(resolvedParams.id, user.id)
    }

    return NextResponse.json({ ratings, userRating })
  } catch (error) {
    console.error('[! /api/modules/[id]/ratings] Error fetching ratings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ratings' },
      { status: 500 }
    )
  }
}

/**
 * Submit a rating
 * @description Submit a rating and optional review comment for a module. Includes spam protection via Turnstile captcha and validation. Users can only rate each module once.
 * @tags Ratings
 * @pathParams ModuleParams - Path parameters for module identification
 * @body CreateRatingBody - Rating data with captcha verification
 * @response 201:CreateRatingResponse:Rating submitted successfully with full rating data
 * @response 400:ValidationErrorResponse:Invalid rating value, comment too long, or captcha verification failed
 * @response 401:ErrorResponse:Authentication required to submit ratings
 * @response 500:ErrorResponse:Internal server error while creating rating
 * @auth bearer
 * @rateLimit Protected by Turnstile captcha, none
 * @example
 * // Request
 * POST /api/modules/abc123/ratings
 * {
 *   "rating": 5,
 *   "comment": "Excellent module! Works perfectly on Android 14 with Magisk. Highly recommended for security-conscious users.",
 *   "turnstileToken": "0.ABC123..."
 * }
 *
 * // Response
 * {
 *   "rating": {
 *     "id": 42,
 *     "moduleId": "abc123",
 *     "userId": "user456",
 *     "rating": 5,
 *     "comment": "Excellent module! Works perfectly...",
 *     "helpful": 0,
 *     "createdAt": "2024-01-15T10:30:00Z",
 *     "userName": "ExampleUser",
 *     "userImage": "https://example.com/avatar.png"
 *   }
 * }
 * @openapi
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { user, error } = await getAuthenticatedUser(request)

    if (error || !user) {
      return NextResponse.json(
        { error: error || 'Authentication required' },
        { status: 401 }
      )
    }

    requireScope(user, "write")

    const body = await request.json()
    const { rating, comment, turnstileToken } = body

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

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    if (comment && typeof comment !== 'string') {
      return NextResponse.json(
        { error: 'Comment must be a string' },
        { status: 400 }
      )
    }

    if (comment && comment.length > 1000) {
      return NextResponse.json(
        { error: 'Comment must be 1000 characters or less' },
        { status: 400 }
      )
    }

    if (comment && comment.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment cannot be empty or only whitespace' },
        { status: 400 }
      )
    }

    const newRating = await createRating({
      moduleId: resolvedParams.id,
      userId: user.id,
      rating,
      comment,
    })

    return NextResponse.json({ rating: newRating }, { status: 201 })
  } catch (error) {
    console.error('[! /api/modules/[id]/ratings] Error creating rating:', error)
    return NextResponse.json(
      { error: 'Failed to create rating' },
      { status: 500 }
    )
  }
}