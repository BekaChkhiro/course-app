'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
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
import { chapterApi } from '@/lib/api/adminApi';
import Badge from '@/components/ui/Badge';
import toast from 'react-hot-toast';

interface CourseChaptersTabProps {
  courseId: string;
  selectedVersionId: string;
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
  selectedVersionId
}: CourseChaptersTabProps) {
  const router = useRouter();
  const [chapters, setChapters] = useState<Chapter[]>([]);

  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Fetch chapters for this version
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

  const handleEdit = (chapterId: string) => {
    router.push(`/admin/courses/${courseId}/versions/${selectedVersionId}/chapters/${chapterId}/edit`);
  };

  const handleCreate = () => {
    router.push(`/admin/courses/${courseId}/versions/${selectedVersionId}/chapters/new`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">თავები</h2>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          ახალი თავი
        </button>
      </div>

      {/* Chapters List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">იტვირთება...</div>
      ) : chapters.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-4">თავები არ არის</p>
          <button
            onClick={handleCreate}
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
                  onEdit={() => handleEdit(chapter.id)}
                  onDelete={() => handleDelete(chapter)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
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
