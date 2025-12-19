import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all instructors (admin - includes inactive)
export const getAllInstructors = async (req: Request, res: Response) => {
  try {
    const instructors = await prisma.instructor.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { courses: true }
        }
      }
    });

    res.json({ instructors });
  } catch (error) {
    console.error('Get instructors error:', error);
    res.status(500).json({ error: 'Failed to fetch instructors' });
  }
};

// Get active instructors only (public)
export const getActiveInstructors = async (req: Request, res: Response) => {
  try {
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            courses: {
              where: { status: 'PUBLISHED' }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: instructors.map(instructor => ({
        id: instructor.id,
        firstName: instructor.firstName,
        lastName: instructor.lastName,
        slug: instructor.slug,
        profession: instructor.profession,
        bio: instructor.bio,
        avatar: instructor.avatar,
        email: instructor.email,
        facebook: instructor.facebook,
        linkedin: instructor.linkedin,
        courseCount: instructor._count.courses
      }))
    });
  } catch (error) {
    console.error('Get active instructors error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch instructors' });
  }
};

// Get instructor by slug (public)
export const getInstructorBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const instructor = await prisma.instructor.findFirst({
      where: {
        slug,
        isActive: true
      },
      include: {
        courses: {
          where: { status: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' },
          include: {
            category: {
              select: { id: true, name: true, slug: true }
            },
            _count: {
              select: { purchases: true, reviews: true }
            },
            reviews: {
              where: { status: 'APPROVED' },
              select: { rating: true }
            },
            versions: {
              where: { isActive: true },
              include: {
                _count: { select: { chapters: true } }
              }
            }
          }
        }
      }
    });

    if (!instructor) {
      return res.status(404).json({ success: false, message: 'Instructor not found' });
    }

    // Format courses with ratings
    const courses = instructor.courses.map(course => {
      const ratings = course.reviews.map(r => r.rating);
      const averageRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;
      const activeVersion = course.versions[0];

      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        shortDescription: course.description?.substring(0, 200),
        thumbnail: course.thumbnail,
        price: Number(course.price),
        category: course.category,
        averageRating,
        reviewCount: course._count.reviews,
        studentCount: course._count.purchases,
        chapterCount: activeVersion?._count?.chapters || 0
      };
    });

    res.json({
      success: true,
      data: {
        id: instructor.id,
        firstName: instructor.firstName,
        lastName: instructor.lastName,
        slug: instructor.slug,
        profession: instructor.profession,
        bio: instructor.bio,
        avatar: instructor.avatar,
        email: instructor.email,
        facebook: instructor.facebook,
        linkedin: instructor.linkedin,
        courses
      }
    });
  } catch (error) {
    console.error('Get instructor by slug error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch instructor' });
  }
};

// Get instructor by ID (admin)
export const getInstructorById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const instructor = await prisma.instructor.findUnique({
      where: { id },
      include: {
        _count: {
          select: { courses: true }
        }
      }
    });

    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    res.json({ instructor });
  } catch (error) {
    console.error('Get instructor error:', error);
    res.status(500).json({ error: 'Failed to fetch instructor' });
  }
};

// Create instructor
export const createInstructor = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, slug, profession, bio, avatar, email, facebook, linkedin, order, isActive } = req.body;

    if (!firstName || !lastName || !slug || !profession) {
      return res.status(400).json({ error: 'First name, last name, slug, and profession are required' });
    }

    // Check if slug already exists
    const existingInstructor = await prisma.instructor.findUnique({
      where: { slug }
    });

    if (existingInstructor) {
      return res.status(400).json({ error: 'Instructor with this slug already exists' });
    }

    // Get max order if not provided
    let instructorOrder = order;
    if (instructorOrder === undefined) {
      const maxOrderInstructor = await prisma.instructor.findFirst({
        orderBy: { order: 'desc' },
        select: { order: true }
      });
      instructorOrder = (maxOrderInstructor?.order ?? -1) + 1;
    }

    const instructor = await prisma.instructor.create({
      data: {
        firstName,
        lastName,
        slug,
        profession,
        bio: bio || null,
        avatar: avatar || null,
        email: email || null,
        facebook: facebook || null,
        linkedin: linkedin || null,
        order: instructorOrder,
        isActive: isActive ?? true
      }
    });

    res.status(201).json({
      message: 'Instructor created successfully',
      instructor
    });
  } catch (error) {
    console.error('Create instructor error:', error);
    res.status(500).json({ error: 'Failed to create instructor' });
  }
};

// Update instructor
export const updateInstructor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, slug, profession, bio, avatar, email, facebook, linkedin, order, isActive } = req.body;

    const existingInstructor = await prisma.instructor.findUnique({
      where: { id }
    });

    if (!existingInstructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    // Check if slug is being changed and if new slug already exists
    if (slug && slug !== existingInstructor.slug) {
      const slugExists = await prisma.instructor.findUnique({
        where: { slug }
      });
      if (slugExists) {
        return res.status(400).json({ error: 'Instructor with this slug already exists' });
      }
    }

    const instructor = await prisma.instructor.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(slug !== undefined && { slug }),
        ...(profession !== undefined && { profession }),
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
        ...(email !== undefined && { email }),
        ...(facebook !== undefined && { facebook }),
        ...(linkedin !== undefined && { linkedin }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json({
      message: 'Instructor updated successfully',
      instructor
    });
  } catch (error) {
    console.error('Update instructor error:', error);
    res.status(500).json({ error: 'Failed to update instructor' });
  }
};

// Delete instructor
export const deleteInstructor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const instructor = await prisma.instructor.findUnique({
      where: { id },
      include: {
        _count: { select: { courses: true } }
      }
    });

    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    if (instructor._count.courses > 0) {
      return res.status(400).json({
        error: 'Cannot delete instructor with assigned courses. Please reassign or remove courses first.'
      });
    }

    await prisma.instructor.delete({
      where: { id }
    });

    res.json({ message: 'Instructor deleted successfully' });
  } catch (error) {
    console.error('Delete instructor error:', error);
    res.status(500).json({ error: 'Failed to delete instructor' });
  }
};

// Reorder instructors
export const reorderInstructors = async (req: Request, res: Response) => {
  try {
    const { instructors } = req.body; // Array of { id, order }

    if (!Array.isArray(instructors)) {
      return res.status(400).json({ error: 'Instructors must be an array' });
    }

    // Update all instructors in a transaction
    await prisma.$transaction(
      instructors.map(({ id, order }) =>
        prisma.instructor.update({
          where: { id },
          data: { order }
        })
      )
    );

    res.json({ message: 'Instructors reordered successfully' });
  } catch (error) {
    console.error('Reorder instructors error:', error);
    res.status(500).json({ error: 'Failed to reorder instructors' });
  }
};

// Toggle instructor active status
export const toggleInstructorStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const instructor = await prisma.instructor.findUnique({
      where: { id }
    });

    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    const updatedInstructor = await prisma.instructor.update({
      where: { id },
      data: { isActive: !instructor.isActive }
    });

    res.json({
      message: `Instructor ${updatedInstructor.isActive ? 'activated' : 'deactivated'} successfully`,
      instructor: updatedInstructor
    });
  } catch (error) {
    console.error('Toggle instructor status error:', error);
    res.status(500).json({ error: 'Failed to toggle instructor status' });
  }
};
