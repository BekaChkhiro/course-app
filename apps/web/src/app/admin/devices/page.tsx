'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Smartphone,
  Monitor,
  Trash2,
  Pencil,
  Loader2,
  AlertCircle,
  Save,
  X,
  RefreshCw,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { authApi, Device } from '@/lib/api/authApi';
import toast from 'react-hot-toast';

// OS-based device icons
const getDeviceIcon = (deviceType: string, os?: string) => {
  // Mobile devices
  if (deviceType.toLowerCase() === 'mobile') {
    return (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }

  // Tablets
  if (deviceType.toLowerCase() === 'tablet') {
    return (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }

  // Desktop - OS specific icons
  if (os?.toLowerCase().includes('mac') || os?.toLowerCase().includes('os x')) {
    return (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    );
  }

  if (os?.toLowerCase().includes('windows')) {
    return (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z"/>
      </svg>
    );
  }

  if (os?.toLowerCase().includes('linux') || os?.toLowerCase().includes('ubuntu')) {
    return (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.504 0c-.155 0-.311.002-.465.006-.751.013-1.495.074-2.207.19-.714.116-1.396.285-2.024.506-.626.222-1.196.498-1.697.827-.5.329-.931.713-1.283 1.146-.351.434-.622.916-.807 1.442-.185.525-.283 1.094-.29 1.7-.007.606.077 1.252.251 1.933.173.68.436 1.394.787 2.137.152.32.32.648.505.98.185.333.387.67.604 1.01.434.678.926 1.368 1.472 2.056.272.343.557.685.854 1.023.594.676 1.23 1.34 1.9 1.976.333.317.676.626 1.027.924.35.298.708.586 1.072.86.364.274.733.536 1.104.783.37.246.742.48 1.115.698.186.11.373.216.56.317.374.203.748.392 1.12.564.186.086.371.168.556.245.185.077.37.15.553.218.366.136.729.258 1.086.365.356.107.707.2 1.049.277.17.039.338.073.506.103.168.03.335.055.5.075.33.04.654.063.972.07.159.003.316.003.473 0 .628-.012 1.246-.077 1.841-.192.298-.057.591-.128.877-.21.286-.083.565-.178.835-.284.54-.213 1.051-.475 1.525-.782.237-.153.465-.318.683-.494.436-.352.834-.748 1.186-1.183.176-.217.34-.445.491-.681.15-.236.287-.48.41-.732.244-.503.432-1.037.561-1.596.065-.28.117-.565.155-.854.038-.288.063-.58.074-.874.022-.588-.023-1.19-.134-1.8-.111-.61-.288-1.226-.53-1.842-.121-.308-.258-.615-.41-.92-.152-.304-.32-.606-.503-.904-.366-.596-.789-1.18-1.264-1.744-.237-.282-.49-.558-.756-.825-.533-.534-1.114-1.042-1.737-1.517-.311-.237-.634-.465-.967-.683-.333-.218-.677-.426-1.03-.62-.354-.194-.716-.375-1.084-.54-.368-.165-.74-.315-1.115-.448-.375-.133-.752-.25-1.129-.348C14.348.092 13.92.037 13.492.01 13.164-.007 12.834 0 12.504 0z"/>
      </svg>
    );
  }

  // Default desktop icon
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
};

const formatLastActive = (lastActiveAt: string) => {
  const date = new Date(lastActiveAt);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'ახლახანს';
  if (minutes < 60) return `${minutes} წუთის წინ`;
  if (hours < 24) return `${hours} საათის წინ`;
  if (days === 1) return 'გუშინ';
  return `${days} დღის წინ`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ka-GE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function AdminDevicesPage() {
  const queryClient = useQueryClient();
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editDeviceName, setEditDeviceName] = useState('');
  const [deviceToRemove, setDeviceToRemove] = useState<Device | null>(null);

  // Fetch devices
  const {
    data: devicesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const response = await authApi.getDevices();
      return response.data.devices;
    },
    staleTime: 30000,
  });

  const devices = devicesData || [];

  // Remove device mutation
  const removeDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      await authApi.removeDevice(deviceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success('მოწყობილობა წარმატებით წაიშალა');
      setDeviceToRemove(null);
    },
    onError: () => {
      toast.error('მოწყობილობის წაშლა ვერ მოხერხდა');
    },
  });

  // Update device name mutation
  const updateDeviceNameMutation = useMutation({
    mutationFn: async ({ deviceId, deviceName }: { deviceId: string; deviceName: string }) => {
      await authApi.updateDeviceName(deviceId, deviceName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success('მოწყობილობის სახელი განახლდა');
      setEditingDevice(null);
      setEditDeviceName('');
    },
    onError: () => {
      toast.error('მოწყობილობის სახელის განახლება ვერ მოხერხდა');
    },
  });

  // Sort devices: current device first, then by last active
  const sortedDevices = [...devices].sort((a, b) => {
    if (a.isCurrentDevice) return -1;
    if (b.isCurrentDevice) return 1;
    return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
  });

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">მოწყობილობების მართვა</h1>
            <p className="text-gray-600 mt-1">
              მართეთ თქვენი აქტიური მოწყობილობები. მაქსიმუმ 3 მოწყობილობა.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            განახლება
          </button>
        </div>

        {/* Device Count Indicator */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-xl">
                <Smartphone className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">აქტიური მოწყობილობები</p>
                <p className="text-sm text-gray-500">
                  {devices.length} მოწყობილობა 3-დან გამოყენებულია
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-gray-900">{devices.length}</span>
              <span className="text-gray-400">/</span>
              <span className="text-2xl font-bold text-gray-400">3</span>
              <div className="flex gap-1.5 ml-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      i <= devices.length ? 'bg-primary-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Devices List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">ჩემი მოწყობილობები</h2>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-600 font-medium">მოწყობილობების ჩატვირთვა ვერ მოხერხდა</p>
                <button
                  onClick={() => refetch()}
                  className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  ხელახლა ცდა
                </button>
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">აქტიური მოწყობილობები არ მოიძებნა</h3>
                <p>შედით თქვენი ანგარიშით სხვა მოწყობილობიდან</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sortedDevices.map((device) => (
                  <div
                    key={device.id}
                    className={`relative p-5 rounded-xl border-2 transition-all ${
                      device.isCurrentDevice
                        ? 'border-primary-300 bg-primary-50/50 ring-2 ring-primary-100'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    {/* Current device badge */}
                    {device.isCurrentDevice && (
                      <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-primary-600 text-white text-xs font-medium rounded-full">
                        ეს მოწყობილობა
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      {/* Device Icon */}
                      <div
                        className={`flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center ${
                          device.isCurrentDevice
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {getDeviceIcon(device.deviceType, device.os)}
                      </div>

                      {/* Device Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate mb-1">
                          {device.deviceName}
                        </h4>
                        <p className="text-sm text-gray-500 mb-1">
                          {device.browser} {device.os && `• ${device.os}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatLastActive(device.lastActiveAt)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setEditingDevice(device);
                          setEditDeviceName(device.deviceName);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                        რედაქტირება
                      </button>
                      {!device.isCurrentDevice && (
                        <button
                          onClick={() => setDeviceToRemove(device)}
                          disabled={removeDeviceMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          წაშლა
                        </button>
                      )}
                    </div>

                    {/* Added date */}
                    <p className="mt-3 text-xs text-gray-400 text-center">
                      დამატებულია: {formatDate(device.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h3 className="font-medium text-amber-800">უსაფრთხოების შენიშვნა</h3>
              <ul className="mt-2 text-sm text-amber-700 list-disc list-inside space-y-1">
                <li>30 დღის არააქტივობის შემდეგ მოწყობილობა ავტომატურად გამოდის</li>
                <li>უცნობი მოწყობილობა დაუყოვნებლივ წაშალეთ</li>
                <li>რეგულარულად გადახედეთ თქვენს აქტიურ სესიებს</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Device Name Modal */}
      {editingDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Pencil className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">მოწყობილობის სახელის შეცვლა</h3>
              </div>
              <button
                onClick={() => {
                  setEditingDevice(null);
                  setEditDeviceName('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editDeviceName.trim() && editDeviceName !== editingDevice.deviceName) {
                  updateDeviceNameMutation.mutate({
                    deviceId: editingDevice.id,
                    deviceName: editDeviceName.trim(),
                  });
                }
              }}
            >
              <div className="mb-4">
                <label htmlFor="deviceName" className="block text-sm font-medium text-gray-700 mb-1">
                  მოწყობილობის სახელი
                </label>
                <input
                  type="text"
                  id="deviceName"
                  value={editDeviceName}
                  onChange={(e) => setEditDeviceName(e.target.value)}
                  maxLength={50}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="მოწყობილობის სახელი"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">{editDeviceName.length}/50 სიმბოლო</p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDevice(null);
                    setEditDeviceName('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  გაუქმება
                </button>
                <button
                  type="submit"
                  disabled={
                    updateDeviceNameMutation.isPending ||
                    !editDeviceName.trim() ||
                    editDeviceName === editingDevice.deviceName
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateDeviceNameMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  შენახვა
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              დარწმუნებული ხართ, რომ გსურთ <span className="font-medium">"{deviceToRemove.deviceName}"</span> მოწყობილობის წაშლა?
              ამ მოწყობილობაზე ავტომატურად გამოხვალთ სისტემიდან.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeviceToRemove(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                გაუქმება
              </button>
              <button
                onClick={() => removeDeviceMutation.mutate(deviceToRemove.id)}
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
    </AdminLayout>
  );
}
