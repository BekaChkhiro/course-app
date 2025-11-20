import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all versions for a course
export const getVersionsByCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const versions = await prisma.courseVersion.findMany({
      where: { courseId },
      include: {
        _count: { select: { chapters: true, progress: true } }
      },
      orderBy: { version: 'desc' }
    });

    res.json({ versions });
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
};

// Get version by ID
export const getVersionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const version = await prisma.courseVersion.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            status: true,
            category: { select: { name: true } }
          }
        },
        chapters: {
          orderBy: { order: 'asc' },
          include: {
            contents: { orderBy: { order: 'asc' } },
            _count: { select: { comments: true, progress: true } }
          }
        },
        _count: { select: { chapters: true, progress: true } }
      }
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json({ version });
  } catch (error) {
    console.error('Get version error:', error);
    res.status(500).json({ error: 'Failed to fetch version' });
  }
};

// Create new version
export const createVersion = async (req: Request, res: Response) => {
  try {
    const {
      courseId,
      title,
      description,
      changelog,
      upgradePrice,
      discountPercentage,
      copyFromVersionId
    } = req.body;

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get the next version number
    const lastVersion = await prisma.courseVersion.findFirst({
      where: { courseId },
      orderBy: { version: 'desc' }
    });

    const newVersionNumber = lastVersion ? lastVersion.version + 1 : 1;

    // If copying from existing version, get the chapters
    let versionData: any = {
      courseId,
      version: newVersionNumber,
      title,
      description,
      changelog,
      upgradePrice,
      discountPercentage,
      isActive: false
    };

    if (copyFromVersionId) {
      const sourceVersion = await prisma.courseVersion.findUnique({
        where: { id: copyFromVersionId },
        include: {
          chapters: {
            orderBy: { order: 'asc' },
            include: {
              contents: { orderBy: { order: 'asc' } }
            }
          }
        }
      });

      if (!sourceVersion) {
        return res.status(404).json({ error: 'Source version not found' });
      }

      versionData.chapters = {
        create: sourceVersion.chapters.map((chapter) => ({
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
      };
    }

    const version = await prisma.courseVersion.create({
      data: versionData,
      include: {
        _count: { select: { chapters: true, progress: true } }
      }
    });

    res.status(201).json({
      message: 'Version created successfully',
      version
    });
  } catch (error) {
    console.error('Create version error:', error);
    res.status(500).json({ error: 'Failed to create version' });
  }
};

// Update version
export const updateVersion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      changelog,
      upgradePrice,
      discountPercentage,
      isActive,
      publishedAt
    } = req.body;

    const existingVersion = await prisma.courseVersion.findUnique({
      where: { id }
    });

    if (!existingVersion) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // If activating this version, deactivate all other versions of the course
    if (isActive === true && !existingVersion.isActive) {
      await prisma.courseVersion.updateMany({
        where: {
          courseId: existingVersion.courseId,
          id: { not: id }
        },
        data: { isActive: false }
      });
    }

    const version = await prisma.courseVersion.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(changelog !== undefined && { changelog }),
        ...(upgradePrice !== undefined && { upgradePrice }),
        ...(discountPercentage !== undefined && { discountPercentage }),
        ...(isActive !== undefined && { isActive }),
        ...(publishedAt !== undefined && { publishedAt })
      },
      include: {
        _count: { select: { chapters: true, progress: true } }
      }
    });

    res.json({
      message: 'Version updated successfully',
      version
    });
  } catch (error) {
    console.error('Update version error:', error);
    res.status(500).json({ error: 'Failed to update version' });
  }
};

// Delete version
export const deleteVersion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const version = await prisma.courseVersion.findUnique({
      where: { id },
      include: {
        _count: { select: { progress: true } }
      }
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    if (version.isActive) {
      return res.status(400).json({
        error: 'Cannot delete active version. Please activate another version first.'
      });
    }

    if (version._count.progress > 0) {
      return res.status(400).json({
        error: 'Cannot delete version with student progress. Consider archiving instead.'
      });
    }

    await prisma.courseVersion.delete({
      where: { id }
    });

    res.json({ message: 'Version deleted successfully' });
  } catch (error) {
    console.error('Delete version error:', error);
    res.status(500).json({ error: 'Failed to delete version' });
  }
};

// Set active version
export const setActiveVersion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const version = await prisma.courseVersion.findUnique({
      where: { id }
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Deactivate all other versions of this course
    await prisma.courseVersion.updateMany({
      where: {
        courseId: version.courseId,
        id: { not: id }
      },
      data: { isActive: false }
    });

    // Activate this version
    const activeVersion = await prisma.courseVersion.update({
      where: { id },
      data: {
        isActive: true,
        publishedAt: version.publishedAt || new Date()
      },
      include: {
        _count: { select: { chapters: true, progress: true } }
      }
    });

    res.json({
      message: 'Version activated successfully',
      version: activeVersion
    });
  } catch (error) {
    console.error('Set active version error:', error);
    res.status(500).json({ error: 'Failed to activate version' });
  }
};

// Compare two versions
export const compareVersions = async (req: Request, res: Response) => {
  try {
    const { version1Id, version2Id } = req.query;

    if (!version1Id || !version2Id) {
      return res.status(400).json({ error: 'Both version IDs are required' });
    }

    const [version1, version2] = await Promise.all([
      prisma.courseVersion.findUnique({
        where: { id: version1Id as string },
        include: {
          chapters: {
            orderBy: { order: 'asc' },
            include: { contents: true }
          }
        }
      }),
      prisma.courseVersion.findUnique({
        where: { id: version2Id as string },
        include: {
          chapters: {
            orderBy: { order: 'asc' },
            include: { contents: true }
          }
        }
      })
    ]);

    if (!version1 || !version2) {
      return res.status(404).json({ error: 'One or both versions not found' });
    }

    if (version1.courseId !== version2.courseId) {
      return res.status(400).json({ error: 'Versions must belong to the same course' });
    }

    // Calculate differences
    const comparison = {
      version1: {
        id: version1.id,
        version: version1.version,
        title: version1.title,
        chaptersCount: version1.chapters.length,
        publishedAt: version1.publishedAt
      },
      version2: {
        id: version2.id,
        version: version2.version,
        title: version2.title,
        chaptersCount: version2.chapters.length,
        publishedAt: version2.publishedAt
      },
      differences: {
        chapterCountDiff: version2.chapters.length - version1.chapters.length,
        newChapters: version2.chapters.filter(
          c2 => !version1.chapters.find(c1 => c1.title === c2.title)
        ).map(c => c.title),
        removedChapters: version1.chapters.filter(
          c1 => !version2.chapters.find(c2 => c2.title === c1.title)
        ).map(c => c.title),
        changelog: version2.changelog
      }
    };

    res.json({ comparison });
  } catch (error) {
    console.error('Compare versions error:', error);
    res.status(500).json({ error: 'Failed to compare versions' });
  }
};
