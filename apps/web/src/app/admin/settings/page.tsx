'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Lock,
  Smartphone,
  Save,
  Eye,
  EyeOff,
  Trash2,
  Monitor,
  Tablet,
  AlertCircle,
  CheckCircle,
  Loader2,
  Mail,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { authApi, Device } from '@/lib/api/authApi';
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
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [deviceToRemove, setDeviceToRemove] = useState<string | null>(null);

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

  // Fetch devices
  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => authApi.getDevices().then((res) => res.data.devices),
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

  // Remove device mutation
  const removeDeviceMutation = useMutation({
    mutationFn: authApi.removeDevice,
    onSuccess: () => {
      toast.success('მოწყობილობა წარმატებით წაიშალა');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setDeviceToRemove(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'მოწყობილობის წაშლა ვერ მოხერხდა');
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

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

        {/* Devices Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">აქტიური მოწყობილობები</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">მართეთ მოწყობილობები, სადაც თქვენი ანგარიში შესულია</p>
          </div>
          <div className="p-6">
            {devicesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : devicesData && devicesData.length > 0 ? (
              <div className="space-y-4">
                {devicesData.map((device: Device) => (
                  <div
                    key={device.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      device.isCurrentDevice
                        ? 'border-primary-200 bg-primary-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2.5 rounded-lg ${
                          device.isCurrentDevice ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {getDeviceIcon(device.deviceType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{device.deviceName}</p>
                          {device.isCurrentDevice && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                              მიმდინარე
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {device.browser} {device.os && `• ${device.os}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          ბოლო აქტივობა: {formatDate(device.lastActiveAt)}
                        </p>
                      </div>
                    </div>
                    {!device.isCurrentDevice && (
                      <button
                        onClick={() => setDeviceToRemove(device.id)}
                        disabled={removeDeviceMutation.isPending && deviceToRemove === device.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="მოწყობილობის წაშლა"
                      >
                        {removeDeviceMutation.isPending && deviceToRemove === device.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Smartphone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>მოწყობილობები ვერ მოიძებნა</p>
              </div>
            )}
          </div>
        </div>

        {/* Remove Device Confirmation Modal */}
        {deviceToRemove && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">მოწყობილობის წაშლა</h3>
              </div>
              <p className="text-gray-600 mb-6">
                დარწმუნებული ხართ, რომ გსურთ ამ მოწყობილობის წაშლა? ამ მოწყობილობიდან მოხდება თქვენი
                ანგარიშიდან გასვლა.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeviceToRemove(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  გაუქმება
                </button>
                <button
                  onClick={() => removeDeviceMutation.mutate(deviceToRemove)}
                  disabled={removeDeviceMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {removeDeviceMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  წაშლა
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
