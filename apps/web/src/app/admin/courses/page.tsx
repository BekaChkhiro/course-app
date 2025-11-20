'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Edit, Copy, Trash2, Download, MoreVertical } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/ui/DataTable';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import FileUpload from '@/components/ui/FileUpload';
import { courseApi, uploadApi, categoryApi } from '@/lib/api/adminApi';
import { formatCurrency, formatDate, slugify, downloadCSV } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PageLoader } from '@/components/ui/LoadingSpinner';

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  price: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  category: { id: string; name: string };
  createdAt: string;
  _count: { purchases: number; reviews: number };
};

export default function CoursesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // Fetch courses
  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => courseApi.getAll().then(res => res.data)
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll().then(res => res.data)
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => courseApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete course');
    }
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: ({ id, title, slug }: { id: string; title: string; slug: string }) =>
      courseApi.duplicate(id, { title, slug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course duplicated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to duplicate course');
    }
  });

  const courses = coursesData?.courses || [];
  const categories = categoriesData?.categories || [];

  const handleDelete = (course: Course) => {
    if (confirm(`Are you sure you want to delete "${course.title}"?`)) {
      deleteMutation.mutate(course.id);
    }
  };

  const handleDuplicate = (course: Course) => {
    const title = `${course.title} (Copy)`;
    const slug = slugify(title);
    duplicateMutation.mutate({ id: course.id, title, slug });
  };

  const handleExport = async () => {
    try {
      const response = await courseApi.exportCSV();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `courses-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Courses exported successfully');
    } catch (error) {
      toast.error('Failed to export courses');
    }
  };

  const columns: ColumnDef<Course>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.title}</div>
          <div className="text-sm text-gray-500">{row.original.slug}</div>
        </div>
      )
    },
    {
      accessorKey: 'category.name',
      header: 'Category'
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => formatCurrency(row.original.price)
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const variants = {
          DRAFT: 'default' as const,
          PUBLISHED: 'success' as const,
          ARCHIVED: 'warning' as const
        };
        return <Badge variant={variants[status]}>{status}</Badge>;
      }
    },
    {
      accessorKey: '_count.purchases',
      header: 'Enrollments',
      cell: ({ row }) => row.original._count.purchases
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => formatDate(row.original.createdAt)
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCourse(row.original);
              setIsEditModalOpen(true);
            }}
            className="p-1 hover:bg-gray-100 rounded"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDuplicate(row.original);
            }}
            className="p-1 hover:bg-gray-100 rounded"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.original);
            }}
            className="p-1 hover:bg-red-100 rounded text-red-600"
            title="Delete"
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your course catalog
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Course
            </button>
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={courses}
          searchKey="title"
          searchPlaceholder="Search courses..."
          onRowClick={(course) => {
            setSelectedCourse(course);
            setIsEditModalOpen(true);
          }}
        />
      </div>

      {/* Create/Edit Modal */}
      <CourseModal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedCourse(null);
        }}
        course={selectedCourse}
        categories={categories}
      />
    </AdminLayout>
  );
}

// Course Modal Component
function CourseModal({
  isOpen,
  onClose,
  course,
  categories
}: {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  categories: any[];
}) {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    thumbnail: '',
    thumbnailPath: '',
    price: '',
    categoryId: '',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    status: 'DRAFT'
  });

  const queryClient = useQueryClient();

  // Initialize form with course data when editing
  useState(() => {
    if (course) {
      setFormData({
        title: course.title,
        slug: course.slug,
        description: course.description,
        thumbnail: course.thumbnail || '',
        thumbnailPath: '',
        price: course.price.toString(),
        categoryId: course.category.id,
        metaTitle: '',
        metaDescription: '',
        metaKeywords: '',
        status: course.status
      });
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => courseApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create course');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => courseApi.update(course!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course updated successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update course');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      price: parseFloat(formData.price)
    };

    if (course) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleUpload = async (file: File) => {
    const response = await uploadApi.thumbnail(file);
    return response.data.file;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={course ? 'Edit Course' : 'Create Course'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => {
              const title = e.target.value;
              setFormData({ ...formData, title, slug: slugify(title) });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <FileUpload
          label="Thumbnail"
          accept="image/*"
          onUpload={handleUpload}
          value={formData.thumbnail}
          onChange={(url, path) => setFormData({ ...formData, thumbnail: url, thumbnailPath: path })}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (GEL)</label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
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
              : course
              ? 'Update Course'
              : 'Create Course'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
