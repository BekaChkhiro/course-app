'use client';

import { useRef, useState } from 'react';
import { Upload, X, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSize?: number; // in MB
  onUpload: (file: File) => Promise<{ url: string; path: string }>;
  value?: string;
  onChange?: (url: string, path: string) => void;
  preview?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function FileUpload({
  label,
  accept,
  maxSize = 10,
  onUpload,
  value,
  onChange,
  preview = true,
  disabled = false,
  className
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSize}MB`);
      return;
    }

    setUploading(true);
    try {
      const result = await onUpload(file);
      onChange?.(result.url, result.path);
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

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

    if (disabled || uploading) return;

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    onChange?.('', '');
    if (inputRef.current) inputRef.current.value = '';
  };

  const isImage = accept?.includes('image');

  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}

      {value && preview ? (
        <div className="relative">
          {isImage ? (
            <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
              <img src={value} alt="Preview" className="w-full h-full object-cover" />
              {!disabled && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-lg hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <File className="w-5 h-5 text-gray-400" />
              <span className="flex-1 text-sm text-gray-600 truncate">{value}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 transition-colors',
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            disabled={disabled || uploading}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-2 text-center">
            {uploading ? (
              <>
                <LoadingSpinner size="md" />
                <p className="text-sm text-gray-600">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Max file size: {maxSize}MB
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
