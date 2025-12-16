'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, File, FileText, Image, Trash2, GripVertical, Download, Eye } from 'lucide-react';
import { attachmentApi } from '@/lib/api/adminApi';
import toast from 'react-hot-toast';

interface ChapterAttachmentsProps {
  chapterId: string;
  type?: 'material' | 'assignment' | 'answer';
  title?: string;
}

interface Attachment {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  type: string;
  order: number;
  url: string;
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
  return <File className="w-5 h-5 text-accent-500" />;
};

export default function ChapterAttachments({
  chapterId,
  type = 'material',
  title = 'დამატებითი მასალები'
}: ChapterAttachmentsProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Fetch attachments by type
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['chapter-attachments', chapterId, type],
    queryFn: async () => {
      const response = await attachmentApi.getByChapter(chapterId, type);
      return response.data.data || [];
    },
    enabled: !!chapterId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chapterId', chapterId);
      formData.append('title', file.name);
      formData.append('type', type);
      return attachmentApi.upload(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-attachments', chapterId, type] });
      toast.success('ფაილი აიტვირთა');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'ატვირთვა ვერ მოხერხდა');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; description?: string } }) =>
      attachmentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-attachments', chapterId, type] });
      setEditingId(null);
      toast.success('განახლდა');
    },
    onError: () => {
      toast.error('განახლება ვერ მოხერხდა');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => attachmentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-attachments', chapterId, type] });
      toast.success('ფაილი წაიშალა');
    },
    onError: () => {
      toast.error('წაშლა ვერ მოხერხდა');
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadMutation.mutateAsync(file);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEdit = (attachment: Attachment) => {
    setEditingId(attachment.id);
    setEditTitle(attachment.title);
    setEditDescription(attachment.description || '');
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      data: { title: editTitle, description: editDescription },
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`წავშალოთ "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <span className="text-xs text-gray-500">{attachments.length} ფაილი</span>
      </div>

      {/* Upload Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-accent-400 hover:bg-accent-50/50 transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.zip"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">
          {uploading ? 'იტვირთება...' : 'დააჭირეთ ან ჩააგდეთ ფაილები'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          PDF, Word, Excel, PowerPoint, სურათები, ZIP (მაქს. 50MB)
        </p>
      </div>

      {/* Attachments List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-500 mx-auto" />
        </div>
      ) : attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment: Attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
            >
              <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />

              {getFileIcon(attachment.mimeType)}

              <div className="flex-1 min-w-0">
                {editingId === attachment.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-accent-500"
                      placeholder="სათაური"
                    />
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-accent-500"
                      placeholder="აღწერა (არასავალდებულო)"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="px-2 py-1 text-xs bg-accent-500 text-white rounded hover:bg-accent-600"
                      >
                        შენახვა
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        გაუქმება
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p
                      className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-accent-500"
                      onClick={() => handleEdit(attachment)}
                    >
                      {attachment.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {attachment.fileName} • {formatFileSize(attachment.fileSize)}
                    </p>
                  </>
                )}
              </div>

              {editingId !== attachment.id && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {attachment.mimeType === 'application/pdf' && (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-accent-500 hover:bg-accent-50 rounded"
                      title="ნახვა"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  )}
                  <a
                    href={attachment.url}
                    download={attachment.fileName}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                    title="ჩამოტვირთვა"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(attachment.id, attachment.title)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="წაშლა"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-500 py-4">
          ფაილები არ არის ატვირთული
        </p>
      )}
    </div>
  );
}
