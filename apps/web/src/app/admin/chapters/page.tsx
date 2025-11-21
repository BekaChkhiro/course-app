'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Edit, Trash2, GripVertical, Video, FileText, File } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import FileUpload from '@/components/ui/FileUpload';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { chapterApi, versionApi, courseApi, uploadApi } from '@/lib/api/adminApi';
import toast from 'react-hot-toast';
import { PageLoader } from '@/components/ui/LoadingSpinner';

type Chapter = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  isFree: boolean;
  videoUrl: string | null;
  theory: string | null;
  assignmentFile: string | null;
  answerFile: string | null;
  _count: { comments: number; progress: number };
};

export default function ChaptersPage() {
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Fetch courses
  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: () => courseApi.getAll().then(res => res.data)
  });

  // Fetch versions for selected course
  const { data: versionsData } = useQuery({
    queryKey: ['versions', selectedCourse],
    queryFn: () => versionApi.getByCourse(selectedCourse).then(res => res.data),
    enabled: !!selectedCourse
  });

  // Fetch chapters for selected version
  const { data: chaptersData, isLoading } = useQuery({
    queryKey: ['chapters', selectedVersion],
    queryFn: () => chapterApi.getByVersion(selectedVersion).then(res => res.data),
    enabled: !!selectedVersion
  });

  // Update local state when data changes
  useState(() => {
    if (chaptersData?.chapters) {
      setChapters(chaptersData.chapters);
    }
  });

  const reorderMutation = useMutation({
    mutationFn: (reorderedChapters: { id: string; order: number }[]) =>
      chapterApi.reorder(reorderedChapters),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', selectedVersion] });
      toast.success('Chapters reordered successfully');
    },
    onError: () => {
      toast.error('Failed to reorder chapters');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => chapterApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', selectedVersion] });
      toast.success('Chapter deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete chapter');
    }
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setChapters((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);

        // Update order values and save
        const updates = reordered.map((chapter, index) => ({
          id: chapter.id,
          order: index
        }));
        reorderMutation.mutate(updates);

        return reordered;
      });
    }
  };

  const handleDelete = (chapter: Chapter) => {
    if (confirm(`Are you sure you want to delete "${chapter.title}"?`)) {
      deleteMutation.mutate(chapter.id);
    }
  };

  const courses = coursesData?.courses || [];
  const versions = versionsData?.versions || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Chapters</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage course chapters with drag-and-drop ordering
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!selectedVersion}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Chapter
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Course</label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setSelectedVersion('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a course...</option>
              {courses.map((course: any) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Version</label>
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              disabled={!selectedCourse}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Choose a version...</option>
              {versions.map((version: any) => (
                <option key={version.id} value={version.id}>
                  v{version.version} - {version.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chapters List */}
        {isLoading ? (
          <PageLoader />
        ) : !selectedVersion ? (
          <div className="text-center py-12 text-gray-500">
            Please select a course and version to manage chapters
          </div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No chapters yet. Click "Add Chapter" to create one.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {chapters.map((chapter) => (
                  <SortableChapterItem
                    key={chapter.id}
                    chapter={chapter}
                    onEdit={() => {
                      setSelectedChapter(chapter);
                      setIsEditModalOpen(true);
                    }}
                    onDelete={() => handleDelete(chapter)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Create/Edit Modal */}
      <ChapterModal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedChapter(null);
        }}
        chapter={selectedChapter}
        versionId={selectedVersion}
      />
    </AdminLayout>
  );
}

// Sortable Chapter Item
function SortableChapterItem({
  chapter,
  onEdit,
  onDelete
}: {
  chapter: Chapter;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chapter.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5 text-gray-400" />
      </button>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900">{chapter.title}</h3>
          {chapter.isFree && <Badge variant="success" size="sm">Free</Badge>}
        </div>
        {chapter.description && (
          <p className="text-sm text-gray-500 mt-1">{chapter.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          {chapter.videoUrl && (
            <span className="flex items-center gap-1">
              <Video className="w-3 h-3" /> Video
            </span>
          )}
          {chapter.theory && (
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" /> Theory
            </span>
          )}
          {chapter.assignmentFile && (
            <span className="flex items-center gap-1">
              <File className="w-3 h-3" /> Assignment
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onEdit} className="p-2 hover:bg-gray-100 rounded" title="Edit">
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-100 rounded text-red-600"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Chapter Modal
function ChapterModal({
  isOpen,
  onClose,
  chapter,
  versionId
}: {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter | null;
  versionId: string;
}) {
  const [formData, setFormData] = useState({
    title: chapter?.title || '',
    description: chapter?.description || '',
    videoUrl: chapter?.videoUrl || '',
    theory: chapter?.theory || '',
    assignmentFile: chapter?.assignmentFile || '',
    answerFile: chapter?.answerFile || '',
    isFree: chapter?.isFree || false
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => chapterApi.create({ ...data, courseVersionId: versionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', versionId] });
      toast.success('Chapter created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create chapter');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => chapterApi.update(chapter!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', versionId] });
      toast.success('Chapter updated successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update chapter');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chapter) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={chapter ? 'Edit Chapter' : 'Create Chapter'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chapter Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Video Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📹 ვიდეო</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ვიდეო URL (YouTube, Vimeo)
            </label>
            <input
              type="url"
              value={formData.videoUrl}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=... ან https://vimeo.com/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              ℹ️ ჩასვით YouTube ან Vimeo ვიდეოს ბმული
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Theory Content</label>
          <RichTextEditor
            content={formData.theory}
            onChange={(html) => setFormData({ ...formData, theory: html })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FileUpload
            label="Assignment File"
            accept=".pdf,.doc,.docx"
            onUpload={(file) => uploadApi.assignment(file).then(res => res.data.file)}
            value={formData.assignmentFile}
            onChange={(url) => setFormData({ ...formData, assignmentFile: url })}
            preview={false}
          />

          <FileUpload
            label="Answer File"
            accept=".pdf,.doc,.docx"
            onUpload={(file) => uploadApi.answer(file).then(res => res.data.file)}
            value={formData.answerFile}
            onChange={(url) => setFormData({ ...formData, answerFile: url })}
            preview={false}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isFree"
            checked={formData.isFree}
            onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="isFree" className="text-sm font-medium text-gray-700">
            Make this chapter free (preview)
          </label>
        </div>

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : chapter
              ? 'Update Chapter'
              : 'Create Chapter'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
