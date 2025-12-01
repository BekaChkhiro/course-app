import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';

// Performance metrics collector
interface PerformanceMetric {
  metricType: string;
  endpoint?: string;
  value: number;
  timestamp: Date;
}

interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  ip: string;
  userAgent?: string;
  userId?: string;
  error?: string;
}

class MonitoringService {
  private metrics: PerformanceMetric[] = [];
  private requestMetrics: RequestMetrics[] = [];
  private errorCounts: Map<string, number> = new Map();
  private readonly flushInterval = 60000; // 1 minute
  private readonly maxMetricsBuffer = 1000;

  constructor() {
    // Start periodic flush
    setInterval(() => this.flush(), this.flushInterval);
  }

  // Request timing middleware
  requestTimer() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = process.hrtime.bigint();

      res.on('finish', () => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1e6; // Convert to milliseconds

        this.recordRequest({
          method: req.method,
          path: req.route?.path || req.path,
          statusCode: res.statusCode,
          duration,
          ip: req.ip || 'unknown',
          userAgent: req.get('User-Agent'),
          userId: (req as any).userId,
        });
      });

      next();
    };
  }

  // Record a request metric
  recordRequest(metric: RequestMetrics) {
    this.requestMetrics.push(metric);

    // Track errors
    if (metric.statusCode >= 500) {
      const key = `${metric.method}:${metric.path}`;
      this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    }

    // Prevent memory overflow
    if (this.requestMetrics.length > this.maxMetricsBuffer) {
      this.flush();
    }
  }

  // Record a custom metric
  recordMetric(type: string, value: number, endpoint?: string) {
    this.metrics.push({
      metricType: type,
      endpoint,
      value,
      timestamp: new Date(),
    });
  }

  // Flush metrics to database
  async flush() {
    if (this.metrics.length === 0 && this.requestMetrics.length === 0) {
      return;
    }

    try {
      // Calculate aggregated metrics by hour
      const now = new Date();
      const hour = new Date(now.setMinutes(0, 0, 0));

      // Aggregate request metrics
      const aggregated = this.aggregateRequestMetrics();

      // Store performance metrics
      for (const [key, data] of Object.entries(aggregated)) {
        const [metricType, endpoint] = key.split('|');

        await db.performanceMetric.upsert({
          where: {
            metricType_endpoint_hour: {
              metricType,
              endpoint: endpoint || '',
              hour,
            },
          },
          update: {
            avgValue: data.avg,
            minValue: data.min,
            maxValue: data.max,
            p50Value: data.p50,
            p95Value: data.p95,
            p99Value: data.p99,
            sampleCount: { increment: data.count },
          },
          create: {
            metricType,
            endpoint: endpoint || null,
            hour,
            avgValue: data.avg,
            minValue: data.min,
            maxValue: data.max,
            p50Value: data.p50,
            p95Value: data.p95,
            p99Value: data.p99,
            sampleCount: data.count,
          },
        });
      }

      // Clear buffers
      this.metrics = [];
      this.requestMetrics = [];
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  // Aggregate request metrics for storage
  private aggregateRequestMetrics() {
    const grouped: Record<string, number[]> = {};

    for (const metric of this.requestMetrics) {
      const key = `api_response|${metric.method} ${metric.path}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(metric.duration);
    }

    const result: Record<string, {
      avg: number;
      min: number;
      max: number;
      p50: number;
      p95: number;
      p99: number;
      count: number;
    }> = {};

    for (const [key, values] of Object.entries(grouped)) {
      const sorted = values.sort((a, b) => a - b);
      const count = sorted.length;

      result[key] = {
        avg: values.reduce((a, b) => a + b, 0) / count,
        min: sorted[0],
        max: sorted[count - 1],
        p50: sorted[Math.floor(count * 0.5)],
        p95: sorted[Math.floor(count * 0.95)],
        p99: sorted[Math.floor(count * 0.99)],
        count,
      };
    }

    return result;
  }

  // Get current stats (for health checks)
  getStats() {
    const now = Date.now();
    const recentRequests = this.requestMetrics.filter(
      m => now - m.timestamp < 60000
    );

    const avgDuration = recentRequests.length > 0
      ? recentRequests.reduce((a, b) => a + b.duration, 0) / recentRequests.length
      : 0;

    const errorRate = recentRequests.length > 0
      ? recentRequests.filter(m => m.statusCode >= 500).length / recentRequests.length
      : 0;

    return {
      requestsPerMinute: recentRequests.length,
      avgResponseTime: Math.round(avgDuration * 100) / 100,
      errorRate: Math.round(errorRate * 10000) / 100, // As percentage
      bufferedMetrics: this.metrics.length,
      bufferedRequests: this.requestMetrics.length,
    };
  }

  // Log activity for audit trail
  async logActivity(
    userId: string | null,
    activityType: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: any,
    req?: Request
  ) {
    try {
      await db.activityLog.create({
        data: {
          userId,
          sessionId: req?.get('X-Session-ID'),
          activityType,
          resourceType,
          resourceId,
          metadata,
          ipAddress: req?.ip,
          userAgent: req?.get('User-Agent'),
        },
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  // Get recent activity
  async getRecentActivity(options: {
    userId?: string;
    activityType?: string;
    resourceType?: string;
    limit?: number;
    offset?: number;
  }) {
    return db.activityLog.findMany({
      where: {
        userId: options.userId,
        activityType: options.activityType,
        resourceType: options.resourceType,
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0,
    });
  }
}

// Structured logger
class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] [${this.context}] ${message}${metaStr}`;
  }

  info(message: string, meta?: any) {
    console.log(this.formatMessage('INFO', message, meta));
  }

  warn(message: string, meta?: any) {
    console.warn(this.formatMessage('WARN', message, meta));
  }

  error(message: string, error?: Error, meta?: any) {
    const errorMeta = error
      ? { ...meta, error: { message: error.message, stack: error.stack } }
      : meta;
    console.error(this.formatMessage('ERROR', message, errorMeta));
  }

  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }

  // Log security events
  security(event: string, details: any) {
    console.log(this.formatMessage('SECURITY', event, details));
  }

  // Log performance metrics
  performance(operation: string, duration: number, details?: any) {
    console.log(this.formatMessage('PERF', `${operation} completed in ${duration}ms`, details));
  }
}

// Create logger factory
export const createLogger = (context: string) => new Logger(context);

// Export singleton monitoring service
export const monitoringService = new MonitoringService();

// Health check endpoint data
export const getHealthStatus = async () => {
  const startTime = process.hrtime.bigint();

  // Check database
  let dbStatus = 'healthy';
  let dbLatency = 0;
  try {
    const dbStart = process.hrtime.bigint();
    await db.$queryRaw`SELECT 1`;
    dbLatency = Number(process.hrtime.bigint() - dbStart) / 1e6;
  } catch {
    dbStatus = 'unhealthy';
  }

  // Get monitoring stats
  const stats = monitoringService.getStats();

  // Memory usage
  const memUsage = process.memoryUsage();
  const memory = {
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024),
    rss: Math.round(memUsage.rss / 1024 / 1024),
  };

  // CPU usage (rough estimate)
  const cpuUsage = process.cpuUsage();

  const totalLatency = Number(process.hrtime.bigint() - startTime) / 1e6;

  return {
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    checks: {
      database: {
        status: dbStatus,
        latency: Math.round(dbLatency * 100) / 100,
      },
    },
    metrics: stats,
    memory,
    responseTime: Math.round(totalLatency * 100) / 100,
  };
};

// Error tracking helper
export const trackError = (error: Error, context: string, req?: Request) => {
  const logger = createLogger(context);
  logger.error('Unhandled error', error, {
    path: req?.path,
    method: req?.method,
    userId: (req as any)?.userId,
  });

  // In production, you would send this to Sentry
  if (process.env.SENTRY_DSN) {
    // Sentry.captureException(error, { extra: { context, path: req?.path } });
  }
};

export default monitoringService;
