'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, File, Image, Download, X, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

interface Attachment {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  url: string;
}

interface AttachmentsPreviewProps {
  chapterId: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) {
    return <Image className="w-5 h-5 text-green-500" />;
  }
  if (mimeType === 'application/pdf') {
    return <FileText className="w-5 h-5 text-red-500" />;
  }
  return <File className="w-5 h-5 text-blue-500" />;
};

export default function AttachmentsPreview({ chapterId }: AttachmentsPreviewProps) {
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch attachments from student API
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['student-chapter-attachments', chapterId],
    queryFn: async () => {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/attachments/chapter/${chapterId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch attachments');
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!chapterId,
  });

  const pdfAttachments = attachments.filter((a: Attachment) => a.mimeType === 'application/pdf');
  const otherAttachments = attachments.filter((a: Attachment) => a.mimeType !== 'application/pdf');

  const currentPdfIndex = pdfAttachments.findIndex((a: Attachment) => a.id === selectedAttachment?.id);

  const handlePrevPdf = () => {
    if (currentPdfIndex > 0) {
      setSelectedAttachment(pdfAttachments[currentPdfIndex - 1]);
    }
  };

  const handleNextPdf = () => {
    if (currentPdfIndex < pdfAttachments.length - 1) {
      setSelectedAttachment(pdfAttachments[currentPdfIndex + 1]);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (attachments.length === 0) {
    return null;
  }

  return (
    <>
      {/* Attachments List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-medium text-gray-900 flex items-center">
            <FileText className="w-4 h-4 mr-2 text-gray-500" />
            დამატებითი მასალები
            <span className="ml-2 text-sm text-gray-500">({attachments.length})</span>
          </h3>
        </div>

        <div className="divide-y divide-gray-100">
          {attachments.map((attachment: Attachment) => (
            <div
              key={attachment.id}
              className="flex items-center p-4 hover:bg-gray-50 transition-colors"
            >
              {getFileIcon(attachment.mimeType)}

              <div className="flex-1 min-w-0 ml-3">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {attachment.title}
                </p>
                <p className="text-xs text-gray-500">
                  {attachment.fileName} • {formatFileSize(attachment.fileSize)}
                </p>
                {attachment.description && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {attachment.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 ml-3">
                {attachment.mimeType === 'application/pdf' && (
                  <button
                    onClick={() => setSelectedAttachment(attachment)}
                    className="px-3 py-1.5 text-sm text-primary-900 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    ნახვა
                  </button>
                )}
                {attachment.mimeType.startsWith('image/') && (
                  <button
                    onClick={() => setSelectedAttachment(attachment)}
                    className="px-3 py-1.5 text-sm text-primary-900 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    ნახვა
                  </button>
                )}
                <a
                  href={attachment.url}
                  download={attachment.fileName}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="ჩამოტვირთვა"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {selectedAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 flex items-center justify-between">
            <div className="text-white">
              <h3 className="font-medium">{selectedAttachment.title}</h3>
              <p className="text-sm text-white/70">{selectedAttachment.fileName}</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={selectedAttachment.url}
                download={selectedAttachment.fileName}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="ჩამოტვირთვა"
              >
                <Download className="w-5 h-5" />
              </a>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title={isFullscreen ? 'შემცირება' : 'გადიდება'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => {
                  setSelectedAttachment(null);
                  setIsFullscreen(false);
                }}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* PDF Navigation */}
          {selectedAttachment.mimeType === 'application/pdf' && pdfAttachments.length > 1 && (
            <>
              {currentPdfIndex > 0 && (
                <button
                  onClick={handlePrevPdf}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {currentPdfIndex < pdfAttachments.length - 1 && (
                <button
                  onClick={handleNextPdf}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </>
          )}

          {/* Content */}
          <div
            className={`bg-white rounded-lg overflow-hidden shadow-2xl transition-all ${
              isFullscreen ? 'w-full h-full m-0 rounded-none' : 'w-[90vw] h-[85vh] max-w-6xl'
            }`}
          >
            {selectedAttachment.mimeType === 'application/pdf' ? (
              <iframe
                src={`${selectedAttachment.url}#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full h-full"
                title={selectedAttachment.title}
              />
            ) : selectedAttachment.mimeType.startsWith('image/') ? (
              <div className="w-full h-full flex items-center justify-center p-4 bg-gray-900">
                <img
                  src={selectedAttachment.url}
                  alt={selectedAttachment.title}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                  <a
                    href={selectedAttachment.url}
                    download={selectedAttachment.fileName}
                    className="inline-flex items-center px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download File
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* PDF Page indicator */}
          {selectedAttachment.mimeType === 'application/pdf' && pdfAttachments.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full text-white text-sm">
              {currentPdfIndex + 1} / {pdfAttachments.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
