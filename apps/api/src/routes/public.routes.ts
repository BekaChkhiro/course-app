import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { uploadSubmissionFiles } from '../services/uploadService';
import { EmailService } from '../services/emailService';
import r2Service from '../services/r2.service';

const router = Router();

const formatPublicCourse = (course: any) => {
  const ratings = course.reviews.map((r: any) => r.rating);
  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length
      : 0;

  const activeVersion = course.versions[0];
  const chapterCount = activeVersion?._count?.chapters || 0;
  const previewChapters = activeVersion?.chapters || [];

  // Build demo video URL - prefer HLS for streaming
  let demoVideoUrl = null;
  if (course.demoVideo) {
    demoVideoUrl = course.demoVideo.hls480pUrl
      || course.demoVideo.hls720pUrl
      || course.demoVideo.hlsMasterUrl
      || (course.demoVideo.r2Key ? `${process.env.R2_PUBLIC_URL}/${course.demoVideo.r2Key}` : null);
  }

  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    shortDescription:
      course.description?.substring(0, 200) +
      (course.description && course.description.length > 200 ? '...' : ''),
    thumbnail: course.thumbnail,
    demoVideoUrl,
    price: Number(course.price),
    category: course.category,
    averageRating,
    reviewCount: course._count.reviews,
    studentCount: course._count.purchases,
    chapterCount,
    previewChapters,
  };
};

// Get published courses with filters and pagination
router.get('/courses', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '12',
      category,
      search,
      sort = 'popular',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      status: 'PUBLISHED',
    };

    // Category filter - include courses from child categories too
    if (category) {
      const categoryRecord = await prisma.category.findFirst({
        where: { slug: category as string },
        include: {
          children: {
            select: { id: true },
          },
        },
      });
      if (categoryRecord) {
        // Get IDs of this category and all its children
        const categoryIds = [
          categoryRecord.id,
          ...categoryRecord.children.map((child) => child.id),
        ];
        where.categoryId = { in: categoryIds };
      }
    }

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Build order by
    let orderBy: any = { createdAt: 'desc' };
    switch (sort) {
      case 'popular':
        // Order by purchase count
        orderBy = { purchases: { _count: 'desc' } };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'price_low':
        orderBy = { price: 'asc' };
        break;
      case 'price_high':
        orderBy = { price: 'desc' };
        break;
      case 'rating':
        // Will need to sort after fetching
        orderBy = { createdAt: 'desc' };
        break;
    }

    // Get courses
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          demoVideo: {
            select: { id: true, r2Key: true, hlsMasterUrl: true, hls720pUrl: true, hls480pUrl: true },
          },
          _count: {
            select: { purchases: true, reviews: true },
          },
          reviews: {
            where: { status: 'APPROVED' },
            select: { rating: true },
          },
          versions: {
            where: { isActive: true },
            include: {
              _count: { select: { chapters: true } },
              chapters: {
                orderBy: { order: 'asc' },
                take: 4,
                select: {
                  id: true,
                  title: true,
                  order: true,
                },
              },
            },
          },
        },
      }),
      prisma.course.count({ where }),
    ]);

    // Calculate average rating and format response
    const formattedCourses = courses.map(formatPublicCourse);

    // Sort by rating if requested
    if (sort === 'rating') {
      formattedCourses.sort((a, b) => b.averageRating - a.averageRating);
    }

    res.json({
      success: true,
      data: {
        courses: formattedCourses,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses',
    });
  }
});

// Get featured courses for homepage
router.get('/courses/featured', async (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '6');

    const courses = await prisma.course.findMany({
      where: {
        status: 'PUBLISHED',
        isFeatured: true,
      },
      take: limit,
      orderBy: [
        { featuredAt: 'desc' },
        { updatedAt: 'desc' },
      ],
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        demoVideo: {
          select: { id: true, r2Key: true, hlsMasterUrl: true, hls720pUrl: true, hls480pUrl: true },
        },
        _count: {
          select: { purchases: true, reviews: true },
        },
        reviews: {
          where: { status: 'APPROVED' },
          select: { rating: true },
        },
        versions: {
          where: { isActive: true },
          include: {
            _count: { select: { chapters: true } },
            chapters: {
              orderBy: { order: 'asc' },
              take: 4,
              select: {
                id: true,
                title: true,
                order: true,
              },
            },
          },
        },
      },
    });

    const formattedCourses = courses.map(formatPublicCourse);

    res.json({
      success: true,
      data: {
        courses: formattedCourses,
      },
    });
  } catch (error) {
    console.error('Get featured courses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch featured courses' });
  }
});

// Get single course by slug
router.get('/courses/:slug', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;

    const course = await prisma.course.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        author: {
          select: { id: true, name: true, surname: true, avatar: true, bio: true },
        },
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            slug: true,
            profession: true,
            bio: true,
            avatar: true,
            email: true,
            facebook: true,
            linkedin: true,
          },
        },
        demoVideo: {
          select: { id: true, r2Key: true, hlsMasterUrl: true, hls720pUrl: true, hls480pUrl: true },
        },
        features: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          select: { id: true, text: true },
        },
        reviews: {
          where: { status: 'APPROVED' },
          select: { rating: true },
        },
        _count: {
          select: { purchases: true, reviews: true },
        },
        versions: {
          where: { isActive: true },
          include: {
            chapters: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                order: true,
                isFree: true,
              },
            },
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

    // Check if user is enrolled and get progress (if authenticated)
    let isEnrolled = false;
    let progressPercentage = 0;
    let upgradeInfo = null;

    if (userId) {
      // Check if user has any completed purchase (original or upgrade)
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId,
          courseId: course.id,
          status: 'COMPLETED',
        },
        include: {
          courseVersion: {
            select: {
              id: true,
              version: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc', // Get original purchase
        },
      });
      isEnrolled = !!purchase;

      // Calculate progress for enrolled users
      if (isEnrolled) {
        const activeVersion = course.versions[0];
        if (activeVersion) {
          const totalChapters = activeVersion.chapters.length;

          if (totalChapters > 0) {
            const chapterIds = activeVersion.chapters.map((c) => c.id);

            const completedCount = await prisma.progress.count({
              where: {
                userId,
                chapterId: { in: chapterIds },
                isCompleted: true,
              },
            });

            progressPercentage = Math.round((completedCount / totalChapters) * 100);
          }

          // Get user's current version (highest version they have access to)
          const userVersionAccess = await prisma.userVersionAccess.findMany({
            where: {
              userId,
              courseVersion: { courseId: course.id },
              isActive: true,
            },
            include: {
              courseVersion: { select: { id: true, version: true } },
            },
            orderBy: {
              courseVersion: { version: 'desc' },
            },
            take: 1,
          });

          const userVersionId = userVersionAccess.length > 0
            ? userVersionAccess[0].courseVersionId
            : purchase?.courseVersionId;
          if (userVersionId && userVersionId !== activeVersion.id) {
            // User has an older version, fetch upgrade info
            const latestVersion = await prisma.courseVersion.findFirst({
              where: { courseId: course.id, isActive: true },
              select: {
                id: true,
                version: true,
                title: true,
                changelog: true,
                upgradePriceType: true,
                upgradePriceValue: true,
                upgradeDiscountStartDate: true,
                upgradeDiscountEndDate: true,
                upgradeDiscountType: true,
                upgradeDiscountValue: true,
              },
            });

            if (latestVersion) {
              const now = new Date();
              let upgradePrice = 0;

              // Check if discount is active
              const hasActiveDiscount =
                latestVersion.upgradeDiscountEndDate &&
                now <= latestVersion.upgradeDiscountEndDate &&
                latestVersion.upgradeDiscountValue;

              if (hasActiveDiscount) {
                // Apply discount price
                if (latestVersion.upgradeDiscountType === 'FIXED') {
                  upgradePrice = Number(latestVersion.upgradeDiscountValue);
                } else if (latestVersion.upgradeDiscountType === 'PERCENTAGE') {
                  const percentage = Number(latestVersion.upgradeDiscountValue) || 0;
                  upgradePrice = (Number(course.price) * percentage) / 100;
                }
              } else {
                // Regular upgrade price
                if (latestVersion.upgradePriceType === 'FIXED') {
                  upgradePrice = Number(latestVersion.upgradePriceValue) || 0;
                } else if (latestVersion.upgradePriceType === 'PERCENTAGE') {
                  const percentage = Number(latestVersion.upgradePriceValue) || 0;
                  upgradePrice = (Number(course.price) * percentage) / 100;
                }
              }

              upgradeInfo = {
                availableVersionId: latestVersion.id,
                availableVersionNumber: latestVersion.version,
                availableVersionTitle: latestVersion.title,
                upgradePrice,
                currentVersionNumber: purchase?.courseVersion?.version || 1,
                hasDiscount: !!hasActiveDiscount,
                discountEndsAt: hasActiveDiscount ? latestVersion.upgradeDiscountEndDate : null,
              };
            }
          }
        }
      }
    }

    // Calculate stats
    const ratings = course.reviews.map((r) => r.rating);
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

    const activeVersion = course.versions[0];
    const chapters = activeVersion?.chapters || [];

    // Parse learning outcomes from description if stored in JSON
    let learningOutcomes: string[] = [];
    try {
      // Check if there's a learningOutcomes field in metadata
      // For now, return empty array - can be added to Course model later
    } catch {}

    // Build demo video URL - prefer HLS for streaming
    let demoVideoUrl = null;
    if (course.demoVideo) {
      demoVideoUrl = course.demoVideo.hls720pUrl
        || course.demoVideo.hls480pUrl
        || course.demoVideo.hlsMasterUrl
        || (course.demoVideo.r2Key ? `${process.env.R2_PUBLIC_URL}/${course.demoVideo.r2Key}` : null);
    }

    res.json({
      success: true,
      data: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        shortDescription: course.description?.substring(0, 200),
        thumbnail: course.thumbnail,
        demoVideoUrl,
        price: Number(course.price),
        individualSessionPrice: course.individualSessionPrice ? Number(course.individualSessionPrice) : null,
        category: course.category,
        author: course.author,
        instructor: course.instructor,
        averageRating,
        reviewCount: course._count.reviews,
        studentCount: course._count.purchases,
        chapterCount: chapters.length,
        chapters,
        learningOutcomes,
        features: course.features || [],
        totalDuration: 0, // Can be calculated if duration is stored in chapters
        isEnrolled,
        progressPercentage,
        upgradeInfo, // ახალი ვერსიის ინფორმაცია თუ ძველი ვერსიის მფლობელია
      },
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course',
    });
  }
});

// Get course reviews
router.get('/courses/:courseId/reviews', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // First check if course exists by slug or id
    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id: courseId }, { slug: courseId }],
        status: 'PUBLISHED',
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          courseId: course.id,
          status: 'APPROVED',
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              surname: true,
              avatar: true,
            },
          },
          response: {
            select: {
              content: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.review.count({
        where: {
          courseId: course.id,
          status: 'APPROVED',
        },
      }),
    ]);

    const formattedReviews = reviews.map((review) => ({
      id: review.id,
      rating: Math.round(review.rating / 10), // Convert 10-50 to 1-5
      title: review.title,
      comment: review.comment,
      pros: review.pros,
      cons: review.cons,
      wouldRecommend: review.wouldRecommend,
      completionPercentage: review.completionPercentage,
      createdAt: review.createdAt,
      user: review.isAnonymous
        ? { firstName: 'ანონიმური', lastName: '', avatar: null }
        : {
            firstName: review.user.name,
            lastName: review.user.surname,
            avatar: review.user.avatar,
          },
      response: review.response,
      helpfulCount: review.helpfulCount,
    }));

    res.json({
      success: true,
      data: {
        reviews: formattedReviews,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
    });
  }
});

// Get all categories with course counts
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          select: { id: true },
        },
        _count: {
          select: {
            courses: {
              where: { status: 'PUBLISHED' },
            },
          },
        },
      },
    });

    // Calculate total course count including children for parent categories
    const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));

    const categoriesWithTotalCount = categories.map((cat) => {
      // Start with own course count
      let totalCourses = cat._count.courses;

      // Add children's course counts if this is a parent category
      if (cat.children && cat.children.length > 0) {
        for (const child of cat.children) {
          const childCat = categoryMap.get(child.id);
          if (childCat) {
            totalCourses += childCat._count.courses;
          }
        }
      }

      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        parent: cat.parent,
        parentId: cat.parent?.id || null,
        _count: {
          courses: totalCourses,
          ownCourses: cat._count.courses, // Keep original count too
        },
        childrenCount: cat.children?.length || 0,
      };
    });

    res.json({
      success: true,
      data: categoriesWithTotalCount,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
    });
  }
});

// Submit contact form
router.post('/contact', async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'ყველა ველი აუცილებელია',
      });
    }

    // Validate name length
    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'სახელი უნდა შეიცავდეს მინიმუმ 2 სიმბოლოს',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'არასწორი ელ-ფოსტის ფორმატი',
      });
    }

    // Validate message length
    if (message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'შეტყობინება უნდა შეიცავდეს მინიმუმ 10 სიმბოლოს',
      });
    }

    // Send email notification to admin
    const adminEmail = process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL || 'info@kursebi.online';

    try {
      await EmailService.sendContactFormNotification(adminEmail, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject,
        message: message.trim(),
      });

      console.log('📧 Contact form submitted:', {
        name: name.trim(),
        email: email.trim(),
        subject,
      });

      res.json({
        success: true,
        message: 'შეტყობინება წარმატებით გაიგზავნა',
      });
    } catch (emailError) {
      console.error('Failed to send contact form email:', emailError);
      res.status(500).json({
        success: false,
        message: 'შეტყობინების გაგზავნა ვერ მოხერხდა. გთხოვთ სცადოთ მოგვიანებით.',
      });
    }
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({
      success: false,
      message: 'შეტყობინების გაგზავნა ვერ მოხერხდა',
    });
  }
});

// ==========================================
// COURSE BOOKING (Individual Course Booking)
// ==========================================

// Simple in-memory rate limiting
const bookingRateLimiter = new Map<string, number>();

router.post('/course-booking', async (req: Request, res: Response) => {
  try {
    const {
      courseId,
      courseTitle,
      firstName,
      lastName,
      phone,
      email,
      preferredDays,
      preferredTimeFrom,
      preferredTimeTo,
      comment,
    } = req.body;

    // Rate limiting - 1 request per 30 seconds per IP
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const lastRequest = bookingRateLimiter.get(clientIP);

    if (lastRequest && now - lastRequest < 30000) {
      return res.status(429).json({
        success: false,
        message: 'გთხოვთ დაელოდოთ 30 წამს შემდეგ მოთხოვნამდე',
      });
    }
    bookingRateLimiter.set(clientIP, now);

    // Clean up old entries periodically
    if (bookingRateLimiter.size > 1000) {
      const cutoff = now - 60000;
      for (const [ip, time] of bookingRateLimiter.entries()) {
        if (time < cutoff) bookingRateLimiter.delete(ip);
      }
    }

    // Validate required fields
    if (!courseId || !courseTitle || !firstName || !lastName || !phone || !email || !preferredDays) {
      return res.status(400).json({
        success: false,
        message: 'ყველა სავალდებულო ველი უნდა შეავსოთ',
      });
    }

    // Validate first name
    if (firstName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'სახელი უნდა შეიცავდეს მინიმუმ 2 სიმბოლოს',
      });
    }

    // Validate last name
    if (lastName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'გვარი უნდა შეიცავდეს მინიმუმ 2 სიმბოლოს',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'არასწორი ელ-ფოსტის ფორმატი',
      });
    }

    // Validate phone format (Georgian format)
    const phoneClean = phone.replace(/\s/g, '');
    const phoneRegex = /^(\+995|995|0)?5\d{8}$/;
    if (!phoneRegex.test(phoneClean)) {
      return res.status(400).json({
        success: false,
        message: 'არასწორი ტელეფონის ნომრის ფორმატი',
      });
    }

    // Validate preferred days
    if (!Array.isArray(preferredDays) || preferredDays.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'აირჩიეთ მინიმუმ ერთი სასურველი დღე',
      });
    }

    // Send email to admin
    const adminEmail = process.env.BOOKING_EMAIL || process.env.ADMIN_EMAIL || 'info@kursebi.online';

    try {
      const bookingData = {
        courseId,
        courseTitle,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phoneClean,
        email: email.trim().toLowerCase(),
        preferredDays,
        preferredTimeFrom: preferredTimeFrom || '10:00',
        preferredTimeTo: preferredTimeTo || '18:00',
        comment: comment?.trim() || '',
      };

      // Send notification to admin
      await EmailService.sendCourseBookingNotification(adminEmail, bookingData);

      // Send confirmation to customer
      try {
        await EmailService.sendCourseBookingConfirmation(bookingData.email, {
          firstName: bookingData.firstName,
          lastName: bookingData.lastName,
          courseTitle: bookingData.courseTitle,
          preferredDays: bookingData.preferredDays,
          preferredTimeFrom: bookingData.preferredTimeFrom,
          preferredTimeTo: bookingData.preferredTimeTo,
        });
      } catch (confirmationError) {
        // Log but don't fail if customer confirmation fails
        console.error('Failed to send customer confirmation email:', confirmationError);
      }

      console.log('📅 Course booking submitted:', {
        courseTitle,
        customer: `${firstName} ${lastName}`,
        email,
        phone: phoneClean,
      });

      res.status(201).json({
        success: true,
        message: 'თქვენი განაცხადი წარმატებით გაიგზავნა! მალე დაგიკავშირდებით.',
      });
    } catch (emailError) {
      console.error('Failed to send booking email:', emailError);
      res.status(500).json({
        success: false,
        message: 'მეილის გაგზავნა ვერ მოხერხდა. გთხოვთ სცადოთ მოგვიანებით.',
      });
    }
  } catch (error: any) {
    console.error('Error submitting course booking:', error);
    res.status(500).json({
      success: false,
      message: 'განაცხადის გაგზავნა ვერ მოხერხდა',
    });
  }
});

// ==========================================
// COURSE SUBMISSION (Become an Instructor)
// ==========================================

// Submit course for review - accepts up to 5 files (50MB each)
router.post(
  '/course-submissions',
  uploadSubmissionFiles.array('files', 5),
  async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, email, phone, courseTitle, courseDescription, driveLink } = req.body;
      const files = req.files as Express.Multer.File[];

      // Validate required fields
      if (!firstName || !lastName || !email || !phone || !courseTitle || !courseDescription) {
        return res.status(400).json({
          success: false,
          message: 'ყველა სავალდებულო ველი უნდა შეავსოთ',
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'არასწორი ელ-ფოსტის ფორმატი',
        });
      }

      // Validate phone format (Georgian format)
      const phoneRegex = /^(\+995|995|0)?5\d{8}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        return res.status(400).json({
          success: false,
          message: 'არასწორი ტელეფონის ნომრის ფორმატი',
        });
      }

      // Check if at least one of files or driveLink is provided
      if ((!files || files.length === 0) && !driveLink) {
        return res.status(400).json({
          success: false,
          message: 'გთხოვთ ატვირთოთ ფაილები ან მიუთითოთ Drive ლინკი',
        });
      }

      // Create submission first (without files)
      const submission = await prisma.courseSubmission.create({
        data: {
          firstName,
          lastName,
          email,
          phone: phone.replace(/\s/g, ''),
          courseTitle,
          courseDescription,
          driveLink: driveLink || null,
        },
      });

      // Upload files to R2 and create file records
      const uploadedFiles: { fileName: string; filePath: string; fileSize: number; mimeType: string }[] = [];

      if (files && files.length > 0) {
        for (const file of files) {
          try {
            // Fix encoding for non-ASCII filenames (Georgian, etc.)
            const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

            const key = r2Service.generateSubmissionKey(submission.id, originalName);
            const result = await r2Service.uploadFile(key, file.buffer, file.mimetype, {
              originalName: originalName,
              submissionId: submission.id,
            });

            // Create file record in database
            await prisma.courseSubmissionFile.create({
              data: {
                submissionId: submission.id,
                fileName: originalName,
                filePath: result.url, // R2 public URL
                fileSize: file.size,
                mimeType: file.mimetype,
              },
            });

            uploadedFiles.push({
              fileName: originalName,
              filePath: result.url,
              fileSize: file.size,
              mimeType: file.mimetype,
            });
          } catch (uploadError) {
            console.error('Failed to upload file to R2:', uploadError);
            // Continue with other files even if one fails
          }
        }
      }

      // Get submission with files
      const submissionWithFiles = await prisma.courseSubmission.findUnique({
        where: { id: submission.id },
        include: { files: true },
      });

      // Send confirmation email to user
      try {
        await EmailService.sendCourseSubmissionConfirmation(
          email,
          firstName,
          courseTitle
        );
      } catch (emailError) {
        console.error('Failed to send user confirmation email:', emailError);
      }

      // Send notification email to admin
      try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

        await EmailService.sendCourseSubmissionNotificationToAdmin(
          adminEmail,
          submission.id,
          `${firstName} ${lastName}`,
          email,
          phone,
          courseTitle,
          courseDescription,
          driveLink,
          uploadedFiles
        );
      } catch (emailError) {
        console.error('Failed to send admin notification email:', emailError);
      }

      res.status(201).json({
        success: true,
        message: 'თქვენი განაცხადი წარმატებით გაიგზავნა! მალე დაგიკავშირდებით.',
        data: {
          id: submission.id,
          courseTitle: submission.courseTitle,
          filesCount: submissionWithFiles?.files.length || 0,
        },
      });
    } catch (error: any) {
      console.error('Error submitting course:', error);

      // Handle multer errors
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'ფაილის ზომა არ უნდა აღემატებოდეს 50MB-ს',
        });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'მაქსიმუმ 5 ფაილის ატვირთვა შეიძლება',
        });
      }
      if (error.message?.includes('Invalid file type')) {
        return res.status(400).json({
          success: false,
          message: 'მხოლოდ PDF, ZIP და ვიდეო ფაილები (MP4, WebM, MOV) არის დაშვებული',
        });
      }

      res.status(500).json({
        success: false,
        message: 'განაცხადის გაგზავნა ვერ მოხერხდა',
      });
    }
  }
);

export default router;
