'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StudentLayout from '@/components/student/StudentLayout';
import { studentApiClient, UserPreferences } from '@/lib/api/studentApi';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api/authApi';

function ToggleSwitch({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
        enabled ? 'bg-accent-500' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    surname: user?.surname || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Fetch preferences
  const { data: preferencesData, isLoading: isLoadingPreferences } = useQuery({
    queryKey: ['preferences'],
    queryFn: studentApiClient.getPreferences,
    staleTime: 60000,
  });

  const preferences = preferencesData?.data.preferences;

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: studentApiClient.updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
    },
  });

  const handlePreferenceChange = (key: keyof UserPreferences, value: boolean | string) => {
    updatePreferencesMutation.mutate({ [key]: value });
  };

  // Profile update mutation (placeholder)
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    // This would call an API to update profile
    // For now, we'll just close the form
    setEditingProfile(false);
  };

  // Password change handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('ახალი პაროლები არ ემთხვევა');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო');
      return;
    }

    // This would call an API to change password
    // For now, just show success
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswordForm(false);
  };

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">პარამეტრები</h1>
          <p className="text-gray-500 mt-1">მართეთ თქვენი ანგარიშის პარამეტრები</p>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">პროფილის ინფორმაცია</h2>
          </div>
          <div className="p-6">
            {!editingProfile ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-2xl font-medium text-primary-900">
                        {user?.name?.charAt(0)}{user?.surname?.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {user?.name} {user?.surname}
                    </h3>
                    <p className="text-gray-500">{user?.email}</p>
                  </div>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">ტელეფონი</dt>
                    <dd className="mt-1 text-gray-900">{user?.phone || 'არ არის მითითებული'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">ელ.ფოსტის სტატუსი</dt>
                    <dd className="mt-1">
                      {user?.emailVerified ? (
                        <span className="inline-flex items-center text-green-600">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          დადასტურებული
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-yellow-600">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          დაუდასტურებელი
                        </span>
                      )}
                    </dd>
                  </div>
                  {user?.bio && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">ბიოგრაფია</dt>
                      <dd className="mt-1 text-gray-900">{user.bio}</dd>
                    </div>
                  )}
                </dl>

                <button
                  onClick={() => setEditingProfile(true)}
                  className="mt-4 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
                >
                  პროფილის რედაქტირება
                </button>
              </div>
            ) : (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      სახელი
                    </label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      გვარი
                    </label>
                    <input
                      type="text"
                      value={profileForm.surname}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, surname: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ტელეფონი
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ბიოგრაფია
                  </label>
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, bio: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
                  >
                    ცვლილებების შენახვა
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    გაუქმება
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Password Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">პაროლი</h2>
          </div>
          <div className="p-6">
            {!showPasswordForm ? (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                პაროლის შეცვლა
              </button>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                {passwordError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {passwordError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    მიმდინარე პაროლი
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ახალი პაროლი
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ახალი პაროლის დადასტურება
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
                  >
                    პაროლის განახლება
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordError('');
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    გაუქმება
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">შეტყობინებები</h2>
          </div>
          <div className="p-6 space-y-6">
            {isLoadingPreferences ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">ელ.ფოსტის შეტყობინებები</h3>
                    <p className="text-sm text-gray-500">მიიღეთ შეტყობინებები კურსების შესახებ ელ.ფოსტით</p>
                  </div>
                  <ToggleSwitch
                    enabled={preferences?.emailNotifications ?? true}
                    onChange={(value) => handlePreferenceChange('emailNotifications', value)}
                    disabled={updatePreferencesMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">პროგრესის შეხსენებები</h3>
                    <p className="text-sm text-gray-500">მიიღეთ შეხსენება კურსების გასაგრძელებლად</p>
                  </div>
                  <ToggleSwitch
                    enabled={preferences?.progressReminders ?? true}
                    onChange={(value) => handlePreferenceChange('progressReminders', value)}
                    disabled={updatePreferencesMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">ყოველკვირეული ანგარიშები</h3>
                    <p className="text-sm text-gray-500">მიიღეთ ყოველკვირეული პროგრესის ანგარიშები ელ.ფოსტით</p>
                  </div>
                  <ToggleSwitch
                    enabled={preferences?.weeklyReports ?? true}
                    onChange={(value) => handlePreferenceChange('weeklyReports', value)}
                    disabled={updatePreferencesMutation.isPending}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Theme Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">გარეგნობა</h2>
          </div>
          <div className="p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">თემა</label>
              <div className="flex gap-3">
                {[
                  { key: 'light', label: 'ნათელი' },
                  { key: 'dark', label: 'მუქი' },
                  { key: 'system', label: 'სისტემური' }
                ].map((theme) => (
                  <button
                    key={theme.key}
                    onClick={() => handlePreferenceChange('theme', theme.key)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      preferences?.theme === theme.key
                        ? 'border-primary-900 bg-primary-50 text-primary-900'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Data Export */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">მონაცემები და კონფიდენციალურობა</h2>
          </div>
          <div className="p-6">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              ჩემი მონაცემების ექსპორტი
            </button>
            <p className="text-sm text-gray-500 mt-2">
              ჩამოტვირთეთ თქვენი მონაცემების ასლი, მათ შორის პროგრესი, ჩანაწერები და სერტიფიკატები
            </p>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
