'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Play, Loader2 } from 'lucide-react';

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
  thumbnailUrl?: string;
}

export default function VideoPreviewModal({
  isOpen,
  onClose,
  videoUrl,
  title,
  thumbnailUrl
}: VideoPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to trigger animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsLoading(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Reset video when modal closes
  useEffect(() => {
    if (!isOpen && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isOpen]);

  const handleVideoLoaded = () => {
    setIsLoading(false);
  };

  const handleVideoError = () => {
    setIsLoading(false);
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/90 backdrop-blur-md transition-all duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`relative z-10 w-full max-w-5xl transition-all duration-300 ease-out ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header with Title and Close Button */}
        <div className="flex items-center justify-between mb-4">
          {title && (
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-accent-500 rounded-full" />
              <h3 className="text-white text-lg sm:text-xl font-semibold truncate max-w-md sm:max-w-xl">
                {title}
              </h3>
            </div>
          )}
          <button
            onClick={onClose}
            className="ml-auto p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 group"
          >
            <X className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Video Container */}
        <div className="relative bg-gray-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
          {/* Aspect Ratio Container */}
          <div className="aspect-video relative">
            {/* Loading State */}
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
                {thumbnailUrl && (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm"
                    style={{ backgroundImage: `url(${thumbnailUrl})` }}
                  />
                )}
                <div className="relative flex flex-col items-center gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-accent-600/20 rounded-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-accent-500 animate-spin" />
                  </div>
                  <p className="text-white/60 text-sm">ვიდეო იტვირთება...</p>
                </div>
              </div>
            )}

            {/* Video Player */}
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              playsInline
              onLoadedData={handleVideoLoaded}
              onCanPlay={handleVideoLoaded}
              onError={handleVideoError}
              className={`w-full h-full transition-opacity duration-300 ${
                isLoading ? 'opacity-0' : 'opacity-100'
              }`}
            />
          </div>

          {/* Bottom gradient for better controls visibility */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
        </div>

        {/* Hint Text */}
        <p className="text-center text-white/40 text-xs sm:text-sm mt-4">
          დააჭირეთ <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60 font-mono text-xs">ESC</kbd> ან ფონს დასახურად
        </p>
      </div>
    </div>
  );
}
