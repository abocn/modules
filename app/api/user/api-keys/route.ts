import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { apiKeys, adminActions } from "@/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { randomBytes, createHash } from "crypto"
import { z } from "zod"

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresIn: z.enum(["30days", "90days", "1year", "never"]).optional(),
  scopes: z.array(z.enum(["read", "write", "admin"])).optional(),
})

function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `mk_${randomBytes(32).toString("base64url")}`
  const hash = createHash("sha256").update(key).digest("hex")
  const prefix = key.substring(0, 8)
  return { key, hash, prefix }
}

function getExpirationDate(expiresIn?: string): Date | null {
  if (!expiresIn || expiresIn === "never") return null

  const now = new Date()
  switch (expiresIn) {
    case "30days":
      return new Date(now.setDate(now.getDate() + 30))
    case "90days":
      return new Date(now.setDate(now.getDate() + 90))
    case "1year":
      return new Date(now.setFullYear(now.getFullYear() + 1))
    default:
      return null
  }
}

/**
 * List user API keys
 * @description Get all active API keys for the authenticated user
 * @response ApiKeysListResponse:List of user's API keys (without actual key values)
 * @response 401:ErrorResponse:Authentication required
 * @response 500:ErrorResponse:Failed to fetch API keys
 * @auth bearer
 * @openapi
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        scopes: apiKeys.scopes,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.userId, session.user.id),
          isNull(apiKeys.revokedAt)
        )
      )
      .orderBy(apiKeys.createdAt)

    return NextResponse.json({ keys })
  } catch (error) {
    console.error("Failed to fetch API keys:", error)
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    )
  }
}

/**
 * Create API key
 * @description Create a new API key for the authenticated user (max 10 keys per user)
 * @body CreateApiKeyBody
 * @response 201:CreateApiKeyResponse:API key created successfully (includes the actual key - only shown once)
 * @response 400:ErrorResponse:Invalid request data or maximum keys exceeded
 * @response 401:ErrorResponse:Authentication required
 * @response 500:ErrorResponse:Failed to create API key
 * @auth bearer
 * @openapi
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validatedData = createApiKeySchema.parse(body)

    if (validatedData.scopes?.includes("admin")) {
      if (session.user.role !== "admin") {
        return NextResponse.json(
          { error: "Only admins can create API keys with admin scope" },
          { status: 403 }
        )
      }
    }

    const activeKeyCount = await db
      .select({ count: apiKeys.id })
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.userId, session.user.id),
          isNull(apiKeys.revokedAt)
        )
      )

    if (activeKeyCount.length >= 10) {
      return NextResponse.json(
        { error: "Maximum of 10 active API keys allowed per user" },
        { status: 400 }
      )
    }

    const { key, hash, prefix } = generateApiKey()
    const expiresAt = getExpirationDate(validatedData.expiresIn)

    const [newKey] = await db
      .insert(apiKeys)
      .values({
        id: `apikey_${randomBytes(16).toString("hex")}`,
        userId: session.user.id,
        name: validatedData.name,
        keyHash: hash,
        keyPrefix: prefix,
        scopes: validatedData.scopes || ["read"],
        expiresAt,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        scopes: apiKeys.scopes,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      })

    if (validatedData.scopes?.includes("admin") && session.user.role === "admin") {
      await db.insert(adminActions).values({
        adminId: session.user.id,
        action: "create_admin_api_key",
        details: `Admin created admin-scoped API key "${validatedData.name}" for their own account`,
        targetType: "api_key",
        targetId: newKey.id,
        newValues: { name: validatedData.name, scopes: validatedData.scopes },
      })
    }

    return NextResponse.json({
      ...newKey,
      key,
      message: "Store this key securely. You won't be able to see it again.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Failed to create API key:", error)
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    )
  }
}