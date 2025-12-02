import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

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

    // Category filter
    if (category) {
      const categoryRecord = await prisma.category.findFirst({
        where: { slug: category as string },
      });
      if (categoryRecord) {
        where.categoryId = categoryRecord.id;
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
            },
          },
        },
      }),
      prisma.course.count({ where }),
    ]);

    // Calculate average rating and format response
    const formattedCourses = courses.map((course) => {
      const ratings = course.reviews.map((r) => r.rating);
      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
          : 0;

      const activeVersion = course.versions[0];
      const chapterCount = activeVersion?._count?.chapters || 0;

      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        shortDescription: course.description?.substring(0, 200) + (course.description && course.description.length > 200 ? '...' : ''),
        thumbnail: course.thumbnail,
        price: Number(course.price),
        category: course.category,
        averageRating,
        reviewCount: course._count.reviews,
        studentCount: course._count.purchases,
        chapterCount,
      };
    });

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
          select: { id: true, name: true, slug: true },
        },
        author: {
          select: { id: true, name: true, surname: true, avatar: true, bio: true },
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

    // Check if user is enrolled (if authenticated)
    let isEnrolled = false;
    if (userId) {
      const purchase = await prisma.purchase.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          },
        },
      });
      isEnrolled = purchase?.status === 'COMPLETED';
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

    res.json({
      success: true,
      data: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        shortDescription: course.description?.substring(0, 200),
        thumbnail: course.thumbnail,
        price: Number(course.price),
        category: course.category,
        author: course.author,
        averageRating,
        reviewCount: course._count.reviews,
        studentCount: course._count.purchases,
        chapterCount: chapters.length,
        chapters,
        learningOutcomes,
        totalDuration: 0, // Can be calculated if duration is stored in chapters
        isEnrolled, // Added: enrollment status for authenticated users
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
      rating: review.rating,
      title: review.title,
      comment: review.comment,
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
        _count: {
          select: {
            courses: {
              where: { status: 'PUBLISHED' },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        _count: cat._count,
      })),
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
        message: 'All fields are required',
      });
    }

    // In a real app, you would:
    // 1. Save to database
    // 2. Send email notification
    // 3. Possibly integrate with a ticketing system

    // For now, just log and return success
    console.log('Contact form submission:', { name, email, subject, message });

    res.json({
      success: true,
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact form',
    });
  }
});

export default router;
