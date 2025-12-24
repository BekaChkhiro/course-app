import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { deleteFile, getFilenameFromUrl } from '../services/uploadService';

const prisma = new PrismaClient();

// Get all chapters for a course version
export const getChaptersByVersion = async (req: Request, res: Response) => {
  try {
    const { versionId } = req.params;

    const chapters = await prisma.chapter.findMany({
      where: { courseVersionId: versionId },
      include: {
        contents: {
          orderBy: { order: 'asc' }
        },
        _count: { select: { comments: true, progress: true } }
      },
      orderBy: { order: 'asc' }
    });

    // Check which chapters have quizzes
    const chapterIds = chapters.map(c => c.id);
    const quizzes = await prisma.quiz.findMany({
      where: { chapterContentId: { in: chapterIds } },
      select: { chapterContentId: true }
    });
    const chaptersWithQuiz = new Set(quizzes.map(q => q.chapterContentId));

    // Add hasQuiz flag to each chapter
    const chaptersWithQuizFlag = chapters.map(chapter => ({
      ...chapter,
      hasQuiz: chaptersWithQuiz.has(chapter.id)
    }));

    res.json({ chapters: chaptersWithQuizFlag });
  } catch (error) {
    console.error('Get chapters error:', error);
    res.status(500).json({ error: 'Failed to fetch chapters' });
  }
};

// Get chapter by ID
export const getChapterById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        courseVersion: {
          include: {
            course: {
              select: { id: true, title: true, slug: true }
            }
          }
        },
        contents: {
          orderBy: { order: 'asc' },
          include: {
            quiz: {
              include: {
                questions: {
                  include: {
                    answers: true
                  },
                  orderBy: { order: 'asc' }
                }
              }
            }
          }
        },
        comments: {
          where: { parentId: null },
          include: {
            user: { select: { name: true, surname: true, avatar: true } },
            replies: {
              include: {
                user: { select: { name: true, surname: true, avatar: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: { select: { comments: true, progress: true } }
      }
    });

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    res.json({ chapter });
  } catch (error) {
    console.error('Get chapter error:', error);
    res.status(500).json({ error: 'Failed to fetch chapter' });
  }
};

// Create chapter
export const createChapter = async (req: Request, res: Response) => {
  try {
    const {
      courseVersionId,
      title,
      description,
      order,
      isFree,
      videoUrl,
      theory,
      assignmentFile,
      answerFile
    } = req.body;

    // Verify course version exists
    const courseVersion = await prisma.courseVersion.findUnique({
      where: { id: courseVersionId }
    });

    if (!courseVersion) {
      return res.status(404).json({ error: 'Course version not found' });
    }

    // If order is not provided, set it as the last chapter
    let chapterOrder = order;
    if (chapterOrder === undefined) {
      const lastChapter = await prisma.chapter.findFirst({
        where: { courseVersionId },
        orderBy: { order: 'desc' }
      });
      chapterOrder = lastChapter ? lastChapter.order + 1 : 0;
    }

    const chapter = await prisma.chapter.create({
      data: {
        courseVersionId,
        title,
        description,
        order: chapterOrder,
        isFree: isFree || false,
        videoUrl,
        theory,
        assignmentFile,
        answerFile
      },
      include: {
        contents: true,
        _count: { select: { comments: true, progress: true } }
      }
    });

    res.status(201).json({
      message: 'Chapter created successfully',
      chapter
    });
  } catch (error) {
    console.error('Create chapter error:', error);
    res.status(500).json({ error: 'Failed to create chapter' });
  }
};

// Update chapter
export const updateChapter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      order,
      isFree,
      videoUrl,
      theory,
      assignmentFile,
      answerFile
    } = req.body;

    const existingChapter = await prisma.chapter.findUnique({
      where: { id },
      include: { courseVersion: true }
    });

    if (!existingChapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Delete old files if being replaced
    if (assignmentFile && existingChapter.assignmentFile && assignmentFile !== existingChapter.assignmentFile) {
      const oldFilename = getFilenameFromUrl(existingChapter.assignmentFile);
      if (oldFilename) await deleteFile(oldFilename).catch(console.error);
    }

    if (answerFile && existingChapter.answerFile && answerFile !== existingChapter.answerFile) {
      const oldFilename = getFilenameFromUrl(existingChapter.answerFile);
      if (oldFilename) await deleteFile(oldFilename).catch(console.error);
    }

    const chapter = await prisma.chapter.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(order !== undefined && { order }),
        ...(isFree !== undefined && { isFree }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(theory !== undefined && { theory }),
        ...(assignmentFile !== undefined && { assignmentFile }),
        ...(answerFile !== undefined && { answerFile })
      },
      include: {
        contents: { orderBy: { order: 'asc' } },
        _count: { select: { comments: true, progress: true } }
      }
    });

    res.json({
      message: 'Chapter updated successfully',
      chapter
    });
  } catch (error) {
    console.error('Update chapter error:', error);
    res.status(500).json({ error: 'Failed to update chapter' });
  }
};

// Delete chapter
export const deleteChapter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: { courseVersion: true }
    });

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Delete associated files
    if (chapter.assignmentFile) {
      const filename = getFilenameFromUrl(chapter.assignmentFile);
      if (filename) await deleteFile(filename).catch(console.error);
    }

    if (chapter.answerFile) {
      const filename = getFilenameFromUrl(chapter.answerFile);
      if (filename) await deleteFile(filename).catch(console.error);
    }

    await prisma.chapter.delete({
      where: { id }
    });

    res.json({ message: 'Chapter deleted successfully' });
  } catch (error) {
    console.error('Delete chapter error:', error);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
};

// Reorder chapters
export const reorderChapters = async (req: Request, res: Response) => {
  try {
    const { chapters } = req.body; // Array of { id, order }

    if (!Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ error: 'Chapters must be a non-empty array' });
    }

    // Update all chapters in a transaction
    await prisma.$transaction(
      chapters.map(({ id, order }) =>
        prisma.chapter.update({
          where: { id },
          data: { order }
        })
      )
    );

    res.json({ message: 'Chapters reordered successfully' });
  } catch (error) {
    console.error('Reorder chapters error:', error);
    res.status(500).json({ error: 'Failed to reorder chapters' });
  }
};

// Bulk delete chapters
export const bulkDeleteChapters = async (req: Request, res: Response) => {
  try {
    const { chapterIds } = req.body;

    if (!Array.isArray(chapterIds) || chapterIds.length === 0) {
      return res.status(400).json({ error: 'Chapter IDs must be a non-empty array' });
    }

    // Get all chapters to delete their files
    const chapters = await prisma.chapter.findMany({
      where: { id: { in: chapterIds } },
      select: { id: true, assignmentFile: true, answerFile: true }
    });

    // Delete all associated files
    for (const chapter of chapters) {
      if (chapter.assignmentFile) {
        const filename = getFilenameFromUrl(chapter.assignmentFile);
        if (filename) await deleteFile(filename).catch(console.error);
      }
      if (chapter.answerFile) {
        const filename = getFilenameFromUrl(chapter.answerFile);
        if (filename) await deleteFile(filename).catch(console.error);
      }
    }

    await prisma.chapter.deleteMany({
      where: { id: { in: chapterIds } }
    });

    res.json({
      message: `${chapterIds.length} chapter(s) deleted successfully`
    });
  } catch (error) {
    console.error('Bulk delete chapters error:', error);
    res.status(500).json({ error: 'Failed to bulk delete chapters' });
  }
};

// Toggle chapter free status
export const toggleChapterFree = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const chapter = await prisma.chapter.findUnique({
      where: { id }
    });

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const updatedChapter = await prisma.chapter.update({
      where: { id },
      data: { isFree: !chapter.isFree },
      include: {
        _count: { select: { comments: true, progress: true } }
      }
    });

    res.json({
      message: `Chapter ${updatedChapter.isFree ? 'is now' : 'is no longer'} free`,
      chapter: updatedChapter
    });
  } catch (error) {
    console.error('Toggle chapter free error:', error);
    res.status(500).json({ error: 'Failed to toggle chapter free status' });
  }
};

// Get chapter videos
export const getChapterVideos = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const videos = await prisma.video.findMany({
      where: { chapterId: id },
      select: {
        id: true,
        originalName: true,
        originalSize: true,
        mimeType: true,
        duration: true,
        width: true,
        height: true,
        processingStatus: true,
        processingProgress: true,
        processingError: true,
        hlsMasterUrl: true,
        hls480pUrl: true,
        hls720pUrl: true,
        hls1080pUrl: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: videos
    });
  } catch (error) {
    console.error('Get chapter videos error:', error);
    res.status(500).json({ error: 'Failed to fetch chapter videos' });
  }
};

// ==========================================
// CHAPTER LINKING FOR VERSION UPGRADES
// ==========================================

// Link a chapter to its original (from previous version)
export const linkChapter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { originalChapterId } = req.body;

    // Validate that the chapter exists
    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: { courseVersion: true },
    });

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    // If originalChapterId is provided, validate it exists and belongs to an older version
    if (originalChapterId) {
      const originalChapter = await prisma.chapter.findUnique({
        where: { id: originalChapterId },
        include: { courseVersion: true },
      });

      if (!originalChapter) {
        return res.status(404).json({
          success: false,
          message: 'Original chapter not found',
        });
      }

      // Ensure both chapters belong to the same course
      if (originalChapter.courseVersion.courseId !== chapter.courseVersion.courseId) {
        return res.status(400).json({
          success: false,
          message: 'Chapters must belong to the same course',
        });
      }

      // Ensure original is from an older version
      if (originalChapter.courseVersion.version >= chapter.courseVersion.version) {
        return res.status(400).json({
          success: false,
          message: 'Original chapter must be from an older version',
        });
      }
    }

    // Update the chapter with the originalChapterId
    const updatedChapter = await prisma.chapter.update({
      where: { id },
      data: { originalChapterId: originalChapterId || null },
      include: {
        originalChapter: {
          select: { id: true, title: true },
        },
      },
    });

    res.json({
      success: true,
      message: originalChapterId ? 'Chapter linked successfully' : 'Chapter link removed',
      data: updatedChapter,
    });
  } catch (error) {
    console.error('Link chapter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to link chapter',
    });
  }
};

// Get chapters with linking status for a version
export const getVersionChaptersWithLinks = async (req: Request, res: Response) => {
  try {
    const { versionId } = req.params;

    const version = await prisma.courseVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        version: true,
        courseId: true,
      },
    });

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Version not found',
      });
    }

    // Get chapters with their original chapter info
    const chapters = await prisma.chapter.findMany({
      where: { courseVersionId: versionId },
      select: {
        id: true,
        title: true,
        order: true,
        originalChapterId: true,
        originalChapter: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Get previous version chapters for dropdown options
    const previousVersion = await prisma.courseVersion.findFirst({
      where: {
        courseId: version.courseId,
        version: { lt: version.version },
      },
      orderBy: { version: 'desc' },
      include: {
        chapters: {
          select: {
            id: true,
            title: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    res.json({
      success: true,
      data: {
        chapters,
        previousVersionChapters: previousVersion?.chapters || [],
        previousVersionNumber: previousVersion?.version || null,
      },
    });
  } catch (error) {
    console.error('Get version chapters with links error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chapters',
    });
  }
};

// Auto-link chapters between versions based on title matching
export const autoLinkVersionChapters = async (req: Request, res: Response) => {
  try {
    const { versionId } = req.params;

    const version = await prisma.courseVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        version: true,
        courseId: true,
      },
    });

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Version not found',
      });
    }

    // Get previous version
    const previousVersion = await prisma.courseVersion.findFirst({
      where: {
        courseId: version.courseId,
        version: { lt: version.version },
      },
      orderBy: { version: 'desc' },
      include: {
        chapters: {
          select: { id: true, title: true },
        },
      },
    });

    if (!previousVersion) {
      return res.status(400).json({
        success: false,
        message: 'No previous version found',
      });
    }

    // Get unlinked chapters in current version
    const unlinkedChapters = await prisma.chapter.findMany({
      where: {
        courseVersionId: versionId,
        originalChapterId: null,
      },
      select: { id: true, title: true },
    });

    // Create a map for quick lookup
    const prevChapterMap = new Map(
      previousVersion.chapters.map((c) => [c.title.toLowerCase().trim(), c.id])
    );

    // Link chapters by exact title match
    let linkedCount = 0;
    const linkedChapters: { id: string; title: string; linkedTo: string }[] = [];

    for (const chapter of unlinkedChapters) {
      const normalizedTitle = chapter.title.toLowerCase().trim();
      const matchingOriginalId = prevChapterMap.get(normalizedTitle);

      if (matchingOriginalId) {
        await prisma.chapter.update({
          where: { id: chapter.id },
          data: { originalChapterId: matchingOriginalId },
        });
        linkedCount++;
        linkedChapters.push({
          id: chapter.id,
          title: chapter.title,
          linkedTo: matchingOriginalId,
        });
      }
    }

    res.json({
      success: true,
      message: `Auto-linked ${linkedCount} chapters`,
      data: {
        linkedCount,
        linkedChapters,
        unlinkedCount: unlinkedChapters.length - linkedCount,
      },
    });
  } catch (error) {
    console.error('Auto-link chapters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-link chapters',
    });
  }
};
