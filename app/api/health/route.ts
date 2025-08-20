import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { adminJobs } from '@/db/schema'
import { desc, eq, and, gte } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { isUserAdmin } from '@/lib/admin-utils'

/**
 * Health check
 * @description Monitor application and scheduler health status. Requires admin role.
 * @tags System, Health
 * @response 200:HealthCheckResponse:Application is healthy
 * @response 401:ErrorResponse:Authentication required
 * @response 403:ErrorResponse:Admin access required
 * @response 503:ErrorResponse:Service unhealthy
 * @auth bearer
 * @openapi
 *   - Overall status (healthy/unhealthy)
 *   - Timestamp
 *   - Scheduler configuration and activity
 *   - Database connectivity
 *   - Recent system job count
 *
 * @example Response
 * {
 *   "status": "healthy",
 *   "timestamp": "2024-01-01T00:00:00.000Z",
 *   "scheduler": {
 *     "enabled": true,
 *     "active": true,
 *     "syncInterval": 6,
 *     "recentSystemJobs": 2
 *   },
 *   "database": "connected"
 * }
 */
export async function GET(request: NextRequest) {
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

    if (!(await isUserAdmin(session.user.id))) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    const recentJobs = await db
      .select()
      .from(adminJobs)
      .where(
        and(
          gte(adminJobs.createdAt, oneHourAgo),
          eq(adminJobs.startedBy, 'SYSTEM')
        )
      )
      .orderBy(desc(adminJobs.createdAt))
      .limit(5)

    const schedulerActive = recentJobs.some(job =>
      job.name === 'Automatic GitHub Scrape' ||
      job.name === 'Automatic GitHub Config Sync'
    )

    const health = {
      status: 'healthy',
      timestamp: now.toISOString(),
      scheduler: {
        enabled: process.env.RELEASE_SCHEDULE_ENABLED === 'true',
        active: schedulerActive,
        syncInterval: parseInt(process.env.DEFAULT_SYNC_INTERVAL_HOURS || '6'),
        recentSystemJobs: recentJobs.length
      },
      database: 'connected'
    }

    return NextResponse.json(health)
  } catch (error) {
    console.error('[! /api/health] Health check failed:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        database: 'disconnected'
      },
      { status: 500 }
    )
  }
}