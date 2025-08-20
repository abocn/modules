import { NextRequest } from "next/server"
import { createHash, randomBytes } from "crypto"
import type { UnifiedUser } from "@/lib/unified-auth"
import type { ApiKeyUser } from "@/lib/api-auth"

export const TEST_BASE_URL = "http://localhost:3000"

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const rawKey = `mk_${randomBytes(24).toString("base64url")}`
  const hash = createHash("sha256").update(rawKey).digest("hex")
  const prefix = rawKey.substring(0, 11)

  return {
    key: rawKey,
    hash,
    prefix
  }
}

export function createMockRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: unknown
    searchParams?: Record<string, string>
  } = {}
): NextRequest {
  const fullUrl = new URL(url, TEST_BASE_URL)

  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      fullUrl.searchParams.set(key, value)
    })
  }

  const headers = new Headers(options.headers || {})

  if (options.body) {
    headers.set("Content-Type", "application/json")
  }

  const init = {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  }

  return new NextRequest(fullUrl.toString(), init as ConstructorParameters<typeof NextRequest>[1])
}

export function createMockUser(overrides?: Partial<UnifiedUser>): UnifiedUser {
  return {
    id: "user_123",
    name: "Test User",
    email: "test@test.com",
    role: "user",
    authMethod: "session",
    ...overrides
  }
}

export function createMockApiKeyUser(scopes: string[] = ["read"], overrides?: Partial<ApiKeyUser>): ApiKeyUser {
  return {
    id: "user_123",
    name: "Test User",
    email: "test@test.com",
    role: "user",
    scopes,
    ...overrides
  }
}

export const testUsers = {
  regularUser: createMockUser(),
  adminUser: createMockUser({ id: "admin_456", name: "Admin User", email: "admin@test.com", role: "admin" }),
  apiKeyReadUser: createMockUser({ authMethod: "api-key", scopes: ["read"] }),
  apiKeyWriteUser: createMockUser({ authMethod: "api-key", scopes: ["write"] }),
  apiKeyAdminUser: createMockUser({ role: "admin", authMethod: "api-key", scopes: ["write"] })
}

export const testApiKeys = {
  readOnly: {
    ...generateApiKey(),
    scopes: ["read"]
  },
  writeAccess: {
    ...generateApiKey(),
    scopes: ["write"]
  },
  adminKey: {
    ...generateApiKey(),
    scopes: ["read", "write"]
  }
}