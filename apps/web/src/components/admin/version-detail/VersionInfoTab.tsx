'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, CheckCircle, XCircle } from 'lucide-react';
import { versionApi } from '@/lib/api/adminApi';
import toast from 'react-hot-toast';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { formatDate } from '@/lib/utils';

interface VersionInfoTabProps {
  version: any;
  courseId: string;
}

export default function VersionInfoTab({ version, courseId }: VersionInfoTabProps) {
  const [formData, setFormData] = useState({
    title: version.title,
    description: version.description || '',
    changelog: version.changelog || '',
    upgradePrice: version.upgradePrice?.toString() || '',
    discountPercentage: version.discountPercentage?.toString() || ''
  });

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: any) => versionApi.update(version.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['version', version.id] });
      queryClient.invalidateQueries({ queryKey: ['versions', courseId] });
      toast.success('ვერსია განახლდა');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const activateMutation = useMutation({
    mutationFn: () => versionApi.activate(version.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['version', version.id] });
      queryClient.invalidateQueries({ queryKey: ['versions', courseId] });
      toast.success('ვერსია აქტიურია');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Version Status Card */}
      <div className={`p-4 rounded-lg border-2 ${
        version.isActive
          ? 'bg-green-50 border-green-200'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              {version.isActive ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">აქტიური ვერსია</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold text-gray-900">არააქტიური ვერსია</span>
                </>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {version.publishedAt
                ? `გამოქვეყნდა: ${formatDate(version.publishedAt)}`
                : 'ჯერ არ არის გამოქვეყნებული'
              }
            </p>
          </div>
          {!version.isActive && (
            <button
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {activateMutation.isPending ? 'გააქტიურება...' : 'გააქტიურე'}
            </button>
          )}
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ვერსიის სათაური *
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              წინა ვერსიის მომხმარებლებისთვის განახლების ფასი
            </p>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              განახლების ფასდაკლება
            </p>
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
          <p className="text-xs text-gray-500 mt-1">
            რა შეიცვალა ამ ვერსიაში? მომხმარებლები დაინახავენ upgrade-ის დროს
          </p>
        </div>

        {/* Version Statistics */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">სტატისტიკა</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">თავების რაოდენობა</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {version._count?.chapters || 0}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">სტუდენტები</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {version._count?.progress || 0}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">ვერსიის ნომერი</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                v{version.version}
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'შენახვა...' : 'ცვლილებების შენახვა'}
          </button>
        </div>
      </form>
    </div>
  );
}
