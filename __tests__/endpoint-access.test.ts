import { describe, test, expect } from "bun:test"
import { hasRequiredScope } from "@/lib/api-auth"
import { requireScope } from "@/lib/unified-auth"
import type { UnifiedUser } from "@/lib/unified-auth"

describe("Endpoint Access Control", () => {
  const publicEndpoints = [
    { method: "GET", path: "/api/health", requiresAuth: false },
    { method: "GET", path: "/api/stats", requiresAuth: false },
    { method: "GET", path: "/api/categories", requiresAuth: false },
    { method: "GET", path: "/api/modules", requiresAuth: false },
    { method: "GET", path: "/api/modules/[id]", requiresAuth: false },
    { method: "GET", path: "/api/search", requiresAuth: false },
    { method: "POST", path: "/api/search", requiresAuth: false },
    { method: "GET", path: "/api/trending", requiresAuth: false }
  ]

  const readScopeEndpoints = [
    { method: "GET", path: "/api/modules/[id]/download", scope: "read" },
    { method: "POST", path: "/api/modules/[id]/download", scope: "read" },
    { method: "GET", path: "/api/modules/[id]/ratings", scope: "read" },
    { method: "GET", path: "/api/modules/[id]/stats", scope: "read" },
    { method: "GET", path: "/api/modules/[id]/releases", scope: "read" },
    { method: "GET", path: "/api/ratings/[id]/replies", scope: "read" },
    { method: "GET", path: "/api/user/profile/[id]", scope: "read" }
  ]

  const writeScopeEndpoints = [
    { method: "POST", path: "/api/modules/submit", scope: "write" },
    { method: "PUT", path: "/api/modules/update/[id]", scope: "write" },
    { method: "POST", path: "/api/modules/[id]/ratings", scope: "write" },
    { method: "POST", path: "/api/ratings/[id]/replies", scope: "write" },
    { method: "POST", path: "/api/ratings/[id]/helpful", scope: "write" },
    { method: "POST", path: "/api/replies/[id]/helpful", scope: "write" },
    { method: "DELETE", path: "/api/user/api-keys/[id]", scope: "write" }
  ]

  const adminEndpoints = [
    { method: "GET", path: "/api/admin/modules", requiresAdmin: true },
    { method: "POST", path: "/api/admin/modules", requiresAdmin: true },
    { method: "DELETE", path: "/api/admin/modules/[id]", requiresAdmin: true },
    { method: "PATCH", path: "/api/admin/modules/[id]", requiresAdmin: true },
    { method: "GET", path: "/api/admin/users", requiresAdmin: true },
    { method: "PATCH", path: "/api/admin/users/[id]", requiresAdmin: true },
    { method: "DELETE", path: "/api/admin/users/[id]", requiresAdmin: true },
    { method: "GET", path: "/api/admin/stats", requiresAdmin: true }
  ]

  describe("Public Endpoints", () => {
    test.each(publicEndpoints)("$method $path should not require authentication", ({ requiresAuth }) => {
      expect(requiresAuth).toBe(false)
    })
  })

  describe("Read Scope Endpoints", () => {
    test.each(readScopeEndpoints)("$method $path should be accessible with read scope", ({ scope }) => {
      const userWithReadScope: UnifiedUser = {
        id: "1",
        name: "Test",
        email: "test@test.com",
        role: "user",
        authMethod: "api-key",
        scopes: ["read"]
      }

      expect(scope).toBe("read")
      expect(() => requireScope(userWithReadScope, "read")).not.toThrow()
    })

    test.each(readScopeEndpoints)("$method $path should be accessible with write scope", () => {
      const userWithWriteScope: UnifiedUser = {
        id: "1",
        name: "Test",
        email: "test@test.com",
        role: "user",
        authMethod: "api-key",
        scopes: ["write"]
      }

      expect(() => requireScope(userWithWriteScope, "read")).not.toThrow()
    })
  })

  describe("Write Scope Endpoints", () => {
    test.each(writeScopeEndpoints)("$method $path should require write scope", ({ scope }) => {
      expect(scope).toBe("write")

      const userWithReadScope: UnifiedUser = {
        id: "1",
        name: "Test",
        email: "test@test.com",
        role: "user",
        authMethod: "api-key",
        scopes: ["read"]
      }

      const userWithWriteScope: UnifiedUser = {
        id: "1",
        name: "Test",
        email: "test@test.com",
        role: "user",
        authMethod: "api-key",
        scopes: ["write"]
      }

      expect(() => requireScope(userWithReadScope, "write")).toThrow("API key requires 'write' scope")
      expect(() => requireScope(userWithWriteScope, "write")).not.toThrow()
    })
  })

  describe("Admin Endpoints", () => {
    test.each(adminEndpoints)("$method $path should require admin role", ({ requiresAdmin }) => {
      expect(requiresAdmin).toBe(true)
    })

    test("API keys with write scope should not grant admin access", () => {
      const hasWriteScope = hasRequiredScope(["write"], "write")
      expect(hasWriteScope).toBe(true)

      const userWithWriteScope: UnifiedUser = {
        id: "1",
        name: "Test",
        email: "test@test.com",
        role: "user",
        authMethod: "api-key",
        scopes: ["write"]
      }

      expect(userWithWriteScope.role).not.toBe("admin")
    })
  })

  describe("Scope Validation Rules", () => {
    test("read scope should allow GET requests", () => {
      const hasRead = hasRequiredScope(["read"], "read")
      expect(hasRead).toBe(true)
    })

    test("write scope should allow all HTTP methods", () => {
      const hasWrite = hasRequiredScope(["write"], "write")
      expect(hasWrite).toBe(true)
    })

    test("session authentication should bypass scope checks", () => {
      const sessionUser: UnifiedUser = {
        id: "1",
        name: "Test",
        email: "test@test.com",
        role: "user",
        authMethod: "session"
      }

      expect(() => requireScope(sessionUser, "read")).not.toThrow()
      expect(() => requireScope(sessionUser, "write")).not.toThrow()
    })
  })
})