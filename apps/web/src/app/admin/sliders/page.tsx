'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, GripVertical, Eye, EyeOff, ImageIcon, Link as LinkIcon } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AdminLayout from '@/components/admin/AdminLayout';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import FileUpload from '@/components/ui/FileUpload';
import { sliderApi, uploadApi, courseApi } from '@/lib/api/adminApi';
import toast from 'react-hot-toast';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import ConfirmModal from '@/components/ui/ConfirmModal';

type Slider = {
  id: string;
  imageUrl: string;
  linkUrl: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// Sortable Slider Item Component
function SortableSliderItem({
  slider,
  onEdit,
  onDelete,
  onToggle,
}: {
  slider: Slider;
  onEdit: (slider: Slider) => void;
  onDelete: (slider: Slider) => void;
  onToggle: (slider: Slider) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slider.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50' : ''}`}
    >
      <div className={`p-3 sm:p-4 bg-white border rounded-lg mb-2 sm:mb-3 hover:shadow-sm transition-shadow ${!slider.isActive ? 'opacity-60' : ''}`}>
        {/* Mobile Layout */}
        <div className="flex items-start gap-2.5 sm:hidden">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing flex-shrink-0 mt-1"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>

          {/* Image Preview */}
          <div className="relative w-24 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={slider.imageUrl}
              alt="Slider image"
              fill
              className="object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-medium text-gray-900">
                #{slider.order + 1}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                slider.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {slider.isActive ? 'აქტ.' : 'არა'}
              </span>
            </div>
            {slider.linkUrl && (
              <div className="flex items-center gap-1 mt-1">
                <LinkIcon className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-gray-500 truncate">{slider.linkUrl}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <button
              onClick={() => onToggle(slider)}
              className={`p-1.5 hover:bg-gray-100 rounded ${slider.isActive ? 'text-green-600' : 'text-gray-400'}`}
            >
              {slider.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onEdit(slider)}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(slider)}
              className="p-1.5 hover:bg-red-50 rounded text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center gap-4">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-5 h-5 text-gray-400" />
          </button>

          {/* Image Preview */}
          <div className="relative w-40 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={slider.imageUrl}
              alt="Slider image"
              fill
              className="object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">
                სლაიდი #{slider.order + 1}
              </span>
              {slider.linkUrl && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                  <LinkIcon className="w-3 h-3" />
                  ლინკი
                </span>
              )}
            </div>
            {slider.linkUrl && (
              <p className="text-sm text-gray-500 truncate">{slider.linkUrl}</p>
            )}
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              slider.isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {slider.isActive ? 'აქტიური' : 'არააქტიური'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggle(slider)}
              className={`p-2 hover:bg-gray-100 rounded ${slider.isActive ? 'text-green-600' : 'text-gray-400'}`}
              title={slider.isActive ? 'გამორთვა' : 'ჩართვა'}
            >
              {slider.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onEdit(slider)}
              className="p-2 hover:bg-gray-100 rounded text-gray-600"
              title="რედაქტირება"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(slider)}
              className="p-2 hover:bg-red-50 rounded text-red-600"
              title="წაშლა"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SlidersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlider, setSelectedSlider] = useState<Slider | null>(null);
  const [localSliders, setLocalSliders] = useState<Slider[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Slider | null>(null);

  const queryClient = useQueryClient();

  const { data: slidersData, isLoading } = useQuery({
    queryKey: ['sliders'],
    queryFn: () => sliderApi.getAll().then(res => res.data)
  });

  // Sync local state with fetched data
  useEffect(() => {
    if (slidersData?.sliders) {
      setLocalSliders(slidersData.sliders);
    }
  }, [slidersData]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sliderApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sliders'] });
      toast.success('სლაიდი წარმატებით წაიშალა');
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'სლაიდის წაშლა ვერ მოხერხდა');
    }
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => sliderApi.toggle(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['sliders'] });
      const slider = response.data.slider;
      toast.success(slider.isActive ? 'სლაიდი გააქტიურდა' : 'სლაიდი გაუქმდა');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'სტატუსის შეცვლა ვერ მოხერხდა');
    }
  });

  const reorderMutation = useMutation({
    mutationFn: (sliders: { id: string; order: number }[]) => sliderApi.reorder(sliders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sliders'] });
      toast.success('თანმიმდევრობა შენახულია');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'თანმიმდევრობის შენახვა ვერ მოხერხდა');
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedSliders = [...localSliders].sort((a, b) => a.order - b.order);

  const handleDelete = (slider: Slider) => {
    setDeleteConfirm(slider);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  const handleEdit = (slider: Slider) => {
    setSelectedSlider(slider);
    setIsModalOpen(true);
  };

  const handleToggle = (slider: Slider) => {
    toggleMutation.mutate(slider.id);
  };

  const handleCreate = () => {
    setSelectedSlider(null);
    setIsModalOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedSliders.findIndex(item => item.id === active.id);
      const newIndex = sortedSliders.findIndex(item => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(sortedSliders, oldIndex, newIndex);

        // Update local state
        const updatedSliders = newItems.map((item, index) => ({
          ...item,
          order: index
        }));
        setLocalSliders(updatedSliders);

        // Save to server
        const reorderData = newItems.map((item, index) => ({
          id: item.id,
          order: index
        }));
        reorderMutation.mutate(reorderData);
      }
    }
  };

  // Stats
  const totalSliders = localSliders.length;
  const activeSliders = localSliders.filter(s => s.isActive).length;

  if (isLoading) return <PageLoader />;

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">სლაიდერი</h1>
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">
              მართეთ <span className="hidden sm:inline">მთავარი გვერდის </span>სლაიდერის სურათები
            </p>
          </div>

          <button
            onClick={handleCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 text-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            ახალი სლაიდი
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div className="bg-white p-3 sm:p-4 rounded-lg border">
            <div className="text-lg sm:text-2xl font-bold text-gray-900">{totalSliders}</div>
            <div className="text-xs sm:text-sm text-gray-500">სულ</div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg border">
            <div className="text-lg sm:text-2xl font-bold text-green-600">{activeSliders}</div>
            <div className="text-xs sm:text-sm text-gray-500">აქტიური</div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-accent-50 border border-accent-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-accent-700">
          <strong>მინიშნება:</strong> გადაათრიეთ სლაიდები თანმიმდევრობის შესაცვლელად.
          <span className="hidden sm:inline"> მხოლოდ აქტიური სლაიდები გამოჩნდება მთავარ გვერდზე.</span>
          <span className="hidden md:inline"> რეკომენდებული სურათის ზომა: <strong>1800x600</strong> პიქსელი.</span>
        </div>

        {/* Slider List */}
        <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
          {sortedSliders.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
              <p className="text-sm">სლაიდები არ მოიძებნა</p>
              <button
                onClick={handleCreate}
                className="mt-3 sm:mt-4 text-accent-600 hover:text-accent-700 font-medium text-sm"
              >
                დაამატეთ პირველი სლაიდი
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedSliders.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedSliders.map(slider => (
                  <SortableSliderItem
                    key={slider.id}
                    slider={slider}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggle={handleToggle}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <SliderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSlider(null);
        }}
        slider={selectedSlider}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="სლაიდის წაშლა"
        message="დარწმუნებული ხართ რომ გსურთ ამ სლაიდის წაშლა? ეს მოქმედება შეუქცევადია."
        confirmText="წაშლა"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}

type Course = {
  id: string;
  title: string;
  slug: string;
};

type LinkType = 'none' | 'url' | 'course';

function SliderModal({
  isOpen,
  onClose,
  slider
}: {
  isOpen: boolean;
  onClose: () => void;
  slider: Slider | null;
}) {
  const [imageUrl, setImageUrl] = useState('');
  const [linkType, setLinkType] = useState<LinkType>('none');
  const [directUrl, setDirectUrl] = useState('');
  const [selectedCourseSlug, setSelectedCourseSlug] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Fetch courses for dropdown
  const { data: coursesData } = useQuery({
    queryKey: ['courses-for-slider'],
    queryFn: () => courseApi.getAll().then(res => res.data),
    enabled: isOpen
  });

  const courses: Course[] = coursesData?.courses || [];

  // Update form data when modal opens or slider changes
  useEffect(() => {
    if (isOpen) {
      if (slider) {
        setImageUrl(slider.imageUrl || '');
        setIsActive(slider.isActive ?? true);

        // Determine link type from existing linkUrl
        if (!slider.linkUrl) {
          setLinkType('none');
          setDirectUrl('');
          setSelectedCourseSlug('');
        } else if (slider.linkUrl.startsWith('/courses/')) {
          setLinkType('course');
          setSelectedCourseSlug(slider.linkUrl.replace('/courses/', ''));
          setDirectUrl('');
        } else {
          setLinkType('url');
          setDirectUrl(slider.linkUrl);
          setSelectedCourseSlug('');
        }
      } else {
        // Reset form for new slider
        setImageUrl('');
        setLinkType('none');
        setDirectUrl('');
        setSelectedCourseSlug('');
        setIsActive(true);
      }
    }
  }, [isOpen, slider]);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => sliderApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sliders'] });
      toast.success('სლაიდი წარმატებით შეიქმნა');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'სლაიდის შექმნა ვერ მოხერხდა');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => sliderApi.update(slider!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sliders'] });
      toast.success('სლაიდი წარმატებით განახლდა');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'სლაიდის განახლება ვერ მოხერხდა');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageUrl.trim()) {
      toast.error('სურათი სავალდებულოა');
      return;
    }

    // Build linkUrl based on selection
    let linkUrl: string | null = null;
    if (linkType === 'url' && directUrl.trim()) {
      linkUrl = directUrl.trim();
    } else if (linkType === 'course' && selectedCourseSlug) {
      linkUrl = `/courses/${selectedCourseSlug}`;
    }

    const data = {
      imageUrl: imageUrl.trim(),
      linkUrl,
      isActive
    };

    if (slider) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleImageUpload = async (file: File) => {
    // Use sliderImage upload endpoint for R2 storage
    const response = await uploadApi.sliderImage(file);
    return {
      url: response.data.file.url,
      path: response.data.file.path
    };
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={slider ? 'სლაიდის რედაქტირება' : 'ახალი სლაიდი'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            სურათი <span className="text-red-500">*</span>
          </label>
          <FileUpload
            accept="image/*"
            maxSize={10}
            onUpload={handleImageUpload}
            value={imageUrl}
            onChange={(url) => setImageUrl(url)}
            preview={true}
          />
          <p className="mt-1 text-xs text-gray-500">
            <span className="hidden sm:inline">რეკომენდებული ზომა: 1800x600 პიქსელი. </span>მაქს. 10MB.
          </p>
        </div>

        {/* Link Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ლინკი <span className="text-gray-400 font-normal">(არასავალდებულო)</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="linkType"
                value="none"
                checked={linkType === 'none'}
                onChange={() => setLinkType('none')}
                className="w-4 h-4 text-accent-600"
              />
              <span className="text-sm text-gray-700">ლინკის გარეშე</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="linkType"
                value="url"
                checked={linkType === 'url'}
                onChange={() => setLinkType('url')}
                className="w-4 h-4 text-accent-600"
              />
              <span className="text-sm text-gray-700">პირდაპირი ლინკი</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="linkType"
                value="course"
                checked={linkType === 'course'}
                onChange={() => setLinkType('course')}
                className="w-4 h-4 text-accent-600"
              />
              <span className="text-sm text-gray-700">კურსის გვერდი</span>
            </label>
          </div>
        </div>

        {/* Direct URL Input */}
        {linkType === 'url' && (
          <div>
            <input
              type="url"
              value={directUrl}
              onChange={(e) => setDirectUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent text-sm"
              placeholder="https://example.com/page"
            />
          </div>
        )}

        {/* Course Selection Dropdown */}
        {linkType === 'course' && (
          <div>
            <select
              value={selectedCourseSlug}
              onChange={(e) => setSelectedCourseSlug(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent text-sm"
            >
              <option value="">აირჩიეთ კურსი...</option>
              {courses.map((course) => (
                <option key={course.id} value={course.slug}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 text-accent-600 border-gray-300 rounded focus:ring-accent-600"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">
            აქტიური <span className="hidden sm:inline">(გამოჩნდება მთავარ გვერდზე)</span>
          </label>
        </div>

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm w-full sm:w-auto"
          >
            გაუქმება
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50 text-sm w-full sm:w-auto"
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'ინახება...'
              : slider
              ? 'განახლება'
              : 'შექმნა'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
