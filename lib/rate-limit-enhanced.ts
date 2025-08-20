import { NextRequest } from "next/server"

interface RateLimitConfig {
  request: NextRequest
  identifier?: string
  limit: number
  window: number // milliseconds
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitResult {
  success: boolean
  count?: number
  remaining?: number
  reset?: number
  retryAfter?: number
}

const rateLimitStore = new Map<string, { count: number; reset: number }>()

export async function rateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const {
    request,
    identifier,
    limit,
    window
  } = config

  const rateLimitId = identifier || getRateLimitIdentifier(request)

  const now = Date.now()

  for (const [key, data] of rateLimitStore.entries()) {
    if (data.reset < now) {
      rateLimitStore.delete(key)
    }
  }

  const current = rateLimitStore.get(rateLimitId)

  if (!current) {
    rateLimitStore.set(rateLimitId, {
      count: 1,
      reset: now + window
    })

    return {
      success: true,
      count: 1,
      remaining: limit - 1,
      reset: now + window
    }
  }

  if (current.reset < now) {
    rateLimitStore.set(rateLimitId, {
      count: 1,
      reset: now + window
    })

    return {
      success: true,
      count: 1,
      remaining: limit - 1,
      reset: now + window
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

function getRateLimitIdentifier(request: NextRequest): string {
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer mk_")) {
    return `api_key:${authHeader.substring(7, 15)}`
  }

  const userIdHeader = request.headers.get("x-user-id")
  if (userIdHeader) {
    return `user:${userIdHeader}`
  }

  const ip = getClientIP(request)
  const userAgent = request.headers.get("user-agent") || ""
  const userAgentHash = hashString(userAgent)

  return `ip:${ip}:${userAgentHash}`
}

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }

  const realIP = request.headers.get("x-real-ip")
  if (realIP) {
    return realIP
  }

  const cfConnectingIP = request.headers.get("cf-connecting-ip")
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  return "unknown"
}

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

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

export function cleanupRateLimitStore(): void {
  const now = Date.now()
  let cleaned = 0

  for (const [key, data] of rateLimitStore.entries()) {
    if (data.reset < now) {
      rateLimitStore.delete(key)
      cleaned++
    }
  }

  console.log(`[Rate Limit] Cleaned up ${cleaned} expired entries`)
}

export function getRateLimitStats(): {
  totalEntries: number
  activeEntries: number
  expiredEntries: number
} {
  const now = Date.now()
  let active = 0
  let expired = 0

  for (const [, data] of rateLimitStore.entries()) {
    if (data.reset >= now) {
      active++
    } else {
      expired++
    }
  }

  return {
    totalEntries: rateLimitStore.size,
    activeEntries: active,
    expiredEntries: expired
  }
}