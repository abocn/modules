import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { adminJobs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logAdminAction } from '@/lib/audit-utils'

export async function POST(
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

    const { id } = await params
    const jobId = parseInt(id)
    if (isNaN(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 })
    }

    const [job] = await db
      .select()
      .from(adminJobs)
      .where(eq(adminJobs.id, jobId))

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status !== 'pending' && job.status !== 'running') {
      return NextResponse.json({ error: 'Job cannot be cancelled' }, { status: 400 })
    }

    const now = new Date()
    const [updatedJob] = await db
      .update(adminJobs)
      .set({ 
        status: 'cancelled',
        completedAt: now,
        duration: job.startedAt ? Math.floor((now.getTime() - new Date(job.startedAt).getTime()) / 1000) : 0,
        logs: [
          ...(job.logs || []),
          {
            timestamp: now.toISOString(),
            level: 'info' as const,
            message: `Job cancelled by ${session.user.name || session.user.email}`
          }
        ]
      })
      .where(eq(adminJobs.id, jobId))
      .returning()

    await logAdminAction({
      adminId: session.user.id,
      action: "Job Cancelled",
      details: `Cancelled job "${job.name}" (${job.type})`,
      targetType: "system",
      targetId: jobId.toString(),
      oldValues: {
        status: job.status,
        type: job.type,
        name: job.name,
        progress: job.progress
      },
      newValues: {
        status: 'cancelled',
        completedAt: now.toISOString(),
        duration: updatedJob.duration
      }
    })

    return NextResponse.json({ job: updatedJob })
  } catch (error) {
    console.error('[! /api/admin/jobs/[id]/cancel] Error cancelling job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}