'use client';

import { useState, useEffect } from 'react';
import { X, ArrowUp, Clock, BookOpen, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UpgradeInfo {
  currentVersion: number;
  availableVersion: number;
  availableVersionId: string;
  regularPrice: number;
  discountPrice: number | null;
  discountEndDate: string | null;
  changelog: string | null;
  newChaptersCount: number;
  updatedChaptersCount: number;
}

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  courseSlug: string;
  upgradeInfo: UpgradeInfo;
  onUpgrade: () => Promise<void>;
}

export function UpgradeModal({
  isOpen,
  onClose,
  courseTitle,
  courseSlug,
  upgradeInfo,
  onUpgrade,
}: UpgradeModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  // Calculate time remaining for discount
  useEffect(() => {
    if (!upgradeInfo.discountEndDate) return;

    const updateTimeRemaining = () => {
      const endDate = new Date(upgradeInfo.discountEndDate!);
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days} დღე ${hours} საათი`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours} საათი ${minutes} წუთი`);
      } else {
        setTimeRemaining(`${minutes} წუთი`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [upgradeInfo.discountEndDate]);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      await onUpgrade();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentPrice = upgradeInfo.discountPrice ?? upgradeInfo.regularPrice;
  const hasDiscount = upgradeInfo.discountPrice !== null && upgradeInfo.discountPrice < upgradeInfo.regularPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <ArrowUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">ახალი ვერსია ხელმისაწვდომია!</h2>
              <p className="text-primary-100 text-sm">
                v{upgradeInfo.currentVersion} → v{upgradeInfo.availableVersion}
              </p>
            </div>
          </div>

          <p className="text-primary-100">{courseTitle}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Discount Banner */}
          {hasDiscount && timeRemaining && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 text-amber-800">
                <Clock className="w-5 h-5" />
                <span className="font-medium">შეზღუდული შეთავაზება!</span>
              </div>
              <p className="mt-1 text-sm text-amber-700">
                ფასდაკლება იწურება: <span className="font-bold">{timeRemaining}</span>
              </p>
            </div>
          )}

          {/* What's New */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-600" />
              რა შეიცვალა
            </h3>

            <div className="space-y-2">
              {upgradeInfo.newChaptersCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>{upgradeInfo.newChaptersCount} ახალი თავი დაემატა</span>
                </div>
              )}
              {upgradeInfo.updatedChaptersCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>{upgradeInfo.updatedChaptersCount} თავი განახლდა</span>
                </div>
              )}
            </div>

            {upgradeInfo.changelog && (
              <div
                className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-600 prose prose-sm max-h-32 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: upgradeInfo.changelog }}
              />
            )}
          </div>

          {/* Progress Transfer Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">პროგრესის გადატანა</p>
                <p className="mt-1 text-blue-700">
                  თქვენი პროგრესი ავტომატურად გადავა ახალ ვერსიაზე. ძველ ვერსიაზე წვდომაც შენარჩუნდება.
                </p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-6">
            <div>
              <p className="text-sm text-gray-500">განახლების ფასი</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {currentPrice.toFixed(2)} ₾
                </span>
                {hasDiscount && (
                  <span className="text-sm text-gray-400 line-through">
                    {upgradeInfo.regularPrice.toFixed(2)} ₾
                  </span>
                )}
              </div>
            </div>
            {hasDiscount && (
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                დაზოგე {(upgradeInfo.regularPrice - currentPrice).toFixed(2)} ₾
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              მოგვიანებით
            </button>
            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  მუშავდება...
                </>
              ) : (
                <>
                  <ArrowUp className="w-5 h-5" />
                  განახლება
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
