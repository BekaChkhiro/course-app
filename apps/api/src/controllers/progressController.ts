import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';

/**
 * Update video progress (called every 30 seconds from player)
 */
export const updateProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { chapterId } = req.params;
    const { currentPosition, totalDuration, watchPercentage } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get chapter with course version
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        courseVersion: true,
      },
    });

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    const courseVersionId = chapter.courseVersionId;

    // Calculate completion (90% threshold)
    const isCompleted = watchPercentage >= 90;

    // Get existing progress
    const existingProgress = await prisma.progress.findUnique({
      where: {
        userId_chapterId: {
          userId,
          chapterId,
        },
      },
    });

    // Determine if user can skip ahead
    let canSkipAhead = existingProgress?.canSkipAhead || false;
    let firstWatchCompleted = existingProgress?.firstWatchCompleted || false;

    if (!firstWatchCompleted && isCompleted) {
      // First time completing the video
      firstWatchCompleted = true;
      canSkipAhead = true;
    }

    // Update or create progress
    const progress = await prisma.progress.upsert({
      where: {
        userId_chapterId: {
          userId,
          chapterId,
        },
      },
      update: {
        lastPosition: Math.floor(currentPosition),
        watchPercentage,
        totalWatchTime: {
          increment: 30, // Increment by 30 seconds (called every 30s)
        },
        isCompleted,
        canSkipAhead,
        firstWatchCompleted,
      },
      create: {
        userId,
        chapterId,
        courseVersionId,
        lastPosition: Math.floor(currentPosition),
        watchPercentage,
        totalWatchTime: 30,
        isCompleted,
        canSkipAhead: false,
        firstWatchCompleted,
      },
    });

    res.json({
      success: true,
      data: {
        lastPosition: progress.lastPosition,
        watchPercentage: progress.watchPercentage,
        isCompleted: progress.isCompleted,
        canSkipAhead: progress.canSkipAhead,
        firstWatchCompleted: progress.firstWatchCompleted,
      },
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update progress',
    });
  }
};

/**
 * Get progress for a chapter
 */
export const getProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { chapterId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const progress = await prisma.progress.findUnique({
      where: {
        userId_chapterId: {
          userId,
          chapterId,
        },
      },
      select: {
        lastPosition: true,
        watchPercentage: true,
        totalWatchTime: true,
        isCompleted: true,
        canSkipAhead: true,
        firstWatchCompleted: true,
        updatedAt: true,
      },
    });

    if (!progress) {
      return res.json({
        success: true,
        data: {
          lastPosition: 0,
          watchPercentage: 0,
          totalWatchTime: 0,
          isCompleted: false,
          canSkipAhead: false,
          firstWatchCompleted: false,
        },
      });
    }

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get progress',
    });
  }
};

/**
 * Get course progress overview
 */
export const getCourseProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get active version for the course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        versions: {
          where: { isActive: true },
          include: {
            chapters: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!course || course.versions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course or active version not found',
      });
    }

    const activeVersion = course.versions[0];
    const chapters = activeVersion.chapters;

    // Get progress for all chapters
    const progressData = await prisma.progress.findMany({
      where: {
        userId,
        chapterId: {
          in: chapters.map((c) => c.id),
        },
      },
    });

    const progressMap = new Map(
      progressData.map((p) => [p.chapterId, p])
    );

    const chaptersWithProgress = chapters.map((chapter) => {
      const progress = progressMap.get(chapter.id);
      return {
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
        lastPosition: progress?.lastPosition || 0,
        watchPercentage: progress?.watchPercentage || 0,
        isCompleted: progress?.isCompleted || false,
        canSkipAhead: progress?.canSkipAhead || false,
      };
    });

    const completedCount = chaptersWithProgress.filter((c) => c.isCompleted).length;
    const totalCount = chapters.length;
    const overallProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    res.json({
      success: true,
      data: {
        courseId,
        versionId: activeVersion.id,
        totalChapters: totalCount,
        completedChapters: completedCount,
        overallProgress: Math.round(overallProgress),
        chapters: chaptersWithProgress,
      },
    });
  } catch (error) {
    console.error('Get course progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get course progress',
    });
  }
};

/**
 * Mark chapter as completed manually (for non-video content)
 */
export const markAsCompleted = async (req: AuthRequest, res: Response) => {
  try {
    const { chapterId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { courseVersion: true },
    });

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    const progress = await prisma.progress.upsert({
      where: {
        userId_chapterId: {
          userId,
          chapterId,
        },
      },
      update: {
        isCompleted: true,
        watchPercentage: 100,
        canSkipAhead: true,
        firstWatchCompleted: true,
      },
      create: {
        userId,
        chapterId,
        courseVersionId: chapter.courseVersionId,
        isCompleted: true,
        watchPercentage: 100,
        canSkipAhead: true,
        firstWatchCompleted: true,
        lastPosition: 0,
        totalWatchTime: 0,
      },
    });

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error('Mark as completed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as completed',
    });
  }
};

/**
 * Reset chapter progress
 */
export const resetProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { chapterId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    await prisma.progress.update({
      where: {
        userId_chapterId: {
          userId,
          chapterId,
        },
      },
      data: {
        lastPosition: 0,
        watchPercentage: 0,
        totalWatchTime: 0,
        isCompleted: false,
        // Keep canSkipAhead and firstWatchCompleted as they were
      },
    });

    res.json({
      success: true,
      message: 'Progress reset successfully',
    });
  } catch (error) {
    console.error('Reset progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset progress',
    });
  }
};

/**
 * Reset entire course progress (for testing purposes)
 * Deletes: Progress, QuizAttempts, QuizResponses, Certificates
 */
export const resetCourseProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get course with active version and chapters
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        versions: {
          include: {
            chapters: {
              include: {
                contents: {
                  include: {
                    quiz: true,
                  },
                },
              },
            },
            finalExams: true,
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Collect all chapter IDs, quiz IDs, and version IDs
    const chapterIds: string[] = [];
    const quizIds: string[] = [];
    const versionIds: string[] = [];

    for (const version of course.versions) {
      versionIds.push(version.id);

      // Add final exam quizzes if exists
      if (version.finalExams && version.finalExams.length > 0) {
        for (const finalExam of version.finalExams) {
          quizIds.push(finalExam.id);
        }
      }

      for (const chapter of version.chapters) {
        chapterIds.push(chapter.id);

        // Add chapter quizzes
        for (const content of chapter.contents) {
          if (content.quiz) {
            quizIds.push(content.quiz.id);
          }
        }
      }
    }

    // Also check for chapter-level quizzes (directly linked to chapter)
    const chapterQuizzes = await prisma.quiz.findMany({
      where: {
        chapterId: { in: chapterIds },
      },
      select: { id: true },
    });
    quizIds.push(...chapterQuizzes.map(q => q.id));

    // Start transaction for safe deletion
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get all quiz attempts for this user in this course
      const attempts = await tx.quizAttempt.findMany({
        where: {
          userId,
          quizId: { in: quizIds },
        },
        select: { id: true },
      });
      const attemptIds = attempts.map(a => a.id);

      // 2. Delete certificates
      const deletedCertificates = await tx.certificate.deleteMany({
        where: {
          attemptId: { in: attemptIds },
        },
      });

      // 3. Delete quiz responses
      const deletedResponses = await tx.quizResponse.deleteMany({
        where: {
          attemptId: { in: attemptIds },
        },
      });

      // 4. Delete quiz attempts
      const deletedAttempts = await tx.quizAttempt.deleteMany({
        where: {
          id: { in: attemptIds },
        },
      });

      // 5. Delete progress records
      const deletedProgress = await tx.progress.deleteMany({
        where: {
          userId,
          chapterId: { in: chapterIds },
        },
      });

      return {
        deletedProgress: deletedProgress.count,
        deletedAttempts: deletedAttempts.count,
        deletedResponses: deletedResponses.count,
        deletedCertificates: deletedCertificates.count,
      };
    });

    res.json({
      success: true,
      data: result,
      message: 'კურსის პროგრესი წარმატებით წაიშალა',
    });
  } catch (error) {
    console.error('Reset course progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset course progress',
    });
  }
};

/**
 * Get user's overall learning statistics
 */
export const getUserStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get all user progress
    const allProgress = await prisma.progress.findMany({
      where: { userId },
      include: {
        chapter: {
          include: {
            courseVersion: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    const totalChapters = allProgress.length;
    const completedChapters = allProgress.filter((p) => p.isCompleted).length;
    const totalWatchTime = allProgress.reduce((sum, p) => sum + p.totalWatchTime, 0);

    // Group by course
    const courseMap = new Map();
    allProgress.forEach((progress) => {
      const courseId = progress.chapter.courseVersion.courseId;
      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, {
          courseId,
          courseTitle: progress.chapter.courseVersion.course.title,
          totalChapters: 0,
          completedChapters: 0,
          watchTime: 0,
        });
      }
      const courseData = courseMap.get(courseId);
      courseData.totalChapters++;
      if (progress.isCompleted) courseData.completedChapters++;
      courseData.watchTime += progress.totalWatchTime;
    });

    const courses = Array.from(courseMap.values()).map((course) => ({
      ...course,
      progress: (course.completedChapters / course.totalChapters) * 100,
    }));

    res.json({
      success: true,
      data: {
        totalChapters,
        completedChapters,
        totalWatchTime, // in seconds
        totalWatchTimeHours: (totalWatchTime / 3600).toFixed(1),
        overallProgress:
          totalChapters > 0 ? ((completedChapters / totalChapters) * 100).toFixed(1) : 0,
        courses,
      },
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user statistics',
    });
  }
};
