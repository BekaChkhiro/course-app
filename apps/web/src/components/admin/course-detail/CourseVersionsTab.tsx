'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, CheckCircle, ArrowRight, BookOpen, Users, Calendar, DollarSign } from 'lucide-react';
import { versionApi } from '@/lib/api/adminApi';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { formatDate, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CourseVersionsTabProps {
  courseId: string;
  onVersionSelect?: (versionId: string) => void;
}

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

export default function CourseVersionsTab({ courseId, onVersionSelect }: CourseVersionsTabProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  const queryClient = useQueryClient();

  const { data: versionsData, isLoading } = useQuery({
    queryKey: ['versions', courseId],
    queryFn: () => versionApi.getByCourse(courseId).then(res => res.data)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => versionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', courseId] });
      toast.success('ვერსია წაიშალა');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => versionApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', courseId] });
      toast.success('ვერსია აქტიურია');
    }
  });

  const versions = versionsData?.versions || [];

  const handleDelete = (version: Version) => {
    if (version._count.progress > 0) {
      toast.error('ვერ წაიშლება - სტუდენტებს აქვთ პროგრესი');
      return;
    }
    if (confirm(`წავშალოთ "${version.title}" (v${version.version})?`)) {
      deleteMutation.mutate(version.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">კურსის ვერსიები</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          ახალი ვერსია
        </button>
      </div>

      {/* Versions List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">იტვირთება...</div>
      ) : versions.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-4">ვერსიები არ არის</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            შექმენი პირველი ვერსია
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {versions.map((version) => (
            <div
              key={version.id}
              className="p-6 border rounded-lg hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-mono font-bold text-gray-900">
                      v{version.version}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {version.title}
                    </h3>
                    {version.isActive && (
                      <Badge variant="success">აქტიური</Badge>
                    )}
                  </div>
                  <p className="text-gray-600 mb-4">{version.description}</p>

                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {version._count.chapters} თავი
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {version._count.progress} სტუდენტი
                    </span>
                    {version.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(version.publishedAt)}
                      </span>
                    )}
                    {version.upgradePrice && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        განახლება: {formatCurrency(version.upgradePrice)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onVersionSelect && (
                    <button
                      onClick={() => onVersionSelect(version.id)}
                      className="p-2 hover:bg-blue-50 rounded text-blue-600"
                      title="თავების მართვა"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  )}

                  {!version.isActive && (
                    <button
                      onClick={() => activateMutation.mutate(version.id)}
                      className="p-2 hover:bg-green-50 rounded text-green-600"
                      title="გააქტიურება"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedVersion(version);
                      setIsEditModalOpen(true);
                    }}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="რედაქტირება"
                  >
                    <Edit className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => handleDelete(version)}
                    className="p-2 hover:bg-red-100 rounded text-red-600"
                    title="წაშლა"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <VersionModal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedVersion(null);
        }}
        version={selectedVersion}
        courseId={courseId}
      />
    </div>
  );
}

function VersionModal({
  isOpen,
  onClose,
  version,
  courseId
}: {
  isOpen: boolean;
  onClose: () => void;
  version: Version | null;
  courseId: string;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    changelog: '',
    upgradePrice: '',
    discountPercentage: ''
  });

  const queryClient = useQueryClient();

  // Update form when version changes
  useEffect(() => {
    if (version) {
      setFormData({
        title: version.title,
        description: version.description,
        changelog: version.changelog || '',
        upgradePrice: version.upgradePrice?.toString() || '',
        discountPercentage: version.discountPercentage?.toString() || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        changelog: '',
        upgradePrice: '',
        discountPercentage: ''
      });
    }
  }, [version]);

  const createMutation = useMutation({
    mutationFn: (data: any) => versionApi.create({ ...data, courseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', courseId] });
      toast.success('ვერსია შეიქმნა');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => versionApi.update(version!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', courseId] });
      toast.success('ვერსია განახლდა');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (version) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={version ? 'ვერსიის რედაქტირება' : 'ახალი ვერსია'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            სათაური *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            აღწერა
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upgrade ფასი (₾)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.upgradePrice}
              onChange={(e) => setFormData({ ...formData, upgradePrice: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ფასდაკლება (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.discountPercentage}
              onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Changelog
          </label>
          <RichTextEditor
            content={formData.changelog}
            onChange={(html) => setFormData({ ...formData, changelog: html })}
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
              ? 'შენახვა...'
              : version
              ? 'განახლება'
              : 'შექმნა'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
