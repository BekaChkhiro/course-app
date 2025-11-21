import Bull, { Queue, Job } from 'bull';
import Redis from 'ioredis';

interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
}

interface VideoProcessingJobData {
  videoId: string;
  chapterId: string;
  courseId: string;
  originalFilePath: string;
  r2Key: string;
  userId: string;
}

interface ThumbnailGenerationJobData {
  videoId: string;
  videoPath: string;
  chapterId: string;
  courseId: string;
  interval: number; // seconds
}

interface VideoMetadataJobData {
  videoId: string;
  videoPath: string;
}

class QueueService {
  private videoProcessingQueue: Queue<VideoProcessingJobData>;
  private thumbnailQueue: Queue<ThumbnailGenerationJobData>;
  private metadataQueue: Queue<VideoMetadataJobData>;
  private config: QueueConfig;

  constructor() {
    // Redis configuration
    this.config = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
      },
    };

    // Create Redis client
    const redisClient = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    // Initialize queues
    this.videoProcessingQueue = new Bull<VideoProcessingJobData>(
      'video-processing',
      {
        redis: this.config.redis,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: false,
          removeOnFail: false,
        },
      }
    );

    this.thumbnailQueue = new Bull<ThumbnailGenerationJobData>(
      'thumbnail-generation',
      {
        redis: this.config.redis,
        defaultJobOptions: {
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 5000,
          },
        },
      }
    );

    this.metadataQueue = new Bull<VideoMetadataJobData>('video-metadata', {
      redis: this.config.redis,
      defaultJobOptions: {
        attempts: 2,
      },
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for all queues
   */
  private setupEventListeners(): void {
    // Video processing queue events
    this.videoProcessingQueue.on('completed', (job: Job) => {
      console.log(`Video processing job ${job.id} completed`);
    });

    this.videoProcessingQueue.on('failed', (job: Job, err: Error) => {
      console.error(`Video processing job ${job?.id} failed:`, err);
    });

    this.videoProcessingQueue.on('progress', (job: Job, progress: number) => {
      console.log(`Video processing job ${job.id} progress: ${progress}%`);
    });

    // Thumbnail queue events
    this.thumbnailQueue.on('completed', (job: Job) => {
      console.log(`Thumbnail generation job ${job.id} completed`);
    });

    this.thumbnailQueue.on('failed', (job: Job, err: Error) => {
      console.error(`Thumbnail generation job ${job?.id} failed:`, err);
    });

    // Metadata queue events
    this.metadataQueue.on('completed', (job: Job) => {
      console.log(`Metadata extraction job ${job.id} completed`);
    });

    this.metadataQueue.on('failed', (job: Job, err: Error) => {
      console.error(`Metadata extraction job ${job?.id} failed:`, err);
    });
  }

  /**
   * Add a video processing job
   */
  async addVideoProcessingJob(
    data: VideoProcessingJobData,
    priority?: number
  ): Promise<Job<VideoProcessingJobData>> {
    return this.videoProcessingQueue.add(data, {
      priority: priority || 1,
      jobId: `video-${data.videoId}`,
    });
  }

  /**
   * Add a thumbnail generation job
   */
  async addThumbnailGenerationJob(
    data: ThumbnailGenerationJobData
  ): Promise<Job<ThumbnailGenerationJobData>> {
    return this.thumbnailQueue.add(data, {
      jobId: `thumbnail-${data.videoId}`,
    });
  }

  /**
   * Add a metadata extraction job
   */
  async addMetadataExtractionJob(
    data: VideoMetadataJobData
  ): Promise<Job<VideoMetadataJobData>> {
    return this.metadataQueue.add(data, {
      jobId: `metadata-${data.videoId}`,
    });
  }

  /**
   * Get job status
   */
  async getJobStatus(
    queueName: 'video-processing' | 'thumbnail-generation' | 'video-metadata',
    jobId: string
  ): Promise<{
    state: string;
    progress: number;
    data: any;
    returnValue?: any;
    failedReason?: string;
  } | null> {
    const queue =
      queueName === 'video-processing'
        ? this.videoProcessingQueue
        : queueName === 'thumbnail-generation'
        ? this.thumbnailQueue
        : this.metadataQueue;

    const job = await queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress();

    return {
      state,
      progress: typeof progress === 'number' ? progress : 0,
      data: job.data,
      returnValue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  /**
   * Cancel a job
   */
  async cancelJob(
    queueName: 'video-processing' | 'thumbnail-generation' | 'video-metadata',
    jobId: string
  ): Promise<void> {
    const queue =
      queueName === 'video-processing'
        ? this.videoProcessingQueue
        : queueName === 'thumbnail-generation'
        ? this.thumbnailQueue
        : this.metadataQueue;

    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  /**
   * Get all jobs in queue
   */
  async getQueueJobs(
    queueName: 'video-processing' | 'thumbnail-generation' | 'video-metadata',
    statuses: Array<'waiting' | 'active' | 'completed' | 'failed' | 'delayed'>
  ): Promise<Job[]> {
    const queue =
      queueName === 'video-processing'
        ? this.videoProcessingQueue
        : queueName === 'thumbnail-generation'
        ? this.thumbnailQueue
        : this.metadataQueue;

    const jobs = await Promise.all(
      statuses.map((status) => queue.getJobs([status]))
    );

    return jobs.flat();
  }

  /**
   * Clean old jobs
   */
  async cleanQueue(
    queueName: 'video-processing' | 'thumbnail-generation' | 'video-metadata',
    grace: number = 86400000 // 24 hours in ms
  ): Promise<void> {
    const queue =
      queueName === 'video-processing'
        ? this.videoProcessingQueue
        : queueName === 'thumbnail-generation'
        ? this.thumbnailQueue
        : this.metadataQueue;

    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
  }

  /**
   * Pause queue
   */
  async pauseQueue(
    queueName: 'video-processing' | 'thumbnail-generation' | 'video-metadata'
  ): Promise<void> {
    const queue =
      queueName === 'video-processing'
        ? this.videoProcessingQueue
        : queueName === 'thumbnail-generation'
        ? this.thumbnailQueue
        : this.metadataQueue;

    await queue.pause();
  }

  /**
   * Resume queue
   */
  async resumeQueue(
    queueName: 'video-processing' | 'thumbnail-generation' | 'video-metadata'
  ): Promise<void> {
    const queue =
      queueName === 'video-processing'
        ? this.videoProcessingQueue
        : queueName === 'thumbnail-generation'
        ? this.thumbnailQueue
        : this.metadataQueue;

    await queue.resume();
  }

  /**
   * Get queue for processing
   */
  getVideoProcessingQueue(): Queue<VideoProcessingJobData> {
    return this.videoProcessingQueue;
  }

  getThumbnailQueue(): Queue<ThumbnailGenerationJobData> {
    return this.thumbnailQueue;
  }

  getMetadataQueue(): Queue<VideoMetadataJobData> {
    return this.metadataQueue;
  }

  /**
   * Close all queues
   */
  async close(): Promise<void> {
    await this.videoProcessingQueue.close();
    await this.thumbnailQueue.close();
    await this.metadataQueue.close();
  }
}

export default new QueueService();
