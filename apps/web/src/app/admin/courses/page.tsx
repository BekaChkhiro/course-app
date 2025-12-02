'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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
      toast.success('კურსი წაიშალა');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'კურსის წაშლა ვერ მოხერხდა');
    }
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: ({ id, title, slug }: { id: string; title: string; slug: string }) =>
      courseApi.duplicate(id, { title, slug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('კურსი დუბლირებულია');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'კურსის დუბლირება ვერ მოხერხდა');
    }
  });

  const courses = coursesData?.courses || [];
  const categories = categoriesData?.categories || [];

  const handleDelete = (course: Course) => {
    if (confirm(`დარწმუნებული ხართ რომ გსურთ "${course.title}" წაშლა?`)) {
      deleteMutation.mutate(course.id);
    }
  };

  const handleDuplicate = (course: Course) => {
    const title = `${course.title} (ასლი)`;
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
      toast.success('კურსები წარმატებით გადმოიწერა');
    } catch (error) {
      toast.error('კურსების ექსპორტი ვერ მოხერხდა');
    }
  };

  const columns: ColumnDef<Course>[] = [
    {
      accessorKey: 'title',
      header: 'სათაური',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.title}</div>
          <div className="text-sm text-gray-500">{row.original.slug}</div>
        </div>
      )
    },
    {
      accessorKey: 'category.name',
      header: 'კატეგორია'
    },
    {
      accessorKey: 'price',
      header: 'ფასი',
      cell: ({ row }) => formatCurrency(row.original.price)
    },
    {
      accessorKey: 'status',
      header: 'სტატუსი',
      cell: ({ row }) => {
        const status = row.original.status;
        const variants = {
          DRAFT: 'default' as const,
          PUBLISHED: 'success' as const,
          ARCHIVED: 'warning' as const
        };
        const labels = {
          DRAFT: 'დრაფტი',
          PUBLISHED: 'გამოქვეყნებული',
          ARCHIVED: 'დაარქივებული'
        };
        return <Badge variant={variants[status]}>{labels[status]}</Badge>;
      }
    },
    {
      accessorKey: '_count.purchases',
      header: 'ჩარიცხვები',
      cell: ({ row }) => row.original._count.purchases
    },
    {
      accessorKey: 'createdAt',
      header: 'შექმნილია',
      cell: ({ row }) => formatDate(row.original.createdAt)
    },
    {
      id: 'actions',
      header: 'მოქმედებები',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCourse(row.original);
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
              handleDuplicate(row.original);
            }}
            className="p-1 hover:bg-gray-100 rounded"
            title="დუბლირება"
          >
            <Copy className="w-4 h-4" />
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">კურსები</h1>
            <p className="mt-1 text-sm text-gray-500">
              მართეთ თქვენი კურსების კატალოგი
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              CSV ექსპორტი
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              ახალი კურსი
            </button>
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={courses}
          searchKey="title"
          searchPlaceholder="კურსის ძიება..."
          onRowClick={(course) => router.push(`/admin/courses/${course.id}`)}
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
  useEffect(() => {
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
    } else {
      // Reset form when creating new course
      setFormData({
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
    }
  }, [course]);

  const createMutation = useMutation({
    mutationFn: (data: any) => courseApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('კურსი წარმატებით შეიქმნა');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'კურსის შექმნა ვერ მოხერხდა');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => courseApi.update(course!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('კურსი წარმატებით განახლდა');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'კურსის განახლება ვერ მოხერხდა');
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
    <Modal isOpen={isOpen} onClose={onClose} title={course ? 'კურსის რედაქტირება' : 'ახალი კურსი'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">სათაური</label>
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
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <FileUpload
          label="თამბნეილი"
          accept="image/*"
          onUpload={handleUpload}
          value={formData.thumbnail}
          onChange={(url, path) => setFormData({ ...formData, thumbnail: url, thumbnailPath: path })}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ფასი (ლარი)</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">კატეგორია</label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">აირჩიეთ კატეგორია</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">სტატუსი</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="DRAFT">დრაფტი</option>
            <option value="PUBLISHED">გამოქვეყნებული</option>
            <option value="ARCHIVED">დაარქივებული</option>
          </select>
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
              : course
              ? 'განახლება'
              : 'შექმნა'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
