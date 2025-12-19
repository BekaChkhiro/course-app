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
        enabled ? 'bg-accent-600' : 'bg-gray-200'
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
  const [verificationSent, setVerificationSent] = useState(false);

  // Email-based password reset state
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const [resetLinkError, setResetLinkError] = useState(false);

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

  // Resend verification email mutation
  const resendVerificationMutation = useMutation({
    mutationFn: authApi.resendVerification,
    onSuccess: () => {
      setVerificationSent(true);
    },
  });

  // Send password reset link mutation
  const sendPasswordResetMutation = useMutation({
    mutationFn: () => authApi.forgotPassword(user?.email || ''),
    onSuccess: () => {
      setResetLinkSent(true);
      setResetLinkError(false);
    },
    onError: () => {
      setResetLinkError(true);
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
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">პარამეტრები</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">მართეთ თქვენი ანგარიშის პარამეტრები</p>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">პროფილის ინფორმაცია</h2>
          </div>
          <div className="p-4 sm:p-6">
            {!editingProfile ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-14 w-14 sm:h-20 sm:w-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-lg sm:text-2xl font-medium text-primary-900">
                        {user?.name?.charAt(0)}{user?.surname?.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                      {user?.name} {user?.surname}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
                  <div>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500">ტელეფონი</dt>
                    <dd className="mt-0.5 sm:mt-1 text-sm sm:text-base text-gray-900">{user?.phone || 'არ არის მითითებული'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500">ელ.ფოსტის სტატუსი</dt>
                    <dd className="mt-0.5 sm:mt-1">
                      {user?.emailVerified ? (
                        <span className="inline-flex items-center text-sm text-green-600">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          დადასტურებული
                        </span>
                      ) : (
                        <div className="space-y-2">
                          <span className="inline-flex items-center text-sm text-yellow-600">
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            დაუდასტურებელი
                          </span>
                          {verificationSent ? (
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              დადასტურების ბმული გაიგზავნა თქვენს ელ.ფოსტაზე
                            </div>
                          ) : (
                            <button
                              onClick={() => resendVerificationMutation.mutate()}
                              disabled={resendVerificationMutation.isPending}
                              className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-accent-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {resendVerificationMutation.isPending ? (
                                <>
                                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  იგზავნება...
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  დადასტურების ბმულის გაგზავნა
                                </>
                              )}
                            </button>
                          )}
                          {resendVerificationMutation.isError && (
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              ბმულის გაგზავნა ვერ მოხერხდა. სცადეთ თავიდან.
                            </div>
                          )}
                        </div>
                      )}
                    </dd>
                  </div>
                  {user?.bio && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs sm:text-sm font-medium text-gray-500">ბიოგრაფია</dt>
                      <dd className="mt-0.5 sm:mt-1 text-sm sm:text-base text-gray-900">{user.bio}</dd>
                    </div>
                  )}
                </dl>

                <button
                  onClick={() => setEditingProfile(true)}
                  className="mt-3 sm:mt-4 px-4 py-2 bg-accent-600 text-white text-sm sm:text-base rounded-lg hover:bg-accent-700 transition-colors"
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
                    className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
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
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">პაროლი</h2>
          </div>
          <div className="p-4 sm:p-6">
            {/* Reset link sent success message */}
            {resetLinkSent && (
              <div className="mb-4 p-4 bg-green-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      პაროლის აღდგენის ბმული გაიგზავნა!
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      შეამოწმეთ თქვენი ელ.ფოსტა <strong>{user?.email}</strong> და მიჰყევით ბმულს პაროლის შესაცვლელად.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reset link error message */}
            {resetLinkError && (
              <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                ბმულის გაგზავნა ვერ მოხერხდა. სცადეთ თავიდან.
              </div>
            )}

            {/* Initial state - show both options */}
            {!showPasswordForm && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm sm:text-base rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  პაროლის შეცვლა
                </button>
                <button
                  onClick={() => {
                    setResetLinkSent(false);
                    setResetLinkError(false);
                    sendPasswordResetMutation.mutate();
                  }}
                  disabled={sendPasswordResetMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-accent-600 text-white text-sm sm:text-base rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50"
                >
                  {sendPasswordResetMutation.isPending ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      იგზავნება...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      აღდგენა ელ.ფოსტით
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Current password change form */}
            {showPasswordForm && (
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
                    className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
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
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">შეტყობინებები</h2>
          </div>
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {isLoadingPreferences ? (
              <div className="animate-pulse space-y-3 sm:space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 sm:h-12 bg-gray-100 rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-medium text-gray-900">ელ.ფოსტის შეტყობინებები</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">მიიღეთ შეტყობინებები კურსების შესახებ ელ.ფოსტით</p>
                  </div>
                  <ToggleSwitch
                    enabled={preferences?.emailNotifications ?? true}
                    onChange={(value) => handlePreferenceChange('emailNotifications', value)}
                    disabled={updatePreferencesMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-medium text-gray-900">პროგრესის შეხსენებები</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">მიიღეთ შეხსენება კურსების გასაგრძელებლად</p>
                  </div>
                  <ToggleSwitch
                    enabled={preferences?.progressReminders ?? true}
                    onChange={(value) => handlePreferenceChange('progressReminders', value)}
                    disabled={updatePreferencesMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-medium text-gray-900">ყოველკვირეული ანგარიშები</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">მიიღეთ ყოველკვირეული პროგრესის ანგარიშები</p>
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

      </div>
    </StudentLayout>
  );
}
