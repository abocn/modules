import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isUserAdmin } from '@/lib/admin-utils'
import { db } from '@/db'
import { modules } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

/**
 * Get pending modules (admin)
 * @description Get list of modules awaiting approval. Requires admin role.
 * @tags Admin, Modules
 * @params PendingModulesQueryParams - Query parameters for pagination
 * @response 200:PendingModulesResponse:Successfully retrieved pending modules
 * @response 401:ErrorResponse:Authentication required
 * @response 403:ErrorResponse:Admin access required
 * @response 500:ErrorResponse:Internal server error
 * @auth bearer
 * @openapi
 */
export async function GET(request: NextRequest) {
  try {
	const session = await auth.api.getSession({ headers: request.headers })
	if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	if (!(await isUserAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

	const { searchParams } = new URL(request.url)
	const limit = Number.parseInt(searchParams.get('limit') || '10')

	const rows = await db
	  .select({
		id: modules.id,
		name: modules.name,
		author: modules.author,
		category: modules.category,
		createdAt: modules.createdAt,
		description: modules.shortDescription,
	  })
	  .from(modules)
	  .where(eq(modules.status, 'pending'))
	  .orderBy(desc(modules.createdAt))
	  .limit(limit)

	const pending = rows.map(r => ({
	  ...r,
	  createdAt: r.createdAt.toISOString(),
	}))

	return NextResponse.json(pending)
  } catch (error) {
	console.error('[! /api/admin/modules/pending] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch pending modules' }, { status: 500 })
  }
}
