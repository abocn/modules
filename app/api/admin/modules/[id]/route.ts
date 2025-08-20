import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { modules } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { isUserAdmin } from '@/lib/admin-utils'
import { logModuleDeletion, logModuleEdit, compareModuleData } from '@/lib/audit-utils'

/**
 * Delete a module (admin)
 * @description Permanently delete a module and all associated data. Requires admin role.
 * @tags Admin, Modules
 * @params ModuleIdParam - Module ID in path
 * @response 200:SuccessResponse:Module deleted successfully
 * @response 401:ErrorResponse:Authentication required
 * @response 403:ErrorResponse:Admin access required
 * @response 404:ErrorResponse:Module not found
 * @response 500:ErrorResponse:Internal server error
 * @auth bearer
 * @openapi
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const existingModule = await db
      .select()
      .from(modules)
      .where(eq(modules.id, id))
      .limit(1)

    if (existingModule.length === 0) {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      )
    }

    await logModuleDeletion(
      session.user.id,
      id,
      existingModule[0].name,
      existingModule[0] as Record<string, unknown>
    )

    // will cascade to ratings and releases
    await db.delete(modules).where(eq(modules.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[! /api/admin/modules/[id]] Error deleting module:', error)
    return NextResponse.json(
      { error: 'Failed to delete module' },
      { status: 500 }
    )
  }
}

/**
 * Update module flags (admin)
 * @description Update module featured, recommended status and warnings. Requires admin role.
 * @tags Admin, Modules
 * @params ModuleIdParam - Module ID in path
 * @body ModuleFlagsUpdateRequest - Module flags to update
 * @response 200:ModuleUpdateResponse:Module updated successfully
 * @response 400:ErrorResponse:Invalid request body
 * @response 401:ErrorResponse:Authentication required
 * @response 403:ErrorResponse:Admin access required
 * @response 404:ErrorResponse:Module not found
 * @response 500:ErrorResponse:Internal server error
 * @auth bearer
 * @openapi
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const body = await request.json()
    const { isFeatured, isRecommended, warnings } = body

    if (isFeatured !== undefined && typeof isFeatured !== 'boolean') {
      return NextResponse.json(
        { error: 'isFeatured must be a boolean' },
        { status: 400 }
      )
    }

    if (isRecommended !== undefined && typeof isRecommended !== 'boolean') {
      return NextResponse.json(
        { error: 'isRecommended must be a boolean' },
        { status: 400 }
      )
    }

    if (warnings !== undefined) {
      if (!Array.isArray(warnings)) {
        return NextResponse.json(
          { error: 'warnings must be an array' },
          { status: 400 }
        )
      }

      for (const warning of warnings) {
        if (!warning.type || !warning.message) {
          return NextResponse.json(
            { error: 'Each warning must have type and message' },
            { status: 400 }
          )
        }

        if (!['malware', 'closed-source', 'stolen-code'].includes(warning.type)) {
          return NextResponse.json(
            { error: 'Invalid warning type' },
            { status: 400 }
          )
        }
      }
    }

    const { id } = await params
    const existingModule = await db
      .select()
      .from(modules)
      .where(eq(modules.id, id))
      .limit(1)

    if (existingModule.length === 0) {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    }

    if (isFeatured !== undefined) {
      updateData.isFeatured = isFeatured
    }

    if (isRecommended !== undefined) {
      updateData.isRecommended = isRecommended
    }

    if (warnings !== undefined) {
      updateData.warnings = warnings
    }

    const [updatedModule] = await db
      .update(modules)
      .set(updateData)
      .where(eq(modules.id, id))
      .returning()

    const changeInfo = compareModuleData(
      existingModule[0] as Record<string, unknown>,
      { ...existingModule[0], ...updateData } as Record<string, unknown>
    )

    if (changeInfo) {
      await logModuleEdit(session.user.id, changeInfo)
    }

    return NextResponse.json({ module: updatedModule })
  } catch (error) {
    console.error('[! /api/admin/modules/[id]] Error updating module:', error)
    return NextResponse.json(
      { error: 'Failed to update module' },
      { status: 500 }
    )
  }
}