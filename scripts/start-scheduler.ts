#!/usr/bin/env bun

import { jobScheduler } from '../lib/job-scheduler'

async function startScheduler() {
  console.log('=== Starting Job Scheduler ===')
  console.log(`Environment Configuration:`)
  console.log(`  RELEASE_SCHEDULE_ENABLED: ${process.env.RELEASE_SCHEDULE_ENABLED || 'false'}`)
  console.log(`  DEFAULT_SYNC_INTERVAL_HOURS: ${process.env.DEFAULT_SYNC_INTERVAL_HOURS || '6'}`)
  console.log(`  JOB_CHECK_INTERVAL_MS: ${process.env.JOB_CHECK_INTERVAL_MS || '60000'}`)

  try {
    await jobScheduler.start()

    process.on('SIGINT', async () => {
      console.log('\nReceived SIGINT, shutting down gracefully...')
      await jobScheduler.stop()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      console.log('\nReceived SIGTERM, shutting down gracefully...')
      await jobScheduler.stop()
      process.exit(0)
    })

    console.log('Job scheduler is running. Press Ctrl+C to stop.')

  } catch (error) {
    console.error('Failed to start scheduler:', error)
    process.exit(1)
  }
}

startScheduler()