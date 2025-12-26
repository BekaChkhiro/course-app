'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import PromoCodeForm from '@/components/admin/PromoCodeForm';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { promoCodeApi, CreatePromoCodeData } from '@/lib/api/adminApi';
import toast from 'react-hot-toast';

export default function EditPromoCodePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Fetch promo code data
  const { data, isLoading, error } = useQuery({
    queryKey: ['promo-code', id],
    queryFn: () => promoCodeApi.getById(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreatePromoCodeData) => promoCodeApi.update(id, data),
    onSuccess: () => {
      toast.success('პრომო კოდი წარმატებით განახლდა');
      router.push('/admin/promo-codes');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'განახლება ვერ მოხერხდა');
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <PageLoader />
      </AdminLayout>
    );
  }

  if (error || !data?.data?.data) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-red-500">პრომო კოდი ვერ მოიძებნა</p>
          <Link href="/admin/promo-codes" className="text-indigo-600 hover:underline mt-4 inline-block">
            უკან დაბრუნება
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const promoCode = data.data.data;

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
            <h1 className="text-2xl font-bold text-gray-900">
              პრომო კოდის რედაქტირება
            </h1>
            <p className="text-gray-600 mt-1">
              კოდი: <span className="font-mono font-bold text-indigo-600">{promoCode.code}</span>
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">გამოყენებული</p>
              <p className="text-2xl font-bold text-gray-900">{promoCode.usedCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">შეძენები</p>
              <p className="text-2xl font-bold text-gray-900">{promoCode._count?.purchases || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">შექმნილია</p>
              <p className="text-lg font-medium text-gray-900">
                {new Date(promoCode.createdAt).toLocaleDateString('ka-GE')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">ბოლო განახლება</p>
              <p className="text-lg font-medium text-gray-900">
                {new Date(promoCode.updatedAt).toLocaleDateString('ka-GE')}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <PromoCodeForm
          initialData={{
            id: promoCode.id,
            code: promoCode.code,
            description: promoCode.description,
            discountType: promoCode.discountType,
            discountValue: Number(promoCode.discountValue),
            scope: promoCode.scope,
            courseId: promoCode.courseId || '',
            categoryId: promoCode.categoryId || '',
            singleUsePerUser: promoCode.singleUsePerUser,
            minOrderAmount: promoCode.minOrderAmount ? Number(promoCode.minOrderAmount) : undefined,
            maxUses: promoCode.maxUses || undefined,
            validFrom: promoCode.validFrom,
            validUntil: promoCode.validUntil,
            isActive: promoCode.isActive,
          }}
          onSubmit={(data) => updateMutation.mutate(data)}
          isLoading={updateMutation.isPending}
        />

        {/* Recent Purchases */}
        {promoCode.purchases && promoCode.purchases.length > 0 && (
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-4">ბოლო შეძენები</h3>
            <div className="space-y-3">
              {promoCode.purchases.map((purchase: any) => (
                <div key={purchase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{purchase.user?.name} {purchase.user?.surname}</p>
                    <p className="text-sm text-gray-500">{purchase.user?.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{purchase.course?.title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(purchase.createdAt).toLocaleDateString('ka-GE')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
