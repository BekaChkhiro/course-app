import redis from '../config/redis';

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  SESSION: 60 * 60 * 24, // 24 hours
  USER: 60 * 5, // 5 minutes
  COURSE: 60 * 5, // 5 minutes
  COURSE_LIST: 60 * 2, // 2 minutes
  CHAPTER: 60 * 5, // 5 minutes
  VIDEO_URL: 60 * 60 * 2, // 2 hours
  CATEGORY: 60 * 10, // 10 minutes
  PROGRESS: 60 * 2, // 2 minutes
  QUIZ: 60 * 5, // 5 minutes
  ANALYTICS: 60 * 5, // 5 minutes
  SEARCH: 60 * 2, // 2 minutes
};

// Cache key prefixes
const CACHE_PREFIX = {
  SESSION: 'session:',
  USER: 'user:',
  COURSE: 'course:',
  COURSE_LIST: 'courses:',
  CHAPTER: 'chapter:',
  VIDEO_URL: 'video_url:',
  CATEGORY: 'category:',
  PROGRESS: 'progress:',
  QUIZ: 'quiz:',
  ANALYTICS: 'analytics:',
  RATE_LIMIT: 'rate_limit:',
};

class CacheService {
  // Generic cache operations
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = CACHE_TTL.COURSE): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  }

  // Session caching
  async getSession(sessionId: string): Promise<any | null> {
    return this.get(`${CACHE_PREFIX.SESSION}${sessionId}`);
  }

  async setSession(sessionId: string, data: any): Promise<void> {
    await this.set(`${CACHE_PREFIX.SESSION}${sessionId}`, data, CACHE_TTL.SESSION);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`${CACHE_PREFIX.SESSION}${sessionId}`);
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.delPattern(`${CACHE_PREFIX.SESSION}${userId}:*`);
  }

  // User caching
  async getUser(userId: string): Promise<any | null> {
    return this.get(`${CACHE_PREFIX.USER}${userId}`);
  }

  async setUser(userId: string, data: any): Promise<void> {
    await this.set(`${CACHE_PREFIX.USER}${userId}`, data, CACHE_TTL.USER);
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.del(`${CACHE_PREFIX.USER}${userId}`);
  }

  // Course caching
  async getCourse(courseId: string): Promise<any | null> {
    return this.get(`${CACHE_PREFIX.COURSE}${courseId}`);
  }

  async setCourse(courseId: string, data: any): Promise<void> {
    await this.set(`${CACHE_PREFIX.COURSE}${courseId}`, data, CACHE_TTL.COURSE);
  }

  async getCourseBySlug(slug: string): Promise<any | null> {
    return this.get(`${CACHE_PREFIX.COURSE}slug:${slug}`);
  }

  async setCourseBySlug(slug: string, data: any): Promise<void> {
    await this.set(`${CACHE_PREFIX.COURSE}slug:${slug}`, data, CACHE_TTL.COURSE);
  }

  async invalidateCourse(courseId: string): Promise<void> {
    await this.del(`${CACHE_PREFIX.COURSE}${courseId}`);
    await this.delPattern(`${CACHE_PREFIX.COURSE_LIST}*`);
  }

  async getCourseList(key: string): Promise<any | null> {
    return this.get(`${CACHE_PREFIX.COURSE_LIST}${key}`);
  }

  async setCourseList(key: string, data: any): Promise<void> {
    await this.set(`${CACHE_PREFIX.COURSE_LIST}${key}`, data, CACHE_TTL.COURSE_LIST);
  }

  async invalidateCourseList(): Promise<void> {
    await this.delPattern(`${CACHE_PREFIX.COURSE_LIST}*`);
  }

  // Chapter caching
  async getChapter(chapterId: string): Promise<any | null> {
    return this.get(`${CACHE_PREFIX.CHAPTER}${chapterId}`);
  }

  async setChapter(chapterId: string, data: any): Promise<void> {
    await this.set(`${CACHE_PREFIX.CHAPTER}${chapterId}`, data, CACHE_TTL.CHAPTER);
  }

  async invalidateChapter(chapterId: string): Promise<void> {
    await this.del(`${CACHE_PREFIX.CHAPTER}${chapterId}`);
  }

  async invalidateCourseChapters(courseVersionId: string): Promise<void> {
    await this.delPattern(`${CACHE_PREFIX.CHAPTER}version:${courseVersionId}:*`);
  }

  // Video URL caching (2-hour TTL for signed URLs)
  async getVideoUrl(videoId: string, quality?: string): Promise<string | null> {
    const key = quality
      ? `${CACHE_PREFIX.VIDEO_URL}${videoId}:${quality}`
      : `${CACHE_PREFIX.VIDEO_URL}${videoId}`;
    return this.get(key);
  }

  async setVideoUrl(videoId: string, url: string, quality?: string): Promise<void> {
    const key = quality
      ? `${CACHE_PREFIX.VIDEO_URL}${videoId}:${quality}`
      : `${CACHE_PREFIX.VIDEO_URL}${videoId}`;
    await this.set(key, url, CACHE_TTL.VIDEO_URL);
  }

  async invalidateVideoUrls(videoId: string): Promise<void> {
    await this.delPattern(`${CACHE_PREFIX.VIDEO_URL}${videoId}:*`);
  }

  // Category caching
  async getCategories(): Promise<any | null> {
    return this.get(`${CACHE_PREFIX.CATEGORY}all`);
  }

  async setCategories(data: any): Promise<void> {
    await this.set(`${CACHE_PREFIX.CATEGORY}all`, data, CACHE_TTL.CATEGORY);
  }

  async getCategory(categoryId: string): Promise<any | null> {
    return this.get(`${CACHE_PREFIX.CATEGORY}${categoryId}`);
  }

  async setCategory(categoryId: string, data: any): Promise<void> {
    await this.set(`${CACHE_PREFIX.CATEGORY}${categoryId}`, data, CACHE_TTL.CATEGORY);
  }

  async invalidateCategories(): Promise<void> {
    await this.delPattern(`${CACHE_PREFIX.CATEGORY}*`);
  }

  // Progress caching
  async getProgress(userId: string, chapterId: string): Promise<any | null> {
    return this.get(`${CACHE_PREFIX.PROGRESS}${userId}:${chapterId}`);
  }

  async setProgress(userId: string, chapterId: string, data: any): Promise<void> {
    await this.set(`${CACHE_PREFIX.PROGRESS}${userId}:${chapterId}`, data, CACHE_TTL.PROGRESS);
  }

  async getUserCourseProgress(userId: string, courseVersionId: string): Promise<any | null> {
    return this.get(`${CACHE_PREFIX.PROGRESS}${userId}:course:${courseVersionId}`);
  }

  async setUserCourseProgress(userId: string, courseVersionId: string, data: any): Promise<void> {
    await this.set(`${CACHE_PREFIX.PROGRESS}${userId}:course:${courseVersionId}`, data, CACHE_TTL.PROGRESS);
  }

  async invalidateProgress(userId: string, chapterId?: string): Promise<void> {
    if (chapterId) {
      await this.del(`${CACHE_PREFIX.PROGRESS}${userId}:${chapterId}`);
    } else {
      await this.delPattern(`${CACHE_PREFIX.PROGRESS}${userId}:*`);
    }
  }

  // Quiz caching
  async getQuiz(quizId: string): Promise<any | null> {
    return this.get(`${CACHE_PREFIX.QUIZ}${quizId}`);
  }

  async setQuiz(quizId: string, data: any): Promise<void> {
    await this.set(`${CACHE_PREFIX.QUIZ}${quizId}`, data, CACHE_TTL.QUIZ);
  }

  async invalidateQuiz(quizId: string): Promise<void> {
    await this.del(`${CACHE_PREFIX.QUIZ}${quizId}`);
  }

  // Analytics caching
  async getAnalytics(key: string): Promise<any | null> {
    return this.get(`${CACHE_PREFIX.ANALYTICS}${key}`);
  }

  async setAnalytics(key: string, data: any): Promise<void> {
    await this.set(`${CACHE_PREFIX.ANALYTICS}${key}`, data, CACHE_TTL.ANALYTICS);
  }

  async invalidateAnalytics(): Promise<void> {
    await this.delPattern(`${CACHE_PREFIX.ANALYTICS}*`);
  }

  // Rate limiting helpers
  async checkRateLimit(key: string, limit: number, windowSec: number): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const redisKey = `${CACHE_PREFIX.RATE_LIMIT}${key}`;
    const current = await redis.incr(redisKey);

    if (current === 1) {
      await redis.expire(redisKey, windowSec);
    }

    const ttl = await redis.ttl(redisKey);

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetIn: ttl > 0 ? ttl : windowSec,
    };
  }

  // Cache warming utility
  async warmCache(type: 'courses' | 'categories' | 'popular', fetcher: () => Promise<any>): Promise<void> {
    try {
      const data = await fetcher();
      switch (type) {
        case 'courses':
          await this.setCourseList('all', data);
          break;
        case 'categories':
          await this.setCategories(data);
          break;
        case 'popular':
          await this.setCourseList('popular', data);
          break;
      }
      console.log(`Cache warmed for: ${type}`);
    } catch (error) {
      console.error(`Failed to warm cache for ${type}:`, error);
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  // Clear all cache
  async flushAll(): Promise<void> {
    try {
      await redis.flushdb();
      console.log('Cache flushed');
    } catch (error) {
      console.error('Failed to flush cache:', error);
    }
  }

  // Get cache stats
  async getStats(): Promise<{ keys: number; memory: string }> {
    try {
      const keys = await redis.dbsize();
      const info = await redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memory = memoryMatch ? memoryMatch[1].trim() : 'unknown';
      return { keys, memory };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return { keys: 0, memory: 'unknown' };
    }
  }
}

export const cacheService = new CacheService();
export default cacheService;
