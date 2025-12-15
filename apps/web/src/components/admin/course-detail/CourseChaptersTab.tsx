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
    if (isPublished) {
      toast.error('Published ვერსიის რედაქტირება შეუძლებელია');
      return;
    }

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
    if (isPublished) {
      toast.error('Published ვერსიის რედაქტირება შეუძლებელია');
      return;
    }
    if (confirm(`წავშალოთ "${chapter.title}"?`)) {
      deleteMutation.mutate(chapter.id);
    }
  };

  const handleEdit = (chapterId: string) => {
    if (isPublished) {
      toast.error('Published ვერსიის რედაქტირება შეუძლებელია. შექმენით Draft ასლი.');
      return;
    }
    setEditingChapterId(chapterId);
  };

  const handleCreateDraftCopy = () => {
    if (confirm('შევქმნათ ამ ვერსიის Draft ასლი?')) {
      createDraftCopyMutation.mutate(selectedVersionId);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Published Version Warning Banner */}
        {isPublished && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-800">
                  Published ვერსია - რედაქტირება დაბლოკილია
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  ცვლილებების შესატანად შექმენით Draft ასლი.
                </p>
              </div>
              <button
                onClick={handleCreateDraftCopy}
                disabled={createDraftCopyMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                <Copy className="w-4 h-4" />
                Draft ასლი
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">თავები</h2>
          {!isPublished && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              ახალი თავი
            </button>
          )}
        </div>

        {/* Chapters List */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">იტვირთება...</div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-gray-500 mb-4">თავები არ არის</p>
            {!isPublished && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                დაამატე პირველი თავი
              </button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={isPublished ? [] : sensors}
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
                    isPublished={isPublished}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Edit Sidebar - Outside of space-y-6 */}
      {editingChapterId && !isPublished && (
        <ChapterEditSidebar
          isOpen={!!editingChapterId}
          onClose={() => setEditingChapterId(null)}
          chapterId={editingChapterId}
          versionId={selectedVersionId}
        />
      )}

      {/* Create Sidebar - Outside of space-y-6 */}
      {!isPublished && (
        <ChapterCreateSidebar
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          versionId={selectedVersionId}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['chapters', selectedVersionId] });
          }}
        />
      )}
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
      className={`flex items-center gap-4 p-4 bg-white border rounded-lg transition-shadow ${isPublished ? 'opacity-75' : 'hover:shadow-md'}`}
    >
      {!isPublished && (
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-5 h-5 text-gray-400" />
        </button>
      )}

      <div className="flex-1 cursor-pointer" onClick={onEdit}>
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
          {chapter.hasQuiz && (
            <span className="flex items-center gap-1 text-purple-600">
              <HelpCircle className="w-3 h-3" /> ქვიზი
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
          className="p-2 hover:bg-red-100 rounded text-red-600"
          title="წაშლა"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
