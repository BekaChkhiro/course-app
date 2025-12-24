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
      upgradePriceType,
      upgradePriceValue,
      copyFromVersionId
    } = req.body;

    // Validate required fields
    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required' });
    }

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'ვერსიის სათაური აუცილებელია' });
    }

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
      description: description || '',
      changelog: changelog || null,
      upgradePriceType: upgradePriceType || null,
      upgradePriceValue: upgradePriceValue || null,
      status: 'DRAFT',
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
      upgradePriceType,
      upgradePriceValue,
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
        ...(upgradePriceType !== undefined && { upgradePriceType }),
        ...(upgradePriceValue !== undefined && { upgradePriceValue }),
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
    const { force } = req.query; // force=true to bypass some checks

    const version = await prisma.courseVersion.findUnique({
      where: { id },
      include: {
        _count: { select: { progress: true, purchases: true } }
      }
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Cannot delete active version (students are using it)
    if (version.isActive) {
      return res.status(400).json({
        error: 'აქტიური ვერსიის წაშლა შეუძლებელია. ჯერ სხვა ვერსია გააქტიურეთ.'
      });
    }

    // Cannot delete version with student progress (data loss)
    if (version._count.progress > 0) {
      return res.status(400).json({
        error: `ვერსიის წაშლა შეუძლებელია - ${version._count.progress} სტუდენტს აქვს პროგრესი.`
      });
    }

    // Cannot delete version that users have purchased
    if (version._count.purchases > 0) {
      return res.status(400).json({
        error: `ვერსიის წაშლა შეუძლებელია - ${version._count.purchases} მომხმარებელს აქვს შეძენილი.`
      });
    }

    // Delete the version (cascade will handle chapters, contents, etc.)
    await prisma.courseVersion.delete({
      where: { id }
    });

    res.json({
      message: 'ვერსია წარმატებით წაიშალა',
      deletedVersion: {
        id: version.id,
        version: version.version,
        title: version.title,
        status: version.status
      }
    });
  } catch (error) {
    console.error('Delete version error:', error);
    res.status(500).json({ error: 'ვერსიის წაშლა ვერ მოხერხდა' });
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

// Publish a draft version (makes it active automatically)
export const publishVersion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const version = await prisma.courseVersion.findUnique({
      where: { id },
      include: {
        _count: { select: { chapters: true } }
      }
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    if (version.status === 'PUBLISHED') {
      return res.status(400).json({
        error: 'ვერსია უკვე გამოქვეყნებულია.'
      });
    }

    // Check if version has at least one chapter
    if (version._count.chapters === 0) {
      return res.status(400).json({
        error: 'ვერსიას უნდა ჰქონდეს მინიმუმ ერთი თავი გამოქვეყნებამდე.'
      });
    }

    // Deactivate all other versions of this course
    await prisma.courseVersion.updateMany({
      where: {
        courseId: version.courseId,
        id: { not: id }
      },
      data: { isActive: false }
    });

    // Publish and activate this version
    const publishedVersion = await prisma.courseVersion.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        isActive: true,
        publishedAt: new Date()
      },
      include: {
        _count: { select: { chapters: true, progress: true } }
      }
    });

    res.json({
      message: 'ვერსია გამოქვეყნდა და აქტიურია',
      version: publishedVersion
    });
  } catch (error) {
    console.error('Publish version error:', error);
    res.status(500).json({ error: 'Failed to publish version' });
  }
};

// Create a draft copy of a published version
export const createDraftCopy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const sourceVersion = await prisma.courseVersion.findUnique({
      where: { id },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
          include: {
            contents: { orderBy: { order: 'asc' } },
            attachments: { orderBy: { order: 'asc' } }
          }
        }
      }
    });

    if (!sourceVersion) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Get the next version number
    const lastVersion = await prisma.courseVersion.findFirst({
      where: { courseId: sourceVersion.courseId },
      orderBy: { version: 'desc' }
    });

    const newVersionNumber = lastVersion ? lastVersion.version + 1 : 1;

    // Create new draft version with all chapters copied
    const newVersion = await prisma.courseVersion.create({
      data: {
        courseId: sourceVersion.courseId,
        version: newVersionNumber,
        title: `${sourceVersion.title} (Draft)`,
        description: sourceVersion.description,
        changelog: '',
        upgradePriceType: sourceVersion.upgradePriceType,
        upgradePriceValue: sourceVersion.upgradePriceValue,
        status: 'DRAFT',
        isActive: false,
        chapters: {
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
            },
            attachments: {
              create: chapter.attachments.map((att) => ({
                title: att.title,
                description: att.description,
                fileName: att.fileName,
                filePath: att.filePath,
                fileSize: att.fileSize,
                mimeType: att.mimeType,
                type: att.type,
                order: att.order
              }))
            }
          }))
        }
      },
      include: {
        _count: { select: { chapters: true, progress: true } }
      }
    });

    res.status(201).json({
      message: 'Draft ასლი შეიქმნა',
      version: newVersion
    });
  } catch (error) {
    console.error('Create draft copy error:', error);
    res.status(500).json({ error: 'Failed to create draft copy' });
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
