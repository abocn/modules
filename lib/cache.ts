import Redis from 'ioredis'

class CacheManager {
  private redis: Redis | null = null
  private isConnected: boolean = false

  constructor() {
    this.connect()
  }

  private connect() {
    try {
      const redisUrl = process.env.VALKEY_URL || 'redis://localhost:6379'
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 100, 2000)
          return delay
        },
        reconnectOnError: (err) => {
          const targetError = 'READONLY'
          if (err.message.includes(targetError)) {
            return true
          }
          return false
        },
      })

      this.redis.on('connect', () => {
        this.isConnected = true
        console.log('Redis cache connected')
      })

      this.redis.on('error', (err) => {
        console.error('Redis cache error:', err)
        this.isConnected = false
      })

      this.redis.on('close', () => {
        this.isConnected = false
      })
    } catch (error) {
      console.error('Failed to initialize Redis cache:', error)
      this.isConnected = false
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.redis || !this.isConnected) {
      console.warn('Redis cache not available, skipping get')
      return null
    }

    try {
      return await this.redis.get(key)
    } catch (error) {
      console.error('Redis cache get error:', error)
      return null
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      console.warn('Redis cache not available, skipping set')
      return false
    }

    try {
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, value)
      } else {
        await this.redis.set(key, value)
      }
      return true
    } catch (error) {
      console.error('Redis cache set error:', error)
      return false
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      console.warn('Redis cache not available, skipping delete')
      return false
    }

    try {
      await this.redis.del(key)
      return true
    } catch (error) {
      console.error('Redis cache delete error:', error)
      return false
    }
  }

  async flush(): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      console.warn('Redis cache not available, skipping flush')
      return false
    }

    try {
      await this.redis.flushdb()
      return true
    } catch (error) {
      console.error('Redis cache flush error:', error)
      return false
    }
  }

  isAvailable(): boolean {
    return this.isConnected
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
      this.isConnected = false
    }
  }
}

export const cache = new CacheManager()

export const CACHE_KEYS = {
  SITEMAP: 'sitemap:xml',
  SITEMAP_TTL: 3600,
} as const