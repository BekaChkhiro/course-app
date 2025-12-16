'use client';

import React, { useEffect, useState } from 'react';
import { X, Award, Download, Share2, CheckCircle, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CourseCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  completedChapters: number;
  totalChapters: number;
  certificate?: {
    id: string;
    certificateNumber: string;
    issuedAt: string;
    pdfUrl: string | null;
  } | null;
}

const CourseCompletionModal: React.FC<CourseCompletionModalProps> = ({
  isOpen,
  onClose,
  courseTitle,
  completedChapters,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  totalChapters: _totalChapters,
  certificate,
}) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen && !showConfetti) {
      setShowConfetti(true);
      // Fire confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#0e3355', '#ff4d40', '#10b981'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#0e3355', '#ff4d40', '#10b981'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isOpen, showConfetti]);

  if (!isOpen) return null;

  const handleDownloadCertificate = () => {
    if (certificate?.pdfUrl) {
      window.open(certificate.pdfUrl, '_blank');
    }
  };

  const handleShare = async () => {
    const shareText = `${courseTitle} კურსი წარმატებით დავასრულე! 🎉`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'კურსი დასრულებულია!',
          text: shareText,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="bg-primary-900 px-8 pt-10 pb-16 text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Award className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">გილოცავთ! 🎉</h2>
          <p className="text-primary-100">კურსი წარმატებით დაასრულეთ</p>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 -mt-8">
          {/* Stats card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">{courseTitle}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xl font-bold">{completedChapters}</span>
                </div>
                <p className="text-xs text-gray-500">თავი გავლილი</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-accent-500 mb-1">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xl font-bold">100%</span>
                </div>
                <p className="text-xs text-gray-500">პროგრესი</p>
              </div>
            </div>
          </div>

          {/* Certificate section */}
          {certificate && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-amber-900">სერტიფიკატი მზადაა!</p>
                  <p className="text-xs text-amber-700">#{certificate.certificateNumber}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {certificate?.pdfUrl && (
              <button
                onClick={handleDownloadCertificate}
                className="w-full flex items-center justify-center gap-2 py-3 bg-accent-500 text-white rounded-xl font-medium hover:bg-accent-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                სერტიფიკატის ჩამოტვირთვა
              </button>
            )}

            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              გაზიარება
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 text-gray-500 text-sm hover:text-gray-700 transition-colors"
            >
              დახურვა
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCompletionModal;
