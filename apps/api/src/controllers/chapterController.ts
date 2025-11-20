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

    res.json({ chapters });
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
      where: { id }
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
      where: { id }
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

    if (!Array.isArray(chapters)) {
      return res.status(400).json({ error: 'Chapters must be an array' });
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
