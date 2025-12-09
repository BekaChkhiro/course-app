'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { courseApi, categoryApi, uploadApi } from '@/lib/api/adminApi';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import FileUpload from '@/components/ui/FileUpload';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { slugify } from '@/lib/utils';

interface CourseInfoTabProps {
  course: any;
}

export default function CourseInfoTab({ course }: CourseInfoTabProps) {
  const [formData, setFormData] = useState({
    title: course.title,
    slug: course.slug,
    description: course.description || '',
    price: course.price,
    thumbnail: course.thumbnail || '',
    categoryId: course.categoryId,
    status: course.status,
    metaTitle: course.metaTitle || '',
    metaDescription: course.metaDescription || '',
    metaKeywords: course.metaKeywords || ''
  });

  const queryClient = useQueryClient();

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll().then(res => res.data)
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => courseApi.update(course.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', course.id] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('კურსი განახლდა');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'შეცდომა');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const categories = categoriesData?.categories || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            სათაური *
          </label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slug *
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ფასი (₾) *
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            კატეგორია *
          </label>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">აირჩიეთ...</option>
            {/* Parent categories with children */}
            {categories
              .filter((cat: any) => !cat.parent)
              .map((parentCat: any) => {
                const children = categories.filter((c: any) => c.parent?.id === parentCat.id);
                return (
                  <optgroup key={parentCat.id} label={parentCat.name}>
                    <option value={parentCat.id}>{parentCat.name} (მთავარი)</option>
                    {children.map((child: any) => (
                      <option key={child.id} value={child.id}>
                        └─ {child.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            სტატუსი *
          </label>
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
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          აღწერა
        </label>
        <RichTextEditor
          content={formData.description}
          onChange={(html) => setFormData({ ...formData, description: html })}
        />
      </div>

      {/* Thumbnail */}
      <div>
        <FileUpload
          label="Thumbnail"
          accept="image/*"
          onUpload={(file) => uploadApi.thumbnail(file).then(res => res.data.file)}
          value={formData.thumbnail}
          onChange={(url) => setFormData({ ...formData, thumbnail: url })}
          preview={true}
        />
      </div>

      {/* SEO Metadata */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO მეტადატა</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta Title
            </label>
            <input
              type="text"
              value={formData.metaTitle}
              onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              maxLength={60}
            />
            <p className="mt-1 text-xs text-gray-500">
              {formData.metaTitle.length}/60 სიმბოლო
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta Description
            </label>
            <textarea
              value={formData.metaDescription}
              onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              maxLength={160}
            />
            <p className="mt-1 text-xs text-gray-500">
              {formData.metaDescription.length}/160 სიმბოლო
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta Keywords
            </label>
            <input
              type="text"
              value={formData.metaKeywords}
              onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
              placeholder="javascript, web development, react"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? 'შენახვა...' : 'ცვლილებების შენახვა'}
        </button>
      </div>
    </form>
  );
}
