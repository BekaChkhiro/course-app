import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

// Ensure upload directories exist
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const THUMBNAILS_DIR = path.join(UPLOAD_DIR, 'thumbnails');
const VIDEOS_DIR = path.join(UPLOAD_DIR, 'videos');
const ASSIGNMENTS_DIR = path.join(UPLOAD_DIR, 'assignments');
const ANSWERS_DIR = path.join(UPLOAD_DIR, 'answers');
const MEDIA_DIR = path.join(UPLOAD_DIR, 'media');
const QUIZ_IMAGES_DIR = path.join(UPLOAD_DIR, 'quiz-images');
const SUBMISSIONS_DIR = path.join(UPLOAD_DIR, 'submissions');
const SLIDERS_DIR = path.join(UPLOAD_DIR, 'sliders');

// Create directories if they don't exist
[UPLOAD_DIR, THUMBNAILS_DIR, VIDEOS_DIR, ASSIGNMENTS_DIR, ANSWERS_DIR, MEDIA_DIR, QUIZ_IMAGES_DIR, SUBMISSIONS_DIR, SLIDERS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// File type configurations
const FILE_TYPES = {
  image: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxSize: 5 * 1024 * 1024, // 5MB
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif']
  },
  video: {
    mimeTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
    maxSize: 500 * 1024 * 1024, // 500MB
    extensions: ['.mp4', '.webm', '.ogg', '.mov']
  },
  document: {
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 50 * 1024 * 1024, // 50MB
    extensions: ['.pdf', '.doc', '.docx']
  },
  submission: {
    mimeTypes: [
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime'
    ],
    maxSize: 50 * 1024 * 1024, // 50MB per file
    extensions: ['.pdf', '.zip', '.mp4', '.webm', '.ogg', '.mov']
  }
};

// Configure storage
const createStorage = (destinationDir: string) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destinationDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${randomUUID()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });
};

// File filter factory
const createFileFilter = (allowedTypes: string[]) => {
  return (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
    }
  };
};

// Multer configurations for different file types
export const uploadThumbnail = multer({
  storage: createStorage(THUMBNAILS_DIR),
  fileFilter: createFileFilter(FILE_TYPES.image.mimeTypes),
  limits: { fileSize: FILE_TYPES.image.maxSize }
});

export const uploadVideo = multer({
  storage: createStorage(VIDEOS_DIR),
  fileFilter: createFileFilter(FILE_TYPES.video.mimeTypes),
  limits: { fileSize: FILE_TYPES.video.maxSize }
});

export const uploadAssignment = multer({
  storage: createStorage(ASSIGNMENTS_DIR),
  fileFilter: createFileFilter(FILE_TYPES.document.mimeTypes),
  limits: { fileSize: FILE_TYPES.document.maxSize }
});

export const uploadAnswer = multer({
  storage: createStorage(ANSWERS_DIR),
  fileFilter: createFileFilter(FILE_TYPES.document.mimeTypes),
  limits: { fileSize: FILE_TYPES.document.maxSize }
});

export const uploadMedia = multer({
  storage: createStorage(MEDIA_DIR),
  fileFilter: createFileFilter([...FILE_TYPES.image.mimeTypes, ...FILE_TYPES.document.mimeTypes]),
  limits: { fileSize: FILE_TYPES.document.maxSize }
});

export const uploadQuizImage = multer({
  storage: createStorage(QUIZ_IMAGES_DIR),
  fileFilter: createFileFilter(FILE_TYPES.image.mimeTypes),
  limits: { fileSize: FILE_TYPES.image.maxSize }
});

export const uploadSliderImage = multer({
  storage: createStorage(SLIDERS_DIR),
  fileFilter: createFileFilter(FILE_TYPES.image.mimeTypes),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB for slider images
});

// Course submission files (public - no auth required) - uses memory storage for R2 upload
export const uploadSubmissionFiles = multer({
  storage: multer.memoryStorage(),
  fileFilter: createFileFilter(FILE_TYPES.submission.mimeTypes),
  limits: { fileSize: FILE_TYPES.submission.maxSize }
});

// Helper function to delete a file
export const deleteFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(process.cwd(), filePath);
    fs.unlink(fullPath, (err) => {
      if (err) {
        // If file doesn't exist, consider it a success
        if (err.code === 'ENOENT') {
          resolve();
        } else {
          reject(err);
        }
      } else {
        resolve();
      }
    });
  });
};

// Helper function to get file URL
export const getFileUrl = (filePath: string): string => {
  const baseUrl = process.env.API_URL || 'http://localhost:4000';
  return `${baseUrl}/${filePath}`;
};

// Helper function to extract filename from URL
export const getFilenameFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1); // Remove leading slash
  } catch {
    return null;
  }
};
