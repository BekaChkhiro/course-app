'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { pageContentApi } from '@/lib/api/adminApi';
import toast from 'react-hot-toast';

const PAGE_LABELS: Record<string, string> = {
  about: 'ჩვენ შესახებ',
  contact: 'კონტაქტი',
};

interface PageContentFormData {
  heroTitle: string;
  heroSubtitle: string;
  content: string;
  isActive: boolean;
}

export default function PageEditorPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = params.slug as string;

  // Fetch page content
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['admin-page', slug],
    queryFn: async () => {
      try {
        const response = await pageContentApi.get(slug);
        return response.data.data;
      } catch {
        // Page doesn't exist yet, return defaults
        return null;
      }
    },
  });

  // Form
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<PageContentFormData>({
    defaultValues: {
      heroTitle: '',
      heroSubtitle: '',
      content: '',
      isActive: true,
    },
  });

  // Reset form when data loads
  useEffect(() => {
    if (pageData) {
      reset({
        heroTitle: pageData.heroTitle || '',
        heroSubtitle: pageData.heroSubtitle || '',
        content: pageData.content || '',
        isActive: pageData.isActive ?? true,
      });
    } else if (!isLoading) {
      // Set defaults for new page
      reset({
        heroTitle: slug === 'about' ? 'ჩვენ შესახებ' : 'დაგვიკავშირდი',
        heroSubtitle: slug === 'about'
          ? 'ჩვენი მისია არის განათლების ხელმისაწვდომობა ყველასთვის'
          : 'გაქვთ კითხვა? მოგვწერეთ და დაგეხმარებით',
        content: '',
        isActive: true,
      });
    }
  }, [pageData, isLoading, reset, slug]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: PageContentFormData) => pageContentApi.update(slug, data),
    onSuccess: () => {
      toast.success('გვერდი წარმატებით განახლდა');
      queryClient.invalidateQueries({ queryKey: ['admin-page', slug] });
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'გვერდის განახლება ვერ მოხერხდა');
    },
  });

  const onSubmit = (data: PageContentFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Link
          href="/admin/pages"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          უკან გვერდების სიაში
        </Link>

        {/* Page Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-50 rounded-xl">
            <FileText className="w-8 h-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {PAGE_LABELS[slug] || slug} - რედაქტირება
            </h1>
            <p className="text-gray-600">/{slug}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Hero Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Hero სექცია</h2>
              <p className="text-sm text-gray-500">გვერდის ზედა ნაწილი</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Hero Title */}
              <div>
                <label htmlFor="heroTitle" className="block text-sm font-medium text-gray-700 mb-1">
                  სათაური
                </label>
                <input
                  type="text"
                  id="heroTitle"
                  {...register('heroTitle', { required: 'სათაური სავალდებულოა' })}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.heroTitle ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.heroTitle && (
                  <p className="mt-1 text-sm text-red-600">{errors.heroTitle.message}</p>
                )}
              </div>

              {/* Hero Subtitle */}
              <div>
                <label htmlFor="heroSubtitle" className="block text-sm font-medium text-gray-700 mb-1">
                  ქვესათაური
                </label>
                <textarea
                  id="heroSubtitle"
                  rows={2}
                  {...register('heroSubtitle')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Content Section (for About page) */}
          {slug === 'about' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">მისიის სექცია</h2>
                <p className="text-sm text-gray-500">ტექსტი &quot;ჩვენი მისია&quot; სექციაში</p>
              </div>
              <div className="p-6">
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                    მისიის ტექსტი
                  </label>
                  <textarea
                    id="content"
                    rows={10}
                    {...register('content')}
                    placeholder="აქ ჩაწერეთ მისიის ტექსტი. შეგიძლიათ გამოიყენოთ ახალი ხაზები პარაგრაფების გამოსაყოფად."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-y font-sans"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    თითოეული ახალი ხაზი გაიყოფა ცალკე პარაგრაფად
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">სტატუსი</h2>
            </div>
            <div className="p-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-gray-700">გვერდი აქტიურია</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link
              href="/admin/pages"
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              გაუქმება
            </Link>
            <button
              type="submit"
              disabled={updateMutation.isPending || !isDirty}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:ring-4 focus:ring-primary-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              შენახვა
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
