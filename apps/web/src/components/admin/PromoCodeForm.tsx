'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
  Tag,
  Percent,
  DollarSign,
  Calendar,
  Users,
  Layers,
} from 'lucide-react';
import { promoCodeApi, CreatePromoCodeData } from '@/lib/api/adminApi';

interface PromoCodeFormProps {
  initialData?: Partial<CreatePromoCodeData> & { id?: string };
  onSubmit: (data: CreatePromoCodeData) => void;
  isLoading?: boolean;
}

export default function PromoCodeForm({ initialData, onSubmit, isLoading }: PromoCodeFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreatePromoCodeData>({
    defaultValues: {
      code: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      scope: 'ALL',
      courseId: '',
      categoryId: '',
      singleUsePerUser: false,
      minOrderAmount: undefined,
      maxUses: undefined,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
      ...initialData,
    },
  });

  const discountType = watch('discountType');
  const scope = watch('scope');

  // Fetch courses and categories for dropdowns
  const { data: optionsData } = useQuery({
    queryKey: ['promo-code-options'],
    queryFn: () => promoCodeApi.getOptions(),
  });

  const courses = optionsData?.data?.data?.courses || [];
  const categories = optionsData?.data?.data?.categories || [];

  // Set initial data when editing
  useEffect(() => {
    if (initialData) {
      Object.entries(initialData).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'validFrom' || key === 'validUntil') {
            setValue(key as any, new Date(value as string).toISOString().split('T')[0]);
          } else {
            setValue(key as any, value);
          }
        }
      });
    }
  }, [initialData, setValue]);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setValue('code', code);
  };

  const handleFormSubmit = (data: CreatePromoCodeData) => {
    // Clean up data based on scope
    const cleanedData = { ...data };
    if (cleanedData.scope !== 'COURSE') {
      cleanedData.courseId = undefined;
    }
    if (cleanedData.scope !== 'CATEGORY') {
      cleanedData.categoryId = undefined;
    }
    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5 text-indigo-600" />
          ძირითადი ინფორმაცია
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              პრომო კოდი *
            </label>
            <div className="flex gap-2">
              <input
                {...register('code', {
                  required: 'კოდი აუცილებელია',
                  pattern: {
                    value: /^[A-Z0-9]+$/,
                    message: 'მხოლოდ დიდი ასოები და ციფრები',
                  },
                })}
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 uppercase"
                placeholder="SALE2024"
                onChange={(e) => setValue('code', e.target.value.toUpperCase())}
              />
              <button
                type="button"
                onClick={generateRandomCode}
                className="px-4 py-2 text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                გენერაცია
              </button>
            </div>
            {errors.code && (
              <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>
            )}
          </div>

          {/* Active Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              სტატუსი
            </label>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <label className="flex items-center gap-3 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-gray-700">აქტიური</span>
                </label>
              )}
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              აღწერა
            </label>
            <textarea
              {...register('description')}
              rows={2}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="საახალწლო აქცია..."
            />
          </div>
        </div>
      </div>

      {/* Discount Settings */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          {discountType === 'PERCENTAGE' ? (
            <Percent className="w-5 h-5 text-green-600" />
          ) : (
            <DollarSign className="w-5 h-5 text-green-600" />
          )}
          ფასდაკლების პარამეტრები
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Discount Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ფასდაკლების ტიპი *
            </label>
            <select
              {...register('discountType')}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="PERCENTAGE">პროცენტული (%)</option>
              <option value="FIXED">ფიქსირებული (₾)</option>
            </select>
          </div>

          {/* Discount Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              მნიშვნელობა *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                {...register('discountValue', {
                  required: 'მნიშვნელობა აუცილებელია',
                  min: { value: 0, message: 'მინიმუმ 0' },
                  max: discountType === 'PERCENTAGE' ? { value: 100, message: 'მაქსიმუმ 100%' } : undefined,
                })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 pr-10"
                placeholder="10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                {discountType === 'PERCENTAGE' ? '%' : '₾'}
              </span>
            </div>
            {errors.discountValue && (
              <p className="text-red-500 text-sm mt-1">{errors.discountValue.message}</p>
            )}
          </div>

          {/* Minimum Order Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              მინიმალური თანხა
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                {...register('minOrderAmount')}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 pr-10"
                placeholder="არაა"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">₾</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scope Settings */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" />
          მოქმედების არეალი
        </h3>

        <div className="space-y-4">
          {/* Scope Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              სად მოქმედებს?
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  scope === 'ALL' ? 'border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  {...register('scope')}
                  value="ALL"
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="font-medium">ყველა კურსზე</p>
                  <p className="text-sm text-gray-500">გლობალური აქცია</p>
                </div>
              </label>
              <label
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  scope === 'COURSE' ? 'border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  {...register('scope')}
                  value="COURSE"
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="font-medium">კონკრეტულ კურსზე</p>
                  <p className="text-sm text-gray-500">ერთი კურსისთვის</p>
                </div>
              </label>
              <label
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  scope === 'CATEGORY' ? 'border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  {...register('scope')}
                  value="CATEGORY"
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="font-medium">კატეგორიაზე</p>
                  <p className="text-sm text-gray-500">კატეგორიის ყველა კურსი</p>
                </div>
              </label>
            </div>
          </div>

          {/* Course Selection */}
          {scope === 'COURSE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                აირჩიეთ კურსი *
              </label>
              <select
                {...register('courseId', {
                  required: scope === 'COURSE' ? 'კურსის არჩევა აუცილებელია' : false,
                })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">აირჩიეთ...</option>
                {courses.map((course: any) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              {errors.courseId && (
                <p className="text-red-500 text-sm mt-1">{errors.courseId.message}</p>
              )}
            </div>
          )}

          {/* Category Selection */}
          {scope === 'CATEGORY' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                აირჩიეთ კატეგორია *
              </label>
              <select
                {...register('categoryId', {
                  required: scope === 'CATEGORY' ? 'კატეგორიის არჩევა აუცილებელია' : false,
                })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">აირჩიეთ...</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="text-red-500 text-sm mt-1">{errors.categoryId.message}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Usage Limits */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          გამოყენების შეზღუდვები
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Max Uses */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              მაქსიმალური გამოყენება
            </label>
            <input
              type="number"
              {...register('maxUses')}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="ულიმიტო"
            />
            <p className="text-xs text-gray-500 mt-1">დატოვეთ ცარიელი ულიმიტო გამოყენებისთვის</p>
          </div>

          {/* Single Use Per User */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ერთჯერადი გამოყენება
            </label>
            <Controller
              control={control}
              name="singleUsePerUser"
              render={({ field }) => (
                <label className="flex items-center gap-3 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-gray-700">თითო მომხმარებელი ერთხელ</span>
                </label>
              )}
            />
          </div>
        </div>
      </div>

      {/* Validity Period */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-600" />
          მოქმედების ვადა
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Valid From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              დაწყების თარიღი *
            </label>
            <input
              type="date"
              {...register('validFrom', { required: 'დაწყების თარიღი აუცილებელია' })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            {errors.validFrom && (
              <p className="text-red-500 text-sm mt-1">{errors.validFrom.message}</p>
            )}
          </div>

          {/* Valid Until */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              დასრულების თარიღი *
            </label>
            <input
              type="date"
              {...register('validUntil', { required: 'დასრულების თარიღი აუცილებელია' })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            {errors.validUntil && (
              <p className="text-red-500 text-sm mt-1">{errors.validUntil.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'იტვირთება...' : initialData?.id ? 'განახლება' : 'შექმნა'}
        </button>
      </div>
    </form>
  );
}
