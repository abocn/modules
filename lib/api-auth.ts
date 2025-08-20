import { NextRequest } from "next/server"
import { db } from "@/db"
import { apiKeys, user } from "@/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { createHash } from "crypto"

export interface ApiKeyUser {
  id: string
  name: string
  email: string
  role: string
  scopes: string[]
}

export async function validateApiKey(
  request: NextRequest
): Promise<{ user: ApiKeyUser | null; error?: string }> {
  const authHeader = request.headers.get("authorization")
  const apiKeyHeader = request.headers.get("x-api-key")

  let apiKey: string | null = null

  if (authHeader?.startsWith("Bearer mk_")) {
    apiKey = authHeader.substring(7)
  } else if (apiKeyHeader?.startsWith("mk_")) {
    apiKey = apiKeyHeader
  }

  if (!apiKey) {
    return { user: null }
  }

  try {
    const keyHash = createHash("sha256").update(apiKey).digest("hex")

    const result = await db
      .select({
        keyId: apiKeys.id,
        keyUserId: apiKeys.userId,
        scopes: apiKeys.scopes,
        expiresAt: apiKeys.expiresAt,
        revokedAt: apiKeys.revokedAt,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
      })
      .from(apiKeys)
      .leftJoin(user, eq(apiKeys.userId, user.id))
      .where(
        and(
          eq(apiKeys.keyHash, keyHash),
          isNull(apiKeys.revokedAt)
        )
      )
      .limit(1)

    if (!result.length) {
      return { user: null, error: "Invalid API key" }
    }

    const keyData = result[0]

    if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
      return { user: null, error: "API key has expired" }
    }

    const clientIp = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown"

    await db
      .update(apiKeys)
      .set({
        lastUsedAt: new Date(),
        lastUsedIp: clientIp,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, keyData.keyId))

    return {
      user: {
        id: keyData.keyUserId,
        name: keyData.userName || "",
        email: keyData.userEmail || "",
        role: keyData.userRole || "user",
        scopes: keyData.scopes as string[],
      }
    }
  } catch (error) {
    console.error("API key validation error:", error)
    return { user: null, error: "Failed to validate API key" }
  }
}

export function hasRequiredScope(
  userScopes: string[],
  requiredScope: "read" | "write"
): boolean {
  if (requiredScope === "read") {
    return userScopes.includes("read") || userScopes.includes("write")
  }
  return userScopes.includes("write")
}

export function isAdmin(user: ApiKeyUser | null): boolean {
  return user?.role === "admin"
}