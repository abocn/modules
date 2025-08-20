import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { adminJobs } from '@/db/schema'
import { desc, eq, and } from 'drizzle-orm'
import { jobExecutionService } from '@/lib/job-execution-service'
import { logAdminAction } from '@/lib/audit-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const whereConditions = []
    if (status && status !== 'all') {
      whereConditions.push(eq(adminJobs.status, status))
    }
    if (type && type !== 'all') {
      whereConditions.push(eq(adminJobs.type, type))
    }

    const jobs = await db
      .select()
      .from(adminJobs)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(adminJobs.createdAt))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({ jobs })
  } catch (error) {
    console.error('[! /api/admin/jobs] Error fetching jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, name, description, parameters = {} } = body

    if (!type || !name) {
      return NextResponse.json({ error: 'Type and name are required' }, { status: 400 })
    }

    const [job] = await db
      .insert(adminJobs)
      .values({
        type,
        name,
        description,
        status: 'pending',
        progress: 0,
        startedBy: session.user.id,
        parameters,
        logs: []
      })
      .returning()

    await logAdminAction({
      adminId: session.user.id,
      action: "Job Started",
      details: `Started job "${name}" (${type})${parameters && Object.keys(parameters).length > 0 ? ` with parameters: ${JSON.stringify(parameters)}` : ''}`,
      targetType: "system",
      targetId: job.id.toString(),
      newValues: {
        type,
        name,
        description,
        parameters
      }
    })

    jobExecutionService.executeJob(job.id).catch(error => {
      console.error(`Failed to execute job ${job.id}:`, error)
    })

    return NextResponse.json({ job })
  } catch (error) {
    console.error('[! /api/admin/jobs] Error creating job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}