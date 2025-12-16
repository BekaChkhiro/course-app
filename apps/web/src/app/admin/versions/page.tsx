'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Edit, Trash2, CheckCircle, GitBranch } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/ui/DataTable';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { versionApi, courseApi } from '@/lib/api/adminApi';
import { formatDate, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PageLoader } from '@/components/ui/LoadingSpinner';

type Version = {
  id: string;
  version: number;
  title: string;
  description: string;
  changelog: string | null;
  upgradePrice: number | null;
  discountPercentage: number | null;
  isActive: boolean;
  publishedAt: string | null;
  _count: { chapters: number; progress: number };
};

export default function VersionsPage() {
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  const queryClient = useQueryClient();

  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: () => courseApi.getAll().then(res => res.data)
  });

  const { data: versionsData, isLoading } = useQuery({
    queryKey: ['versions', selectedCourse],
    queryFn: () => versionApi.getByCourse(selectedCourse).then(res => res.data),
    enabled: !!selectedCourse
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => versionApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', selectedCourse] });
      toast.success('ვერსია წარმატებით გააქტიურდა');
    }
  });

  const courses = coursesData?.courses || [];
  const versions = versionsData?.versions || [];

  const columns: ColumnDef<Version>[] = [
    {
      accessorKey: 'version',
      header: 'ვერსია',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium">v{row.original.version}</span>
          {row.original.isActive && <Badge variant="success" size="sm">აქტიური</Badge>}
        </div>
      )
    },
    {
      accessorKey: 'title',
      header: 'სათაური'
    },
    {
      accessorKey: '_count.chapters',
      header: 'თავები'
    },
    {
      accessorKey: 'publishedAt',
      header: 'გამოქვეყნებულია',
      cell: ({ row }) => row.original.publishedAt ? formatDate(row.original.publishedAt) : '-'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">კურსის ვერსიები</h1>
            <p className="mt-1 text-sm text-gray-500">მართეთ კურსის ვერსიები</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!selectedCourse}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            ახალი ვერსია
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">აირჩიეთ კურსი</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="max-w-md px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">აირჩიეთ კურსი...</option>
            {courses.map((course: any) => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
        </div>

        {isLoading ? <PageLoader /> : !selectedCourse ? (
          <div className="text-center py-12 text-gray-500">აირჩიეთ კურსი</div>
        ) : (
          <DataTable columns={columns} data={versions} />
        )}
      </div>
    </AdminLayout>
  );
}
