import { Request, Response } from 'express';
import { getFileUrl } from '../services/uploadService';

export const uploadThumbnailHandler = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = getFileUrl(req.file.path.replace(process.cwd() + '/', ''));

    res.status(200).json({
      message: 'Thumbnail uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        path: req.file.path.replace(process.cwd() + '/', '')
      }
    });
  } catch (error) {
    console.error('Thumbnail upload error:', error);
    res.status(500).json({ error: 'Failed to upload thumbnail' });
  }
};

export const uploadVideoHandler = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = getFileUrl(req.file.path.replace(process.cwd() + '/', ''));

    res.status(200).json({
      message: 'Video uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        path: req.file.path.replace(process.cwd() + '/', '')
      }
    });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
};

export const uploadAssignmentHandler = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = getFileUrl(req.file.path.replace(process.cwd() + '/', ''));

    res.status(200).json({
      message: 'Assignment uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        path: req.file.path.replace(process.cwd() + '/', '')
      }
    });
  } catch (error) {
    console.error('Assignment upload error:', error);
    res.status(500).json({ error: 'Failed to upload assignment' });
  }
};

export const uploadAnswerHandler = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = getFileUrl(req.file.path.replace(process.cwd() + '/', ''));

    res.status(200).json({
      message: 'Answer file uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        path: req.file.path.replace(process.cwd() + '/', '')
      }
    });
  } catch (error) {
    console.error('Answer upload error:', error);
    res.status(500).json({ error: 'Failed to upload answer file' });
  }
};

export const uploadMediaHandler = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = getFileUrl(req.file.path.replace(process.cwd() + '/', ''));

    res.status(200).json({
      message: 'Media uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        path: req.file.path.replace(process.cwd() + '/', '')
      }
    });
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({ error: 'Failed to upload media' });
  }
};
