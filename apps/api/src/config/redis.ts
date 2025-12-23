import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL

console.log('🔍 REDIS_URL:', redisUrl ? 'configured' : 'not configured')

let redis: Redis | null = null

if (redisUrl) {
  redis = new Redis(redisUrl, {
    retryStrategy: (times) => {
      if (times > 3) {
        console.log('⚠️ Redis: max retries reached, stopping reconnection')
        return null
      }
      return Math.min(times * 100, 2000)
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })

  redis.on('connect', () => {
    console.log('✅ Redis connected')
  })

  redis.on('error', (err) => {
    console.log('⚠️ Redis error:', err.message)
  })

  redis.connect().catch((err) => {
    console.log('⚠️ Redis connection failed:', err.message)
    redis = null
  })
} else {
  console.log('ℹ️ Running without Redis (REDIS_URL not set)')
}

export default redis
