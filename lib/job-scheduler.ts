import { db } from '../db'
import { adminJobs } from '../db/schema'
import { jobExecutionService } from './job-execution-service'
import { eq } from 'drizzle-orm'

export class JobScheduler {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private checkInterval: number
  private scrapeInterval: number

  constructor() {
    this.checkInterval = parseInt(process.env.JOB_CHECK_INTERVAL_MS || '60000')
    this.scrapeInterval = parseInt(process.env.DEFAULT_SYNC_INTERVAL_HOURS || '6') * 60 * 60 * 1000
  }

  async start() {
    if (this.isRunning) {
      console.log('[Job Scheduler] Already running')
      return
    }

    this.isRunning = true
    console.log('[Job Scheduler] Starting job scheduler')
    console.log(`[Job Scheduler] Job check interval: ${this.checkInterval}ms`)
    console.log(`[Job Scheduler] Scrape interval: ${this.scrapeInterval}ms (${this.scrapeInterval / 1000 / 60 / 60} hours)`)

    await this.processPendingJobs()

    await this.scheduleAutomaticScrape()

    this.intervalId = setInterval(async () => {
      await this.processPendingJobs()
    }, this.checkInterval)

    setInterval(async () => {
      await this.scheduleAutomaticScrape()
    }, this.scrapeInterval)

    console.log('[Job Scheduler] Job scheduler started successfully')
  }

  async stop() {
    if (!this.isRunning) {
      console.log('[Job Scheduler] Not running')
      return
    }

    this.isRunning = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    console.log('[Job Scheduler] Job scheduler stopped')
  }

  private async processPendingJobs() {
    try {
      const pendingJobs = await db
        .select()
        .from(adminJobs)
        .where(eq(adminJobs.status, 'pending'))

      if (pendingJobs.length === 0) {
        return
      }

      console.log(`[Job Scheduler] Found ${pendingJobs.length} pending job(s)`)

      for (const job of pendingJobs) {
        console.log(`[Job Scheduler] Executing job ${job.id}: ${job.name}`)

        jobExecutionService.executeJob(job.id).catch(error => {
          console.error(`[Job Scheduler] Failed to execute job ${job.id}:`, error)
        })
      }
    } catch (error) {
      console.error('[Job Scheduler] Error processing pending jobs:', error)
    }
  }

  private async scheduleAutomaticScrape() {
    if (process.env.RELEASE_SCHEDULE_ENABLED !== 'true') {
      console.log('[Job Scheduler] Automatic scraping is disabled')
      return
    }

    try {
      console.log('[Job Scheduler] Scheduling automatic GitHub scrape job')

      const existingJobs = await db
        .select()
        .from(adminJobs)
        .where(
          eq(adminJobs.status, 'pending')
        )

      const hasPendingScrape = existingJobs.some(job => 
        job.type === 'scrape_releases' && 
        job.name === 'Automatic GitHub Scrape'
      )

      if (hasPendingScrape) {
        console.log('[Job Scheduler] Automatic scrape job already pending, skipping')
        return
      }

      const [job] = await db
        .insert(adminJobs)
        .values({
          type: 'scrape_releases',
          name: 'Automatic GitHub Scrape',
          description: 'Scheduled automatic GitHub release synchronization',
          status: 'pending',
          progress: 0,
          startedBy: 'SYSTEM',
          parameters: {
            scope: 'all',
            automatic: true
          },
          logs: [{
            timestamp: new Date().toISOString(),
            level: 'info' as const,
            message: 'Automatic scrape job scheduled'
          }]
        })
        .returning()

      console.log(`[Job Scheduler] Created automatic scrape job with ID: ${job.id}`)

      const [configJob] = await db
        .insert(adminJobs)
        .values({
          type: 'sync_github_configs',
          name: 'Automatic GitHub Config Sync',
          description: 'Scheduled automatic GitHub configuration synchronization',
          status: 'pending',
          progress: 0,
          startedBy: 'SYSTEM',
          parameters: {
            automatic: true
          },
          logs: [{
            timestamp: new Date().toISOString(),
            level: 'info' as const,
            message: 'Automatic config sync job scheduled'
          }]
        })
        .returning()

      console.log(`[Job Scheduler] Created automatic config sync job with ID: ${configJob.id}`)

    } catch (error) {
      console.error('[Job Scheduler] Error scheduling automatic scrape:', error)
    }
  }

  async runOnce() {
    console.log('[Job Scheduler] Running one-time job processing')
    await this.processPendingJobs()
    await this.scheduleAutomaticScrape()
  }
}

export const jobScheduler = new JobScheduler()