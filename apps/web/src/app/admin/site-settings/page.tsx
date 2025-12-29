'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Globe,
  Mail,
  Phone,
  MessageCircle,
  Save,
  Loader2,
  Facebook,
  Instagram,
  Link as LinkIcon,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { siteSettingsApi } from '@/lib/api/adminApi';
import toast from 'react-hot-toast';

interface SiteSettingsFormData {
  email: string;
  phone: string;
  whatsappNumber: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
}

export default function SiteSettingsPage() {
  const queryClient = useQueryClient();

  // Fetch settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const response = await siteSettingsApi.get();
      return response.data.data;
    },
  });

  // Form
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<SiteSettingsFormData>({
    defaultValues: {
      email: '',
      phone: '',
      whatsappNumber: '',
      facebookUrl: '',
      instagramUrl: '',
      tiktokUrl: '',
    },
  });

  // Reset form when data loads
  useEffect(() => {
    if (settingsData) {
      reset({
        email: settingsData.email || '',
        phone: settingsData.phone || '',
        whatsappNumber: settingsData.whatsappNumber || '',
        facebookUrl: settingsData.facebookUrl || '',
        instagramUrl: settingsData.instagramUrl || '',
        tiktokUrl: settingsData.tiktokUrl || '',
      });
    }
  }, [settingsData, reset]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: siteSettingsApi.update,
    onSuccess: () => {
      toast.success('პარამეტრები წარმატებით განახლდა');
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'პარამეტრების განახლება ვერ მოხერხდა');
    },
  });

  const onSubmit = (data: SiteSettingsFormData) => {
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
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">საიტის პარამეტრები</h1>
          <p className="text-gray-600 mt-1">მართეთ საკონტაქტო ინფორმაცია და სოციალური ლინკები</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Contact Information Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">საკონტაქტო ინფორმაცია</h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      ელ-ფოსტა
                    </div>
                  </label>
                  <input
                    type="email"
                    id="email"
                    {...register('email', { required: 'ელ-ფოსტა სავალდებულოა' })}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      ტელეფონი
                    </div>
                  </label>
                  <input
                    type="text"
                    id="phone"
                    {...register('phone', { required: 'ტელეფონი სავალდებულოა' })}
                    placeholder="+995 XXX XX XX XX"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>

                {/* WhatsApp Number */}
                <div className="md:col-span-2">
                  <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp ნომერი
                    </div>
                  </label>
                  <input
                    type="text"
                    id="whatsappNumber"
                    {...register('whatsappNumber', { required: 'WhatsApp ნომერი სავალდებულოა' })}
                    placeholder="995XXXXXXXXX"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      errors.whatsappNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-500">მხოლოდ ციფრები (მაგ: 995596899191)</p>
                  {errors.whatsappNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.whatsappNumber.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Social Media Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <LinkIcon className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">სოციალური ქსელები</h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Facebook */}
              <div>
                <label htmlFor="facebookUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <Facebook className="w-4 h-4" />
                    Facebook
                  </div>
                </label>
                <input
                  type="url"
                  id="facebookUrl"
                  {...register('facebookUrl')}
                  placeholder="https://facebook.com/..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>

              {/* Instagram */}
              <div>
                <label htmlFor="instagramUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </div>
                </label>
                <input
                  type="url"
                  id="instagramUrl"
                  {...register('instagramUrl')}
                  placeholder="https://instagram.com/..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>

              {/* TikTok */}
              <div>
                <label htmlFor="tiktokUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                    TikTok
                  </div>
                </label>
                <input
                  type="url"
                  id="tiktokUrl"
                  {...register('tiktokUrl')}
                  placeholder="https://tiktok.com/@..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
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
