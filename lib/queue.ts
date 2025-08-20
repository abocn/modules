import Redis from 'ioredis'

export interface QueueJob {
  id: string
  type: 'sync-module' | 'sync-batch'
  data: SyncModuleJob | SyncBatchJob
  attempts: number
  maxAttempts: number
  delay: number
  createdAt: Date
}

export interface SyncModuleJob {
  moduleId: string
  githubRepo: string
  userId?: string
}

export interface SyncBatchJob {
  batchSize: number
}

export class Queue {
  private redis: Redis
  private queueName: string

  constructor(connectionString?: string, queueName = 'release-sync') {
    this.redis = new Redis(connectionString || process.env.VALKEY_URL || 'redis://localhost:6379')
    this.queueName = queueName
  }

  async add(jobType: string, data: SyncModuleJob | SyncBatchJob, options: {
    delay?: number
    maxAttempts?: number
    priority?: number
  } = {}): Promise<string> {
    const job: QueueJob = {
      id: `${jobType}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
      type: jobType as 'sync-module' | 'sync-batch',
      data,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      delay: options.delay || 0,
      createdAt: new Date(),
    }

    const executeAt = Date.now() + (options.delay || 0)

    if (options.delay && options.delay > 0) {
      await this.redis.zadd(`${this.queueName}:delayed`, executeAt, JSON.stringify(job))
    } else {
      // Add to immediate queue
      await this.redis.lpush(`${this.queueName}:waiting`, JSON.stringify(job))
    }

    return job.id
  }

  async addSyncModuleJob(moduleId: string, githubRepo: string, userId?: string, delay = 0): Promise<string> {
    return this.add('sync-module', {
      moduleId,
      githubRepo,
      userId
    } as SyncModuleJob, { delay })
  }

  async addSyncBatchJob(batchSize = 10, delay = 0): Promise<string> {
    return this.add('sync-batch', {
      batchSize
    } as SyncBatchJob, { delay })
  }

  async getNextJob(): Promise<QueueJob | null> {
    await this.moveDelayedJobs()

    const jobData = await this.redis.brpop(`${this.queueName}:waiting`, 1)

    if (!jobData || !jobData[1]) {
      return null
    }

    try {
      const job = JSON.parse(jobData[1]) as QueueJob
      job.attempts++

      await this.redis.lpush(`${this.queueName}:active`, JSON.stringify(job))

      return job
    } catch (error) {
      console.error('Failed to parse job data:', error)
      return null
    }
  }

  async completeJob(jobId: string): Promise<void> {
    const jobs = await this.redis.lrange(`${this.queueName}:active`, 0, -1)

    for (let i = 0; i < jobs.length; i++) {
      try {
        const job = JSON.parse(jobs[i]) as QueueJob
        if (job.id === jobId) {
          await this.redis.lrem(`${this.queueName}:active`, 1, jobs[i])
          await this.redis.lpush(`${this.queueName}:completed`, jobs[i])
          // Keep only last 100 completed jobs
          await this.redis.ltrim(`${this.queueName}:completed`, 0, 99)
          break
        }
      } catch (error) {
        console.error('Failed to parse job for completion:', error)
      }
    }
  }

  async failJob(jobId: string, error: string): Promise<void> {
    const jobs = await this.redis.lrange(`${this.queueName}:active`, 0, -1)

    for (let i = 0; i < jobs.length; i++) {
      try {
        const job = JSON.parse(jobs[i]) as QueueJob
        if (job.id === jobId) {
          await this.redis.lrem(`${this.queueName}:active`, 1, jobs[i])

          if (job.attempts < job.maxAttempts) {
            const delay = Math.min(60000 * Math.pow(2, job.attempts), 300000) // Max 5 minutes
            const executeAt = Date.now() + delay
            await this.redis.zadd(`${this.queueName}:delayed`, executeAt, JSON.stringify(job))
          } else {
            const failedJob = { ...job, error, failedAt: new Date() }
            await this.redis.lpush(`${this.queueName}:failed`, JSON.stringify(failedJob))
            await this.redis.ltrim(`${this.queueName}:failed`, 0, 99)
          }
          break
        }
      } catch (parseError) {
        console.error('Failed to parse job for failure:', parseError)
      }
    }
  }

  private async moveDelayedJobs(): Promise<void> {
    const now = Date.now()

    const readyJobs = await this.redis.zrangebyscore(
      `${this.queueName}:delayed`,
      '-inf',
      now.toString()
    )

    if (readyJobs.length === 0) return

    const pipeline = this.redis.pipeline()

    for (const jobData of readyJobs) {
      pipeline.lpush(`${this.queueName}:waiting`, jobData)
      pipeline.zrem(`${this.queueName}:delayed`, jobData)
    }

    await pipeline.exec()
  }

  async getQueueStats(): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.redis.llen(`${this.queueName}:waiting`),
      this.redis.llen(`${this.queueName}:active`),
      this.redis.llen(`${this.queueName}:completed`),
      this.redis.llen(`${this.queueName}:failed`),
      this.redis.zcard(`${this.queueName}:delayed`),
    ])

    return { waiting, active, completed, failed, delayed }
  }

  async clearQueue(): Promise<void> {
    await Promise.all([
      this.redis.del(`${this.queueName}:waiting`),
      this.redis.del(`${this.queueName}:active`),
      this.redis.del(`${this.queueName}:delayed`),
    ])
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect()
  }
}

export const releaseQueue = new Queue(process.env.VALKEY_URL, 'release-sync')