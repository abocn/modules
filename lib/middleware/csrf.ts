import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * CSRF token validation result
 * @interface CSRFValidationResult
 */
interface CSRFValidationResult {
  valid: boolean
  error?: string
}

const CSRF_HEADER = 'x-csrf-token'
const CSRF_COOKIE = 'csrf-token'
const TOKEN_LENGTH = 32

/**
 * Generate a cryptographically secure CSRF token
 *
 * @returns A random, URL-safe token string
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('base64url')
}

/**
 * Validate CSRF token using double-submit cookie pattern
 *
 * Compares the token from the request header with the token
 * stored in the cookie to prevent cross-site request forgery.
 *
 * @param request - The incoming request to validate
 * @returns Validation result with error details if invalid
 */
export function validateCSRFToken(request: NextRequest): CSRFValidationResult {
  const method = request.method.toUpperCase()

  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true }
  }

  const headerToken = request.headers.get(CSRF_HEADER)
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value

  if (!headerToken) {
    return {
      valid: false,
      error: 'CSRF token missing from request header'
    }
  }

  if (!cookieToken) {
    return {
      valid: false,
      error: 'CSRF token missing from cookie'
    }
  }

  if (headerToken.length !== cookieToken.length) {
    return {
      valid: false,
      error: 'CSRF token mismatch'
    }
  }

  const tokensMatch = crypto.timingSafeEqual(
    Buffer.from(headerToken),
    Buffer.from(cookieToken)
  )

  if (!tokensMatch) {
    return {
      valid: false,
      error: 'CSRF token validation failed'
    }
  }

  return { valid: true }
}

/**
 * Middleware to enforce CSRF protection
 *
 * Validates CSRF tokens for state-changing requests and
 * generates new tokens for GET requests when needed.
 *
 * @param request - The incoming request
 * @param exemptPaths - Paths to exempt from CSRF validation (e.g., webhooks)
 * @returns Response or null to continue
 */
export function csrfMiddleware(
  request: NextRequest,
  exemptPaths: string[] = []
): NextResponse | null {
  const pathname = new URL(request.url).pathname

  if (exemptPaths.some(path => pathname.startsWith(path))) {
    return null
  }

  const method = request.method.toUpperCase()

  if (method === 'GET' || method === 'HEAD') {
    const existingToken = request.cookies.get(CSRF_COOKIE)?.value

    if (!existingToken) {
      const response = NextResponse.next()
      const newToken = generateCSRFToken()

      response.cookies.set(CSRF_COOKIE, newToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 86400
      })

      response.headers.set('X-CSRF-Token', newToken)
      return response
    }

    const response = NextResponse.next()
    response.headers.set('X-CSRF-Token', existingToken)
    return response
  }

  const validation = validateCSRFToken(request)

  if (!validation.valid) {
    return NextResponse.json(
      {
        error: 'CSRF validation failed',
        message: validation.error
      },
      { status: 403 }
    )
  }

  return null
}

/**
 * Create a CSRF-protected route handler
 *
 * Wraps a route handler with automatic CSRF validation for
 * state-changing operations.
 *
 * @param handler - The route handler to protect
 * @param options - Configuration options
 * @returns Protected handler
 *
 * @example
 * ```typescript
 * export const POST = withCSRFProtection(async (request) => {
 *   const data = await request.json()
 *   await saveData(data)
 *   return NextResponse.json({ success: true })
 * })
 * ```
 */
export function withCSRFProtection<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
  options: { exempt?: boolean } = {}
) {
  return async (...args: T): Promise<NextResponse> => {
    if (options.exempt) {
      return handler(...args)
    }

    const request = args[0] as NextRequest
    const validation = validateCSRFToken(request)

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'CSRF validation failed',
          message: validation.error
        },
        { status: 403 }
      )
    }

    return handler(...args)
  }
}

/**
 * Get CSRF token from request
 *
 * Retrieves the CSRF token from either the header or cookie,
 * useful for validation in custom implementations.
 *
 * @param request - The request to get token from
 * @param source - Where to get the token from
 * @returns The CSRF token or null if not found
 */
export function getCSRFToken(
  request: NextRequest,
  source: 'header' | 'cookie' | 'both' = 'both'
): string | null {
  if (source === 'header' || source === 'both') {
    const headerToken = request.headers.get(CSRF_HEADER)
    if (headerToken) return headerToken
  }

  if (source === 'cookie' || source === 'both') {
    const cookieToken = request.cookies.get(CSRF_COOKIE)?.value
    if (cookieToken) return cookieToken
  }

  return null
}

/**
 * Set CSRF token in response
 *
 * Adds a CSRF token to the response cookies and headers
 * for client-side usage.
 *
 * @param response - The response to add token to
 * @param token - The token to set (generates new if not provided)
 * @returns The modified response
 */
export function setCSRFToken(
  response: NextResponse,
  token?: string
): NextResponse {
  const csrfToken = token || generateCSRFToken()

  response.cookies.set(CSRF_COOKIE, csrfToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 86400
  })

  response.headers.set('X-CSRF-Token', csrfToken)

  return response
}