import Bull, { Queue, Job } from 'bull';

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
  private videoProcessingQueue: Queue<VideoProcessingJobData> | null = null;
  private thumbnailQueue: Queue<ThumbnailGenerationJobData> | null = null;
  private metadataQueue: Queue<VideoMetadataJobData> | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;

    if (!redisUrl) {
      console.log('ℹ️ QueueService: Redis not configured, queues disabled');
      return;
    }

    try {
      // Initialize queues with Redis URL
      this.videoProcessingQueue = new Bull<VideoProcessingJobData>(
        'video-processing',
        redisUrl,
        {
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
        redisUrl,
        {
          defaultJobOptions: {
            attempts: 2,
            backoff: {
              type: 'fixed',
              delay: 5000,
            },
          },
        }
      );

      this.metadataQueue = new Bull<VideoMetadataJobData>(
        'video-metadata',
        redisUrl,
        {
          defaultJobOptions: {
            attempts: 2,
          },
        }
      );

      // Set up event listeners
      this.setupEventListeners();
      this.initialized = true;
      console.log('✅ QueueService: Initialized with Redis');
    } catch (error) {
      console.log('⚠️ QueueService: Failed to initialize:', error);
    }
  }

  isAvailable(): boolean {
    return this.initialized && this.videoProcessingQueue !== null;
  }

  /**
   * Setup event listeners for all queues
   */
  private setupEventListeners(): void {
    if (!this.videoProcessingQueue || !this.thumbnailQueue || !this.metadataQueue) return;

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
  ): Promise<Job<VideoProcessingJobData> | null> {
    if (!this.videoProcessingQueue) return null;
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
  ): Promise<Job<ThumbnailGenerationJobData> | null> {
    if (!this.thumbnailQueue) return null;
    return this.thumbnailQueue.add(data, {
      jobId: `thumbnail-${data.videoId}`,
    });
  }

  /**
   * Add a metadata extraction job
   */
  async addMetadataExtractionJob(
    data: VideoMetadataJobData
  ): Promise<Job<VideoMetadataJobData> | null> {
    if (!this.metadataQueue) return null;
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

    if (!queue) return null;

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

    if (!queue) return;

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

    if (!queue) return [];

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

    if (!queue) return;

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

    if (!queue) return;

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

    if (!queue) return;

    await queue.resume();
  }

  /**
   * Get queue for processing
   */
  getVideoProcessingQueue(): Queue<VideoProcessingJobData> | null {
    return this.videoProcessingQueue;
  }

  getThumbnailQueue(): Queue<ThumbnailGenerationJobData> | null {
    return this.thumbnailQueue;
  }

  getMetadataQueue(): Queue<VideoMetadataJobData> | null {
    return this.metadataQueue;
  }

  /**
   * Close all queues
   */
  async close(): Promise<void> {
    if (this.videoProcessingQueue) await this.videoProcessingQueue.close();
    if (this.thumbnailQueue) await this.thumbnailQueue.close();
    if (this.metadataQueue) await this.metadataQueue.close();
  }
}

export default new QueueService();
