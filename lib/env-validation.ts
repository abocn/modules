import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  BETTER_AUTH_SECRET: z.string().min(1, 'BETTER_AUTH_SECRET is required'),
  BETTER_AUTH_URL: z.string().url({ message: 'BETTER_AUTH_URL must be a valid URL' }),
  NEXT_PUBLIC_BETTER_AUTH_URL: z.string().url({ message: 'NEXT_PUBLIC_BETTER_AUTH_URL must be a valid URL' }),

  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),

  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  MAILGUN_API_URL: z.string().default('https://api.mailgun.net'),
  MAILGUN_FROM_EMAIL: z.string().optional(),
  MAILGUN_FROM_NAME: z.string().optional(),

  GITHUB_PAT_SALT: z.string().min(32, 'GITHUB_PAT_SALT must be at least 32 characters for security'),
  VALKEY_URL: z.string().default('redis://localhost:6379'),

  RELEASE_SCHEDULE_ENABLED: z.string().default('true').transform(val => val === 'true'),
  DEFAULT_SYNC_INTERVAL_HOURS: z.string().default('6').transform(val => parseInt(val)),
  JOB_CHECK_INTERVAL_MS: z.string().default('60000').transform(val => parseInt(val)),

  TELEGRAM_CHANNEL: z.string().optional(),
  TELEGRAM_CHAT: z.string().optional(),
})

export type Environment = z.infer<typeof envSchema>

let validatedEnv: Environment | null = null

export function validateEnvironment(): Environment {
  if (validatedEnv) {
    return validatedEnv
  }

  try {
    validatedEnv = envSchema.parse(process.env)
    return validatedEnv
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join('\n')
      throw new Error(`Environment validation failed:\n${missingVars}`)
    }
    throw error
  }
}

export function getEnv(): Environment {
  if (!validatedEnv) {
    throw new Error('Environment not validated. Call validateEnvironment() first.')
  }
  return validatedEnv
}

if (typeof window === 'undefined') {
  try {
    validateEnvironment()
    console.log('✅ Environment validation passed')
  } catch (error) {
    console.error('❌ Environment validation failed:', error)

    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  }
}