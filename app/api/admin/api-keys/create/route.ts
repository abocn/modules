import { NextResponse, type NextRequest } from "next/server"
import { db } from "@/db"
import { apiKeys, adminActions } from "@/db/schema"
import { withAuth } from "@/lib/api-wrapper"
import { randomBytes, createHash } from "crypto"

/**
 * Create API key for a user
 * @description Create a new API key for a specific user. Only admins can create API keys on behalf of users. The actual key is returned only once during creation.
 * @tags Admin - API Keys
 * @body CreateApiKeyRequest:required:API key creation parameters
 * @response 201:CreateApiKeyResponse:API key successfully created
 * @response 400:ErrorResponse:Invalid request parameters
 * @response 403:ErrorResponse:User lacks admin privileges
 * @response 500:ErrorResponse:Internal server error while creating key
 * @auth session (required - admin role)
 * @audit Creates an admin action log entry for the API key creation
 * @security The actual API key is only returned once during creation and cannot be retrieved later
 * @example
 * // Request Body
 * {
 *   "userId": "user_123",
 *   "name": "Production API Key",
 *   "scopes": ["read", "write"],
 *   "expiresAt": "2025-01-15T00:00:00Z"
 * }
 *
 * // Response
 * {
 *   "message": "API key created successfully",
 *   "apiKey": {
 *     "id": "key_abc123",
 *     "key": "pk_live_1234567890abcdef", // Only returned once!
 *     "name": "Production API Key",
 *     "keyPrefix": "pk_live_",
 *     "scopes": ["read", "write"],
 *     "expiresAt": "2025-01-15T00:00:00Z"
 *   }
 * }
 * @openapi
 */
const _wrappedPost = withAuth(
  async (request, context) => {
    const { user } = context
    try {
      const body = await request.json()
      const { userId, name, scopes = ["read"], expiresAt } = body

      if (!userId || !name) {
        return NextResponse.json(
          { error: "User ID and name are required" },
          { status: 400 }
        )
      }

      const validScopes = ["read", "write", "admin"]
      const invalidScopes = scopes.filter((scope: string) => !validScopes.includes(scope))
      if (invalidScopes.length > 0) {
        return NextResponse.json(
          { error: `Invalid scopes: ${invalidScopes.join(", ")}` },
          { status: 400 }
        )
      }

      const keyPrefix = "mk_"
      const randomKey = randomBytes(32).toString("hex")
      const fullKey = `${keyPrefix}${randomKey}`
      const keyHash = createHash("sha256").update(fullKey).digest("hex")

      const keyId = `key_${randomBytes(12).toString("hex")}`

      await db.insert(apiKeys).values({
        id: keyId,
        userId,
        name,
        keyHash,
        keyPrefix: fullKey.substring(0, 12),
        scopes,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await db.insert(adminActions).values({
        adminId: user.id,
        action: "create_api_key",
        details: `Created API key "${name}" for user ${userId} with scopes: ${scopes.join(", ")}`,
        targetType: "api_key",
        targetId: keyId,
        newValues: { name, scopes, userId },
      })

      return NextResponse.json(
        {
          message: "API key created successfully",
          apiKey: {
            id: keyId,
            key: fullKey,
            name,
            keyPrefix: fullKey.substring(0, 12),
            scopes,
            expiresAt: expiresAt || null,
          }
        },
        { status: 201 }
      )
    } catch (error) {
      console.error("Failed to create API key:", error)
      return NextResponse.json(
        { error: "Failed to create API key" },
        { status: 500 }
      )
    }
  },
  { requireAdmin: true }
)

export async function POST(request: NextRequest) {
  return _wrappedPost(request, {})
}