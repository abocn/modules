import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { ratings, user, modules } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logReviewDeletion } from '@/lib/audit-utils'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const reviewId = parseInt(resolvedParams.id)
    if (isNaN(reviewId)) {
      return NextResponse.json({ error: 'Invalid review ID' }, { status: 400 })
    }

    const reviewData = await db
      .select({
        id: ratings.id,
        rating: ratings.rating,
        comment: ratings.comment,
        userId: ratings.userId,
        moduleId: ratings.moduleId,
        userName: user.name,
        moduleName: modules.name,
      })
      .from(ratings)
      .leftJoin(user, eq(ratings.userId, user.id))
      .leftJoin(modules, eq(ratings.moduleId, modules.id))
      .where(eq(ratings.id, reviewId))
      .limit(1)

    if (reviewData.length === 0) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    const review = reviewData[0]

    await logReviewDeletion(session.user.id, reviewId, {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      userName: review.userName,
      moduleName: review.moduleName,
      userId: review.userId,
      moduleId: review.moduleId,
    })

    await db.delete(ratings).where(eq(ratings.id, reviewId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[! /api/admin/reviews/[id]] Error deleting review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}