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
import { Plus, Trash2, GripVertical, Video, FileText, File, HelpCircle, Lock, Copy } from 'lucide-react';
import { chapterApi, versionApi } from '@/lib/api/adminApi';
import Badge from '@/components/ui/Badge';
import ChapterEditSidebar from '@/components/admin/ChapterEditSidebar';
import ChapterCreateSidebar from '@/components/admin/ChapterCreateSidebar';
import toast from 'react-hot-toast';

interface CourseChaptersTabProps {
  courseId: string;
  selectedVersionId: string;
  versionStatus?: 'DRAFT' | 'PUBLISHED';
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
  hasQuiz?: boolean;
  _count: { comments: number; progress: number };
};

export default function CourseChaptersTab({
  courseId,
  selectedVersionId,
  versionStatus = 'DRAFT'
}: CourseChaptersTabProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const queryClient = useQueryClient();
  const isPublished = versionStatus === 'PUBLISHED';

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
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
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

  const createDraftCopyMutation = useMutation({
    mutationFn: (id: string) => versionApi.createDraftCopy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', courseId] });
      toast.success('Draft ასლი შეიქმნა. გადადით ვერსიებში.');
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
    setEditingChapterId(chapterId);
  };

  const handleCreateDraftCopy = () => {
    if (confirm('შევქმნათ ამ ვერსიის Draft ასლი?')) {
      createDraftCopyMutation.mutate(selectedVersionId);
    }
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">თავები</h2>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm bg-accent-600 text-white rounded-lg hover:bg-accent-700"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">ახალი</span> თავი
          </button>
        </div>

        {/* Chapters List */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">იტვირთება...</div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-8 sm:py-12 border-2 border-dashed rounded-lg">
            <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4">თავები არ არის</p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="text-accent-600 hover:text-accent-600 font-medium text-sm sm:text-base"
            >
              დაამატე პირველი თავი
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {chapters.map((chapter) => (
                  <SortableChapterItem
                    key={chapter.id}
                    chapter={chapter}
                    onEdit={() => handleEdit(chapter.id)}
                    onDelete={() => handleDelete(chapter)}
                    isPublished={false}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Edit Sidebar - Outside of space-y-6 */}
      {editingChapterId && (
        <ChapterEditSidebar
          isOpen={!!editingChapterId}
          onClose={() => setEditingChapterId(null)}
          chapterId={editingChapterId}
          versionId={selectedVersionId}
        />
      )}

      {/* Create Sidebar - Outside of space-y-6 */}
      <ChapterCreateSidebar
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        versionId={selectedVersionId}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['chapters', selectedVersionId] });
        }}
      />
    </>
  );
}

// Sortable Chapter Item
function SortableChapterItem({
  chapter,
  onEdit,
  onDelete,
  isPublished = false
}: {
  chapter: Chapter;
  onEdit: () => void;
  onDelete: () => void;
  isPublished?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chapter.id,
    disabled: isPublished
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
      className={`flex items-start sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-white border rounded-lg transition-shadow ${isPublished ? 'opacity-75' : 'hover:shadow-md'}`}
    >
      {!isPublished && (
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-1 sm:mt-0 flex-shrink-0">
          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
        </button>
      )}

      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
        <div className="flex items-start sm:items-center gap-2 flex-wrap">
          <h3 className="font-medium text-gray-900 text-sm sm:text-base">{chapter.title}</h3>
          {chapter.isFree && <Badge variant="success" size="sm">უფასო</Badge>}
        </div>
        {chapter.description && (
          <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-1">{chapter.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
          {chapter.videoUrl && (
            <span className="flex items-center gap-1">
              <Video className="w-3 h-3" /> <span className="hidden xs:inline">ვიდეო</span>
            </span>
          )}
          {chapter.theory && (
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" /> <span className="hidden xs:inline">თეორია</span>
            </span>
          )}
          {chapter.assignmentFile && (
            <span className="flex items-center gap-1">
              <File className="w-3 h-3" /> <span className="hidden xs:inline">დავალება</span>
            </span>
          )}
          {chapter.hasQuiz && (
            <span className="flex items-center gap-1 text-accent-600">
              <HelpCircle className="w-3 h-3" /> <span className="hidden xs:inline">ქვიზი</span>
            </span>
          )}
        </div>
      </div>

      {!isPublished && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 sm:p-2 hover:bg-red-100 rounded text-red-600 flex-shrink-0"
          title="წაშლა"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
