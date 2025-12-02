'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/ui/DataTable';
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

export default function CategoriesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const queryClient = useQueryClient();

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll().then(res => res.data)
  });

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

  const categories = categoriesData?.categories || [];

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

  const columns: ColumnDef<Category>[] = [
    {
      accessorKey: 'name',
      header: 'სახელი',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-gray-500">{row.original.slug}</div>
        </div>
      )
    },
    {
      accessorKey: 'parent.name',
      header: 'მშობელი კატეგორია',
      cell: ({ row }) => row.original.parent?.name || '-'
    },
    {
      accessorKey: 'description',
      header: 'აღწერა',
      cell: ({ row }) => row.original.description || '-'
    },
    {
      accessorKey: '_count.courses',
      header: 'კურსები'
    },
    {
      accessorKey: '_count.children',
      header: 'ქვე-კატეგორიები'
    },
    {
      accessorKey: 'order',
      header: 'რიგი'
    },
    {
      id: 'actions',
      header: 'მოქმედებები',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCategory(row.original);
              setIsEditModalOpen(true);
            }}
            className="p-1 hover:bg-gray-100 rounded"
            title="რედაქტირება"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.original);
            }}
            className="p-1 hover:bg-red-100 rounded text-red-600"
            title="წაშლა"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  if (isLoading) return <PageLoader />;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">კატეგორიები</h1>
            <p className="mt-1 text-sm text-gray-500">
              მართეთ კურსების კატეგორიები
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            ახალი კატეგორია
          </button>
        </div>

        <DataTable
          columns={columns}
          data={categories}
          searchKey="name"
          searchPlaceholder="კატეგორიის ძიება..."
          onRowClick={(category) => {
            setSelectedCategory(category);
            setIsEditModalOpen(true);
          }}
        />
      </div>

      <CategoryModal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
        categories={categories}
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
    name: category?.name || '',
    slug: category?.slug || '',
    description: category?.description || '',
    icon: category?.icon || '',
    parentId: category?.parent?.id || '',
    order: category?.order || 0
  });

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
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">სახელი</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              const name = e.target.value;
              setFormData({ ...formData, name, slug: slugify(name) });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">სლაგი</label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">აღწერა</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">მშობელი კატეგორია</label>
          <select
            value={formData.parentId}
            onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">არცერთი (მთავარი კატეგორია)</option>
            {categories
              .filter((cat) => cat.id !== category?.id)
              .map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">რიგი</label>
          <input
            type="number"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
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
