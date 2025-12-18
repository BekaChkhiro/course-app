import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { uploadSubmissionFiles } from '../services/uploadService';
import { EmailService } from '../services/emailService';
import r2Service from '../services/r2.service';

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
    const formattedCourses = courses.map((course) => {
      const ratings = course.reviews.map((r) => r.rating);
      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
          : 0;

      const activeVersion = course.versions[0];
      const chapterCount = activeVersion?._count?.chapters || 0;
      const previewChapters = activeVersion?.chapters || [];

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
        previewChapters,
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
