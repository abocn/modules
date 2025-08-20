const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

interface RateLimitOptions {
  interval: number // in ms
  limit: number
}

export async function checkRateLimit(
  identifier: string,
  action: string,
  options: RateLimitOptions = { interval: 60 * 60 * 1000, limit: 5 } // 5 rph
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const key = `${action}:${identifier}`
  const now = Date.now()

  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    const resetTime = now + options.interval
    rateLimitMap.set(key, { count: 1, resetTime })
    return { allowed: true, remaining: options.limit - 1, resetTime }
  }

  if (record.count >= options.limit) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime }
  }

  record.count++
  return { allowed: true, remaining: options.limit - record.count, resetTime: record.resetTime }
}

// cleanup old entries
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime + 60 * 60 * 1000) { // Clean up after 1 hour past reset
      rateLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000) // runs every 5 minutes