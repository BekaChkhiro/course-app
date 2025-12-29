'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, BookOpen, DollarSign, Image, Search, UserCircle, Video } from 'lucide-react';
import { courseApi, categoryApi, uploadApi, instructorApi } from '@/lib/api/adminApi';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import FileUpload from '@/components/ui/FileUpload';
import RichTextEditor from '@/components/ui/RichTextEditor';
import DemoVideoSelector from '@/components/admin/DemoVideoSelector';
import { slugify } from '@/lib/utils';

interface CourseInfoTabProps {
  course: any;
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

function Section({ icon, title, description, children }: SectionProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-accent-100 rounded-lg text-accent-600 flex-shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{title}</h3>
            <p className="text-xs sm:text-sm text-gray-500 truncate">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}

export default function CourseInfoTab({ course }: CourseInfoTabProps) {
  const [formData, setFormData] = useState({
    title: course.title,
    slug: course.slug,
    description: course.description || '',
    price: course.price,
    individualSessionPrice: course.individualSessionPrice || '',
    thumbnail: course.thumbnail || '',
    demoVideoId: course.demoVideoId || null,
    categoryId: course.categoryId,
    instructorId: course.instructorId || '',
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

  const { data: instructorsData } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => instructorApi.getAll().then(res => res.data)
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
    updateMutation.mutate({
      ...formData,
      individualSessionPrice: formData.individualSessionPrice || null
    });
  };

  const categories = categoriesData?.categories || [];
  const instructors = instructorsData?.instructors || [];

  const statusOptions = [
    { value: 'DRAFT', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
    { value: 'PUBLISHED', label: 'Published', color: 'bg-green-100 text-green-700' },
    { value: 'ARCHIVED', label: 'Archived', color: 'bg-red-100 text-red-700' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info Section */}
      <Section
        icon={<BookOpen className="w-5 h-5" />}
        title="ძირითადი ინფორმაცია"
        description="კურსის სათაური, slug და აღწერა"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                სათაური <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setFormData({ ...formData, title, slug: slugify(title) });
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-accent-600 transition-colors"
                placeholder="მაგ: JavaScript საფუძვლები"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Slug <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">/courses/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full pl-20 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-accent-600 transition-colors"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              აღწერა
            </label>
            <RichTextEditor
              content={formData.description}
              onChange={(html) => setFormData({ ...formData, description: html })}
            />
          </div>
        </div>
      </Section>

      {/* Pricing & Category Section */}
      <Section
        icon={<DollarSign className="w-5 h-5" />}
        title="ფასი და კატეგორია"
        description="კურსის ფასი, კატეგორია და სტატუსი"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ფასი <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-accent-600 transition-colors"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₾</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ინდივიდუალური სესიის ფასი
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={formData.individualSessionPrice}
                onChange={(e) => setFormData({ ...formData, individualSessionPrice: e.target.value ? parseFloat(e.target.value) : '' })}
                className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-accent-600 transition-colors"
                placeholder="არასავალდებულო"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₾</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">თუ ცარიელია, გამოჩნდება "შეთანხმებით"</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              კატეგორია <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-accent-600 transition-colors bg-white"
              required
            >
              <option value="">აირჩიეთ...</option>
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              სტატუსი <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-1.5 sm:gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: option.value })}
                  className={`
                    flex-1 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all
                    ${formData.status === option.value
                      ? `${option.color} ring-2 ring-offset-1 ring-accent-600`
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Instructor Section */}
      <Section
        icon={<UserCircle className="w-5 h-5" />}
        title="ლექტორი"
        description="კურსის ლექტორის არჩევა"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            ლექტორი
          </label>
          <select
            value={formData.instructorId}
            onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-accent-600 transition-colors bg-white"
          >
            <option value="">ლექტორის გარეშე</option>
            {instructors
              .filter((inst: any) => inst.isActive)
              .map((instructor: any) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.firstName} {instructor.lastName} - {instructor.profession}
                </option>
              ))}
          </select>
          <p className="mt-1.5 text-xs text-gray-500">
            ლექტორი გამოჩნდება კურსის გვერდზე
          </p>
        </div>
      </Section>

      {/* Media Section */}
      <Section
        icon={<Image className="w-5 h-5" />}
        title="მედია"
        description="კურსის thumbnail სურათი"
      >
        <FileUpload
          label="Thumbnail"
          accept="image/*"
          onUpload={(file) => uploadApi.thumbnail(file).then(res => res.data.file)}
          value={formData.thumbnail}
          onChange={(url) => setFormData({ ...formData, thumbnail: url })}
          preview={true}
        />
      </Section>

      {/* Demo Video Section */}
      <Section
        icon={<Video className="w-5 h-5" />}
        title="დემო ვიდეო"
        description="კურსის თრეილერი ქარდებისთვის"
      >
        <DemoVideoSelector
          courseId={course.id}
          selectedVideoId={formData.demoVideoId}
          onSelect={(videoId) => setFormData({ ...formData, demoVideoId: videoId })}
        />
        <p className="mt-3 text-xs text-gray-500">
          დემო ვიდეო გამოჩნდება კურსის ქარდებზე auto-play რეჟიმში hover-ზე
        </p>
      </Section>

      {/* SEO Section */}
      <Section
        icon={<Search className="w-5 h-5" />}
        title="SEO მეტადატა"
        description="საძიებო სისტემების ოპტიმიზაცია"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Meta Title
            </label>
            <input
              type="text"
              value={formData.metaTitle}
              onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-accent-600 transition-colors"
              placeholder="კურსის სათაური საძიებო სისტემებისთვის"
              maxLength={60}
            />
            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                რეკომენდებულია 50-60 სიმბოლო
              </p>
              <span className={`text-xs font-medium ${formData.metaTitle.length > 60 ? 'text-red-500' : formData.metaTitle.length > 50 ? 'text-green-500' : 'text-gray-500'}`}>
                {formData.metaTitle.length}/60
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Meta Description
            </label>
            <textarea
              value={formData.metaDescription}
              onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-accent-600 transition-colors resize-none"
              placeholder="მოკლე აღწერა საძიებო რეზულტატებში გამოსაჩენად"
              maxLength={160}
            />
            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                რეკომენდებულია 120-160 სიმბოლო
              </p>
              <span className={`text-xs font-medium ${formData.metaDescription.length > 160 ? 'text-red-500' : formData.metaDescription.length > 120 ? 'text-green-500' : 'text-gray-500'}`}>
                {formData.metaDescription.length}/160
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Meta Keywords
            </label>
            <input
              type="text"
              value={formData.metaKeywords}
              onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
              placeholder="javascript, web development, react"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-accent-600 transition-colors"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              გამოყავით მძიმით
            </p>
          </div>
        </div>
      </Section>

      {/* Sticky Submit Button */}
      <div className="sticky bottom-0 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-4 sm:pt-6 pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6 -mb-4 sm:-mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
            ცვლილებები შეინახება ყველა ველისთვის ერთდროულად
          </p>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50 transition-colors font-medium shadow-sm text-sm sm:text-base w-full sm:w-auto"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'შენახვა...' : 'შენახვა'}
          </button>
        </div>
      </div>
    </form>
  );
}
