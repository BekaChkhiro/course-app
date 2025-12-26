'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import PromoCodeForm from '@/components/admin/PromoCodeForm';
import { promoCodeApi, CreatePromoCodeData } from '@/lib/api/adminApi';
import toast from 'react-hot-toast';

export default function NewPromoCodePage() {
  const router = useRouter();

  const createMutation = useMutation({
    mutationFn: (data: CreatePromoCodeData) => promoCodeApi.create(data),
    onSuccess: () => {
      toast.success('პრომო კოდი წარმატებით შეიქმნა');
      router.push('/admin/promo-codes');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'შექმნა ვერ მოხერხდა');
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/admin/promo-codes"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ახალი პრომო კოდი</h1>
            <p className="text-gray-600 mt-1">შექმენით ახალი ფასდაკლების კოდი</p>
          </div>
        </div>

        {/* Form */}
        <PromoCodeForm
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </div>
    </AdminLayout>
  );
}
