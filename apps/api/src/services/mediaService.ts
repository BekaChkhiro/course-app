import { PrismaClient, VideoProcessingStatus } from '@prisma/client';
import r2Service from './r2.service';

const prisma = new PrismaClient();

interface VideoFilters {
  status?: VideoProcessingStatus;
  courseId?: string;
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'largest' | 'smallest';
  page?: number;
  limit?: number;
}

interface AttachmentFilters {
  type?: 'material' | 'assignment' | 'answer';
  search?: string;
  page?: number;
  limit?: number;
}

interface ImageFilters {
  type?: 'slider' | 'course-thumbnail' | 'quiz-image' | 'video-thumbnail';
  page?: number;
  limit?: number;
}

interface OrphanScanResult {
  key: string;
  size: number;
  lastModified: Date;
}

export class MediaService {
  /**
   * Get all videos with relations and pagination
   */
  static async getVideos(filters: VideoFilters) {
    const {
      status,
      courseId,
      search,
      sortBy = 'newest',
      page = 1,
      limit = 20,
    } = filters;

    const where: any = {};

    if (status) {
      where.processingStatus = status;
    }

    if (courseId) {
      where.chapter = {
        courseVersion: {
          courseId,
        },
      };
    }

    if (search) {
      where.originalName = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Determine sort order
    let orderBy: any = { createdAt: 'desc' };
    switch (sortBy) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'largest':
        orderBy = { originalSize: 'desc' };
        break;
      case 'smallest':
        orderBy = { originalSize: 'asc' };
        break;
    }

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          chapter: {
            select: {
              id: true,
              title: true,
              courseVersion: {
                select: {
                  id: true,
                  version: true,
                  course: {
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
          thumbnails: {
            take: 1,
            orderBy: { timeOffset: 'asc' },
          },
        },
      }),
      prisma.video.count({ where }),
    ]);

    return {
      videos,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all attachments with relations and pagination
   */
  static async getAttachments(filters: AttachmentFilters) {
    const { type, search, page = 1, limit = 20 } = filters;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [attachments, total] = await Promise.all([
      prisma.chapterAttachment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          chapter: {
            select: {
              id: true,
              title: true,
              courseVersion: {
                select: {
                  course: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.chapterAttachment.count({ where }),
    ]);

    return {
      attachments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all images (sliders, course thumbnails, quiz images, video thumbnails)
   */
  static async getImages(filters: ImageFilters) {
    const { type, page = 1, limit = 20 } = filters;

    const images: Array<{
      id: string;
      type: string;
      url: string;
      name: string;
      createdAt: Date;
      context?: string;
    }> = [];

    // If no type filter or specific type requested
    if (!type || type === 'slider') {
      const sliders = await prisma.slider.findMany({
        orderBy: { createdAt: 'desc' },
      });
      sliders.forEach(s => {
        images.push({
          id: s.id,
          type: 'slider',
          url: s.imageUrl,
          name: `Slider #${s.order}`,
          createdAt: s.createdAt,
          context: s.isActive ? 'Active' : 'Inactive',
        });
      });
    }

    if (!type || type === 'course-thumbnail') {
      const courses = await prisma.course.findMany({
        where: { thumbnail: { not: null } },
        select: {
          id: true,
          title: true,
          thumbnail: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      courses.forEach(c => {
        if (c.thumbnail) {
          images.push({
            id: `course-${c.id}`,
            type: 'course-thumbnail',
            url: c.thumbnail,
            name: c.title,
            createdAt: c.createdAt,
            context: 'Course Thumbnail',
          });
        }
      });
    }

    if (!type || type === 'quiz-image') {
      const questions = await prisma.quizQuestion.findMany({
        where: { questionImage: { not: null } },
        select: {
          id: true,
          question: true,
          questionImage: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      questions.forEach(q => {
        if (q.questionImage) {
          images.push({
            id: `quiz-${q.id}`,
            type: 'quiz-image',
            url: q.questionImage,
            name: q.question.substring(0, 50) + (q.question.length > 50 ? '...' : ''),
            createdAt: q.createdAt,
            context: 'Quiz Question',
          });
        }
      });
    }

    if (!type || type === 'video-thumbnail') {
      const thumbnails = await prisma.videoThumbnail.findMany({
        select: {
          id: true,
          url: true,
          r2Key: true,
          timeOffset: true,
          createdAt: true,
          video: {
            select: {
              originalName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      thumbnails.forEach(t => {
        images.push({
          id: t.id,
          type: 'video-thumbnail',
          url: t.url,
          name: `${t.video.originalName} @ ${t.timeOffset}s`,
          createdAt: t.createdAt,
          context: 'Video Thumbnail',
        });
      });
    }

    // Sort by createdAt desc
    images.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Paginate
    const total = images.length;
    const paginatedImages = images.slice((page - 1) * limit, page * limit);

    return {
      images: paginatedImages,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats() {
    const [
      videoStats,
      attachmentStats,
      sliderCount,
      courseThumbnailCount,
      quizImageCount,
      videoThumbnailCount,
      videosByStatus,
      recentVideos,
    ] = await Promise.all([
      // Video stats
      prisma.video.aggregate({
        _count: { id: true },
        _sum: { originalSize: true },
      }),
      // Attachment stats
      prisma.chapterAttachment.aggregate({
        _count: { id: true },
        _sum: { fileSize: true },
      }),
      // Slider count
      prisma.slider.count(),
      // Course thumbnail count
      prisma.course.count({ where: { thumbnail: { not: null } } }),
      // Quiz image count
      prisma.quizQuestion.count({ where: { questionImage: { not: null } } }),
      // Video thumbnail count
      prisma.videoThumbnail.count(),
      // Videos by status
      prisma.video.groupBy({
        by: ['processingStatus'],
        _count: { id: true },
        _sum: { originalSize: true },
      }),
      // Recent videos
      prisma.video.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          originalName: true,
          originalSize: true,
          processingStatus: true,
          createdAt: true,
          chapter: {
            select: {
              title: true,
              courseVersion: {
                select: {
                  course: {
                    select: { title: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const totalImageCount = sliderCount + courseThumbnailCount + quizImageCount + videoThumbnailCount;

    // Format videos by status
    const byStatus: Record<string, { count: number; size: number }> = {};
    videosByStatus.forEach(item => {
      byStatus[item.processingStatus] = {
        count: item._count.id,
        size: item._sum.originalSize || 0,
      };
    });

    return {
      videos: {
        count: videoStats._count.id,
        totalSize: videoStats._sum.originalSize || 0,
      },
      attachments: {
        count: attachmentStats._count.id,
        totalSize: attachmentStats._sum.fileSize || 0,
      },
      images: {
        count: totalImageCount,
        breakdown: {
          sliders: sliderCount,
          courseThumbnails: courseThumbnailCount,
          quizImages: quizImageCount,
          videoThumbnails: videoThumbnailCount,
        },
      },
      total: {
        count: (videoStats._count.id || 0) + (attachmentStats._count.id || 0) + totalImageCount,
        totalSize: (videoStats._sum.originalSize || 0) + (attachmentStats._sum.fileSize || 0),
      },
      byStatus,
      recentUploads: recentVideos.map(v => ({
        id: v.id,
        name: v.originalName,
        size: v.originalSize,
        status: v.processingStatus,
        createdAt: v.createdAt,
        course: v.chapter?.courseVersion?.course?.title,
        chapter: v.chapter?.title,
      })),
    };
  }

  /**
   * Scan for orphan files in R2 that don't exist in database
   */
  static async findOrphanFiles(prefix?: string): Promise<{
    orphanFiles: OrphanScanResult[];
    totalSize: number;
    count: number;
  }> {
    // Get all R2 files with prefix
    const prefixesToScan = prefix
      ? [prefix]
      : ['courses/', 'attachments/', 'sliders/', 'thumbnails/', 'quiz-images/'];

    const allR2Files: Array<{ key: string; size: number; lastModified: Date }> = [];

    for (const p of prefixesToScan) {
      try {
        const files = await r2Service.listFiles(p);
        allR2Files.push(...files);
      } catch (error) {
        console.error(`Error listing R2 files with prefix ${p}:`, error);
      }
    }

    // Get all known keys from database
    const dbKeys = new Set<string>();

    // Video r2Keys
    const videos = await prisma.video.findMany({
      select: { r2Key: true },
    });
    videos.forEach(v => dbKeys.add(v.r2Key));

    // Video thumbnail r2Keys
    const videoThumbnails = await prisma.videoThumbnail.findMany({
      select: { r2Key: true },
    });
    videoThumbnails.forEach(t => dbKeys.add(t.r2Key));

    // Attachment filePaths (already R2 keys)
    const attachments = await prisma.chapterAttachment.findMany({
      select: { filePath: true },
    });
    attachments.forEach(a => dbKeys.add(a.filePath));

    // Slider imageUrls (extract key from URL)
    const sliders = await prisma.slider.findMany({
      select: { imageUrl: true },
    });
    sliders.forEach(s => {
      const key = r2Service.getKeyFromUrl(s.imageUrl);
      if (key) dbKeys.add(key);
    });

    // Course thumbnails (extract key from URL)
    const courses = await prisma.course.findMany({
      where: { thumbnail: { not: null } },
      select: { thumbnail: true },
    });
    courses.forEach(c => {
      if (c.thumbnail) {
        const key = r2Service.getKeyFromUrl(c.thumbnail);
        if (key) dbKeys.add(key);
      }
    });

    // Quiz images (extract key from URL)
    const quizQuestions = await prisma.quizQuestion.findMany({
      where: { questionImage: { not: null } },
      select: { questionImage: true },
    });
    quizQuestions.forEach(q => {
      if (q.questionImage) {
        const key = r2Service.getKeyFromUrl(q.questionImage);
        if (key) dbKeys.add(key);
      }
    });

    // Find orphans (R2 files not in DB)
    const orphanFiles = allR2Files.filter(file => !dbKeys.has(file.key));

    const totalSize = orphanFiles.reduce((sum, f) => sum + f.size, 0);

    return {
      orphanFiles,
      totalSize,
      count: orphanFiles.length,
    };
  }

  /**
   * Delete orphan files from R2
   */
  static async deleteOrphanFiles(keys: string[]): Promise<{ deletedCount: number }> {
    let deletedCount = 0;

    for (const key of keys) {
      try {
        await r2Service.deleteFile(key);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete orphan file ${key}:`, error);
      }
    }

    return { deletedCount };
  }

  /**
   * Bulk delete videos
   */
  static async bulkDeleteVideos(videoIds: string[]): Promise<{ deletedCount: number }> {
    let deletedCount = 0;

    for (const videoId of videoIds) {
      try {
        // Get video with thumbnails
        const video = await prisma.video.findUnique({
          where: { id: videoId },
          include: { thumbnails: true },
        });

        if (!video) continue;

        // Delete R2 files
        if (video.r2Bucket !== 'local' && video.r2Key) {
          try {
            await r2Service.deleteFile(video.r2Key);
          } catch (error) {
            console.error(`Failed to delete video R2 file:`, error);
          }

          // Delete thumbnails from R2
          for (const thumb of video.thumbnails) {
            try {
              await r2Service.deleteFile(thumb.r2Key);
            } catch (error) {
              console.error(`Failed to delete thumbnail R2 file:`, error);
            }
          }
        }

        // Delete from database (cascades to thumbnails, accessTokens, analytics, etc.)
        await prisma.video.delete({
          where: { id: videoId },
        });

        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete video ${videoId}:`, error);
      }
    }

    return { deletedCount };
  }

  /**
   * Bulk delete attachments
   */
  static async bulkDeleteAttachments(attachmentIds: string[]): Promise<{ deletedCount: number }> {
    let deletedCount = 0;

    for (const attachmentId of attachmentIds) {
      try {
        const attachment = await prisma.chapterAttachment.findUnique({
          where: { id: attachmentId },
        });

        if (!attachment) continue;

        // Delete from R2
        try {
          await r2Service.deleteFile(attachment.filePath);
        } catch (error) {
          console.error(`Failed to delete attachment R2 file:`, error);
        }

        // Delete from database
        await prisma.chapterAttachment.delete({
          where: { id: attachmentId },
        });

        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete attachment ${attachmentId}:`, error);
      }
    }

    return { deletedCount };
  }

  /**
   * Get presigned URL for video preview
   */
  static async getVideoPreviewUrl(videoId: string): Promise<string | null> {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video || !video.r2Key) return null;

    try {
      return await r2Service.getPresignedUrl(video.r2Key, 7200); // 2 hours
    } catch (error) {
      console.error('Failed to generate presigned URL:', error);
      return null;
    }
  }

  /**
   * Get list of courses for filter dropdown
   */
  static async getCoursesForFilter() {
    return prisma.course.findMany({
      select: {
        id: true,
        title: true,
      },
      orderBy: { title: 'asc' },
    });
  }
}
