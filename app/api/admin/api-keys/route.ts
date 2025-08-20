import { NextResponse, type NextRequest } from "next/server"
import { db } from "@/db"
import { apiKeys, user as userTable } from "@/db/schema"
import { desc, sql, eq } from "drizzle-orm"
import { withAuth } from "@/lib/api-wrapper"

/**
 * List all API keys
 * @description Get a list of all API keys across all users with usage statistics. Requires admin authentication.
 * @tags Admin - API Keys
 * @response 200:ApiKeysListResponse:Successfully retrieved API keys and statistics
 * @response 403:ErrorResponse:User lacks admin privileges
 * @response 500:ErrorResponse:Internal server error while fetching API keys
 * @auth session (required - admin role)
 * @example
 * // Response
 * {
 *   "keys": [
 *     {
 *       "id": "key_abc123",
 *       "name": "Production API Key",
 *       "keyPrefix": "pk_live_",
 *       "scopes": ["read", "write"],
 *       "lastUsedAt": "2024-01-15T10:30:00Z",
 *       "lastUsedIp": "192.168.1.1",
 *       "expiresAt": "2025-01-15T00:00:00Z",
 *       "revokedAt": null,
 *       "createdAt": "2024-01-01T00:00:00Z",
 *       "userId": "user_123",
 *       "userName": "John Doe",
 *       "userEmail": "john@example.com"
 *     }
 *   ],
 *   "stats": {
 *     "totalKeys": 150,
 *     "activeKeys": 120,
 *     "revokedKeys": 20,
 *     "expiredKeys": 10,
 *     "recentlyUsed": 45
 *   }
 * }
 * @openapi
 */
const _wrappedGet = withAuth(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_request, _context) => {
    try {
      const keysWithUsers = await db
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
        .orderBy(desc(apiKeys.createdAt))

      const stats = await db
        .select({
          totalKeys: sql<number>`count(*)`,
          activeKeys: sql<number>`count(*) filter (where ${apiKeys.revokedAt} is null)`,
          revokedKeys: sql<number>`count(*) filter (where ${apiKeys.revokedAt} is not null)`,
          expiredKeys: sql<number>`count(*) filter (where ${apiKeys.expiresAt} < now() and ${apiKeys.revokedAt} is null)`,
          recentlyUsed: sql<number>`count(*) filter (where ${apiKeys.lastUsedAt} > now() - interval '7 days')`,
        })
        .from(apiKeys)

      return NextResponse.json({
        keys: keysWithUsers,
        stats: stats[0] || {
          totalKeys: 0,
          activeKeys: 0,
          revokedKeys: 0,
          expiredKeys: 0,
          recentlyUsed: 0,
        }
      })
    } catch (error) {
      console.error("Failed to fetch API keys:", error)
      return NextResponse.json(
        { error: "Failed to fetch API keys" },
        { status: 500 }
      )
    }
  },
  { requireAdmin: true }
)

export async function GET(request: NextRequest) {
  return _wrappedGet(request, {})
}