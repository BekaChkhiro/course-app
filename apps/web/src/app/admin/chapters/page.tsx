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
      toast.success('თავები წარმატებით გადაწყობილია');
    },
    onError: () => {
      toast.error('თავების გადაწყობა ვერ მოხერხდა');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => chapterApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', selectedVersion] });
      toast.success('თავი წარმატებით წაიშალა');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'თავის წაშლა ვერ მოხერხდა');
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
    if (confirm(`დარწმუნებული ხართ რომ გსურთ "${chapter.title}" წაშლა?`)) {
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
            <h1 className="text-3xl font-bold text-gray-900">თავები</h1>
            <p className="mt-1 text-sm text-gray-500">
              მართეთ კურსის თავები drag-and-drop-ით
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!selectedVersion}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            ახალი თავი
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">აირჩიეთ კურსი</label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setSelectedVersion('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500"
            >
              <option value="">აირჩიეთ კურსი...</option>
              {courses.map((course: any) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">აირჩიეთ ვერსია</label>
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              disabled={!selectedCourse}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 disabled:opacity-50"
            >
              <option value="">აირჩიეთ ვერსია...</option>
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
            აირჩიეთ კურსი და ვერსია თავების სამართავად
          </div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            თავები ჯერ არ არის. დააჭირეთ "ახალი თავი" შესაქმნელად.
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
      toast.success('თავი წარმატებით შეიქმნა');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'თავის შექმნა ვერ მოხერხდა');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => chapterApi.update(chapter!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', versionId] });
      toast.success('თავი წარმატებით განახლდა');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'თავის განახლება ვერ მოხერხდა');
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
          <label className="block text-sm font-medium text-gray-700 mb-1">თავის სათაური</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">აღწერა</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              ℹ️ ჩასვით YouTube ან Vimeo ვიდეოს ბმული
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">თეორიული მასალა</label>
          <RichTextEditor
            content={formData.theory}
            onChange={(html) => setFormData({ ...formData, theory: html })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FileUpload
            label="დავალების ფაილი"
            accept=".pdf,.doc,.docx"
            onUpload={(file) => uploadApi.assignment(file).then(res => res.data.file)}
            value={formData.assignmentFile}
            onChange={(url) => setFormData({ ...formData, assignmentFile: url })}
            preview={false}
          />

          <FileUpload
            label="პასუხების ფაილი"
            accept=".pdf,.doc,.docx"
            onUpload={(file) => uploadApi.answer(file).then(res => res.data.file)}
            value={formData.answerFile}
            onChange={(url) => setFormData({ ...formData, answerFile: url })}
            preview={false}
          />
        </div>

        {/* Quiz Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 ქვიზი</h3>

          <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-accent-600">
              💡 <strong>ქვიზის დამატება:</strong> გადადით{' '}
              <a href="/admin/quizzes" className="underline font-medium">
                ქვიზების მართვა
              </a>{' '}
              გვერდზე, შექმენით ქვიზი და მიუთითეთ ეს თავი.
            </p>
            <p className="text-xs text-accent-500 mt-2">
              ან გამოიყენეთ API: <code className="bg-accent-100 px-1 rounded">chapterContentId: "{chapter?.id}"</code>
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <strong>როგორ ჩაამატოთ ქვიზი:</strong>
            </p>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1 ml-2">
              <li>შექმენით თავი (შეინახეთ)</li>
              <li>გადადით <strong>ადმინი → ქვიზები</strong></li>
              <li>შექმენით ქვიზი</li>
              <li>დაამატეთ კითხვები</li>
              <li>სტუდენტები ნახავენ ქვიზს ამ თავში</li>
            </ol>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isFree"
            checked={formData.isFree}
            onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
            className="w-4 h-4 text-accent-500 rounded focus:ring-2 focus:ring-accent-500"
          />
          <label htmlFor="isFree" className="text-sm font-medium text-gray-700">
            ეს თავი უფასოა (პრევიუ)
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
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50"
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'ინახება...'
              : chapter
              ? 'განახლება'
              : 'შექმნა'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
