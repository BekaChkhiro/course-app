'use client';

import { useState, useEffect } from 'react';
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
import { chapterApi, versionApi, uploadApi } from '@/lib/api/adminApi';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import FileUpload from '@/components/ui/FileUpload';
import RichTextEditor from '@/components/ui/RichTextEditor';
import toast from 'react-hot-toast';

interface CourseChaptersTabProps {
  courseId: string;
  selectedVersionId: string;
  onVersionChange: (versionId: string) => void;
}

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

export default function CourseChaptersTab({
  courseId,
  selectedVersionId,
  onVersionChange
}: CourseChaptersTabProps) {
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

  // Fetch versions for dropdown
  const { data: versionsData } = useQuery({
    queryKey: ['versions', courseId],
    queryFn: () => versionApi.getByCourse(courseId).then(res => res.data)
  });

  // Fetch chapters for selected version
  const { data: chaptersData, isLoading } = useQuery({
    queryKey: ['chapters', selectedVersionId],
    queryFn: () => chapterApi.getByVersion(selectedVersionId).then(res => res.data),
    enabled: !!selectedVersionId
  });

  // Update local state when data changes
  useEffect(() => {
    if (chaptersData?.chapters) {
      setChapters(chaptersData.chapters);
    }
  }, [chaptersData]);

  const reorderMutation = useMutation({
    mutationFn: (reorderedChapters: { id: string; order: number }[]) =>
      chapterApi.reorder(reorderedChapters),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', selectedVersionId] });
      toast.success('თავები გადალაგდა');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => chapterApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', selectedVersionId] });
      toast.success('თავი წაიშალა');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setChapters((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);

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
    if (confirm(`წავშალოთ "${chapter.title}"?`)) {
      deleteMutation.mutate(chapter.id);
    }
  };

  const versions = versionsData?.versions || [];

  return (
    <div className="space-y-6">
      {/* Header with Version Selector */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            აირჩიეთ ვერსია
          </label>
          <select
            value={selectedVersionId}
            onChange={(e) => onVersionChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">აირჩიეთ ვერსია...</option>
            {versions.map((version: any) => (
              <option key={version.id} value={version.id}>
                v{version.version} - {version.title}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          disabled={!selectedVersionId}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          ახალი თავი
        </button>
      </div>

      {/* Chapters List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">იტვირთება...</div>
      ) : !selectedVersionId ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500">აირჩიეთ ვერსია თავების სანახავად</p>
        </div>
      ) : chapters.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-4">თავები არ არის</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            დაამატე პირველი თავი
          </button>
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

      {/* Create/Edit Modal */}
      <ChapterModal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedChapter(null);
        }}
        chapter={selectedChapter}
        versionId={selectedVersionId}
      />
    </div>
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
          {chapter.isFree && <Badge variant="success" size="sm">უფასო</Badge>}
        </div>
        {chapter.description && (
          <p className="text-sm text-gray-500 mt-1">{chapter.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          {chapter.videoUrl && (
            <span className="flex items-center gap-1">
              <Video className="w-3 h-3" /> ვიდეო
            </span>
          )}
          {chapter.theory && (
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" /> თეორია
            </span>
          )}
          {chapter.assignmentFile && (
            <span className="flex items-center gap-1">
              <File className="w-3 h-3" /> დავალება
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onEdit} className="p-2 hover:bg-gray-100 rounded" title="რედაქტირება">
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-100 rounded text-red-600"
          title="წაშლა"
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
    title: '',
    description: '',
    videoUrl: '',
    theory: '',
    assignmentFile: '',
    answerFile: '',
    isFree: false
  });

  const queryClient = useQueryClient();

  // Update form when chapter changes
  useEffect(() => {
    if (chapter) {
      setFormData({
        title: chapter.title,
        description: chapter.description || '',
        videoUrl: chapter.videoUrl || '',
        theory: chapter.theory || '',
        assignmentFile: chapter.assignmentFile || '',
        answerFile: chapter.answerFile || '',
        isFree: chapter.isFree
      });
    } else {
      setFormData({
        title: '',
        description: '',
        videoUrl: '',
        theory: '',
        assignmentFile: '',
        answerFile: '',
        isFree: false
      });
    }
  }, [chapter]);

  const createMutation = useMutation({
    mutationFn: (data: any) => chapterApi.create({ ...data, courseVersionId: versionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', versionId] });
      toast.success('თავი შეიქმნა');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => chapterApi.update(chapter!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', versionId] });
      toast.success('თავი განახლდა');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
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
      title={chapter ? 'თავის რედაქტირება' : 'ახალი თავი'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">თავის სათაური *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">აღწერა</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ვიდეო URL</label>
          <input
            type="url"
            value={formData.videoUrl}
            onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">თეორია</label>
          <RichTextEditor
            content={formData.theory}
            onChange={(html) => setFormData({ ...formData, theory: html })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FileUpload
            label="დავალება"
            accept=".pdf,.doc,.docx"
            onUpload={(file) => uploadApi.assignment(file).then(res => res.data.file)}
            value={formData.assignmentFile}
            onChange={(url) => setFormData({ ...formData, assignmentFile: url })}
            preview={false}
          />

          <FileUpload
            label="პასუხი"
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
            უფასო თავი (preview)
          </label>
        </div>

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            გაუქმება
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'შენახვა...'
              : chapter
              ? 'განახლება'
              : 'შექმნა'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
