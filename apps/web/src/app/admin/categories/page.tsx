'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, GripVertical, ChevronRight, ChevronDown, FolderOpen, Folder } from 'lucide-react';
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
import { categoryApi } from '@/lib/api/adminApi';
import { slugify } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PageLoader } from '@/components/ui/LoadingSpinner';

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  order: number;
  parent: { id: string; name: string } | null;
  _count: { courses: number; children: number };
};

// Sortable Category Item Component
function SortableCategoryItem({
  category,
  children,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  level = 0,
}: {
  category: Category;
  children: Category[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  level?: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasChildren = children.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50' : ''}`}
    >
      <div
        className={`p-3 bg-white border rounded-lg mb-2 hover:shadow-sm transition-shadow ${
          level > 0 ? 'ml-4 sm:ml-8 border-l-4 border-l-accent-200' : ''
        }`}
      >
        {/* Mobile: Stacked Layout */}
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>

          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-100 rounded flex-shrink-0 mt-0.5"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          ) : (
            <div className="w-6 flex-shrink-0" />
          )}

          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-accent-600" />
              ) : (
                <Folder className="w-4 h-4 sm:w-5 sm:h-5 text-accent-600" />
              )
            ) : (
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-gray-200" />
            )}
          </div>

          {/* Category Info & Stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start sm:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm sm:text-base">{category.name}</span>
                  <span className="text-xs text-gray-400 hidden sm:inline">({category.slug})</span>
                </div>
                {category.description && (
                  <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">{category.description}</p>
                )}
              </div>

              {/* Actions - always visible */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => onEdit(category)}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded text-gray-600"
                  title="რედაქტირება"
                >
                  <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => onDelete(category)}
                  className="p-1.5 sm:p-2 hover:bg-red-50 rounded text-red-600"
                  title="წაშლა"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* Stats - below on mobile */}
            <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-500 flex-wrap">
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-accent-50 text-accent-600 rounded text-xs">
                {category._count.courses} კურსი
              </span>
              {hasChildren && (
                <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-accent-50 text-accent-600 rounded text-xs">
                  {category._count.children} ქვე
                </span>
              )}
              <span className="text-gray-400 text-xs">#{category.order}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [localCategories, setLocalCategories] = useState<Category[]>([]);

  const queryClient = useQueryClient();

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll().then(res => res.data)
  });

  // Sync local state with fetched data
  useEffect(() => {
    if (categoriesData?.categories) {
      setLocalCategories(categoriesData.categories);
    }
  }, [categoriesData]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('კატეგორია წარმატებით წაიშალა');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'კატეგორიის წაშლა ვერ მოხერხდა');
    }
  });

  const reorderMutation = useMutation({
    mutationFn: (categories: { id: string; order: number }[]) => categoryApi.reorder(categories),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
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

  // Get parent categories
  const parentCategories = localCategories
    .filter(cat => !cat.parent)
    .sort((a, b) => a.order - b.order);

  // Get children for a parent
  const getChildren = (parentId: string) =>
    localCategories
      .filter(cat => cat.parent?.id === parentId)
      .sort((a, b) => a.order - b.order);

  const handleDelete = (category: Category) => {
    if (category._count.courses > 0) {
      toast.error('კატეგორიას აქვს მიბმული კურსები');
      return;
    }
    if (category._count.children > 0) {
      toast.error('კატეგორიას აქვს ქვე-კატეგორიები');
      return;
    }
    if (confirm(`დარწმუნებული ხართ რომ გსურთ "${category.name}" წაშლა?`)) {
      deleteMutation.mutate(category.id);
    }
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setIsEditModalOpen(true);
  };

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allParentIds = parentCategories
      .filter(cat => cat._count.children > 0)
      .map(cat => cat.id);
    setExpandedCategories(new Set(allParentIds));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const handleDragEnd = (event: DragEndEvent, parentId: string | null = null) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const items = parentId ? getChildren(parentId) : parentCategories;
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex);

        // Update local state
        const updatedCategories = localCategories.map(cat => {
          const newIdx = newItems.findIndex(item => item.id === cat.id);
          if (newIdx !== -1) {
            return { ...cat, order: newIdx };
          }
          return cat;
        });
        setLocalCategories(updatedCategories);

        // Save to server
        const reorderData = newItems.map((item, index) => ({
          id: item.id,
          order: index
        }));
        reorderMutation.mutate(reorderData);
      }
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">კატეგორიები</h1>
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">
              მართეთ კურსების კატეგორიები და მათი თანმიმდევრობა
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={expandAll}
              className="px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <span className="hidden sm:inline">ყველას გახსნა</span>
              <span className="sm:hidden">გახსნა</span>
            </button>
            <button
              onClick={collapseAll}
              className="px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <span className="hidden sm:inline">ყველას დაკეცვა</span>
              <span className="sm:hidden">დაკეცვა</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">ახალი</span>
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="bg-accent-50 border border-accent-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-accent-600">
          <strong>მინიშნება:</strong> გადაათრიეთ კატეგორიები თანმიმდევრობის შესაცვლელად.
          <span className="hidden sm:inline"> ქვეკატეგორიების სანახავად დააჭირეთ ისარს.</span>
        </div>

        {/* Categories Tree */}
        <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
          {parentCategories.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-500 text-sm">
              კატეგორიები არ მოიძებნა
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleDragEnd(event, null)}
            >
              <SortableContext
                items={parentCategories.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {parentCategories.map(parentCat => {
                  const children = getChildren(parentCat.id);
                  const isExpanded = expandedCategories.has(parentCat.id);

                  return (
                    <div key={parentCat.id}>
                      <SortableCategoryItem
                        category={parentCat}
                        children={children}
                        isExpanded={isExpanded}
                        onToggle={() => toggleExpand(parentCat.id)}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        level={0}
                      />

                      {/* Children */}
                      {isExpanded && children.length > 0 && (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => handleDragEnd(event, parentCat.id)}
                        >
                          <SortableContext
                            items={children.map(c => c.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {children.map(child => (
                              <SortableCategoryItem
                                key={child.id}
                                category={child}
                                children={[]}
                                isExpanded={false}
                                onToggle={() => {}}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                level={1}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                      )}
                    </div>
                  );
                })}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <CategoryModal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
        categories={localCategories}
      />
    </AdminLayout>
  );
}

function CategoryModal({
  isOpen,
  onClose,
  category,
  categories
}: {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  categories: Category[];
}) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
    parentId: '',
    order: 0
  });

  // Update form data when category changes
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
        icon: category.icon || '',
        parentId: category.parent?.id || '',
        order: category.order || 0
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        icon: '',
        parentId: '',
        order: 0
      });
    }
  }, [category]);

  // Get children of this category for display
  const childCategories = category
    ? categories.filter(cat => cat.parent?.id === category.id)
    : [];

  // Get only parent categories for the dropdown
  const parentCategoriesForSelect = categories.filter(cat => !cat.parent);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => categoryApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('კატეგორია წარმატებით შეიქმნა');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'კატეგორიის შექმნა ვერ მოხერხდა');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => categoryApi.update(category!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('კატეგორია წარმატებით განახლდა');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'კატეგორიის განახლება ვერ მოხერხდა');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      parentId: formData.parentId || null
    };

    if (category) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={category ? 'კატეგორიის რედაქტირება' : 'ახალი კატეგორია'}>
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">სახელი</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              const name = e.target.value;
              setFormData({ ...formData, name, slug: slugify(name) });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">სლაგი</label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">აღწერა</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">მშობელი კატეგორია</label>
          <select
            value={formData.parentId}
            onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 text-sm"
          >
            <option value="">არცერთი (მთავარი)</option>
            {parentCategoriesForSelect
              .filter((cat) => cat.id !== category?.id)
              .map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
          </select>
          {category?.parent && (
            <p className="text-xs text-gray-500 mt-1">
              მიმდინარე მშობელი: {category.parent.name}
            </p>
          )}
        </div>

        {/* Show child categories when editing */}
        {category && childCategories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ქვეკატეგორიები</label>
            <div className="space-y-1.5 sm:space-y-2 max-h-32 sm:max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 sm:p-3 bg-gray-50">
              {childCategories.map((child) => (
                <div
                  key={child.id}
                  className="flex items-center justify-between text-xs sm:text-sm p-1.5 sm:p-2 bg-white rounded border border-gray-100"
                >
                  <span className="font-medium text-gray-900">{child.name}</span>
                  <span className="text-gray-500 text-xs">
                    {child._count.courses} კურსი
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            გაუქმება
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-3 sm:px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50 text-sm"
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'ინახება...'
              : category
              ? 'განახლება'
              : 'შექმნა'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
