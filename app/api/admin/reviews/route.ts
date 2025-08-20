import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { getAllReviewsForAdmin, getReviewsWithAdvancedFilters, getReviewStats } from '@/lib/db-utils'

/**
 * Get all reviews (admin)
 * @description Get all module reviews with advanced filtering. Requires admin role.
 * @tags Admin, Reviews
 * @params AdminReviewsQueryParams - Query parameters for filtering reviews
 * @response 200:AdminReviewsResponse:Successfully retrieved reviews
 * @response 401:ErrorResponse:Unauthorized - admin access required
 * @response 500:ErrorResponse:Internal server error
 * @auth bearer
 * @openapi
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const ratingFilter = searchParams.get('rating') || 'all'
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const minHelpful = searchParams.get('minHelpful') ? parseInt(searchParams.get('minHelpful')!) : undefined
    const moduleFilter = searchParams.get('module') || 'all'

    let reviews
    if (query.trim() || ratingFilter !== 'all' || dateFrom || dateTo || 
        minHelpful !== undefined || moduleFilter !== 'all') {
      reviews = await getReviewsWithAdvancedFilters({
        query,
        ratingFilter,
        dateFrom,
        dateTo,
        minHelpful,
        moduleFilter
      })
    } else {
      reviews = await getAllReviewsForAdmin()
    }

    const stats = await getReviewStats()

    return NextResponse.json({ reviews, stats })
  } catch (error) {
    console.error('[! /api/admin/reviews] Error fetching reviews:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}