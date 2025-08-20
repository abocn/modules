import { releaseQueue, type SyncModuleJob, type SyncBatchJob } from './queue'
import { GitHubService } from './github-service'
import { getReleaseSchedule, updateReleaseSchedule, getModulesForSync, updateModuleGithubSync } from './db-utils'

export class ReleaseScheduler {
  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Release scheduler is already running')
      return
    }

    this.isRunning = true
    console.log('Starting release scheduler...')

    this.intervalId = setInterval(async () => {
      await this.checkAndScheduleJobs()
    }, 60000)

    this.processJobs()

    console.log('Release scheduler started')
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return

    this.isRunning = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    console.log('Release scheduler stopped')
  }

  private async checkAndScheduleJobs(): Promise<void> {
    try {
      const schedule = await getReleaseSchedule()
      if (!schedule || !schedule.enabled) {
        return
      }

      const now = new Date()
      if (now >= schedule.nextRunAt) {
        console.log('Scheduling batch sync job...')

        await releaseQueue.addSyncBatchJob(schedule.batchSize)

        const nextRunAt = new Date(now.getTime() + schedule.intervalHours * 60 * 60 * 1000)
        await updateReleaseSchedule({
          lastRunAt: now,
          nextRunAt
        })

        console.log(`Next batch sync scheduled for: ${nextRunAt.toISOString()}`)
      }
    } catch (error) {
      console.error('Error in scheduler check:', error)
    }
  }

  private async processJobs(): Promise<void> {
    while (this.isRunning) {
      try {
        const job = await releaseQueue.getNextJob()

        if (!job) {
          await new Promise(resolve => setTimeout(resolve, 5000))
          continue
        }

        console.log(`Processing job: ${job.type} (${job.id})`)

        try {
          switch (job.type) {
            case 'sync-module':
              await this.processSyncModuleJob(job.data as SyncModuleJob)
              break
            case 'sync-batch':
              await this.processSyncBatchJob(job.data as SyncBatchJob)
              break
            default:
              throw new Error(`Unknown job type: ${job.type}`)
          }

          await releaseQueue.completeJob(job.id)
          console.log(`Job completed: ${job.id}`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`Job failed: ${job.id} - ${errorMessage}`)
          await releaseQueue.failJob(job.id, errorMessage)
        }
      } catch (error) {
        console.error('Error in job processing loop:', error)
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  }

  private async processSyncModuleJob(jobData: SyncModuleJob): Promise<void> {
    const { moduleId, githubRepo, userId } = jobData

    let githubService: GitHubService

    if (userId) {
      const userService = await GitHubService.createFromUserPAT(userId)
      githubService = userService || new GitHubService()
    } else {
      githubService = new GitHubService()
    }

    const result = await githubService.syncModuleReleases(moduleId, githubRepo)

    const syncErrors = result.errors.map(error => ({
      error,
      timestamp: new Date().toISOString(),
      retryCount: 0
    }))

    await updateModuleGithubSync(moduleId, {
      lastSyncAt: new Date(),
      syncErrors: result.success ? [] : syncErrors
    })

    if (!result.success) {
      throw new Error(`Sync failed: ${result.errors.join(', ')}`)
    }

    console.log(`Module ${moduleId} synced successfully. Added ${result.newReleases} new releases.`)
  }

  private async processSyncBatchJob(jobData: SyncBatchJob): Promise<void> {
    const { batchSize } = jobData

    const modulesToSync = await getModulesForSync(batchSize)

    console.log(`Processing batch of ${modulesToSync.length} modules`)

    for (const { module, sync } of modulesToSync) {
      try {
        await releaseQueue.addSyncModuleJob(
          module.id,
          sync.githubRepo,
          module.submittedBy || undefined,
          Math.random() * 10000
        )
      } catch (error) {
        console.error(`Failed to queue sync job for module ${module.id}:`, error)
      }
    }

    console.log(`Queued ${modulesToSync.length} sync jobs`)
  }

  async triggerManualSync(moduleId?: string): Promise<void> {
    if (moduleId) {
      const modulesToSync = await getModulesForSync(1)
      const moduleToSync = modulesToSync.find(m => m.module.id === moduleId)

      if (!moduleToSync) {
        throw new Error(`Module ${moduleId} not found or not configured for sync`)
      }

      await releaseQueue.addSyncModuleJob(
        moduleToSync.module.id,
        moduleToSync.sync.githubRepo,
        moduleToSync.module.submittedBy || undefined
      )
    } else {
      const schedule = await getReleaseSchedule()
      const batchSize = schedule?.batchSize || 10

      await releaseQueue.addSyncBatchJob(batchSize)
    }
  }
}

export const releaseScheduler = new ReleaseScheduler()