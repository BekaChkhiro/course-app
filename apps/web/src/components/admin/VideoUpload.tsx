'use client';

import React, { useState, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface UploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  videoId?: string;
  error?: string;
}

interface VideoUploadProps {
  chapterId: string;
  onUploadComplete?: (videoId: string) => void;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ chapterId, onUploadComplete }) => {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Handle file selection
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter((file) => {
      const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
      const validExts = ['.mp4', '.mov', '.avi', '.mkv'];
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

      if (file.size > 2 * 1024 * 1024 * 1024) {
        alert(`${file.name}: ფაილის ზომა არ უნდა აღემატებოდეს 2GB-ს`);
        return false;
      }

      if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
        alert(`${file.name}: არასწორი ფორმატი. დასაშვებია მხოლოდ: MP4, MOV, AVI, MKV`);
        return false;
      }

      return true;
    });

    const newUploads: UploadItem[] = validFiles.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
      progress: 0,
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    // Start uploading immediately
    newUploads.forEach((upload) => {
      uploadVideo(upload);
    });
  }, []);

  // Upload video function
  const uploadVideo = async (upload: UploadItem) => {
    try {
      // Update status to uploading
      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id ? { ...u, status: 'uploading' as const, progress: 0 } : u
        )
      );

      const formData = new FormData();
      formData.append('video', upload.file);
      formData.append('chapterId', chapterId);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploads((prev) =>
            prev.map((u) => (u.id === upload.id ? { ...u, progress } : u))
          );
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            const videoId = response.data.videoId;

            // Update to processing status
            setUploads((prev) =>
              prev.map((u) =>
                u.id === upload.id
                  ? { ...u, status: 'processing' as const, videoId, progress: 100 }
                  : u
              )
            );

            // Poll for processing status
            pollProcessingStatus(upload.id, videoId);
          } else {
            throw new Error(response.message || 'Upload failed');
          }
        } else {
          throw new Error(`Upload failed with status: ${xhr.status}`);
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === upload.id
              ? {
                  ...u,
                  status: 'error' as const,
                  error: 'ატვირთვა ვერ მოხერხდა',
                }
              : u
          )
        );
      });

      // Send request
      xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL}/api/videos/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('accessToken')}`);
      xhr.send(formData);
    } catch (error) {
      console.error('Upload error:', error);
      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? {
                ...u,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'ატვირთვა ვერ მოხერხდა',
              }
            : u
        )
      );
    }
  };

  // Poll processing status
  const pollProcessingStatus = async (uploadId: string, videoId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/videos/${videoId}/status`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
          }
        );

        const data = await response.json();

        if (data.success) {
          const { processingStatus, processingProgress, processingError } = data.data;

          setUploads((prev) =>
            prev.map((u) => {
              if (u.id !== uploadId) return u;

              if (processingStatus === 'COMPLETED') {
                clearInterval(interval);
                if (onUploadComplete) {
                  onUploadComplete(videoId);
                }
                return { ...u, status: 'completed' as const, progress: 100 };
              }

              if (processingStatus === 'FAILED') {
                clearInterval(interval);
                return {
                  ...u,
                  status: 'error' as const,
                  error: processingError || 'დამუშავება ვერ მოხერხდა',
                };
              }

              return { ...u, progress: processingProgress || 0 };
            })
          );
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
    }, 3000); // Poll every 3 seconds

    // Clear interval after 30 minutes
    setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
  };

  // Remove upload from queue
  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  // Retry failed upload
  const retryUpload = (id: string) => {
    const upload = uploads.find((u) => u.id === id);
    if (upload) {
      uploadVideo(upload);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Get status icon
  const getStatusIcon = (status: UploadItem['status']) => {
    switch (status) {
      case 'pending':
      case 'uploading':
      case 'processing':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  // Get status text
  const getStatusText = (upload: UploadItem) => {
    switch (upload.status) {
      case 'pending':
        return 'მზადება...';
      case 'uploading':
        return `ატვირთვა... ${upload.progress}%`;
      case 'processing':
        return `დამუშავება... ${upload.progress}%`;
      case 'completed':
        return 'დასრულდა';
      case 'error':
        return upload.error || 'შეცდომა';
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-gray-300 dark:border-gray-700'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          ჩააგდეთ ვიდეო ფაილები აქ
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          ან დააჭირეთ ასარჩევად
        </p>
        <label className="inline-block">
          <input
            type="file"
            className="hidden"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.mov,.avi,.mkv"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
          />
          <span className="px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors inline-block">
            ფაილების არჩევა
          </span>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          მხარდაჭერილი ფორმატები: MP4, MOV, AVI, MKV (მაქს. 2GB)
        </p>
      </div>

      {/* Upload Queue */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-gray-700 dark:text-gray-300">
            ატვირთვის რიგი ({uploads.length})
          </h3>
          <div className="space-y-2">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getStatusIcon(upload.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {upload.file.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {(upload.file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {upload.status === 'error' && (
                      <button
                        onClick={() => retryUpload(upload.id)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        თავიდან
                      </button>
                    )}
                    {(upload.status === 'completed' || upload.status === 'error') && (
                      <button
                        onClick={() => removeUpload(upload.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {(upload.status === 'uploading' || upload.status === 'processing') && (
                  <div className="mt-2">
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Status Text */}
                <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                  {getStatusText(upload)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;
