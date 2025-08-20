import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { apiKeys } from "@/db/schema"
import { eq, and, isNull } from "drizzle-orm"

/**
 * Revoke API key
 * @description Revoke/delete a specific API key for the authenticated user
 * @pathParams ApiKeyParams
 * @response 200:RevokeApiKeyResponse:API key revoked successfully
 * @response 401:ErrorResponse:Authentication required
 * @response 404:ErrorResponse:API key not found
 * @response 500:ErrorResponse:Failed to revoke API key
 * @auth bearer
 * @openapi
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const key = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.id, id),
          eq(apiKeys.userId, session.user.id),
          isNull(apiKeys.revokedAt)
        )
      )
      .limit(1)

    if (!key.length) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      )
    }

    await db
      .update(apiKeys)
      .set({
        revokedAt: new Date(),
        revokedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id))

    return NextResponse.json({ message: "API key revoked successfully" })
  } catch (error) {
    console.error("Failed to revoke API key:", error)
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 }
    )
  }
}