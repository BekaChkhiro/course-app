import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Enroll in a course (without payment - for testing/free courses)
export const enrollInCourse = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { courseId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'ავტორიზაცია საჭიროა',
      });
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'კურსის ID აუცილებელია',
      });
    }

    // Check if course exists and is published
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'კურსი ვერ მოიძებნა',
      });
    }

    // Check if already enrolled
    const existingPurchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        message: 'თქვენ უკვე ჩარიცხული ხართ ამ კურსზე',
        code: 'ALREADY_ENROLLED',
      });
    }

    // Create purchase record with COMPLETED status (no payment required)
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        courseId,
        amount: course.price,
        finalAmount: course.price, // No discount applied
        status: 'COMPLETED',
      },
    });

    return res.status(201).json({
      success: true,
      message: 'კურსზე წარმატებით ჩაირიცხეთ',
      data: {
        purchaseId: purchase.id,
        courseSlug: course.slug,
        courseTitle: course.title,
      },
    });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    return res.status(500).json({
      success: false,
      message: 'შეცდომა კურსზე ჩარიცხვისას',
    });
  }
};

// Enroll by course slug (alternative endpoint)
export const enrollBySlug = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { slug } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'ავტორიზაცია საჭიროა',
      });
    }

    // Find course by slug
    const course = await prisma.course.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'კურსი ვერ მოიძებნა',
      });
    }

    // Check if already enrolled
    const existingPurchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: course.id,
        },
      },
    });

    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        message: 'თქვენ უკვე ჩარიცხული ხართ ამ კურსზე',
        code: 'ALREADY_ENROLLED',
      });
    }

    // Create purchase record
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        courseId: course.id,
        amount: course.price,
        finalAmount: course.price,
        status: 'COMPLETED',
      },
    });

    return res.status(201).json({
      success: true,
      message: 'კურსზე წარმატებით ჩაირიცხეთ',
      data: {
        purchaseId: purchase.id,
        courseSlug: course.slug,
        courseTitle: course.title,
      },
    });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    return res.status(500).json({
      success: false,
      message: 'შეცდომა კურსზე ჩარიცხვისას',
    });
  }
};

// Check enrollment status
export const checkEnrollment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { courseId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'ავტორიზაცია საჭიროა',
      });
    }

    const purchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    return res.json({
      success: true,
      data: {
        isEnrolled: purchase?.status === 'COMPLETED',
        purchaseStatus: purchase?.status || null,
        enrolledAt: purchase?.createdAt || null,
      },
    });
  } catch (error) {
    console.error('Error checking enrollment:', error);
    return res.status(500).json({
      success: false,
      message: 'შეცდომა ჩარიცხვის შემოწმებისას',
    });
  }
};
