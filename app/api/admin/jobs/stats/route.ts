import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { adminJobs } from '@/db/schema'
import { eq, count } from 'drizzle-orm'

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(adminJobs)
    const [pendingResult] = await db
      .select({ count: count() })
      .from(adminJobs)
      .where(eq(adminJobs.status, 'pending'))
    const [runningResult] = await db
      .select({ count: count() })
      .from(adminJobs)
      .where(eq(adminJobs.status, 'running'))
    const [completedResult] = await db
      .select({ count: count() })
      .from(adminJobs)
      .where(eq(adminJobs.status, 'completed'))
    const [failedResult] = await db
      .select({ count: count() })
      .from(adminJobs)
      .where(eq(adminJobs.status, 'failed'))

    const stats = {
      total: totalResult.count,
      pending: pendingResult.count,
      running: runningResult.count,
      completed: completedResult.count,
      failed: failedResult.count
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('[! /api/admin/jobs/stats] Error fetching job stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}