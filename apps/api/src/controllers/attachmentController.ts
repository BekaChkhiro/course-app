import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'attachments');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed',
    ];
    const allowedExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.txt', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, Word, Excel, PowerPoint, Images, Text, ZIP'));
    }
  },
});

export const uploadMiddleware = upload.single('file');
export const uploadMultipleMiddleware = upload.array('files', 10);

/**
 * Upload attachment to a chapter
 */
export const uploadAttachment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided',
      });
    }

    const { chapterId, title, description } = req.body;

    if (!chapterId) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Chapter ID is required',
      });
    }

    // Verify chapter exists
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
    });

    if (!chapter) {
      await fs.unlink(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    // Get max order
    const maxOrder = await prisma.chapterAttachment.aggregate({
      where: { chapterId },
      _max: { order: true },
    });

    const filePath = `attachments/${req.file.filename}`;
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    const fileUrl = `${apiUrl}/uploads/${filePath}`;

    // Create attachment record
    const attachment = await prisma.chapterAttachment.create({
      data: {
        chapterId,
        title: title || req.file.originalname,
        description,
        fileName: req.file.originalname,
        filePath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        order: (maxOrder._max.order || 0) + 1,
      },
    });

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        ...attachment,
        url: fileUrl,
      },
    });
  } catch (error) {
    console.error('Upload attachment error:', error);

    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get attachments for a chapter
 */
export const getChapterAttachments = async (req: AuthRequest, res: Response) => {
  try {
    const { chapterId } = req.params;

    const attachments = await prisma.chapterAttachment.findMany({
      where: { chapterId },
      orderBy: { order: 'asc' },
    });

    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    const attachmentsWithUrls = attachments.map(att => ({
      ...att,
      url: `${apiUrl}/uploads/${att.filePath}`,
    }));

    res.json({
      success: true,
      data: attachmentsWithUrls,
    });
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attachments',
    });
  }
};

/**
 * Update attachment
 */
export const updateAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { attachmentId } = req.params;
    const { title, description, order } = req.body;

    const attachment = await prisma.chapterAttachment.update({
      where: { id: attachmentId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(order !== undefined && { order }),
      },
    });

    const apiUrl = process.env.API_URL || 'http://localhost:4000';

    res.json({
      success: true,
      data: {
        ...attachment,
        url: `${apiUrl}/uploads/${attachment.filePath}`,
      },
    });
  } catch (error) {
    console.error('Update attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update attachment',
    });
  }
};

/**
 * Delete attachment
 */
export const deleteAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { attachmentId } = req.params;

    const attachment = await prisma.chapterAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found',
      });
    }

    // Delete file from disk
    const filePath = path.join(process.cwd(), 'uploads', attachment.filePath);
    await fs.unlink(filePath).catch(() => {});

    // Delete from database
    await prisma.chapterAttachment.delete({
      where: { id: attachmentId },
    });

    res.json({
      success: true,
      message: 'Attachment deleted successfully',
    });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete attachment',
    });
  }
};

/**
 * Reorder attachments
 */
export const reorderAttachments = async (req: AuthRequest, res: Response) => {
  try {
    const { chapterId } = req.params;
    const { attachmentIds } = req.body;

    if (!Array.isArray(attachmentIds)) {
      return res.status(400).json({
        success: false,
        message: 'attachmentIds must be an array',
      });
    }

    // Update order for each attachment
    await Promise.all(
      attachmentIds.map((id: string, index: number) =>
        prisma.chapterAttachment.update({
          where: { id },
          data: { order: index + 1 },
        })
      )
    );

    res.json({
      success: true,
      message: 'Attachments reordered successfully',
    });
  } catch (error) {
    console.error('Reorder attachments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder attachments',
    });
  }
};
