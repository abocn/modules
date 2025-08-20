import { NextRequest } from 'next/server'
import { db } from '../db'
import { sql } from 'drizzle-orm'

/**
 * Rate limit configuration interface
 * @interface RateLimitConfig
 */
interface RateLimitConfig {
  request: NextRequest
  identifier?: string
  limit: number
  window: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

/**
 * Rate limit result interface
 * @interface RateLimitResult
 */
interface RateLimitResult {
  success: boolean
  count?: number
  remaining?: number
  reset?: number
  retryAfter?: number
}

/**
 * In-memory fallback store for rate limiting
 */
const memoryStore = new Map<string, { count: number; reset: number }>()

/**
 * Get rate limit identifier from request
 *
 * @param request - The incoming request
 * @returns A unique identifier for rate limiting
 */
function getRateLimitIdentifier(request: NextRequest): string {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer mk_')) {
    return `api_key:${authHeader.substring(7, 15)}`
  }

  const userIdHeader = request.headers.get('x-user-id')
  if (userIdHeader) {
    return `user:${userIdHeader}`
  }

  const ip = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || ''
  const userAgentHash = hashString(userAgent)

  return `ip:${ip}:${userAgentHash}`
}

/**
 * Get client IP from request headers
 *
 * @param request - The incoming request
 * @returns The client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  return 'unknown'
}

/**
 * Hash a string for consistent identifier generation
 *
 * @param str - The string to hash
 * @returns A hashed string
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

/**
 * Persistent rate limiting with database storage
 *
 * Uses database for persistence across server restarts with
 * in-memory fallback for resilience.
 *
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function rateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const {
    request,
    identifier,
    limit,
    window
  } = config

  const rateLimitId = identifier || getRateLimitIdentifier(request)
  const now = Date.now()
  const windowStart = now - window
  const nextReset = now + window

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        identifier TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        reset_at BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await db.execute(sql`
      DELETE FROM rate_limits WHERE reset_at < ${windowStart}
    `)

    const existingLimit = await db.execute<{
      count: number
      reset_at: number
    }>(sql`
      SELECT count, reset_at
      FROM rate_limits
      WHERE identifier = ${rateLimitId} AND reset_at > ${now}
    `)

    if (existingLimit.rows.length > 0) {
      const current = existingLimit.rows[0]

      if (current.count >= limit) {
        return {
          success: false,
          count: current.count,
          remaining: 0,
          reset: current.reset_at,
          retryAfter: Math.ceil((current.reset_at - now) / 1000)
        }
      }

      await db.execute(sql`
        UPDATE rate_limits
        SET count = count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE identifier = ${rateLimitId}
      `)

      return {
        success: true,
        count: current.count + 1,
        remaining: limit - current.count - 1,
        reset: current.reset_at
      }
    } else {
      await db.execute(sql`
        INSERT INTO rate_limits (identifier, count, reset_at)
        VALUES (${rateLimitId}, 1, ${nextReset})
        ON CONFLICT (identifier) DO UPDATE
        SET count = 1, reset_at = ${nextReset}, updated_at = CURRENT_TIMESTAMP
      `)

      return {
        success: true,
        count: 1,
        remaining: limit - 1,
        reset: nextReset
      }
    }
  } catch (error) {
    console.error('[Rate Limit] Database error, falling back to memory:', error)

    for (const [key, data] of memoryStore.entries()) {
      if (data.reset < now) {
        memoryStore.delete(key)
      }
    }

    const current = memoryStore.get(rateLimitId)

    if (!current || current.reset < now) {
      memoryStore.set(rateLimitId, {
        count: 1,
        reset: nextReset
      })

      return {
        success: true,
        count: 1,
        remaining: limit - 1,
        reset: nextReset
      }
    }

    current.count++

    if (current.count > limit) {
      return {
        success: false,
        count: current.count,
        remaining: 0,
        reset: current.reset,
        retryAfter: Math.ceil((current.reset - now) / 1000)
      }
    }

    return {
      success: true,
      count: current.count,
      remaining: limit - current.count,
      reset: current.reset
    }
  }
}

/**
 * Rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  PUBLIC_READ: {
    limit: 100,
    window: 60 * 1000,
  },
  AUTHENTICATED_READ: {
    limit: 1000,
    window: 60 * 1000,
  },
  WRITE_OPERATIONS: {
    limit: 30,
    window: 60 * 1000,
  },
  ADMIN_OPERATIONS: {
    limit: 200,
    window: 60 * 1000,
  },
  MODULE_SUBMIT: {
    limit: 5,
    window: 60 * 60 * 1000,
  },
  API_KEY_CREATION: {
    limit: 10,
    window: 24 * 60 * 60 * 1000,
  },
  DOWNLOAD_TRACKING: {
    limit: 50,
    window: 60 * 1000,
  },
  SEARCH_OPERATIONS: {
    limit: 60,
    window: 60 * 1000,
  }
} as const

/**
 * Apply rate limiting with predefined configuration
 *
 * @param request - The incoming request
 * @param configKey - The configuration key to use
 * @param customIdentifier - Optional custom identifier
 * @returns Rate limit result
 */
export async function applyRateLimit(
  request: NextRequest,
  configKey: keyof typeof RATE_LIMIT_CONFIGS,
  customIdentifier?: string
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[configKey]

  return rateLimit({
    request,
    identifier: customIdentifier,
    limit: config.limit,
    window: config.window,
  })
}

/**
 * Clean up expired rate limit entries
 *
 * @returns Number of entries cleaned
 */
export async function cleanupRateLimits(): Promise<number> {
  try {
    const result = await db.execute<{ count: number }>(sql`
      DELETE FROM rate_limits
      WHERE reset_at < ${Date.now() - 3600000}
      RETURNING COUNT(*) as count
    `)

    const count = result.rows[0]?.count || 0
    console.log(`[Rate Limit] Cleaned up ${count} expired entries`)
    return count
  } catch (error) {
    console.error('[Rate Limit] Cleanup error:', error)
    return 0
  }
}

/**
 * Get rate limit statistics
 *
 * @returns Statistics about current rate limits
 */
export async function getRateLimitStats(): Promise<{
  totalEntries: number
  activeEntries: number
  expiredEntries: number
}> {
  try {
    const now = Date.now()
    const result = await db.execute<{
      total: number
      active: number
      expired: number
    }>(sql`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN reset_at >= ${now} THEN 1 END) as active,
        COUNT(CASE WHEN reset_at < ${now} THEN 1 END) as expired
      FROM rate_limits
    `)

    const stats = result.rows[0]
    return {
      totalEntries: stats?.total || 0,
      activeEntries: stats?.active || 0,
      expiredEntries: stats?.expired || 0
    }
  } catch (error) {
    console.error('[Rate Limit] Stats error:', error)

    const now = Date.now()
    let active = 0
    let expired = 0

    for (const [, data] of memoryStore.entries()) {
      if (data.reset >= now) {
        active++
      } else {
        expired++
      }
    }

    return {
      totalEntries: memoryStore.size,
      activeEntries: active,
      expiredEntries: expired
    }
  }
}