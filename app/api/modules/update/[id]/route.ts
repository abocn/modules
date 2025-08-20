import { NextResponse } from "next/server"
import { db } from "@/db"
import { modules } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { validateTurnstileToken, getClientIP } from "@/lib/turnstile"
import { auth } from "@/lib/auth"

/**
 * Update module
 * @description Update a module's information. Only the submitter can update their own unpublished modules.
 * @pathParams ModuleParams
 * @body UpdateModuleBody
 * @response 200:UpdateModuleResponse:Module updated successfully
 * @response 400:ErrorResponse:Invalid update data or captcha verification failed
 * @response 401:ErrorResponse:Authentication required
 * @response 403:ErrorResponse:Cannot edit published modules
 * @response 404:ErrorResponse:Module not found or no permission to edit
 * @response 500:ErrorResponse:Failed to update module
 * @auth bearer
 * @openapi
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth.api.getSession({
      headers: request.headers as Headers,
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    if (body.status === "pending" && body.turnstileToken) {
      const turnstileResult = await validateTurnstileToken(
        body.turnstileToken,
        { remoteip: getClientIP(request) }
      )

      if (!turnstileResult.success) {
        return NextResponse.json(
          {
            error: turnstileResult.error || 'Captcha verification failed',
            captchaError: true
          },
          { status: 400 }
        )
      }
    }

    const existingModule = await db
      .select()
      .from(modules)
      .where(
        and(
          eq(modules.id, id),
          eq(modules.submittedBy, session.user.id)
        )
      )
      .limit(1)

    if (existingModule.length === 0) {
      return NextResponse.json(
        { error: "Module not found or you don't have permission to edit it" },
        { status: 404 }
      )
    }

    if (existingModule[0].isPublished && !body.status) {
      return NextResponse.json(
        { error: "Cannot edit published modules" },
        { status: 403 }
      )
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.shortDescription !== undefined) updateData.shortDescription = body.shortDescription
    if (body.description !== undefined) updateData.description = body.description
    if (body.author !== undefined) updateData.author = body.author
    if (body.category !== undefined) updateData.category = body.category
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.license !== undefined) updateData.license = body.license
    if (body.isOpenSource !== undefined) updateData.isOpenSource = body.isOpenSource
    if (body.sourceUrl !== undefined) updateData.sourceUrl = body.sourceUrl
    if (body.communityUrl !== undefined) updateData.communityUrl = body.communityUrl
    if (body.features !== undefined) updateData.features = body.features
    if (body.compatibility !== undefined) updateData.compatibility = body.compatibility
    if (body.images !== undefined) updateData.images = body.images
    if (body.status !== undefined) updateData.status = body.status

    await db
      .update(modules)
      .set(updateData)
      .where(
        and(
          eq(modules.id, id),
          eq(modules.submittedBy, session.user.id)
        )
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating module:", error)
    return NextResponse.json(
      { error: "Failed to update module" },
      { status: 500 }
    )
  }
}