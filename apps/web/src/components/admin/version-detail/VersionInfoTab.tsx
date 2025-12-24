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
    upgradePriceType: version.upgradePriceType || 'FIXED',
    upgradePriceValue: version.upgradePriceValue?.toString() || '',
    upgradeDiscountStartDate: version.upgradeDiscountStartDate
      ? new Date(version.upgradeDiscountStartDate).toISOString().slice(0, 16)
      : '',
    upgradeDiscountEndDate: version.upgradeDiscountEndDate
      ? new Date(version.upgradeDiscountEndDate).toISOString().slice(0, 16)
      : '',
    upgradeDiscountType: version.upgradeDiscountType || 'FIXED',
    upgradeDiscountValue: version.upgradeDiscountValue?.toString() || '',
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
    <div className="space-y-4 sm:space-y-6">
      {/* Version Status Card */}
      <div className={`p-3 sm:p-4 rounded-lg border-2 ${
        version.isActive
          ? 'bg-green-50 border-green-200'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {version.isActive ? (
                <>
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  <span className="font-semibold text-green-900 text-sm sm:text-base">აქტიური ვერსია</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  <span className="font-semibold text-gray-900 text-sm sm:text-base">არააქტიური ვერსია</span>
                </>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
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
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm w-full sm:w-auto"
            >
              {activateMutation.isPending ? 'გააქტიურება...' : 'გააქტიურე'}
            </button>
          )}
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ვერსიის სათაური *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 text-sm"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 text-sm"
          />
        </div>

        {/* Upgrade Price Section */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-gray-900">განახლების ფასი</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ფასის ტიპი
              </label>
              <select
                value={formData.upgradePriceType}
                onChange={(e) => setFormData({ ...formData, upgradePriceType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 text-sm"
              >
                <option value="FIXED">ფიქსირებული (₾)</option>
                <option value="PERCENTAGE">პროცენტული (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.upgradePriceType === 'FIXED' ? 'ფასი (₾)' : 'პროცენტი (%)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.upgradePriceValue}
                onChange={(e) => setFormData({ ...formData, upgradePriceValue: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 text-sm"
                placeholder={formData.upgradePriceType === 'FIXED' ? '0.00' : '0'}
              />
              <p className="text-xs text-gray-500 mt-1">
                წინა ვერსიის მომხმარებლებისთვის განახლების ფასი
              </p>
            </div>
          </div>
        </div>

        {/* Promotional Discount Section */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-gray-900">პრომო ფასდაკლების პერიოდი</h4>
          <p className="text-xs text-gray-500 -mt-2">
            დროში შეზღუდული ფასდაკლება upgrade-ისთვის
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                დაწყების თარიღი
              </label>
              <input
                type="datetime-local"
                value={formData.upgradeDiscountStartDate}
                onChange={(e) => setFormData({ ...formData, upgradeDiscountStartDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                დასრულების თარიღი
              </label>
              <input
                type="datetime-local"
                value={formData.upgradeDiscountEndDate}
                onChange={(e) => setFormData({ ...formData, upgradeDiscountEndDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ფასდაკლების ტიპი
              </label>
              <select
                value={formData.upgradeDiscountType}
                onChange={(e) => setFormData({ ...formData, upgradeDiscountType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 text-sm"
              >
                <option value="FIXED">ფიქსირებული (₾)</option>
                <option value="PERCENTAGE">პროცენტული (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.upgradeDiscountType === 'FIXED' ? 'ფასდაკლებული ფასი (₾)' : 'ფასდაკლება (%)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.upgradeDiscountValue}
                onChange={(e) => setFormData({ ...formData, upgradeDiscountValue: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 text-sm"
                placeholder={formData.upgradeDiscountType === 'FIXED' ? '0.00' : '0'}
              />
            </div>
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
        <div className="border-t pt-4 sm:pt-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">სტატისტიკა</h3>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="p-2.5 sm:p-4 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">თავები</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">
                {version._count?.chapters || 0}
              </p>
            </div>
            <div className="p-2.5 sm:p-4 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">სტუდენტები</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">
                {version._count?.progress || 0}
              </p>
            </div>
            <div className="p-2.5 sm:p-4 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">ვერსია</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">
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
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50 text-sm w-full sm:w-auto"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'შენახვა...' : 'ცვლილებების შენახვა'}
          </button>
        </div>
      </form>
    </div>
  );
}
