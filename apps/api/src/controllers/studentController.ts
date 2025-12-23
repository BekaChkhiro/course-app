import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import r2Service from '../services/r2.service';
import { EmailService } from '../services/emailService';

/**
 * Get student dashboard data
 * Includes: stats, continue learning, recent activity, gamification
 */
export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get purchased courses with progress
    const purchases = await prisma.purchase.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      include: {
        course: {
          include: {
            category: true,
            versions: {
              where: { isActive: true },
              include: {
                chapters: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    // Get all progress for the user
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
      orderBy: { updatedAt: 'desc' },
    });

    // Calculate course progress
    const coursesWithProgress = purchases.map((purchase) => {
      const activeVersion = purchase.course.versions[0];
      if (!activeVersion) return null;

      const chapters = activeVersion.chapters;
      const courseProgress = allProgress.filter(
        (p) => p.chapter.courseVersion.courseId === purchase.courseId
      );

      const completedChapters = courseProgress.filter((p) => p.isCompleted).length;
      const totalChapters = chapters.length;
      const progressPercentage = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

      // Find last accessed chapter
      const lastAccessed = courseProgress[0];
      const lastAccessedChapter = lastAccessed
        ? chapters.find((c) => c.id === lastAccessed.chapterId)
        : chapters[0];

      // Find next chapter to continue
      const nextChapter = chapters.find((chapter) => {
        const chapterProgress = courseProgress.find((p) => p.chapterId === chapter.id);
        return !chapterProgress?.isCompleted;
      }) || lastAccessedChapter;

      return {
        id: purchase.course.id,
        title: purchase.course.title,
        slug: purchase.course.slug,
        thumbnail: purchase.course.thumbnail,
        category: purchase.course.category.name,
        totalChapters,
        completedChapters,
        progressPercentage,
        lastAccessedAt: lastAccessed?.updatedAt,
        nextChapter: nextChapter
          ? {
              id: nextChapter.id,
              title: nextChapter.title,
              order: nextChapter.order,
            }
          : null,
        purchasedAt: purchase.createdAt,
      };
    }).filter(Boolean);

    // Continue learning (most recent 3 courses with progress < 100%)
    const continueLearning = coursesWithProgress
      .filter((c) => c && c.progressPercentage < 100)
      .sort((a, b) => {
        const aDate = a?.lastAccessedAt || a?.purchasedAt;
        const bDate = b?.lastAccessedAt || b?.purchasedAt;
        return new Date(bDate!).getTime() - new Date(aDate!).getTime();
      })
      .slice(0, 3);

    // Get study streak
    const studyStreak = await prisma.studyStreak.findUnique({
      where: { userId },
    });

    // Get user XP and level
    const userXP = await prisma.userXP.findUnique({
      where: { userId },
    });

    // Get recent badges (last 5)
    const recentBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
      take: 5,
    });

    // Calculate overall stats
    const totalWatchTime = allProgress.reduce((sum, p) => sum + p.totalWatchTime, 0);
    const completedChaptersTotal = allProgress.filter((p) => p.isCompleted).length;

    // Get certificates count
    const certificatesCount = await prisma.certificate.count({
      where: { userId },
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalCourses: purchases.length,
          completedCourses: coursesWithProgress.filter((c) => c?.progressPercentage === 100).length,
          inProgressCourses: coursesWithProgress.filter((c) => c && c.progressPercentage > 0 && c.progressPercentage < 100).length,
          totalChaptersCompleted: completedChaptersTotal,
          totalWatchTimeHours: Math.round((totalWatchTime / 3600) * 10) / 10,
          certificates: certificatesCount,
        },
        continueLearning,
        studyStreak: studyStreak || {
          currentStreak: 0,
          longestStreak: 0,
          totalStudyDays: 0,
        },
        gamification: {
          level: userXP?.level || 1,
          totalXP: userXP?.totalXP || 0,
          xpToNextLevel: calculateXPToNextLevel(userXP?.level || 1),
          recentBadges: recentBadges.map((ub) => ({
            id: ub.badge.id,
            name: ub.badge.name,
            icon: ub.badge.icon,
            earnedAt: ub.earnedAt,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data',
    });
  }
};

/**
 * Get all purchased courses with detailed progress
 */
export const getMyCourses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { filter, sort, search } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get purchased courses
    const purchases = await prisma.purchase.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      include: {
        course: {
          include: {
            category: true,
            author: {
              select: {
                id: true,
                name: true,
                surname: true,
                avatar: true,
              },
            },
            versions: {
              where: { isActive: true },
              include: {
                chapters: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    // Get all progress for the user
    const allProgress = await prisma.progress.findMany({
      where: { userId },
    });

    const progressMap = new Map(allProgress.map((p) => [p.chapterId, p]));

    // Build courses with progress
    let courses = purchases.map((purchase) => {
      const activeVersion = purchase.course.versions[0];
      if (!activeVersion) return null;

      const chapters = activeVersion.chapters;
      const completedChapters = chapters.filter((c) => progressMap.get(c.id)?.isCompleted).length;
      const totalChapters = chapters.length;
      const progressPercentage = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

      // Find last accessed time
      const chapterProgress = chapters
        .map((c) => progressMap.get(c.id))
        .filter(Boolean)
        .sort((a, b) => new Date(b!.updatedAt).getTime() - new Date(a!.updatedAt).getTime());

      const lastAccessedAt = chapterProgress[0]?.updatedAt;

      return {
        id: purchase.course.id,
        title: purchase.course.title,
        slug: purchase.course.slug,
        description: purchase.course.description,
        thumbnail: purchase.course.thumbnail,
        category: purchase.course.category,
        author: purchase.course.author,
        totalChapters,
        completedChapters,
        progressPercentage,
        lastAccessedAt,
        purchasedAt: purchase.createdAt,
        status: progressPercentage === 100 ? 'completed' : progressPercentage > 0 ? 'in_progress' : 'not_started',
      };
    }).filter(Boolean);

    // Apply search filter
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      courses = courses.filter(
        (c) =>
          c?.title.toLowerCase().includes(searchLower) ||
          c?.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filter && filter !== 'all') {
      courses = courses.filter((c) => c?.status === filter);
    }

    // Apply sorting
    if (sort) {
      courses.sort((a, b) => {
        if (!a || !b) return 0;
        switch (sort) {
          case 'recent':
            const aDate = a.lastAccessedAt || a.purchasedAt;
            const bDate = b.lastAccessedAt || b.purchasedAt;
            return new Date(bDate).getTime() - new Date(aDate).getTime();
          case 'progress':
            return b.progressPercentage - a.progressPercentage;
          case 'name':
            return a.title.localeCompare(b.title);
          case 'oldest':
            return new Date(a.purchasedAt).getTime() - new Date(b.purchasedAt).getTime();
          default:
            return 0;
        }
      });
    }

    res.json({
      success: true,
      data: {
        courses,
        total: courses.length,
      },
    });
  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get courses',
    });
  }
};

/**
 * Get course learning data (for course learning interface)
 */
export const getCourseForLearning = async (req: AuthRequest, res: Response) => {
  try {
    const { courseSlug } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get course basic info first
    const course = await prisma.course.findUnique({
      where: { slug: courseSlug },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        thumbnail: true,
        price: true,
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            surname: true,
            avatar: true,
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

    // Check if user has purchased this course
    const purchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: course.id,
        },
      },
    });

    if (!purchase || purchase.status !== 'COMPLETED') {
      return res.status(403).json({
        success: false,
        message: 'You have not purchased this course',
      });
    }

    // Get the version the user purchased (or active version for legacy purchases)
    let userVersion;
    if (purchase.courseVersionId) {
      // User has a specific version they purchased
      userVersion = await prisma.courseVersion.findUnique({
        where: { id: purchase.courseVersionId },
        include: {
          chapters: {
            orderBy: { order: 'asc' },
            include: {
              videos: true,
              quiz: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  passingScore: true,
                  timeLimit: true,
                },
              },
            },
          },
          finalExams: {
            select: {
              id: true,
              title: true,
              type: true,
              passingScore: true,
              timeLimit: true,
              lockUntilChaptersComplete: true,
            },
          },
        },
      });
    } else {
      // Legacy purchase - use active version
      userVersion = await prisma.courseVersion.findFirst({
        where: { courseId: course.id, isActive: true },
        include: {
          chapters: {
            orderBy: { order: 'asc' },
            include: {
              videos: true,
              quiz: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  passingScore: true,
                  timeLimit: true,
                },
              },
            },
          },
          finalExams: {
            select: {
              id: true,
              title: true,
              type: true,
              passingScore: true,
              timeLimit: true,
              lockUntilChaptersComplete: true,
            },
          },
        },
      });
    }

    if (!userVersion) {
      return res.status(404).json({
        success: false,
        message: 'No version found for this course',
      });
    }

    // Check if there's a newer version available for upgrade
    const latestActiveVersion = await prisma.courseVersion.findFirst({
      where: { courseId: course.id, isActive: true },
      select: {
        id: true,
        version: true,
        title: true,
        changelog: true,
        upgradePriceType: true,
        upgradePriceValue: true,
      },
    });

    const hasNewerVersion = latestActiveVersion && latestActiveVersion.id !== userVersion.id;

    // Get user progress for all chapters
    const progress = await prisma.progress.findMany({
      where: {
        userId,
        chapterId: {
          in: userVersion.chapters.map((c) => c.id),
        },
      },
    });

    const progressMap = new Map(progress.map((p) => [p.chapterId, p]));

    // Build chapters with progress
    const chaptersWithProgress = userVersion.chapters.map((chapter) => {
      const chapterProgress = progressMap.get(chapter.id);
      return {
        id: chapter.id,
        title: chapter.title,
        description: chapter.description,
        order: chapter.order,
        isFree: chapter.isFree,
        hasVideo: chapter.videos.length > 0 || !!chapter.videoUrl,
        hasTheory: !!chapter.theory,
        hasAssignment: !!chapter.assignmentFile,
        hasQuiz: !!chapter.quiz,
        videoDuration: chapter.videos[0]?.duration || null,
        progress: {
          isCompleted: chapterProgress?.isCompleted || false,
          watchPercentage: Number(chapterProgress?.watchPercentage) || 0,
          lastPosition: chapterProgress?.lastPosition || 0,
        },
      };
    });

    // Calculate overall progress
    const completedChapters = chaptersWithProgress.filter((c) => c.progress.isCompleted).length;
    const totalChapters = chaptersWithProgress.length;
    const overallProgress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

    // Check if final exam is available
    const finalExam = userVersion.finalExams[0];
    const isFinalExamUnlocked = finalExam?.lockUntilChaptersComplete
      ? completedChapters === totalChapters
      : true;

    // Get certificate if completed
    let certificate = null;
    if (overallProgress === 100) {
      certificate = await prisma.certificate.findFirst({
        where: {
          userId,
          courseId: course.id,
        },
        select: {
          id: true,
          certificateNumber: true,
          studentName: true,
          issuedAt: true,
          pdfUrl: true,
        },
      });
    }

    // Calculate upgrade price if there's a newer version
    let upgradeInfo = null;
    if (hasNewerVersion && latestActiveVersion) {
      let upgradePrice = 0;
      if (latestActiveVersion.upgradePriceType === 'FIXED') {
        upgradePrice = Number(latestActiveVersion.upgradePriceValue) || 0;
      } else if (latestActiveVersion.upgradePriceType === 'PERCENTAGE') {
        const percentage = Number(latestActiveVersion.upgradePriceValue) || 0;
        upgradePrice = (Number(course.price) * percentage) / 100;
      }

      upgradeInfo = {
        availableVersionId: latestActiveVersion.id,
        availableVersionNumber: latestActiveVersion.version,
        availableVersionTitle: latestActiveVersion.title,
        changelog: latestActiveVersion.changelog,
        upgradePrice,
        currentVersionNumber: userVersion.version,
      };
    }

    res.json({
      success: true,
      data: {
        course: {
          id: course.id,
          title: course.title,
          slug: course.slug,
          description: course.description,
          thumbnail: course.thumbnail,
          category: course.category,
          author: course.author,
          price: Number(course.price),
        },
        versionId: userVersion.id,
        versionNumber: userVersion.version,
        chapters: chaptersWithProgress,
        progress: {
          completedChapters,
          totalChapters,
          overallProgress,
        },
        finalExam: finalExam
          ? {
              ...finalExam,
              isUnlocked: isFinalExamUnlocked,
            }
          : null,
        certificate,
        upgradeInfo, // ახალი ვერსიის ინფორმაცია თუ ხელმისაწვდომია
      },
    });
  } catch (error) {
    console.error('Get course for learning error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get course data',
    });
  }
};

/**
 * Get chapter content for learning
 */
export const getChapterForLearning = async (req: AuthRequest, res: Response) => {
  try {
    const { chapterId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get chapter with all content
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        courseVersion: {
          include: {
            course: true,
          },
        },
        videos: true,
        attachments: {
          orderBy: { order: 'asc' },
        },
        quiz: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                answers: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    // Check if user has access to this course
    const purchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: chapter.courseVersion.courseId,
        },
      },
    });

    // Allow access if free chapter or purchased
    if (!chapter.isFree && (!purchase || purchase.status !== 'COMPLETED')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this chapter',
      });
    }

    // Get user progress for this chapter
    const progress = await prisma.progress.findUnique({
      where: {
        userId_chapterId: {
          userId,
          chapterId,
        },
      },
    });

    // Get user notes for this chapter
    const notes = await prisma.note.findMany({
      where: {
        userId,
        chapterId,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get user bookmarks for this chapter
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId,
        chapterId,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Update study streak (mark as studied today)
    await updateStudyStreak(userId);

    // Build attachments with URLs (R2) - grouped by type
    const buildAttachment = (att: any) => ({
      id: att.id,
      title: att.title,
      description: att.description,
      fileName: att.fileName,
      fileSize: att.fileSize,
      mimeType: att.mimeType,
      type: att.type,
      url: r2Service.getPublicUrl(att.filePath),
    });

    const materials = chapter.attachments
      .filter(att => att.type === 'material')
      .map(buildAttachment);
    const assignments = chapter.attachments
      .filter(att => att.type === 'assignment')
      .map(buildAttachment);
    const answers = chapter.attachments
      .filter(att => att.type === 'answer')
      .map(buildAttachment);

    res.json({
      success: true,
      data: {
        chapter: {
          id: chapter.id,
          title: chapter.title,
          description: chapter.description,
          order: chapter.order,
          theory: chapter.theory,
          assignmentFile: chapter.assignmentFile, // Legacy
          answerFile: chapter.answerFile, // Legacy
          materials,
          assignments,
          answers,
          video: chapter.videos[0]
            ? chapter.videos[0]
            : chapter.videoUrl
              ? { id: null, duration: null, hlsMasterUrl: chapter.videoUrl }
              : null,
          quiz: chapter.quiz
            ? {
                id: chapter.quiz.id,
                title: chapter.quiz.title,
                type: chapter.quiz.type,
                passingScore: chapter.quiz.passingScore,
                timeLimit: chapter.quiz.timeLimit,
                questionCount: chapter.quiz.questions.length,
              }
            : null,
        },
        progress: {
          isCompleted: progress?.isCompleted || false,
          watchPercentage: Number(progress?.watchPercentage) || 0,
          lastPosition: progress?.lastPosition || 0,
          canSkipAhead: progress?.canSkipAhead || false,
        },
        notes,
        bookmarks,
        courseInfo: {
          id: chapter.courseVersion.course.id,
          title: chapter.courseVersion.course.title,
          slug: chapter.courseVersion.course.slug,
        },
      },
    });
  } catch (error) {
    console.error('Get chapter for learning error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chapter data',
    });
  }
};

/**
 * Get user's transaction history
 */
export const getTransactionHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where: { userId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnail: true,
            },
          },
          promoCode: {
            select: {
              code: true,
              discount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.purchase.count({ where: { userId } }),
    ]);

    const transactions = purchases.map((p) => ({
      id: p.id,
      course: p.course,
      originalAmount: Number(p.amount),
      finalAmount: Number(p.finalAmount),
      discount: p.promoCode
        ? {
            code: p.promoCode.code,
            percentage: Number(p.promoCode.discount),
          }
        : null,
      status: p.status,
      paymentId: p.stripePaymentId,
      purchasedAt: p.createdAt,
    }));

    // Calculate total spent
    const totalSpent = await prisma.purchase.aggregate({
      where: {
        userId,
        status: 'COMPLETED',
      },
      _sum: {
        finalAmount: true,
      },
    });

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
        summary: {
          totalPurchases: total,
          totalSpent: Number(totalSpent._sum.finalAmount) || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction history',
    });
  }
};

/**
 * Get user's certificates
 */
export const getCertificates = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const certificates = await prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
    });

    res.json({
      success: true,
      data: { certificates },
    });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get certificates',
    });
  }
};

/**
 * Get certificate by ID
 */
export const getCertificateById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { certificateId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const certificate = await prisma.certificate.findFirst({
      where: {
        id: certificateId,
        userId,
      },
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found',
      });
    }

    res.json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    console.error('Get certificate by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get certificate',
    });
  }
};

/**
 * Generate certificate with custom name
 */
export const generateCertificate = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { courseId, studentName } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!courseId || !studentName) {
      return res.status(400).json({
        success: false,
        message: 'courseId and studentName are required',
      });
    }

    // Check if user has completed all chapters and passed final exam
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        versions: {
          where: { isActive: true },
          include: {
            chapters: true,
            finalExams: true,
          },
        },
      },
    });

    if (!course || !course.versions[0]) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const currentVersion = course.versions[0];
    const chapters = currentVersion.chapters;
    const finalExam = currentVersion.finalExams?.[0];

    // Check all chapters are completed
    const completedChapters = await prisma.progress.count({
      where: {
        userId,
        chapterId: { in: chapters.map(c => c.id) },
        isCompleted: true,
      },
    });

    if (completedChapters < chapters.length) {
      return res.status(400).json({
        success: false,
        message: 'ყველა თავი უნდა იყოს დასრულებული',
      });
    }

    // Check final exam is passed (if exists)
    if (finalExam) {
      const passedAttempt = await prisma.quizAttempt.findFirst({
        where: {
          userId,
          quizId: finalExam.id,
          passed: true,
        },
      });

      if (!passedAttempt) {
        return res.status(400).json({
          success: false,
          message: 'საფინალო გამოცდა უნდა იყოს ჩაბარებული',
        });
      }

      // Check if certificate already exists
      const existingCertificate = await prisma.certificate.findFirst({
        where: {
          userId,
          courseId,
        },
      });

      if (existingCertificate) {
        // Update existing certificate with new name
        const updatedCertificate = await prisma.certificate.update({
          where: { id: existingCertificate.id },
          data: { studentName },
        });

        return res.json({
          success: true,
          data: updatedCertificate,
          message: 'სერტიფიკატი განახლდა',
        });
      }

      // Generate new certificate
      const certificateNumber = `CERT-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)
        .toUpperCase()}`;

      const certificate = await prisma.certificate.create({
        data: {
          attemptId: passedAttempt.id,
          userId,
          courseId,
          quizId: finalExam.id,
          certificateNumber,
          studentName,
          courseName: course.title,
          quizTitle: finalExam.title,
          score: passedAttempt.score || 0,
          completionDate: passedAttempt.completedAt || new Date(),
        },
      });

      // Send certificate ready email
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        if (user?.email) {
          await EmailService.sendCertificateReadyEmail(
            user.email,
            studentName,
            course.title,
            certificateNumber,
            certificate.id,
            Number(passedAttempt.score) || 0,
            userId
          );
        }
      } catch (emailError) {
        console.error('Failed to send certificate email:', emailError);
        // Don't throw - email failure shouldn't affect certificate generation
      }

      return res.json({
        success: true,
        data: certificate,
        message: 'სერტიფიკატი შეიქმნა',
      });
    }

    return res.status(400).json({
      success: false,
      message: 'კურსს არ აქვს საფინალო გამოცდა',
    });
  } catch (error) {
    console.error('Generate certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate certificate',
    });
  }
};

/**
 * Get user preferences
 */
export const getPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    let preferences = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    // Create default preferences if not exist
    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: { userId },
      });
    }

    res.json({
      success: true,
      data: { preferences },
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get preferences',
    });
  }
};

/**
 * Update user preferences
 */
export const updatePreferences = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const updates = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: updates,
      create: {
        userId,
        ...updates,
      },
    });

    res.json({
      success: true,
      data: { preferences },
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences',
    });
  }
};

/**
 * Create or update a note
 */
export const saveNote = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { chapterId, content, highlightedText, color, noteId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    let note;
    if (noteId) {
      // Update existing note
      note = await prisma.note.update({
        where: { id: noteId, userId },
        data: { content, highlightedText, color },
      });
    } else {
      // Create new note
      note = await prisma.note.create({
        data: {
          userId,
          chapterId,
          content,
          highlightedText,
          color,
        },
      });
    }

    res.json({
      success: true,
      data: { note },
    });
  } catch (error) {
    console.error('Save note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save note',
    });
  }
};

/**
 * Delete a note
 */
export const deleteNote = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { noteId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    await prisma.note.delete({
      where: { id: noteId, userId },
    });

    res.json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete note',
    });
  }
};

/**
 * Create a bookmark
 */
export const createBookmark = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { chapterId, videoId, timestamp, title, description } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const bookmark = await prisma.bookmark.create({
      data: {
        userId,
        chapterId,
        videoId,
        timestamp,
        title,
        description,
      },
    });

    res.json({
      success: true,
      data: { bookmark },
    });
  } catch (error) {
    console.error('Create bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bookmark',
    });
  }
};

/**
 * Delete a bookmark
 */
export const deleteBookmark = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { bookmarkId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    await prisma.bookmark.delete({
      where: { id: bookmarkId, userId },
    });

    res.json({
      success: true,
      message: 'Bookmark deleted successfully',
    });
  } catch (error) {
    console.error('Delete bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bookmark',
    });
  }
};

/**
 * Get all notes for a course
 */
export const getCourseNotes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { courseId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get all chapters for the course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        versions: {
          where: { isActive: true },
          include: {
            chapters: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!course || !course.versions[0]) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const chapterIds = course.versions[0].chapters.map((c) => c.id);

    const notes = await prisma.note.findMany({
      where: {
        userId,
        chapterId: { in: chapterIds },
      },
      include: {
        chapter: {
          select: {
            id: true,
            title: true,
            order: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { notes },
    });
  } catch (error) {
    console.error('Get course notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notes',
    });
  }
};

/**
 * Get all bookmarks for a course
 */
export const getCourseBookmarks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { courseId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get all chapters for the course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        versions: {
          where: { isActive: true },
          include: {
            chapters: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!course || !course.versions[0]) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const chapterIds = course.versions[0].chapters.map((c) => c.id);

    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId,
        chapterId: { in: chapterIds },
      },
      include: {
        chapter: {
          select: {
            id: true,
            title: true,
            order: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { bookmarks },
    });
  } catch (error) {
    console.error('Get course bookmarks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bookmarks',
    });
  }
};

// Helper functions

/**
 * Calculate XP required for next level
 */
function calculateXPToNextLevel(currentLevel: number): number {
  // XP formula: level * 100 + (level - 1) * 50
  return currentLevel * 100 + (currentLevel - 1) * 50;
}

/**
 * Update study streak for user
 */
async function updateStudyStreak(userId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const streak = await prisma.studyStreak.findUnique({
    where: { userId },
  });

  if (!streak) {
    // Create new streak
    await prisma.studyStreak.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastStudyDate: today,
        streakStartDate: today,
        totalStudyDays: 1,
      },
    });
    return;
  }

  const lastStudy = streak.lastStudyDate ? new Date(streak.lastStudyDate) : null;
  if (lastStudy) {
    lastStudy.setHours(0, 0, 0, 0);
  }

  // If already studied today, do nothing
  if (lastStudy && lastStudy.getTime() === today.getTime()) {
    return;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let newCurrentStreak = 1;
  let newStreakStart = today;

  if (lastStudy && lastStudy.getTime() === yesterday.getTime()) {
    // Consecutive day - extend streak
    newCurrentStreak = streak.currentStreak + 1;
    newStreakStart = streak.streakStartDate || today;
  }

  const newLongestStreak = Math.max(streak.longestStreak, newCurrentStreak);

  await prisma.studyStreak.update({
    where: { userId },
    data: {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastStudyDate: today,
      streakStartDate: newStreakStart,
      totalStudyDays: streak.totalStudyDays + 1,
    },
  });
}

/**
 * Award XP to user
 */
export async function awardXP(
  userId: string,
  amount: number,
  reason: string,
  sourceId?: string,
  sourceType?: string
): Promise<void> {
  const userXP = await prisma.userXP.upsert({
    where: { userId },
    update: {
      totalXP: { increment: amount },
    },
    create: {
      userId,
      totalXP: amount,
    },
  });

  // Create XP history entry
  await prisma.xPHistory.create({
    data: {
      userXPId: userXP.id,
      amount,
      reason,
      sourceId,
      sourceType,
    },
  });

  // Check and update level
  const newLevel = calculateLevel(userXP.totalXP + amount);
  if (newLevel > userXP.level) {
    await prisma.userXP.update({
      where: { userId },
      data: { level: newLevel },
    });
  }
}

/**
 * Calculate level based on total XP
 */
function calculateLevel(totalXP: number): number {
  let level = 1;
  let xpRequired = 100;
  let xpAccumulated = 0;

  while (xpAccumulated + xpRequired <= totalXP) {
    xpAccumulated += xpRequired;
    level++;
    xpRequired = level * 100 + (level - 1) * 50;
  }

  return level;
}

/**
 * Update chapter progress (video watch time, position)
 */
export const updateChapterProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { chapterId } = req.params;
    const { watchPercentage, lastPosition, totalWatchTime } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get chapter to find courseVersionId
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

    // Upsert progress
    const progress = await prisma.progress.upsert({
      where: {
        userId_chapterId: {
          userId,
          chapterId,
        },
      },
      update: {
        watchPercentage: watchPercentage !== undefined ? watchPercentage : undefined,
        lastPosition: lastPosition !== undefined ? lastPosition : undefined,
        totalWatchTime: totalWatchTime !== undefined
          ? { increment: totalWatchTime }
          : undefined,
        // Mark first watch completed if percentage >= 90%
        firstWatchCompleted: watchPercentage >= 90 ? true : undefined,
        canSkipAhead: watchPercentage >= 90 ? true : undefined,
      },
      create: {
        userId,
        chapterId,
        courseVersionId: chapter.courseVersionId,
        watchPercentage: watchPercentage || 0,
        lastPosition: lastPosition || 0,
        totalWatchTime: totalWatchTime || 0,
      },
    });

    res.json({
      success: true,
      data: { progress },
    });
  } catch (error) {
    console.error('Update chapter progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update progress',
    });
  }
};

/**
 * Mark chapter as complete
 */
export const markChapterComplete = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { chapterId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get chapter to find courseVersionId
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { courseVersion: { include: { course: true } } },
    });

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    // Upsert progress with completed status
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
        firstWatchCompleted: true,
        canSkipAhead: true,
      },
      create: {
        userId,
        chapterId,
        courseVersionId: chapter.courseVersionId,
        isCompleted: true,
        watchPercentage: 100,
        firstWatchCompleted: true,
        canSkipAhead: true,
      },
    });

    // Award XP for completing chapter
    await awardXP(userId, 25, 'chapter_complete', chapterId, 'chapter');

    // Update study streak
    await updateStudyStreak(userId);

    // Check if all chapters are completed
    const allChapters = await prisma.chapter.count({
      where: { courseVersionId: chapter.courseVersionId },
    });

    const completedChapters = await prisma.progress.count({
      where: {
        userId,
        courseVersionId: chapter.courseVersionId,
        isCompleted: true,
      },
    });

    // Award course completion XP if all chapters done
    if (completedChapters === allChapters) {
      await awardXP(userId, 100, 'course_complete', chapter.courseVersion.courseId, 'course');
    }

    res.json({
      success: true,
      data: {
        progress,
        xpEarned: 25,
        courseCompleted: completedChapters === allChapters,
      },
    });
  } catch (error) {
    console.error('Mark chapter complete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark chapter complete',
    });
  }
};

/**
 * Get comments for a chapter
 */
export const getChapterComments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { chapterId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const comments = await prisma.comment.findMany({
      where: {
        chapterId,
        parentId: null, // Only top-level comments
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname: true,
            avatar: true,
            role: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname: true,
                avatar: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { comments },
    });
  } catch (error) {
    console.error('Get chapter comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get comments',
    });
  }
};

/**
 * Create a comment on a chapter
 */
export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { chapterId } = req.params;
    const { content, parentId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required',
      });
    }

    // If parentId provided, verify it exists and belongs to this chapter
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      });

      if (!parentComment || parentComment.chapterId !== chapterId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parent comment',
        });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        userId,
        chapterId,
        content: content.trim(),
        parentId: parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname: true,
            avatar: true,
            role: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname: true,
                avatar: true,
                role: true,
              },
            },
          },
        },
      },
    });

    // Award XP for engagement
    await awardXP(userId, 5, 'comment_created', comment.id, 'comment');

    res.status(201).json({
      success: true,
      data: { comment },
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create comment',
    });
  }
};

/**
 * Delete a comment
 */
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { commentId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Verify comment exists and belongs to user (or user is admin)
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (comment.userId !== userId && user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment',
      });
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
    });
  }
}
