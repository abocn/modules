import { describe, test, expect } from "bun:test"
import { hasRequiredScope, isAdmin } from "@/lib/api-auth"
import { requireScope, requireAuth, requireAdmin } from "@/lib/unified-auth"
import type { UnifiedUser } from "@/lib/unified-auth"

describe("API Key Scope System", () => {
  describe("hasRequiredScope function", () => {
    test("read scope allows read access", () => {
      expect(hasRequiredScope(["read"], "read")).toBe(true)
    })

    test("write scope allows read access", () => {
      expect(hasRequiredScope(["write"], "read")).toBe(true)
    })

    test("write scope allows write access", () => {
      expect(hasRequiredScope(["write"], "write")).toBe(true)
    })

    test("read scope denies write access", () => {
      expect(hasRequiredScope(["read"], "write")).toBe(false)
    })

    test("empty scopes deny all access", () => {
      expect(hasRequiredScope([], "read")).toBe(false)
      expect(hasRequiredScope([], "write")).toBe(false)
    })

    test("multiple scopes work correctly", () => {
      expect(hasRequiredScope(["read", "write"], "read")).toBe(true)
      expect(hasRequiredScope(["read", "write"], "write")).toBe(true)
    })
  })

  describe("isAdmin function", () => {
    test("returns true for admin users", () => {
      const adminUser = {
        id: "1",
        name: "Admin",
        email: "admin@test.com",
        role: "admin",
        scopes: ["read", "write"]
      }
      expect(isAdmin(adminUser)).toBe(true)
    })

    test("returns false for regular users", () => {
      const regularUser = {
        id: "2",
        name: "User",
        email: "user@test.com",
        role: "user",
        scopes: ["read"]
      }
      expect(isAdmin(regularUser)).toBe(false)
    })

    test("returns false for null user", () => {
      expect(isAdmin(null)).toBe(false)
    })
  })

  describe("requireAuth function", () => {
    test("passes for authenticated user", () => {
      const user: UnifiedUser = {
        id: "1",
        name: "Test",
        email: "test@test.com",
        role: "user",
        authMethod: "session"
      }
      expect(() => requireAuth(user)).not.toThrow()
    })

    test("throws for null user", () => {
      expect(() => requireAuth(null)).toThrow("Authentication required")
    })
  })

  describe("requireAdmin function", () => {
    test("passes for admin user", () => {
      const adminUser: UnifiedUser = {
        id: "1",
        name: "Admin",
        email: "admin@test.com",
        role: "admin",
        authMethod: "session"
      }
      expect(() => requireAdmin(adminUser)).not.toThrow()
    })

    test("throws for regular user", () => {
      const regularUser: UnifiedUser = {
        id: "2",
        name: "User",
        email: "user@test.com",
        role: "user",
        authMethod: "session"
      }
      expect(() => requireAdmin(regularUser)).toThrow("Admin access required")
    })

    test("throws for null user", () => {
      expect(() => requireAdmin(null)).toThrow("Authentication required")
    })
  })

  describe("requireScope function", () => {
    describe("with API key authentication", () => {
      test("allows read scope for read requirement", () => {
        const user: UnifiedUser = {
          id: "1",
          name: "Test",
          email: "test@test.com",
          role: "user",
          authMethod: "api-key",
          scopes: ["read"]
        }
        expect(() => requireScope(user, "read")).not.toThrow()
      })

      test("allows write scope for read requirement", () => {
        const user: UnifiedUser = {
          id: "1",
          name: "Test",
          email: "test@test.com",
          role: "user",
          authMethod: "api-key",
          scopes: ["write"]
        }
        expect(() => requireScope(user, "read")).not.toThrow()
      })

      test("allows write scope for write requirement", () => {
        const user: UnifiedUser = {
          id: "1",
          name: "Test",
          email: "test@test.com",
          role: "user",
          authMethod: "api-key",
          scopes: ["write"]
        }
        expect(() => requireScope(user, "write")).not.toThrow()
      })

      test("denies read scope for write requirement", () => {
        const user: UnifiedUser = {
          id: "1",
          name: "Test",
          email: "test@test.com",
          role: "user",
          authMethod: "api-key",
          scopes: ["read"]
        }
        expect(() => requireScope(user, "write")).toThrow("API key requires 'write' scope")
      })

      test("handles missing scopes", () => {
        const user: UnifiedUser = {
          id: "1",
          name: "Test",
          email: "test@test.com",
          role: "user",
          authMethod: "api-key"
        }
        expect(() => requireScope(user, "read")).toThrow("API key requires 'read' scope")
      })

      test("handles empty scopes array", () => {
        const user: UnifiedUser = {
          id: "1",
          name: "Test",
          email: "test@test.com",
          role: "user",
          authMethod: "api-key",
          scopes: []
        }
        expect(() => requireScope(user, "read")).toThrow("API key requires 'read' scope")
      })
    })

    describe("with session authentication", () => {
      test("bypasses scope check for session users", () => {
        const user: UnifiedUser = {
          id: "1",
          name: "Test",
          email: "test@test.com",
          role: "user",
          authMethod: "session"
        }
        expect(() => requireScope(user, "read")).not.toThrow()
        expect(() => requireScope(user, "write")).not.toThrow()
      })

      test("bypasses scope check for admin session users", () => {
        const user: UnifiedUser = {
          id: "1",
          name: "Admin",
          email: "admin@test.com",
          role: "admin",
          authMethod: "session"
        }
        expect(() => requireScope(user, "read")).not.toThrow()
        expect(() => requireScope(user, "write")).not.toThrow()
      })
    })

    test("throws for null user", () => {
      expect(() => requireScope(null, "read")).toThrow("Authentication required")
      expect(() => requireScope(null, "write")).toThrow("Authentication required")
    })
  })

  describe("Scope Hierarchy", () => {
    test("write scope includes read permissions", () => {
      const user: UnifiedUser = {
        id: "1",
        name: "Test",
        email: "test@test.com",
        role: "user",
        authMethod: "api-key",
        scopes: ["write"]
      }

      expect(() => requireScope(user, "read")).not.toThrow()
      expect(() => requireScope(user, "write")).not.toThrow()
    })

    test("read scope does not include write permissions", () => {
      const user: UnifiedUser = {
        id: "1",
        name: "Test",
        email: "test@test.com",
        role: "user",
        authMethod: "api-key",
        scopes: ["read"]
      }

      expect(() => requireScope(user, "read")).not.toThrow()
      expect(() => requireScope(user, "write")).toThrow("API key requires 'write' scope")
    })

    test("multiple scopes work correctly", () => {
      const user: UnifiedUser = {
        id: "1",
        name: "Test",
        email: "test@test.com",
        role: "user",
        authMethod: "api-key",
        scopes: ["read", "write", "admin"]
      }

      expect(() => requireScope(user, "read")).not.toThrow()
      expect(() => requireScope(user, "write")).not.toThrow()
    })
  })

  describe("Admin vs API Key Access", () => {
    test("admin role with session auth has full access", () => {
      const adminUser: UnifiedUser = {
        id: "1",
        name: "Admin",
        email: "admin@test.com",
        role: "admin",
        authMethod: "session"
      }

      expect(() => requireAuth(adminUser)).not.toThrow()
      expect(() => requireAdmin(adminUser)).not.toThrow()
      expect(() => requireScope(adminUser, "write")).not.toThrow()
    })

    test("admin role with API key still requires scopes", () => {
      const adminWithApiKey: UnifiedUser = {
        id: "1",
        name: "Admin",
        email: "admin@test.com",
        role: "admin",
        authMethod: "api-key",
        scopes: ["read"]
      }

      expect(() => requireAuth(adminWithApiKey)).not.toThrow()
      expect(() => requireAdmin(adminWithApiKey)).not.toThrow()
      expect(() => requireScope(adminWithApiKey, "read")).not.toThrow()
      expect(() => requireScope(adminWithApiKey, "write")).toThrow("API key requires 'write' scope")
    })

    test("regular user with write scope cannot pass admin check", () => {
      const userWithWriteScope: UnifiedUser = {
        id: "1",
        name: "User",
        email: "user@test.com",
        role: "user",
        authMethod: "api-key",
        scopes: ["write"]
      }

      expect(() => requireAuth(userWithWriteScope)).not.toThrow()
      expect(() => requireAdmin(userWithWriteScope)).toThrow("Admin access required")
      expect(() => requireScope(userWithWriteScope, "write")).not.toThrow()
    })
  })
})