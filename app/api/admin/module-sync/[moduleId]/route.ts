import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/db"
import { moduleGithubSync } from "@/db/schema"
import { eq } from "drizzle-orm"
import { logAdminAction } from "@/lib/audit-utils"

/**
 * PUT /api/admin/module-sync/[moduleId]
 *
 * Updates the GitHub sync configuration for a specific module.
 * Can enable/disable sync and update sync parameters.
 *
 * @requires Admin role
 *
 * @param {string} moduleId - The module ID to update
 *
 * @body {Object} Sync configuration update
 * @body {boolean} [data.enabled] - Whether to enable/disable sync for this module
 *
 * @returns {Object} The updated sync configuration
 * @returns {number} returns.id - Sync configuration ID
 * @returns {string} returns.moduleId - Module ID
 * @returns {boolean} returns.enabled - Updated enabled status
 *
 * @throws {401} If user is not authenticated or not an admin
 * @throws {404} If module sync configuration not found
 * @throws {500} If there's a database error
 */
export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { moduleId } = await params
    const data = await request.json()

    const [existingSync] = await db
      .select()
      .from(moduleGithubSync)
      .where(eq(moduleGithubSync.moduleId, moduleId))
      .limit(1)

    if (!existingSync) {
      return NextResponse.json(
        { error: "Module sync configuration not found" },
        { status: 404 }
      )
    }

    const [updatedSync] = await db
      .update(moduleGithubSync)
      .set({
        enabled: data.enabled,
        updatedAt: new Date()
      })
      .where(eq(moduleGithubSync.moduleId, moduleId))
      .returning()

    await logAdminAction({
      adminId: session.user.id,
      action: "Module Sync Updated",
      details: `Updated sync for module ${moduleId} - Enabled: ${data.enabled}`,
      targetType: "module",
      targetId: moduleId,
      oldValues: { enabled: existingSync.enabled },
      newValues: { enabled: data.enabled }
    })

    return NextResponse.json(updatedSync)
  } catch (error) {
    console.error("[! /api/admin/module-sync/[moduleId]] Error updating module sync:", error)
    return NextResponse.json(
      { error: "Failed to update module sync" },
      { status: 500 }
    )
  }
}