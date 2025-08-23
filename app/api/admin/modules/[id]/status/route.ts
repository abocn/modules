import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { modules, adminActions, moduleGithubSync, adminJobs } from "@/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { isUserAdmin } from "@/lib/admin-utils"
import { getModuleGithubSync, createModuleGithubSync } from "@/lib/db-utils"
import { jobExecutionService } from "@/lib/job-execution-service"
import { cache, CACHE_KEYS } from "@/lib/cache"

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
 * Update module status (admin)
 * @description Approve or reject a module submission. Requires admin role.
 * @tags Admin, Modules
 * @params ModuleIdParam - Module ID in path
 * @body ModuleStatusUpdateRequest - Status update details
 * @response 200:ModuleStatusResponse:Module status updated successfully
 * @response 400:ErrorResponse:Invalid status or missing reason for rejection
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
  const { id: moduleId } = await params
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!(await isUserAdmin(session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { isPublished, notes } = await request.json()

    const currentModule = await db
      .select()
      .from(modules)
      .where(eq(modules.id, moduleId))
      .limit(1)

    if (!currentModule.length) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    const existingWarnings = (currentModule[0].warnings as Array<{
      type: "malware" | "closed-source" | "stolen-code";
      message: string
    }>) || []

    const existingReviewNotes = (currentModule[0].reviewNotes as Array<{
      type: "approved" | "rejected" | "changes-requested";
      message: string;
      reviewedBy?: string;
      reviewedAt?: string;
    }>) || []

    let updatedReviewNotes = existingReviewNotes
    if (notes) {
      const reviewNote: {
        type: "approved" | "rejected";
        message: string;
        reviewedBy: string;
        reviewedAt: string;
      } = {
        type: isPublished ? "approved" : "rejected",
        message: notes,
        reviewedBy: session.user.name || session.user.email || 'Admin',
        reviewedAt: new Date().toISOString()
      }
      updatedReviewNotes = [...existingReviewNotes, reviewNote]
    }

    await db
      .update(modules)
      .set({
        isPublished,
        status: isPublished ? 'approved' : 'declined',
        warnings: existingWarnings,
        reviewNotes: updatedReviewNotes,
        updatedAt: new Date()
      })
      .where(eq(modules.id, moduleId))

    await cache.del(CACHE_KEYS.SITEMAP)
    console.log('[Sitemap Cache] Invalidated due to module status change')

    const moduleData = currentModule[0]
    const githubRepo = extractGithubRepo(moduleData.sourceUrl)

    if (githubRepo) {
      const existingSync = await getModuleGithubSync(moduleId)

      if (isPublished) {
        let shouldTriggerSync = false

        if (!existingSync) {
          await createModuleGithubSync({
            moduleId,
            githubRepo,
            enabled: true
          })
          shouldTriggerSync = true
        } else if (!existingSync.enabled || existingSync.githubRepo !== githubRepo) {
          await db
            .update(moduleGithubSync)
            .set({
              githubRepo,
              enabled: true,
              updatedAt: new Date()
            })
            .where(eq(moduleGithubSync.moduleId, moduleId))
          shouldTriggerSync = true
        }

        if (shouldTriggerSync) {
          try {
            const [job] = await db
              .insert(adminJobs)
              .values({
                type: "scrape_releases",
                name: `Auto Sync - Module Approved`,
                description: `Automatically triggered GitHub release sync for approved module ${moduleData.name}`,
                status: "pending",
                progress: 0,
                startedBy: session.user.id,
                parameters: {
                  moduleId,
                  scope: "single",
                  manual: false,
                  autoTriggered: true
                },
                logs: []
              })
              .returning()

            console.log(`[Status Update] Created sync job ${job.id} for approved module ${moduleId} from repo ${githubRepo}`)

            jobExecutionService.executeJob(job.id).catch(error => {
              console.error(`[Status Update] Failed to execute sync job ${job.id} for module ${moduleId}:`, error)
            })

          } catch (syncError) {
            console.error(`[Status Update] Failed to create sync job for module ${moduleId}:`, syncError)
          }
        }
      } else {
        if (existingSync && existingSync.enabled) {
          await db
            .update(moduleGithubSync)
            .set({ enabled: false, updatedAt: new Date() })
            .where(eq(moduleGithubSync.moduleId, moduleId))
        }
      }
    }

    await db.insert(adminActions).values({
      adminId: session.user.id,
      action: isPublished ? "Module Approved" : "Module Rejected",
      details: notes || (isPublished ? "Module approved for publication" : "Module rejected"),
      targetType: "module",
      targetId: moduleId,
    })

    return NextResponse.json({
      success: true,
      message: isPublished ? "Module approved" : "Module rejected"
    })
  } catch (error) {
    console.error("[! /admin/modules/[id]/status] Error updating module status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}