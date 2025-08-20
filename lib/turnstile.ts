interface TurnstileValidationResponse {
  success: boolean
  "error-codes"?: string[]
  challenge_ts?: string
  hostname?: string
  action?: string
  cdata?: string
}

interface TurnstileValidationOptions {
  remoteip?: string
  idempotency_key?: string
}

/**
 * Validates a Turnstile token (server side)
 * @param token - The Turnstile token from the client
 * @param options - Additional validation options
 * @returns Promise resolving to validation result
 */
export async function validateTurnstileToken(
  token: string,
  options?: TurnstileValidationOptions
): Promise<{ success: boolean; error?: string; data?: TurnstileValidationResponse }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  if (!secretKey) {
    console.error('[Turnstile] Secret key not configured')
    return {
      success: false,
      error: 'Turnstile validation is not properly configured'
    }
  }

  if (!token || typeof token !== 'string' || token.trim() === '') {
    return {
      success: false,
      error: 'Invalid or missing Turnstile token'
    }
  }

  try {
    const formData = new FormData()
    formData.append('secret', secretKey)
    formData.append('response', token.trim())

    if (options?.remoteip) {
      formData.append('remoteip', options.remoteip)
    }

    if (options?.idempotency_key) {
      formData.append('idempotency_key', options.idempotency_key)
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      throw new Error(`Turnstile API responded with status ${response.status}`)
    }

    const data: TurnstileValidationResponse = await response.json()

    console.log('[Turnstile] Validation response:', {
      success: data.success,
      hostname: data.hostname,
      action: data.action,
      errorCodes: data["error-codes"]
    })

    if (data.success) {
      return {
        success: true,
        data
      }
    } else {
      console.warn('[Turnstile] Validation failed:', data)

      const errorMessage = data["error-codes"]?.length
        ? `Captcha verification failed: ${data["error-codes"].join(', ')}`
        : 'Captcha verification failed. Please try again.'

      return {
        success: false,
        error: errorMessage,
        data
      }
    }
  } catch (error) {
    console.error('[Turnstile] Validation error:', error)

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return {
          success: false,
          error: 'Captcha verification timed out. Please try again.'
        }
      }
    }

    return {
      success: false,
      error: 'Failed to verify captcha. Please try again.'
    }
  }
}

/**
 * Middleware to validate Turnstile token from request body
 * @param request - The incoming request
 * @param getClientIP - Optional function to extract client IP
 * @returns Validation result
 */
export async function validateTurnstileFromRequest(
  request: Request,
  getClientIP?: (request: Request) => string | undefined
): Promise<{ success: boolean; error?: string; token?: string }> {
  try {
    const body = await request.json()
    const token = body.turnstileToken || body['cf-turnstile-response']

    if (!token) {
      return {
        success: false,
        error: 'Captcha verification is required'
      }
    }

    const clientIP = getClientIP?.(request)
    const result = await validateTurnstileToken(token, {
      remoteip: clientIP
    })

    return {
      success: result.success,
      error: result.error,
      token
    }
  } catch (error) {
    console.error('[Turnstile] Request validation error:', error)
    return {
      success: false,
      error: 'Invalid request format'
    }
  }
}

/**
 * Get client IP from request headers
 * @param request - The incoming request
 * @returns Client IP address or undefined
 */
export function getClientIP(request: Request): string | undefined {
  const headers = request.headers

  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = headers.get('x-real-ip')
  if (realIP) {
    return realIP.trim()
  }

  const clientIP = headers.get('x-client-ip')
  if (clientIP) {
    return clientIP.trim()
  }

  const forwardedHost = headers.get('x-forwarded-host')
  if (forwardedHost?.includes('localhost') || forwardedHost?.includes('127.0.0.1')) {
    return '127.0.0.1'
  }

  return undefined
}

/**
 * Helper to check if Turnstile is properly configured
 * @returns boolean indicating if Turnstile is configured
 */
export function isTurnstileConfigured(): boolean {
  return !!(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
}

/**
 * Get the public site key for client-side usage
 * @returns The site key or undefined if not configured
 */
export function getTurnstileSiteKey(): string | undefined {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
}