import { releaseScheduler } from './scheduler'
import { validateEnvironment } from './env-validation'

let isInitialized = false

export async function initializeApplication(): Promise<void> {
  if (isInitialized) {
    return
  }

  try {
    console.log('Initializing application...')

    const env = validateEnvironment()
    console.log('Environment validation passed')

    if (env.RELEASE_SCHEDULE_ENABLED) {
      console.log('Starting release scheduler...')
      await releaseScheduler.start()
      console.log('Release scheduler started')
    } else {
      console.log('Release scheduler disabled by environment variable')
    }

    isInitialized = true
    console.log('Application initialization complete')

  } catch (error) {
    console.error('Application initialization failed:', error)

    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }

    throw error
  }
}

export async function shutdownApplication(): Promise<void> {
  if (!isInitialized) {
    return
  }

  try {
    console.log('Shutting down application...')

    await releaseScheduler.stop()
    console.log('Release scheduler stopped')

    isInitialized = false
    console.log('Application shutdown complete')

  } catch (error) {
    console.error('Application shutdown failed:', error)
    throw error
  }
}

if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...')
    await shutdownApplication()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...')
    await shutdownApplication()
    process.exit(0)
  })
}

if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  setTimeout(() => {
    initializeApplication().catch(console.error)
  }, 1000)
}