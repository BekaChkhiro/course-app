'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Lock,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  Loader2,
  Mail,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { authApi } from '@/lib/api/authApi';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

// Profile form schema
const profileSchema = z.object({
  name: z.string().min(2, 'სახელი უნდა იყოს მინიმუმ 2 სიმბოლო').max(50),
  surname: z.string().min(2, 'გვარი უნდა იყოს მინიმუმ 2 სიმბოლო').max(50),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^(\+?995|0)?(5\d{8}|[347]\d{8})$/.test(val),
      'არასწორი ტელეფონის ფორმატი'
    ),
  bio: z.string().max(500, 'ბიო არ უნდა აღემატებოდეს 500 სიმბოლოს').optional(),
});

// Password form schema
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'მიმდინარე პაროლი სავალდებულოა'),
    newPassword: z
      .string()
      .min(8, 'პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'პაროლი უნდა შეიცავდეს დიდ და პატარა ასოებს, ციფრს და სპეციალურ სიმბოლოს'
      ),
    confirmPassword: z.string().min(1, 'პაროლის დადასტურება სავალდებულოა'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'პაროლები არ ემთხვევა',
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function AdminSettingsPage() {
  const { user, setUser } = useAuthStore();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isDirty: isProfileDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      surname: user?.surname || '',
      phone: user?.phone || '',
      bio: user?.bio || '',
    },
  });

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (response) => {
      if (response.success && response.data.user) {
        setUser(response.data.user);
        toast.success('პროფილი წარმატებით განახლდა');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'პროფილის განახლება ვერ მოხერხდა');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      toast.success('პაროლი წარმატებით შეიცვალა');
      resetPasswordForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'პაროლის შეცვლა ვერ მოხერხდა');
    },
  });

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: () => authApi.forgotPassword(user?.email || ''),
    onSuccess: () => {
      toast.success('პაროლის აღდგენის ლინკი გამოგზავნილია თქვენს ელ-ფოსტაზე');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'შეცდომა მოხდა, სცადეთ მოგვიანებით');
    },
  });

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    changePasswordMutation.mutate(data);
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">პარამეტრები</h1>
          <p className="text-gray-600 mt-1">მართეთ თქვენი პროფილი და უსაფრთხოების პარამეტრები</p>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">პირადი ინფორმაცია</h2>
            </div>
          </div>
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  სახელი
                </label>
                <input
                  type="text"
                  id="name"
                  {...registerProfile('name')}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    profileErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {profileErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{profileErrors.name.message}</p>
                )}
              </div>

              {/* Surname */}
              <div>
                <label htmlFor="surname" className="block text-sm font-medium text-gray-700 mb-1">
                  გვარი
                </label>
                <input
                  type="text"
                  id="surname"
                  {...registerProfile('surname')}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    profileErrors.surname ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {profileErrors.surname && (
                  <p className="mt-1 text-sm text-red-600">{profileErrors.surname.message}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  ტელეფონი
                </label>
                <input
                  type="tel"
                  id="phone"
                  {...registerProfile('phone')}
                  placeholder="5XX XXX XXX"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    profileErrors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {profileErrors.phone && (
                  <p className="mt-1 text-sm text-red-600">{profileErrors.phone.message}</p>
                )}
              </div>

              {/* Email (read-only) */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  ელ-ფოსტა
                </label>
                <input
                  type="email"
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">ელ-ფოსტის შეცვლა შეუძლებელია</p>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                ბიო
              </label>
              <textarea
                id="bio"
                rows={3}
                {...registerProfile('bio')}
                placeholder="მოკლედ თქვენს შესახებ..."
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none ${
                  profileErrors.bio ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {profileErrors.bio && (
                <p className="mt-1 text-sm text-red-600">{profileErrors.bio.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateProfileMutation.isPending || !isProfileDirty}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:ring-4 focus:ring-primary-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updateProfileMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                შენახვა
              </button>
            </div>
          </form>
        </div>

        {/* Password Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">პაროლის შეცვლა</h2>
            </div>
          </div>
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="p-6 space-y-6">
            {/* Current Password */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                მიმდინარე პაროლი
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  id="currentPassword"
                  {...registerPassword('currentPassword')}
                  className={`w-full px-4 py-2.5 pr-12 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    passwordErrors.currentPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* New Password */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  ახალი პაროლი
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    id="newPassword"
                    {...registerPassword('newPassword')}
                    className={`w-full px-4 py-2.5 pr-12 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      passwordErrors.newPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  გაიმეორეთ ახალი პაროლი
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    {...registerPassword('confirmPassword')}
                    className={`w-full px-4 py-2.5 pr-12 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      passwordErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Password requirements */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">პაროლის მოთხოვნები:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  მინიმუმ 8 სიმბოლო
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  მინიმუმ ერთი დიდი ასო (A-Z)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  მინიმუმ ერთი პატარა ასო (a-z)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  მინიმუმ ერთი ციფრი (0-9)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  მინიმუმ ერთი სპეციალური სიმბოლო (@$!%*?&)
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:ring-4 focus:ring-primary-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {changePasswordMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                პაროლის შეცვლა
              </button>
            </div>

            {/* Forgot Password Section */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Mail className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">დაგავიწყდათ პაროლი?</p>
                    <p className="text-sm text-gray-600">
                      გამოგზავნით აღდგენის ლინკს: {user?.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => forgotPasswordMutation.mutate()}
                  disabled={forgotPasswordMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 focus:ring-4 focus:ring-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {forgotPasswordMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  გაგზავნა
                </button>
              </div>
            </div>
          </form>
        </div>

      </div>
    </AdminLayout>
  );
}
