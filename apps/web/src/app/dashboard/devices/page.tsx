'use client';

import { useEffect, useState } from 'react';
import { authApi, Device } from '@/lib/api/authApi';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import StudentLayout from '@/components/student/StudentLayout';

const getDeviceIcon = (deviceType: string) => {
  switch (deviceType.toLowerCase()) {
    case 'mobile':
      return (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case 'tablet':
      return (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    default:
      return (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
  }
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
  return `${days} დღის წინ`;
};

export default function DevicesPage() {
  const { isAuthenticated } = useAuthStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [newDeviceName, setNewDeviceName] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchDevices();
    }
  }, [isAuthenticated]);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const response = await authApi.getDevices();
      if (response.success) {
        setDevices(response.data.devices);
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!confirm('დარწმუნებული ხართ, რომ გსურთ ამ მოწყობილობის წაშლა? თქვენ გამოხვალთ იმ მოწყობილობაზე.')) {
      return;
    }

    try {
      await authApi.removeDevice(deviceId);
      setDevices(devices.filter((d) => d.id !== deviceId));
    } catch (error) {
      console.error('Failed to remove device:', error);
      alert('მოწყობილობის წაშლა ვერ მოხერხდა');
    }
  };

  const handleStartEdit = (device: Device) => {
    setEditingDevice(device.id);
    setNewDeviceName(device.deviceName);
  };

  const handleCancelEdit = () => {
    setEditingDevice(null);
    setNewDeviceName('');
  };

  const handleSaveDeviceName = async (deviceId: string) => {
    if (!newDeviceName.trim()) {
      alert('მოწყობილობის სახელი არ შეიძლება იყოს ცარიელი');
      return;
    }

    try {
      await authApi.updateDeviceName(deviceId, newDeviceName);
      setDevices(
        devices.map((d) =>
          d.id === deviceId ? { ...d, deviceName: newDeviceName } : d
        )
      );
      setEditingDevice(null);
      setNewDeviceName('');
    } catch (error) {
      console.error('Failed to update device name:', error);
      alert('მოწყობილობის სახელის განახლება ვერ მოხერხდა');
    }
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">მოწყობილობების მართვა</h1>
          <p className="text-gray-500 mt-1">
            მართეთ თქვენი აქტიური მოწყობილობები. შეგიძლიათ გქონდეთ მაქსიმუმ 3 მოწყობილობა ერთდროულად.
          </p>
        </div>

        {/* Devices List */}
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              აქტიური მოწყობილობები ({devices.length}/3)
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              მოწყობილობები, რომლებზეც ამჟამად ხართ შესული
            </p>
          </div>

          {isLoading ? (
            <div className="px-4 py-12 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-500 mt-4">იტვირთება...</p>
            </div>
          ) : devices.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500">აქტიური მოწყობილობები არ მოიძებნა</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {devices.map((device) => (
                <li key={device.id} className="px-6 py-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                          {getDeviceIcon(device.deviceType)}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        {editingDevice === device.id ? (
                          <div className="flex items-center space-x-2 mb-2">
                            <Input
                              value={newDeviceName}
                              onChange={(e) => setNewDeviceName(e.target.value)}
                              className="max-w-xs"
                              placeholder="მოწყობილობის სახელი"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveDeviceName(device.id)}
                            >
                              შენახვა
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                            >
                              გაუქმება
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-lg font-medium text-gray-900">
                              {device.deviceName}
                            </h4>
                            <button
                              onClick={() => handleStartEdit(device)}
                              className="text-indigo-600 hover:text-indigo-500"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </div>
                        )}

                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-gray-500 flex items-center">
                            <span className="capitalize">{device.deviceType}</span>
                            {device.browser && (
                              <>
                                <span className="mx-2">•</span>
                                <span>{device.browser}</span>
                              </>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">
                            IP: {device.ipAddress}
                          </p>
                          <p className="text-sm text-gray-500">
                            ბოლო აქტივობა: {formatLastActive(device.lastActiveAt)}
                          </p>
                          <p className="text-xs text-gray-400">
                            დამატების თარიღი: {new Date(device.createdAt).toLocaleDateString('ka-GE')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 ml-4">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveDevice(device.id)}
                      >
                        წაშლა
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Security Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                უსაფრთხოების შენიშვნა
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  მოწყობილობები, რომლებიც არააქტიურია 30 დღეზე მეტი, ავტომატურად გამოდიან უსაფრთხოების მიზნით.
                  თუ ვერ ცნობთ რომელიმე მოწყობილობას, დაუყოვნებლივ წაშალეთ და შეცვალეთ პაროლი.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
