import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { modules, moduleGithubSync } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { isUserAdmin } from '@/lib/admin-utils'
import { logModuleEdit, compareModuleData } from '@/lib/audit-utils'
import { moduleSubmissionSchema } from '@/lib/validations/module'
import { getModuleGithubSync, createModuleGithubSync } from '@/lib/db-utils'
import * as z from 'zod'

function extractGithubRepo(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null
  try {
    const url = new URL(sourceUrl)
    if (url.hostname !== 'github.com') return null

    const pathParts = url.pathname.split('/').filter(part => part.length > 0)
    if (pathParts.length < 2) return null

    return `${pathParts[0]}/${pathParts[1]}`
  } catch {
    return null
  }
}

/**
 * Edit module details (admin)
 * @description Edit complete module information including metadata and sync settings. Requires admin role.
 * @tags Admin, Modules
 * @params ModuleIdParam - Module ID in path
 * @body ModuleEditRequest - Complete module details to update
 * @response 200:ModuleEditResponse:Module updated successfully
 * @response 400:ErrorResponse:Validation failed
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
  const { id } = await params
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

    const editModuleSchema = moduleSubmissionSchema.partial().extend({
      isFeatured: z.boolean().optional(),
      isRecommended: z.boolean().optional(),
    })

    const parsed = editModuleSchema.safeParse(body)
    if (!parsed.success) {
      const errors = parsed.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
      console.error('[Edit Module Validation Error]:', errors)
      return NextResponse.json(
        {
          error: 'Validation failed. Please check your input.',
          errors,
          message: errors[0]?.message || 'Validation failed. Please check your input.'
        },
        { status: 400 }
      )
    }

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

    const validatedData = parsed.data
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.shortDescription !== undefined) updateData.shortDescription = validatedData.shortDescription
    if (validatedData.author !== undefined) updateData.author = validatedData.author
    if (validatedData.category !== undefined) updateData.category = validatedData.category
    if (validatedData.license !== undefined) updateData.license = validatedData.license
    if (validatedData.isOpenSource !== undefined) updateData.isOpenSource = validatedData.isOpenSource
    if (validatedData.sourceUrl !== undefined) updateData.sourceUrl = validatedData.sourceUrl
    if (validatedData.communityUrl !== undefined) updateData.communityUrl = validatedData.communityUrl
    if (validatedData.features !== undefined) updateData.features = validatedData.features
    if (validatedData.compatibility !== undefined) updateData.compatibility = validatedData.compatibility
    if (validatedData.icon !== undefined) updateData.icon = validatedData.icon
    if (validatedData.images !== undefined) updateData.images = validatedData.images
    if (validatedData.isFeatured !== undefined) updateData.isFeatured = validatedData.isFeatured
    if (validatedData.isRecommended !== undefined) updateData.isRecommended = validatedData.isRecommended

    const [updatedModule] = await db
      .update(modules)
      .set(updateData)
      .where(eq(modules.id, id))
      .returning()

    const existingModuleData = existingModule[0]
    const sourceUrlChanged = 'sourceUrl' in updateData && updateData.sourceUrl !== existingModuleData.sourceUrl

    if (updatedModule.isPublished && sourceUrlChanged) {
      const oldGithubRepo = extractGithubRepo(existingModuleData.sourceUrl)
      const newGithubRepo = extractGithubRepo(updateData.sourceUrl as string)
      const existingSync = await getModuleGithubSync(id)

      if (newGithubRepo) {
        if (!existingSync) {
          await createModuleGithubSync({
            moduleId: id,
            githubRepo: newGithubRepo,
            enabled: true
          })
        } else if (existingSync.githubRepo !== newGithubRepo) {
          await db
            .update(moduleGithubSync)
            .set({
              githubRepo: newGithubRepo,
              enabled: true,
              updatedAt: new Date()
            })
            .where(eq(moduleGithubSync.moduleId, id))
        } else if (!existingSync.enabled) {
          await db
            .update(moduleGithubSync)
            .set({ enabled: true, updatedAt: new Date() })
            .where(eq(moduleGithubSync.moduleId, id))
        }
      } else if (oldGithubRepo && !newGithubRepo) {
        // GitHub repo was removed, disable sync
        if (existingSync && existingSync.enabled) {
          await db
            .update(moduleGithubSync)
            .set({ enabled: false, updatedAt: new Date() })
            .where(eq(moduleGithubSync.moduleId, id))
        }
      }
    }

    const changeInfo = compareModuleData(
      existingModule[0] as Record<string, unknown>,
      { ...existingModule[0], ...updateData } as Record<string, unknown>
    )

    if (changeInfo) {
      await logModuleEdit(session.user.id, changeInfo)
    }

    return NextResponse.json({
      success: true,
      module: updatedModule
    })
  } catch (error) {
    console.error('[! /api/admin/modules/[id]/edit] Error updating module:', error)

    const message = error instanceof Error && error.message.includes('duplicate')
      ? 'A module with this name may already exist.'
      : 'An error occurred while updating the module. Please try again.'

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}