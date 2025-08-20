import { NextResponse } from "next/server"
import { db } from "@/db"
import { apiKeys, adminActions, user as userTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { withAdminAuth } from "@/lib/middleware/admin-auth"
import { withErrorHandling } from "@/lib/middleware/error-handler"

/**
 * Get API key details
 * @description Retrieve detailed information about a specific API key including user information. Requires admin authentication.
 * @tags Admin - API Keys
 * @params id:string:required:The unique identifier of the API key
 * @response 200:ApiKeyDetailsResponse:Successfully retrieved API key details
 * @response 400:ErrorResponse:API key ID is required
 * @response 403:ErrorResponse:User lacks admin privileges
 * @response 404:ErrorResponse:API key not found
 * @response 500:ErrorResponse:Internal server error
 * @auth session (required - admin role)
 * @example
 * // Response
 * {
 *   "key": {
 *     "id": "key_abc123",
 *     "name": "Production API Key",
 *     "keyPrefix": "pk_live_",
 *     "scopes": ["read", "write"],
 *     "lastUsedAt": "2024-01-15T10:30:00Z",
 *     "lastUsedIp": "192.168.1.1",
 *     "expiresAt": "2025-01-15T00:00:00Z",
 *     "revokedAt": null,
 *     "createdAt": "2024-01-01T00:00:00Z",
 *     "userId": "user_123",
 *     "userName": "John Doe",
 *     "userEmail": "john@example.com"
 *   }
 * }
 * @openapi
 */
export const GET = withErrorHandling(withAdminAuth(async (_request, context) => {
  const { id } = await context.params as { id: string }

  if (!id) {
    return NextResponse.json(
      { error: "API key ID is required" },
      { status: 400 }
    )
  }

  try {
    const keyDetails = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        scopes: apiKeys.scopes,
        lastUsedAt: apiKeys.lastUsedAt,
        lastUsedIp: apiKeys.lastUsedIp,
        expiresAt: apiKeys.expiresAt,
        revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt,
        userId: apiKeys.userId,
        userName: userTable.name,
        userEmail: userTable.email,
      })
      .from(apiKeys)
      .leftJoin(userTable, eq(apiKeys.userId, userTable.id))
      .where(eq(apiKeys.id, id))
      .limit(1)

    if (!keyDetails.length) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ key: keyDetails[0] })
  } catch (error) {
    console.error("Failed to fetch API key details:", error)
    return NextResponse.json(
      { error: "Failed to fetch API key details" },
      { status: 500 }
    )
  }
}))

/**
 * Revoke an API key
 * @description Permanently revoke an API key, preventing any further use. This action cannot be undone. Requires admin authentication.
 * @tags Admin - API Keys
 * @params id:string:required:The unique identifier of the API key to revoke
 * @response 200:ApiKeyRevokeResponse:API key successfully revoked
 * @response 400:ErrorResponse:API key ID is required
 * @response 403:ErrorResponse:User lacks admin privileges
 * @response 404:ErrorResponse:API key not found
 * @response 500:ErrorResponse:Internal server error while revoking key
 * @auth session (required - admin role)
 * @audit Creates an admin action log entry for the revocation
 * @example
 * // Response
 * {
 *   "message": "API key revoked successfully",
 *   "revokedKey": {
 *     "id": "key_abc123",
 *     "name": "Production API Key",
 *     "keyPrefix": "pk_live_"
 *   }
 * }
 * @openapi
 */
export const DELETE = withErrorHandling(withAdminAuth(async (_request, context, user) => {
  const { id } = await context.params as { id: string }
  
  if (!id) {
    return NextResponse.json(
      { error: "API key ID is required" },
      { status: 400 }
    )
  }

  try {
    const key = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        userId: apiKeys.userId,
        keyPrefix: apiKeys.keyPrefix,
      })
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
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
        revokedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id))

    await db.insert(adminActions).values({
      adminId: user.id,
      action: "revoke_api_key",
      details: `Revoked API key "${key[0].name}" (${key[0].keyPrefix}...) for user ${key[0].userId}`,
      targetType: "api_key",
      targetId: id,
      oldValues: { status: "active" },
      newValues: { status: "revoked" },
    })

    return NextResponse.json({
      message: "API key revoked successfully",
      revokedKey: {
        id: key[0].id,
        name: key[0].name,
        keyPrefix: key[0].keyPrefix,
      }
    })
  } catch (error) {
    console.error("Failed to revoke API key:", error)
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 }
    )
  }
}))