/**
 * Redis Client for Caching Layer
 * Optional caching infrastructure - gracefully degrades if Redis is not available
 */

import { log } from '../log'

interface RedisClientConfig {
  url?: string
  enabled?: boolean
  reconnectStrategy?: (retries: number) => number
}

class RedisClient {
  private client: any = null
  private enabled: boolean = false
  private connected: boolean = false

  constructor(config: RedisClientConfig = {}) {
    this.enabled = config.enabled ?? process.env.REDIS_ENABLED === 'true'

    if (!this.enabled) {
      log('Redis caching disabled')
      return
    }

    // Lazy load redis to avoid requiring it when disabled
    this.initializeClient(config).catch((err) => {
      log('Failed to initialize Redis client', { error: err.message })
      this.enabled = false
    })
  }

  private async initializeClient(config: RedisClientConfig): Promise<void> {
    try {
      const redis = await import('redis')
      const redisUrl = config.url || process.env.REDIS_URL || 'redis://localhost:6379'

      this.client = redis.createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: config.reconnectStrategy || ((retries) => Math.min(retries * 50, 2000))
        }
      })

      this.client.on('error', (err: Error) => {
        log('Redis error', { error: err.message })
        this.connected = false
      })

      this.client.on('connect', () => {
        log('Redis connected')
        this.connected = true
      })

      this.client.on('disconnect', () => {
        log('Redis disconnected')
        this.connected = false
      })

      await this.client.connect()
    } catch (error) {
      log('Redis client initialization failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.enabled || !this.connected || !this.client) {
      return null
    }

    try {
      return await this.client.get(key)
    } catch (error) {
      log('Redis GET error', { key, error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.enabled || !this.connected || !this.client) {
      return false
    }

    try {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value)
      } else {
        await this.client.set(key, value)
      }
      return true
    } catch (error) {
      log('Redis SET error', { key, error: error instanceof Error ? error.message : String(error) })
      return false
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.enabled || !this.connected || !this.client) {
      return false
    }

    try {
      await this.client.del(key)
      return true
    } catch (error) {
      log('Redis DEL error', { key, error: error instanceof Error ? error.message : String(error) })
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.enabled || !this.connected || !this.client) {
      return false
    }

    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      return false
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      try {
        await this.client.disconnect()
        log('Redis disconnected gracefully')
      } catch (error) {
        log('Error disconnecting Redis', {
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  isConnected(): boolean {
    return this.connected
  }
}

// Export singleton instance
export const redis = new RedisClient({
  enabled: process.env.REDIS_ENABLED === 'true',
  url: process.env.REDIS_URL
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redis.disconnect()
})

process.on('SIGINT', async () => {
  await redis.disconnect()
})
