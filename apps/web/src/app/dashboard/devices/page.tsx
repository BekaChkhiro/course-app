'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi, Device } from '@/lib/api/authApi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import ConfirmModal from '@/components/ui/ConfirmModal';
import StudentLayout from '@/components/student/StudentLayout';

// OS-based device icons
const getDeviceIcon = (deviceType: string, os?: string) => {
  // Mobile devices
  if (deviceType.toLowerCase() === 'mobile') {
    if (os?.toLowerCase().includes('ios') || os?.toLowerCase().includes('iphone')) {
      return (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
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

// Device card component
function DeviceCard({
  device,
  onEdit,
  onRemove,
  isRemoving,
}: {
  device: Device;
  onEdit: (device: Device) => void;
  onRemove: (device: Device) => void;
  isRemoving: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border ${
        device.isCurrentDevice ? 'border-primary-300 ring-2 ring-primary-100' : 'border-gray-100'
      } p-6 transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          {/* Device Icon */}
          <div
            className={`flex-shrink-0 h-14 w-14 rounded-full flex items-center justify-center ${
              device.isCurrentDevice
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {getDeviceIcon(device.deviceType, device.os)}
          </div>

          {/* Device Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-lg font-medium text-gray-900 truncate">
                {device.deviceName}
              </h4>
              {device.isCurrentDevice && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  ეს მოწყობილობა
                </span>
              )}
            </div>

            <div className="space-y-1 text-sm text-gray-500">
              <p className="flex items-center gap-2">
                <span className="capitalize">{device.deviceType}</span>
                {device.os && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span>{device.os} {device.osVersion}</span>
                  </>
                )}
              </p>
              {device.browser && (
                <p>{device.browser}</p>
              )}
              <p className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span>{device.ipAddress}</span>
              </p>
              <p className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>ბოლო აქტივობა: {formatLastActive(device.lastActiveAt)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => onEdit(device)}
            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="სახელის შეცვლა"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          {!device.isCurrentDevice && (
            <button
              onClick={() => onRemove(device)}
              disabled={isRemoving}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="მოწყობილობის წაშლა"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Added date */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          დამატებულია: {new Date(device.createdAt).toLocaleDateString('ka-GE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>
    </div>
  );
}

// Edit device modal
function EditDeviceModal({
  device,
  isOpen,
  onClose,
  onSave,
  isLoading,
}: {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (deviceId: string, newName: string) => void;
  isLoading: boolean;
}) {
  const [deviceName, setDeviceName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (device && isOpen) {
      setDeviceName(device.deviceName);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [device, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (device && deviceName.trim()) {
      onSave(device.id, deviceName.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!device) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOpen ? '' : 'hidden'}`}
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              მოწყობილობის სახელის შეცვლა
            </h3>
            <Input
              ref={inputRef}
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="მოწყობილობის სახელი"
              maxLength={50}
            />
            <p className="mt-2 text-xs text-gray-500">
              {deviceName.length}/50 სიმბოლო
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              გაუქმება
            </Button>
            <Button
              type="submit"
              disabled={!deviceName.trim() || deviceName === device.deviceName || isLoading}
              isLoading={isLoading}
            >
              შენახვა
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DevicesPage() {
  const queryClient = useQueryClient();
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [removingDevice, setRemovingDevice] = useState<Device | null>(null);

  // Fetch devices
  const {
    data,
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

  const devices = data || [];

  // Remove device mutation
  const removeDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      await authApi.removeDevice(deviceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success('მოწყობილობა წარმატებით წაიშალა');
      setRemovingDevice(null);
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
    },
    onError: () => {
      toast.error('მოწყობილობის სახელის განახლება ვერ მოხერხდა');
    },
  });

  const handleRemoveDevice = (device: Device) => {
    setRemovingDevice(device);
  };

  const confirmRemoveDevice = () => {
    if (removingDevice) {
      removeDeviceMutation.mutate(removingDevice.id);
    }
  };

  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
  };

  const handleSaveDeviceName = (deviceId: string, newName: string) => {
    updateDeviceNameMutation.mutate({ deviceId, deviceName: newName });
  };

  // Sort devices: current device first, then by last active
  const sortedDevices = [...devices].sort((a, b) => {
    if (a.isCurrentDevice) return -1;
    if (b.isCurrentDevice) return 1;
    return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
  });

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">მოწყობილობების მართვა</h1>
            <p className="text-gray-500 mt-1">
              მართეთ თქვენი აქტიური მოწყობილობები. შეგიძლიათ გქონდეთ მაქსიმუმ 3 მოწყობილობა ერთდროულად.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="განახლება"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Device Count Indicator */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">აქტიური მოწყობილობები</p>
                <p className="text-sm text-gray-500">
                  {devices.length} / 3 მოწყობილობა გამოყენებულია
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i <= devices.length ? 'bg-primary-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Devices List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
                <div className="flex items-start space-x-4">
                  <div className="h-14 w-14 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-600 font-medium">მოწყობილობების ჩატვირთვა ვერ მოხერხდა</p>
            <p className="text-red-500 text-sm mt-1">გთხოვთ, სცადოთ მოგვიანებით</p>
            <Button className="mt-4" onClick={() => refetch()}>
              ხელახლა ცდა
            </Button>
          </div>
        ) : devices.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">აქტიური მოწყობილობები არ მოიძებნა</h3>
            <p className="text-gray-500">შედით თქვენი ანგარიშით სხვა მოწყობილობიდან</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedDevices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onEdit={handleEditDevice}
                onRemove={handleRemoveDevice}
                isRemoving={removeDeviceMutation.isPending && removingDevice?.id === device.id}
              />
            ))}
          </div>
        )}

        {/* Security Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                უსაფრთხოების შენიშვნა
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>მოწყობილობები, რომლებიც არააქტიურია 30 დღეზე მეტი, ავტომატურად გამოდიან</li>
                  <li>თუ ვერ ცნობთ რომელიმე მოწყობილობას, დაუყოვნებლივ წაშალეთ და შეცვალეთ პაროლი</li>
                  <li>მიმდინარე მოწყობილობის წაშლა შეუძლებელია - ჯერ გამოდით სისტემიდან</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Device Modal */}
      <EditDeviceModal
        device={editingDevice}
        isOpen={!!editingDevice}
        onClose={() => setEditingDevice(null)}
        onSave={handleSaveDeviceName}
        isLoading={updateDeviceNameMutation.isPending}
      />

      {/* Remove Device Confirmation */}
      <ConfirmModal
        isOpen={!!removingDevice}
        onClose={() => setRemovingDevice(null)}
        onConfirm={confirmRemoveDevice}
        title="მოწყობილობის წაშლა"
        message={`დარწმუნებული ხართ, რომ გსურთ "${removingDevice?.deviceName}" მოწყობილობის წაშლა? ამ მოწყობილობაზე ავტომატურად გამოხვალთ სისტემიდან.`}
        confirmText="წაშლა"
        cancelText="გაუქმება"
        variant="danger"
        isLoading={removeDeviceMutation.isPending}
      />
    </StudentLayout>
  );
}
