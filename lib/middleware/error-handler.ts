import { NextResponse } from 'next/server'

/**
 * Error response structure for API endpoints
 * @interface ErrorResponse
 */
export interface ErrorResponse {
  error: string
  code?: string
  details?: unknown
  timestamp?: string
}

/**
 * Sanitize error messages for production environments
 *
 * Removes sensitive information like stack traces, database queries,
 * and internal paths from error messages before sending to client.
 *
 * @param error - The error object to sanitize
 * @param isDevelopment - Whether running in development mode
 * @returns Sanitized error message safe for client consumption
 */
export function sanitizeErrorMessage(error: unknown, isDevelopment = false): string {
  if (isDevelopment && error instanceof Error) {
    return error.message
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('unique constraint') || message.includes('duplicate')) {
      return 'This resource already exists'
    }
    if (message.includes('foreign key') || message.includes('constraint')) {
      return 'Related resource not found or cannot be modified'
    }
    if (message.includes('not found')) {
      return 'Resource not found'
    }
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return 'Authentication required'
    }
    if (message.includes('forbidden') || message.includes('permission')) {
      return 'Insufficient permissions'
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Invalid input provided'
    }
    if (message.includes('timeout')) {
      return 'Request timeout'
    }
    if (message.includes('rate limit')) {
      return 'Too many requests'
    }
  }

  return 'An unexpected error occurred'
}

/**
 * Create a standardized error response
 *
 * Ensures consistent error response format across all API endpoints
 * with proper sanitization of error messages.
 *
 * @param error - The error that occurred
 * @param status - HTTP status code
 * @param code - Optional error code for client reference
 * @param isDevelopment - Whether running in development mode
 * @returns NextResponse with sanitized error information
 */
export function createErrorResponse(
  error: unknown,
  status = 500,
  code?: string,
  isDevelopment = process.env.NODE_ENV === 'development'
): NextResponse {
  const sanitizedMessage = sanitizeErrorMessage(error, isDevelopment)

  if (error instanceof Error && !isDevelopment) {
    console.error('[API Error]', {
      message: error.message,
      stack: error.stack,
      code,
      status
    })
  }

  const response: ErrorResponse = {
    error: sanitizedMessage,
    timestamp: new Date().toISOString()
  }

  if (code) {
    response.code = code
  }

  if (isDevelopment && error instanceof Error) {
    response.details = {
      message: error.message,
      name: error.name
    }
  }

  return NextResponse.json(response, { status })
}

/**
 * Wrap an async handler with error handling
 *
 * Automatically catches and sanitizes errors from route handlers,
 * ensuring no sensitive information leaks to clients.
 *
 * @param handler - The async handler function to wrap
 * @returns Wrapped handler with automatic error handling
 *
 * @example
 * ```typescript
 * export const GET = withErrorHandling(async (request) => {
 *   const data = await riskyOperation()
 *   return NextResponse.json(data)
 * })
 * ```
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return createErrorResponse(error)
    }
  }
}

/**
 * Log error details securely
 *
 * Logs full error information server-side while ensuring
 * sensitive data doesn't appear in client-facing logs.
 *
 * @param context - Context identifier for the error
 * @param error - The error to log
 * @param metadata - Additional metadata to log
 */
export function logSecureError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString()

  if (error instanceof Error) {
    console.error(`[${context}] ${timestamp}`, {
      message: error.message,
      name: error.name,
      stack: error.stack,
      ...metadata
    })
  } else {
    console.error(`[${context}] ${timestamp}`, {
      error,
      ...metadata
    })
  }
}

/**
 * Validate and sanitize error status codes
 *
 * Ensures only valid HTTP status codes are used and
 * provides appropriate defaults for common error types.
 *
 * @param error - The error to get status code for
 * @param defaultStatus - Default status if none can be determined
 * @returns Valid HTTP status code
 */
export function getErrorStatusCode(error: unknown, defaultStatus = 500): number {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('not found')) return 404
    if (message.includes('unauthorized') || message.includes('authentication')) return 401
    if (message.includes('forbidden') || message.includes('permission')) return 403
    if (message.includes('validation') || message.includes('invalid')) return 400
    if (message.includes('conflict') || message.includes('duplicate')) return 409
    if (message.includes('rate limit')) return 429
    if (message.includes('timeout')) return 408
  }

  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: unknown }).status
    if (typeof status === 'number' && status >= 100 && status < 600) {
      return status
    }
  }

  return defaultStatus
}