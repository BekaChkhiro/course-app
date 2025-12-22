'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, GripVertical, Eye, EyeOff, User, BookOpen, Mail, Facebook, Linkedin } from 'lucide-react';
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
import { instructorApi, uploadApi } from '@/lib/api/adminApi';
import { slugify } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import ConfirmModal from '@/components/ui/ConfirmModal';

type Instructor = {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  profession: string;
  bio: string | null;
  avatar: string | null;
  email: string | null;
  facebook: string | null;
  linkedin: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    courses: number;
  };
};

// Sortable Instructor Item Component
function SortableInstructorItem({
  instructor,
  onEdit,
  onDelete,
  onToggle,
}: {
  instructor: Instructor;
  onEdit: (instructor: Instructor) => void;
  onDelete: (instructor: Instructor) => void;
  onToggle: (instructor: Instructor) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: instructor.id });

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
      <div className={`p-3 sm:p-4 bg-white border rounded-lg mb-2 sm:mb-3 hover:shadow-sm transition-shadow ${!instructor.isActive ? 'opacity-60' : ''}`}>
        {/* Mobile Layout */}
        <div className="flex items-start gap-3 sm:hidden">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing flex-shrink-0 mt-1"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>

          {/* Avatar */}
          <div className="relative w-12 h-12 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
            {instructor.avatar ? (
              <Image
                src={instructor.avatar}
                alt={`${instructor.firstName} ${instructor.lastName}`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-100">
                <User className="w-6 h-6 text-primary-600" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {instructor.firstName} {instructor.lastName}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                instructor.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {instructor.isActive ? 'აქტ.' : 'არა'}
              </span>
            </div>
            <p className="text-xs text-primary-600 font-medium truncate">{instructor.profession}</p>

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 px-2 py-0.5 bg-primary-50 rounded text-xs">
                <BookOpen className="w-3 h-3 text-primary-600" />
                <span className="font-medium text-primary-700">{instructor._count.courses}</span>
              </div>

              {/* Social Icons */}
              <div className="flex items-center gap-1">
                {instructor.email && (
                  <span className="p-1 bg-gray-100 rounded text-gray-600">
                    <Mail className="w-3 h-3" />
                  </span>
                )}
                {instructor.facebook && (
                  <span className="p-1 bg-blue-50 rounded text-blue-600">
                    <Facebook className="w-3 h-3" />
                  </span>
                )}
                {instructor.linkedin && (
                  <span className="p-1 bg-blue-100 rounded text-blue-700">
                    <Linkedin className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <button
              onClick={() => onToggle(instructor)}
              className={`p-1.5 hover:bg-gray-100 rounded ${instructor.isActive ? 'text-green-600' : 'text-gray-400'}`}
            >
              {instructor.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onEdit(instructor)}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(instructor)}
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

          {/* Avatar */}
          <div className="relative w-16 h-16 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
            {instructor.avatar ? (
              <Image
                src={instructor.avatar}
                alt={`${instructor.firstName} ${instructor.lastName}`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-100">
                <User className="w-8 h-8 text-primary-600" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-semibold text-gray-900">
                {instructor.firstName} {instructor.lastName}
              </span>
              <span className="text-xs text-gray-400">({instructor.slug})</span>
            </div>
            <p className="text-sm text-primary-600 font-medium">{instructor.profession}</p>
            {instructor.bio && (
              <p className="text-sm text-gray-500 line-clamp-1 mt-1">{instructor.bio}</p>
            )}
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-2">
            {instructor.email && (
              <span className="p-1.5 bg-gray-100 rounded text-gray-600" title={instructor.email}>
                <Mail className="w-4 h-4" />
              </span>
            )}
            {instructor.facebook && (
              <span className="p-1.5 bg-blue-50 rounded text-blue-600" title="Facebook">
                <Facebook className="w-4 h-4" />
              </span>
            )}
            {instructor.linkedin && (
              <span className="p-1.5 bg-blue-100 rounded text-blue-700" title="LinkedIn">
                <Linkedin className="w-4 h-4" />
              </span>
            )}
          </div>

          {/* Course Count */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 rounded-lg">
            <BookOpen className="w-4 h-4 text-primary-600" />
            <span className="text-sm font-medium text-primary-700">{instructor._count.courses}</span>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              instructor.isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {instructor.isActive ? 'აქტიური' : 'არააქტიური'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggle(instructor)}
              className={`p-2 hover:bg-gray-100 rounded ${instructor.isActive ? 'text-green-600' : 'text-gray-400'}`}
              title={instructor.isActive ? 'გამორთვა' : 'ჩართვა'}
            >
              {instructor.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onEdit(instructor)}
              className="p-2 hover:bg-gray-100 rounded text-gray-600"
              title="რედაქტირება"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(instructor)}
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

export default function InstructorsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);
  const [localInstructors, setLocalInstructors] = useState<Instructor[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Instructor | null>(null);

  const queryClient = useQueryClient();

  const { data: instructorsData, isLoading } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => instructorApi.getAll().then(res => res.data)
  });

  // Sync local state with fetched data
  useEffect(() => {
    if (instructorsData?.instructors) {
      setLocalInstructors(instructorsData.instructors);
    }
  }, [instructorsData]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => instructorApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      toast.success('ლექტორი წარმატებით წაიშალა');
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'ლექტორის წაშლა ვერ მოხერხდა');
    }
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => instructorApi.toggle(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      const instructor = response.data.instructor;
      toast.success(instructor.isActive ? 'ლექტორი გააქტიურდა' : 'ლექტორი გაუქმდა');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'სტატუსის შეცვლა ვერ მოხერხდა');
    }
  });

  const reorderMutation = useMutation({
    mutationFn: (instructors: { id: string; order: number }[]) => instructorApi.reorder(instructors),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
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

  const sortedInstructors = [...localInstructors].sort((a, b) => a.order - b.order);

  const handleDelete = (instructor: Instructor) => {
    if (instructor._count.courses > 0) {
      toast.error('ლექტორს აქვს მიბმული კურსები. ჯერ გადაანაწილეთ კურსები.');
      return;
    }
    setDeleteConfirm(instructor);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  const handleEdit = (instructor: Instructor) => {
    setSelectedInstructor(instructor);
    setIsModalOpen(true);
  };

  const handleToggle = (instructor: Instructor) => {
    toggleMutation.mutate(instructor.id);
  };

  const handleCreate = () => {
    setSelectedInstructor(null);
    setIsModalOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedInstructors.findIndex(item => item.id === active.id);
      const newIndex = sortedInstructors.findIndex(item => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(sortedInstructors, oldIndex, newIndex);

        // Update local state
        const updatedInstructors = newItems.map((item, index) => ({
          ...item,
          order: index
        }));
        setLocalInstructors(updatedInstructors);

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
  const totalInstructors = localInstructors.length;
  const activeInstructors = localInstructors.filter(i => i.isActive).length;
  const totalCourses = localInstructors.reduce((sum, i) => sum + i._count.courses, 0);

  if (isLoading) return <PageLoader />;

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">ლექტორები</h1>
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">
              მართეთ კურსების ლექტორები და მათი ინფორმაცია
            </p>
          </div>

          <button
            onClick={handleCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 text-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            ახალი ლექტორი
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white p-3 sm:p-4 rounded-lg border">
            <div className="text-lg sm:text-2xl font-bold text-gray-900">{totalInstructors}</div>
            <div className="text-xs sm:text-sm text-gray-500">სულ</div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg border">
            <div className="text-lg sm:text-2xl font-bold text-green-600">{activeInstructors}</div>
            <div className="text-xs sm:text-sm text-gray-500">აქტიური</div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg border">
            <div className="text-lg sm:text-2xl font-bold text-primary-600">{totalCourses}</div>
            <div className="text-xs sm:text-sm text-gray-500">კურსი</div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-accent-50 border border-accent-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-accent-700">
          <strong>მინიშნება:</strong> გადაათრიეთ ლექტორები თანმიმდევრობის შესაცვლელად.
          <span className="hidden sm:inline"> მხოლოდ აქტიური ლექტორები გამოჩნდება საიტზე.</span>
        </div>

        {/* Instructor List */}
        <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
          {sortedInstructors.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <User className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
              <p className="text-sm">ლექტორები არ მოიძებნა</p>
              <button
                onClick={handleCreate}
                className="mt-3 sm:mt-4 text-accent-600 hover:text-accent-700 font-medium text-sm"
              >
                დაამატეთ პირველი ლექტორი
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedInstructors.map(i => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedInstructors.map(instructor => (
                  <SortableInstructorItem
                    key={instructor.id}
                    instructor={instructor}
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
      <InstructorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInstructor(null);
        }}
        instructor={selectedInstructor}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="ლექტორის წაშლა"
        message={`დარწმუნებული ხართ რომ გსურთ "${deleteConfirm?.firstName} ${deleteConfirm?.lastName}" წაშლა? ეს მოქმედება შეუქცევადია.`}
        confirmText="წაშლა"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}

function InstructorModal({
  isOpen,
  onClose,
  instructor
}: {
  isOpen: boolean;
  onClose: () => void;
  instructor: Instructor | null;
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    slug: '',
    profession: '',
    bio: '',
    avatar: '',
    email: '',
    facebook: '',
    linkedin: '',
    isActive: true
  });

  // Update form data when modal opens or instructor changes
  useEffect(() => {
    if (isOpen) {
      if (instructor) {
        setFormData({
          firstName: instructor.firstName || '',
          lastName: instructor.lastName || '',
          slug: instructor.slug || '',
          profession: instructor.profession || '',
          bio: instructor.bio || '',
          avatar: instructor.avatar || '',
          email: instructor.email || '',
          facebook: instructor.facebook || '',
          linkedin: instructor.linkedin || '',
          isActive: instructor.isActive ?? true
        });
      } else {
        // Reset form for new instructor
        setFormData({
          firstName: '',
          lastName: '',
          slug: '',
          profession: '',
          bio: '',
          avatar: '',
          email: '',
          facebook: '',
          linkedin: '',
          isActive: true
        });
      }
    }
  }, [isOpen, instructor]);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => instructorApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      toast.success('ლექტორი წარმატებით შეიქმნა');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'ლექტორის შექმნა ვერ მოხერხდა');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => instructorApi.update(instructor!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      toast.success('ლექტორი წარმატებით განახლდა');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'ლექტორის განახლება ვერ მოხერხდა');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.slug.trim() || !formData.profession.trim()) {
      toast.error('სახელი, გვარი, სლაგი და პროფესია სავალდებულოა');
      return;
    }

    const data = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      slug: formData.slug.trim(),
      profession: formData.profession.trim(),
      bio: formData.bio.trim() || null,
      avatar: formData.avatar.trim() || null,
      email: formData.email.trim() || null,
      facebook: formData.facebook.trim() || null,
      linkedin: formData.linkedin.trim() || null,
      isActive: formData.isActive
    };

    if (instructor) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleImageUpload = async (file: File) => {
    // Use thumbnail upload endpoint for instructor avatar
    const response = await uploadApi.thumbnail(file);
    return {
      url: response.data.file.url,
      path: response.data.file.path
    };
  };

  const handleNameChange = (field: 'firstName' | 'lastName', value: string) => {
    const newData = { ...formData, [field]: value };

    // Auto-generate slug from name if slug hasn't been manually edited or is empty
    if (!instructor) {
      const fullName = `${field === 'firstName' ? value : newData.firstName} ${field === 'lastName' ? value : newData.lastName}`;
      newData.slug = slugify(fullName.trim());
    }

    setFormData(newData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={instructor ? 'ლექტორის რედაქტირება' : 'ახალი ლექტორი'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        {/* Avatar Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ფოტო
          </label>
          <FileUpload
            accept="image/*"
            maxSize={5}
            onUpload={handleImageUpload}
            value={formData.avatar}
            onChange={(url) => setFormData({ ...formData, avatar: url })}
            preview={true}
          />
          <p className="mt-1 text-xs text-gray-500">
            <span className="hidden sm:inline">რეკომენდებული ზომა: 400x400 პიქსელი. </span>მაქს. 5MB.
          </p>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              სახელი <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleNameChange('firstName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              გვარი <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleNameChange('lastName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent text-sm"
              required
            />
          </div>
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            სლაგი (URL) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent text-sm"
            placeholder="giorgi-beridze"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            <span className="hidden sm:inline">გამოიყენება URL-ში: </span>/instructors/{formData.slug || 'slug'}
          </p>
        </div>

        {/* Profession */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            პროფესია <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.profession}
            onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent text-sm"
            placeholder="მაგ: სენიორ დეველოპერი"
            required
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ბიოგრაფია
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent text-sm"
            placeholder="მოკლე ინფორმაცია ლექტორის შესახებ..."
          />
        </div>

        {/* Contact & Social Links */}
        <div className="space-y-2 sm:space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            კონტაქტი <span className="hidden sm:inline">და სოციალური ბმულები</span>
          </label>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent text-sm"
              placeholder="email@example.com"
            />
          </div>

          <div className="relative">
            <Facebook className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-600" />
            <input
              type="url"
              value={formData.facebook}
              onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent text-sm"
              placeholder="https://facebook.com/username"
            />
          </div>

          <div className="relative">
            <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-700" />
            <input
              type="url"
              value={formData.linkedin}
              onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent text-sm"
              placeholder="https://linkedin.com/in/username"
            />
          </div>
        </div>

        {/* Active Status */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="w-4 h-4 text-accent-600 border-gray-300 rounded focus:ring-accent-600"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">
            აქტიური <span className="hidden sm:inline">(გამოჩნდება საიტზე)</span>
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
              : instructor
              ? 'განახლება'
              : 'შექმნა'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
