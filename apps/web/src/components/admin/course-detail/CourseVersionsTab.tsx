'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowRight, BookOpen, Users, Calendar, DollarSign, Globe, FileEdit, Copy, Rocket, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { versionApi } from '@/lib/api/adminApi';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { formatDate, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CourseVersionsTabProps {
  courseId: string;
}

type UpgradePriceType = 'FIXED' | 'PERCENTAGE';

type Version = {
  id: string;
  version: number;
  title: string;
  description: string;
  changelog: string | null;
  upgradePriceType: UpgradePriceType | null;
  upgradePriceValue: number | null;
  status: 'DRAFT' | 'PUBLISHED';
  isActive: boolean;
  publishedAt: string | null;
  _count: { chapters: number; progress: number };
};

export default function CourseVersionsTab({ courseId }: CourseVersionsTabProps) {
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

  const publishMutation = useMutation({
    mutationFn: (id: string) => versionApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', courseId] });
      toast.success('ვერსია გამოქვეყნდა და აქტიურია');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const createDraftCopyMutation = useMutation({
    mutationFn: (id: string) => versionApi.createDraftCopy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', courseId] });
      toast.success('Draft ასლი შეიქმნა');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => versionApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', courseId] });
      toast.success('ვერსია გააქტიურდა');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const versions = versionsData?.versions || [];

  const handleDelete = (version: Version) => {
    if (version.isActive) {
      toast.error('აქტიური ვერსიის წაშლა შეუძლებელია. ჯერ სხვა ვერსია გააქტიურეთ.');
      return;
    }
    if (version._count.progress > 0) {
      toast.error(`ვერ წაიშლება - ${version._count.progress} სტუდენტს აქვს პროგრესი`);
      return;
    }
    const statusText = version.status === 'PUBLISHED' ? ' (Published)' : ' (Draft)';
    if (confirm(`წავშალოთ "${version.title}" (v${version.version})${statusText}?\n\nეს მოქმედება შეუქცევადია!`)) {
      deleteMutation.mutate(version.id);
    }
  };

  const handlePublish = (version: Version) => {
    if (version._count.chapters === 0) {
      toast.error('ვერსიას უნდა ჰქონდეს მინიმუმ ერთი თავი გამოქვეყნებამდე');
      return;
    }
    if (confirm(`გამოვაქვეყნოთ "${version.title}" (v${version.version})? \n\nეს ვერსია გახდება აქტიური და სტუდენტები დაინახავენ.`)) {
      publishMutation.mutate(version.id);
    }
  };

  const handleCreateDraftCopy = (version: Version) => {
    if (confirm(`შევქმნათ Draft ასლი "${version.title}" (v${version.version}) ვერსიიდან?`)) {
      createDraftCopyMutation.mutate(version.id);
    }
  };

  const handleActivate = (version: Version) => {
    if (version.isActive) {
      toast.error('ეს ვერსია უკვე აქტიურია');
      return;
    }
    if (confirm(`გავაქტიუროთ "${version.title}" (v${version.version})? \n\nეს გახდება მთავარი ვერსია და სტუდენტები დაინახავენ.`)) {
      activateMutation.mutate(version.id);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-semibold">ვერსიები</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm bg-accent-600 text-white rounded-lg hover:bg-accent-700"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline">ახალი</span> ვერსია
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-400"></span>
          Draft
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500"></span>
          Published
        </span>
        <span className="flex items-center gap-1.5">
          <Badge variant="info" size="sm">აქტიური</Badge>
          <span className="hidden xs:inline">სტუდენტები ხედავენ</span>
        </span>
      </div>

      {/* Versions List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">იტვირთება...</div>
      ) : versions.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-4">ვერსიები არ არის</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="text-accent-600 hover:text-accent-600 font-medium"
          >
            შექმენი პირველი ვერსია
          </button>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {versions.map((version: Version) => (
            <div key={version.id} className="relative group">
              <Link
                href={`/admin/courses/${courseId}/versions/${version.id}`}
                className={`
                  block p-3 sm:p-4 md:p-6 border rounded-lg hover:shadow-md transition-all bg-white
                  ${version.status === 'DRAFT' ? 'border-l-4 border-l-yellow-400' : 'border-l-4 border-l-green-500'}
                `}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <span className="text-lg sm:text-xl md:text-2xl font-mono font-bold text-gray-900">
                        v{version.version}
                      </span>
                      <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 truncate">
                        {version.title}
                      </h3>

                      {/* Status Badge */}
                      <span
                        className={`
                          inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-xs font-medium rounded-full
                          ${version.status === 'PUBLISHED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                          }
                        `}
                      >
                        {version.status === 'PUBLISHED' ? (
                          <><Globe className="w-3 h-3" /> <span className="hidden xs:inline">Published</span></>
                        ) : (
                          <><FileEdit className="w-3 h-3" /> <span className="hidden xs:inline">Draft</span></>
                        )}
                      </span>

                      {version.isActive && (
                        <Badge variant="info" size="sm">აქტიური</Badge>
                      )}
                    </div>
                    {version.description && (
                      <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-2">{version.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        {version._count.chapters} თავი
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        {version._count.progress}
                      </span>
                      {version.publishedAt && (
                        <span className="hidden sm:flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(version.publishedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center">
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-accent-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>

                {/* Mobile Action buttons */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t sm:hidden">
                  {version.status === 'DRAFT' && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePublish(version);
                      }}
                      disabled={publishMutation.isPending}
                      className="flex-1 px-2 py-1.5 bg-green-600 text-white text-xs rounded-lg flex items-center justify-center gap-1"
                    >
                      <Rocket className="w-3 h-3" />
                      Publish
                    </button>
                  )}
                  {version.status === 'PUBLISHED' && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCreateDraftCopy(version);
                      }}
                      disabled={createDraftCopyMutation.isPending}
                      className="flex-1 px-2 py-1.5 bg-accent-600 text-white text-xs rounded-lg flex items-center justify-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      ასლი
                    </button>
                  )}
                  {!version.isActive && (
                    <>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleActivate(version);
                        }}
                        disabled={activateMutation.isPending}
                        className="px-2 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(version);
                        }}
                        className="p-1.5 hover:bg-red-100 rounded text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </Link>

              {/* Desktop Action buttons */}
              <div className="absolute top-4 sm:top-6 right-10 sm:right-14 hidden sm:flex items-center gap-2 z-10">
                {version.status === 'DRAFT' && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePublish(version);
                    }}
                    disabled={publishMutation.isPending}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm rounded-lg flex items-center gap-1 sm:gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    title="გამოქვეყნება"
                  >
                    <Rocket className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden md:inline">Publish</span>
                  </button>
                )}

                {version.status === 'PUBLISHED' && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCreateDraftCopy(version);
                    }}
                    disabled={createDraftCopyMutation.isPending}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 bg-accent-600 hover:bg-accent-700 text-white text-xs sm:text-sm rounded-lg flex items-center gap-1 sm:gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    title="Draft ასლის შექმნა"
                  >
                    <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden md:inline">ასლი</span>
                  </button>
                )}

                {!version.isActive && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleActivate(version);
                    }}
                    disabled={activateMutation.isPending}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 bg-accent-600 hover:bg-accent-700 text-white text-xs sm:text-sm rounded-lg flex items-center gap-1 sm:gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    title="აქტიურის გახდომა"
                  >
                    <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                )}

                {!version.isActive && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(version);
                    }}
                    className="p-1.5 sm:p-2 bg-white hover:bg-red-100 rounded border border-gray-200 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="წაშლა"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                )}
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
    upgradePriceType: '' as '' | UpgradePriceType,
    upgradePriceValue: ''
  });

  const [copyFromVersion, setCopyFromVersion] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState('');

  const queryClient = useQueryClient();

  // Get all versions for the course
  const { data: versionsData } = useQuery({
    queryKey: ['versions', courseId],
    queryFn: () => versionApi.getByCourse(courseId).then(res => res.data)
  });

  const availableVersions = versionsData?.versions || [];

  // Update form when version changes
  useEffect(() => {
    if (version) {
      setFormData({
        title: version.title,
        description: version.description,
        changelog: version.changelog || '',
        upgradePriceType: version.upgradePriceType || '',
        upgradePriceValue: version.upgradePriceValue?.toString() || ''
      });
      setCopyFromVersion(false);
      setSelectedVersionId('');
    } else {
      setFormData({
        title: '',
        description: '',
        changelog: '',
        upgradePriceType: '',
        upgradePriceValue: ''
      });
      setCopyFromVersion(false);
      setSelectedVersionId('');
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
      const data = {
        ...formData,
        ...(copyFromVersion && selectedVersionId && { copyFromVersionId: selectedVersionId })
      };
      createMutation.mutate(data);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={version ? 'ვერსიის რედაქტირება' : 'ახალი ვერსია (Draft)'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info banner for new versions */}
        {!version && (
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-3 text-sm text-accent-600">
            ახალი ვერსია იქმნება Draft სტატუსით. გამოქვეყნებამდე შეგიძლიათ თავისუფლად დაარედაქტიროთ.
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            სათაური *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600"
          />
        </div>

        {/* Copy from previous version - only show when creating new version */}
        {!version && availableVersions.length > 0 && (
          <div className="border border-accent-200 bg-accent-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="copyFromVersion"
                checked={copyFromVersion}
                onChange={(e) => {
                  setCopyFromVersion(e.target.checked);
                  if (!e.target.checked) setSelectedVersionId('');
                }}
                className="mt-1 w-4 h-4 text-accent-600 rounded focus:ring-2 focus:ring-accent-600"
              />
              <div className="flex-1">
                <label htmlFor="copyFromVersion" className="block text-sm font-medium text-gray-900 cursor-pointer">
                  დააკოპირე თავები წინა ვერსიიდან
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  თუ მონიშნავთ, ყველა თავი დაკოპირდება არჩეული ვერსიიდან და შემდეგ შეგიძლიათ მხოლოდ საჭირო ცვლილებების შეტანა
                </p>
              </div>
            </div>

            {copyFromVersion && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  აირჩიეთ ვერსია
                </label>
                <select
                  value={selectedVersionId}
                  onChange={(e) => setSelectedVersionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600"
                  required={copyFromVersion}
                >
                  <option value="">აირჩიეთ ვერსია...</option>
                  {availableVersions.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      v{v.version} - {v.title} ({v._count.chapters} თავი) {v.status === 'PUBLISHED' ? '[Published]' : '[Draft]'}
                    </option>
                  ))}
                </select>
                {selectedVersionId && (
                  <p className="text-xs text-green-600 mt-2">
                    {availableVersions.find((v: any) => v.id === selectedVersionId)?._count.chapters || 0} თავი დაკოპირდება
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Upgrade Price Section - only show for v2+ */}
        {(version ? version.version > 1 : availableVersions.length > 0) && (
          <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              განახლების ფასი (v2+ ვერსიებისთვის)
            </label>
            <p className="text-xs text-gray-600 mb-3">
              მიუთითეთ რამდენი უნდა გადაიხადონ წინა ვერსიის მფლობელებმა ამ ვერსიაზე გადასასვლელად
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ფასის ტიპი
                </label>
                <select
                  value={formData.upgradePriceType}
                  onChange={(e) => setFormData({
                    ...formData,
                    upgradePriceType: e.target.value as '' | UpgradePriceType
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600"
                >
                  <option value="">არ მითითებულა</option>
                  <option value="FIXED">ფიქსირებული თანხა (GEL)</option>
                  <option value="PERCENTAGE">კურსის ფასის პროცენტი (%)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.upgradePriceType === 'PERCENTAGE' ? 'პროცენტი (%)' : 'თანხა (GEL)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={formData.upgradePriceType === 'PERCENTAGE' ? '100' : undefined}
                  value={formData.upgradePriceValue}
                  onChange={(e) => setFormData({ ...formData, upgradePriceValue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600"
                  disabled={!formData.upgradePriceType}
                  placeholder={formData.upgradePriceType === 'PERCENTAGE' ? 'მაგ: 30' : 'მაგ: 50.00'}
                />
              </div>
            </div>
            {formData.upgradePriceType && formData.upgradePriceValue && (
              <p className="text-xs text-green-600 mt-2">
                {formData.upgradePriceType === 'FIXED'
                  ? `განახლების ფასი: ${formData.upgradePriceValue} GEL`
                  : `განახლების ფასი: კურსის ფასის ${formData.upgradePriceValue}%`}
              </p>
            )}
          </div>
        )}

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
            className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
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
