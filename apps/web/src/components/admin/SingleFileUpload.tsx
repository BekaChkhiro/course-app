'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, File, Trash2, Download, Eye, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface SingleFileUploadProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  accept?: string;
  onUpload: (file: File) => Promise<{ url: string; path: string }>;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileNameFromUrl = (url: string): string => {
  if (!url) return '';
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  // Remove timestamp prefix if present (e.g., "1234567890_filename.pdf" -> "filename.pdf")
  const match = filename.match(/^\d+_(.+)$/);
  return match ? match[1] : filename;
};

const isPdfFile = (url: string): boolean => {
  return url?.toLowerCase().includes('.pdf');
};

export default function SingleFileUpload({
  label,
  value,
  onChange,
  accept = '.pdf,.doc,.docx',
  onUpload,
}: SingleFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await onUpload(file);
      onChange(result.url);
      setFileInfo({ name: file.name, size: file.size });
      toast.success('ფაილი აიტვირთა');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'ატვირთვა ვერ მოხერხდა');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    if (confirm('წავშალოთ ფაილი?')) {
      onChange('');
      setFileInfo(null);
    }
  };

  const fileName = fileInfo?.name || getFileNameFromUrl(value || '');
  const isPdf = isPdfFile(value || '');

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {value ? (
        // File Preview
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
          {isPdf ? (
            <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
          ) : (
            <File className="w-5 h-5 text-blue-500 flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {fileName}
            </p>
            {fileInfo?.size && (
              <p className="text-xs text-gray-500">
                {formatFileSize(fileInfo.size)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isPdf && (
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="ნახვა"
              >
                <Eye className="w-4 h-4" />
              </a>
            )}
            <a
              href={value}
              download={fileName}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
              title="ჩამოტვირთვა"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={handleRemove}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="წაშლა"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        // Upload Area
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            uploading
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 text-blue-500 mx-auto mb-1 animate-spin" />
              <p className="text-sm text-gray-600">იტვირთება...</p>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
              <p className="text-sm text-gray-600">აირჩიეთ ფაილი</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
