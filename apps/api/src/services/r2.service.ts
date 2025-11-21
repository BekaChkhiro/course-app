import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

class R2Service {
  private client: S3Client;
  private config: R2Config;

  constructor() {
    this.config = {
      accountId: process.env.R2_ACCOUNT_ID || '',
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      bucketName: process.env.R2_BUCKET_NAME || 'course-platform-videos',
      publicUrl: process.env.R2_PUBLIC_URL || '',
    };

    // Initialize S3 client for R2
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${this.config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  /**
   * Upload a file to R2
   */
  async uploadFile(
    key: string,
    fileBuffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<{ key: string; url: string; size: number }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: metadata,
      });

      await this.client.send(command);

      return {
        key,
        url: `${this.config.publicUrl}/${key}`,
        size: fileBuffer.length,
      };
    } catch (error) {
      console.error('R2 upload error:', error);
      throw new Error(`Failed to upload file to R2: ${error}`);
    }
  }

  /**
   * Upload a stream to R2 (useful for large files)
   */
  async uploadStream(
    key: string,
    stream: Readable,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<{ key: string; url: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: stream,
        ContentType: contentType,
        Metadata: metadata,
      });

      await this.client.send(command);

      return {
        key,
        url: `${this.config.publicUrl}/${key}`,
      };
    } catch (error) {
      console.error('R2 stream upload error:', error);
      throw new Error(`Failed to upload stream to R2: ${error}`);
    }
  }

  /**
   * Get a file from R2
   */
  async getFile(key: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);
      return response.Body as Readable;
    } catch (error) {
      console.error('R2 get file error:', error);
      throw new Error(`Failed to get file from R2: ${error}`);
    }
  }

  /**
   * Delete a file from R2
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      await this.client.send(command);
    } catch (error) {
      console.error('R2 delete error:', error);
      throw new Error(`Failed to delete file from R2: ${error}`);
    }
  }

  /**
   * Delete multiple files from R2
   */
  async deleteFiles(keys: string[]): Promise<void> {
    try {
      await Promise.all(keys.map((key) => this.deleteFile(key)));
    } catch (error) {
      console.error('R2 bulk delete error:', error);
      throw new Error(`Failed to delete files from R2: ${error}`);
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<{
    size: number;
    lastModified: Date;
    contentType: string;
    metadata?: Record<string, string>;
  }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);

      return {
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType || '',
        metadata: response.Metadata,
      };
    } catch (error) {
      console.error('R2 metadata error:', error);
      throw new Error(`Failed to get file metadata from R2: ${error}`);
    }
  }

  /**
   * Generate a presigned URL for temporary access
   */
  async getPresignedUrl(
    key: string,
    expiresIn: number = 7200 // 2 hours default
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error('R2 presigned URL error:', error);
      throw new Error(`Failed to generate presigned URL: ${error}`);
    }
  }

  /**
   * List files with a specific prefix
   */
  async listFiles(prefix: string): Promise<
    Array<{
      key: string;
      size: number;
      lastModified: Date;
    }>
  > {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        Prefix: prefix,
      });

      const response = await this.client.send(command);

      return (
        response.Contents?.map((item) => ({
          key: item.Key || '',
          size: item.Size || 0,
          lastModified: item.LastModified || new Date(),
        })) || []
      );
    } catch (error) {
      console.error('R2 list files error:', error);
      throw new Error(`Failed to list files from R2: ${error}`);
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.getFileMetadata(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a key path for video storage
   */
  generateVideoKey(
    courseId: string,
    chapterId: string,
    filename: string
  ): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `courses/${courseId}/chapters/${chapterId}/videos/${timestamp}_${sanitizedFilename}`;
  }

  /**
   * Generate a key path for HLS files
   */
  generateHLSKey(
    courseId: string,
    chapterId: string,
    videoId: string,
    quality: string,
    filename: string
  ): string {
    return `courses/${courseId}/chapters/${chapterId}/hls/${videoId}/${quality}/${filename}`;
  }

  /**
   * Generate a key path for thumbnails
   */
  generateThumbnailKey(
    courseId: string,
    chapterId: string,
    videoId: string,
    index: number
  ): string {
    return `courses/${courseId}/chapters/${chapterId}/thumbnails/${videoId}/thumb_${index}.jpg`;
  }

  /**
   * Get public URL for a key
   */
  getPublicUrl(key: string): string {
    return `${this.config.publicUrl}/${key}`;
  }
}

export default new R2Service();
