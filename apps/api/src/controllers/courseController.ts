import { Request, Response } from 'express';
import { PrismaClient, CourseStatus } from '@prisma/client';
import { deleteFile, getFilenameFromUrl } from '../services/uploadService';
import r2Service from '../services/r2.service';

const prisma = new PrismaClient();

// Get all courses with filtering, sorting, and pagination
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      search,
      status,
      categoryId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status as CourseStatus;
    }

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          author: { select: { id: true, name: true, surname: true, email: true } },
          _count: { select: { purchases: true, reviews: true, versions: true } }
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: limitNum
      }),
      prisma.course.count({ where })
    ]);

    res.json({
      courses,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

// Get course by ID
export const getCourseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        category: true,
        author: { select: { id: true, name: true, surname: true, email: true, avatar: true } },
        versions: {
          include: {
            chapters: {
              orderBy: { order: 'asc' },
              include: {
                _count: { select: { contents: true, comments: true } }
              }
            },
            _count: { select: { chapters: true } }
          },
          orderBy: { version: 'desc' }
        },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true, surname: true, avatar: true } }
          }
        },
        _count: { select: { purchases: true, reviews: true, versions: true } }
      }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Calculate average rating
    const avgRating = await prisma.review.aggregate({
      where: { courseId: id },
      _avg: { rating: true }
    });

    res.json({
      course,
      avgRating: avgRating._avg.rating || 0
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
};

// Create course
export const createCourse = async (req: Request, res: Response) => {
  try {
    const {
      title,
      slug,
      description,
      thumbnail,
      price,
      categoryId,
      metaTitle,
      metaDescription,
      metaKeywords,
      status = 'DRAFT'
    } = req.body;

    // @ts-ignore - User is attached by auth middleware
    const authorId = req.user.id;

    // Check if slug already exists
    const existingCourse = await prisma.course.findUnique({
      where: { slug }
    });

    if (existingCourse) {
      return res.status(400).json({ error: 'Course with this slug already exists' });
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const course = await prisma.course.create({
      data: {
        title,
        slug,
        description,
        thumbnail,
        price,
        categoryId,
        authorId,
        metaTitle,
        metaDescription,
        metaKeywords,
        status: status as CourseStatus
      },
      include: {
        category: true,
        author: { select: { id: true, name: true, surname: true, email: true } },
        _count: { select: { purchases: true, reviews: true, versions: true } }
      }
    });

    res.status(201).json({
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
};

// Update course
export const updateCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      description,
      thumbnail,
      price,
      categoryId,
      metaTitle,
      metaDescription,
      metaKeywords,
      status
    } = req.body;

    const existingCourse = await prisma.course.findUnique({
      where: { id }
    });

    if (!existingCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if slug is being changed and if it's unique
    if (slug && slug !== existingCourse.slug) {
      const slugExists = await prisma.course.findUnique({
        where: { slug }
      });

      if (slugExists) {
        return res.status(400).json({ error: 'Course with this slug already exists' });
      }
    }

    // If category is being changed, verify it exists
    if (categoryId && categoryId !== existingCourse.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
    }

    // Delete old thumbnail if being replaced
    if (thumbnail && existingCourse.thumbnail && thumbnail !== existingCourse.thumbnail) {
      // Try R2 deletion first (for new thumbnails)
      const r2Key = r2Service.getKeyFromUrl(existingCourse.thumbnail);
      if (r2Key) {
        await r2Service.deleteFile(r2Key).catch(console.error);
      } else {
        // Fallback to local file deletion (for legacy thumbnails)
        const oldFilename = getFilenameFromUrl(existingCourse.thumbnail);
        if (oldFilename) {
          await deleteFile(oldFilename).catch(console.error);
        }
      }
    }

    const course = await prisma.course.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(slug && { slug }),
        ...(description && { description }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(price !== undefined && { price }),
        ...(categoryId && { categoryId }),
        ...(metaTitle !== undefined && { metaTitle }),
        ...(metaDescription !== undefined && { metaDescription }),
        ...(metaKeywords !== undefined && { metaKeywords }),
        ...(status && { status: status as CourseStatus })
      },
      include: {
        category: true,
        author: { select: { id: true, name: true, surname: true, email: true } },
        _count: { select: { purchases: true, reviews: true, versions: true } }
      }
    });

    res.json({
      message: 'Course updated successfully',
      course
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
};

// Delete course
export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        _count: { select: { purchases: true } }
      }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course._count.purchases > 0) {
      return res.status(400).json({
        error: 'Cannot delete course with existing purchases. Consider archiving instead.'
      });
    }

    // Delete thumbnail file if exists
    if (course.thumbnail) {
      // Try R2 deletion first (for new thumbnails)
      const r2Key = r2Service.getKeyFromUrl(course.thumbnail);
      if (r2Key) {
        await r2Service.deleteFile(r2Key).catch(console.error);
      } else {
        // Fallback to local file deletion (for legacy thumbnails)
        const filename = getFilenameFromUrl(course.thumbnail);
        if (filename) {
          await deleteFile(filename).catch(console.error);
        }
      }
    }

    await prisma.course.delete({
      where: { id }
    });

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
};

// Duplicate course
export const duplicateCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, slug } = req.body;

    // @ts-ignore
    const authorId = req.user.id;

    const originalCourse = await prisma.course.findUnique({
      where: { id },
      include: {
        versions: {
          include: {
            chapters: {
              orderBy: { order: 'asc' },
              include: {
                contents: { orderBy: { order: 'asc' } }
              }
            }
          }
        }
      }
    });

    if (!originalCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if slug is unique
    const slugExists = await prisma.course.findUnique({
      where: { slug }
    });

    if (slugExists) {
      return res.status(400).json({ error: 'Course with this slug already exists' });
    }

    // Create duplicate course with all versions and chapters
    const duplicatedCourse = await prisma.course.create({
      data: {
        title,
        slug,
        description: originalCourse.description,
        thumbnail: originalCourse.thumbnail,
        price: originalCourse.price,
        categoryId: originalCourse.categoryId,
        authorId,
        metaTitle: originalCourse.metaTitle,
        metaDescription: originalCourse.metaDescription,
        metaKeywords: originalCourse.metaKeywords,
        status: 'DRAFT',
        versions: {
          create: originalCourse.versions.map((version) => ({
            version: version.version,
            title: version.title,
            description: version.description,
            changelog: version.changelog,
            upgradePrice: version.upgradePrice,
            discountPercentage: version.discountPercentage,
            isActive: false,
            chapters: {
              create: version.chapters.map((chapter) => ({
                title: chapter.title,
                description: chapter.description,
                order: chapter.order,
                isFree: chapter.isFree,
                videoUrl: chapter.videoUrl,
                theory: chapter.theory,
                assignmentFile: chapter.assignmentFile,
                answerFile: chapter.answerFile,
                contents: {
                  create: chapter.contents.map((content) => ({
                    type: content.type,
                    title: content.title,
                    content: content.content,
                    duration: content.duration,
                    fileSize: content.fileSize,
                    mimeType: content.mimeType,
                    order: content.order,
                    isFree: content.isFree
                  }))
                }
              }))
            }
          }))
        }
      },
      include: {
        category: true,
        author: { select: { id: true, name: true, surname: true, email: true } },
        _count: { select: { purchases: true, reviews: true, versions: true } }
      }
    });

    res.status(201).json({
      message: 'Course duplicated successfully',
      course: duplicatedCourse
    });
  } catch (error) {
    console.error('Duplicate course error:', error);
    res.status(500).json({ error: 'Failed to duplicate course' });
  }
};

// Bulk update course status
export const bulkUpdateStatus = async (req: Request, res: Response) => {
  try {
    const { courseIds, status } = req.body;

    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ error: 'Course IDs must be a non-empty array' });
    }

    if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await prisma.course.updateMany({
      where: { id: { in: courseIds } },
      data: { status: status as CourseStatus }
    });

    res.json({
      message: `${courseIds.length} course(s) updated to ${status} successfully`
    });
  } catch (error) {
    console.error('Bulk update status error:', error);
    res.status(500).json({ error: 'Failed to bulk update courses' });
  }
};

// Export courses to CSV
export const exportCoursesToCSV = async (req: Request, res: Response) => {
  try {
    const { status, categoryId } = req.query;

    const where: any = {};
    if (status) where.status = status as CourseStatus;
    if (categoryId) where.categoryId = categoryId as string;

    const courses = await prisma.course.findMany({
      where,
      include: {
        category: { select: { name: true } },
        author: { select: { name: true, surname: true } },
        _count: { select: { purchases: true, reviews: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Generate CSV
    const csvHeader = 'ID,Title,Slug,Category,Author,Price,Status,Purchases,Reviews,Created At\n';
    const csvRows = courses.map(course =>
      [
        course.id,
        `"${course.title.replace(/"/g, '""')}"`,
        course.slug,
        course.category.name,
        `${course.author.name} ${course.author.surname}`,
        course.price,
        course.status,
        course._count.purchases,
        course._count.reviews,
        course.createdAt.toISOString()
      ].join(',')
    ).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=courses-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export courses error:', error);
    res.status(500).json({ error: 'Failed to export courses' });
  }
};

// Get course statistics
export const getCourseStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [purchases, avgRating, completionRate] = await Promise.all([
      prisma.purchase.count({
        where: { courseId: id, status: 'COMPLETED' }
      }),
      prisma.review.aggregate({
        where: { courseId: id },
        _avg: { rating: true },
        _count: true
      }),
      prisma.progress.aggregate({
        where: {
          courseVersion: { courseId: id },
          isCompleted: true
        },
        _count: true
      })
    ]);

    res.json({
      purchases,
      avgRating: avgRating._avg.rating || 0,
      totalReviews: avgRating._count,
      completedChapters: completionRate._count
    });
  } catch (error) {
    console.error('Get course stats error:', error);
    res.status(500).json({ error: 'Failed to fetch course statistics' });
  }
};
