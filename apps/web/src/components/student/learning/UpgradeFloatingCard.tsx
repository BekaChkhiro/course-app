'use client';

import { useState, useEffect } from 'react';
import { X, Zap, Clock, ArrowRight } from 'lucide-react';

interface UpgradeInfo {
  availableVersionId: string;
  availableVersionNumber: number;
  availableVersionTitle: string;
  changelog?: string;
  upgradePrice: number;
  currentVersionNumber: number;
  hasDiscount?: boolean;
  discountEndsAt?: string | null;
}

interface UpgradeFloatingCardProps {
  upgradeInfo: UpgradeInfo;
  courseSlug: string;
  onUpgrade: () => void;
  isUpgrading?: boolean;
}

export default function UpgradeFloatingCard({
  upgradeInfo,
  courseSlug,
  onUpgrade,
  isUpgrading = false,
}: UpgradeFloatingCardProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  // Check localStorage for dismissed state
  useEffect(() => {
    const dismissedKey = `upgrade-dismissed-${courseSlug}-v${upgradeInfo.availableVersionNumber}`;
    const dismissed = localStorage.getItem(dismissedKey);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      // Show again after 24 hours
      if (Date.now() - dismissedTime < 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem(dismissedKey);
      }
    }
  }, [courseSlug, upgradeInfo.availableVersionNumber]);

  // Calculate countdown for discount
  useEffect(() => {
    if (!upgradeInfo.hasDiscount || !upgradeInfo.discountEndsAt) return;

    const updateCountdown = () => {
      const endTime = new Date(upgradeInfo.discountEndsAt!).getTime();
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        setTimeRemaining(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeRemaining(`${days} დღე`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}სთ ${minutes}წთ`);
      } else {
        setTimeRemaining(`${minutes}წთ`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [upgradeInfo.hasDiscount, upgradeInfo.discountEndsAt]);

  const handleDismiss = () => {
    const dismissedKey = `upgrade-dismissed-${courseSlug}-v${upgradeInfo.availableVersionNumber}`;
    localStorage.setItem(dismissedKey, Date.now().toString());
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-accent-600 to-accent-500 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white/20 rounded-full p-2">
              <Zap className="w-5 h-5" />
            </div>
            <span className="font-semibold text-base">ახალი ვერსია ხელმისაწვდომია!</span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-full transition-colors"
            title="დამალვა 24 საათით"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Version info */}
          <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
            <span className="font-mono bg-gray-100 px-3 py-1 rounded-md text-base">
              v{upgradeInfo.currentVersionNumber}
            </span>
            <ArrowRight className="w-5 h-5 text-accent-500" />
            <span className="font-mono bg-accent-100 text-accent-700 px-3 py-1 rounded-md font-medium text-base">
              v{upgradeInfo.availableVersionNumber}
            </span>
          </div>

          {/* Title */}
          <h4 className="font-semibold text-gray-900 mb-3 text-lg line-clamp-2">
            {upgradeInfo.availableVersionTitle}
          </h4>

          {/* Discount countdown */}
          {upgradeInfo.hasDiscount && timeRemaining && (
            <div className="flex items-center gap-2 text-sm bg-amber-50 text-amber-700 px-4 py-2.5 rounded-lg mb-4">
              <Clock className="w-5 h-5" />
              <span>
                ფასდაკლება მთავრდება: <strong>{timeRemaining}</strong>
              </span>
            </div>
          )}

          {/* Price and CTA */}
          <div className="flex items-center justify-between mt-4">
            <div>
              {upgradeInfo.upgradePrice > 0 ? (
                <span className="text-2xl font-bold text-gray-900">
                  {upgradeInfo.upgradePrice.toFixed(2)} ₾
                </span>
              ) : (
                <span className="text-2xl font-bold text-green-600">უფასო</span>
              )}
            </div>
            <button
              onClick={onUpgrade}
              disabled={isUpgrading}
              className="px-5 py-2.5 bg-accent-600 text-white font-medium rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUpgrading ? (
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
                  მიმდინარეობს...
                </>
              ) : (
                <>
                  განახლება
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
