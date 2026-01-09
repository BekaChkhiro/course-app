'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import Hls from 'hls.js';

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
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);

  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsLoading(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
      return;
    }

    setIsAnimating(false);
    const timer = setTimeout(() => {
      setShouldRender(false);
      setIsLoading(true);
    }, 300);
    return () => clearTimeout(timer);
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

    if (!isOpen && hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, [isOpen]);

  // Initialize video when modal opens
  useEffect(() => {
    if (!shouldRender || !videoUrl) return;

    const timer = setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;

      const isHLS = videoUrl.includes('.m3u8');

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (isHLS && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          startLevel: -1,
        });
        hlsRef.current = hls;

        hls.loadSource(videoUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(console.error);
        });

        video.addEventListener('loadedmetadata', () => {
          // Calculate proper dimensions based on video aspect ratio
          const maxH = window.innerHeight * 0.75;
          const maxW = window.innerWidth * 0.9;
          const videoRatio = video.videoWidth / video.videoHeight;

          console.log('Video actual size:', video.videoWidth, 'x', video.videoHeight);
          console.log('Video ratio:', videoRatio);
          console.log('Max constraints:', maxW, 'x', maxH);

          let displayWidth, displayHeight;
          if (videoRatio > 1) {
            // Landscape video
            displayWidth = Math.min(maxW, maxH * videoRatio);
            displayHeight = displayWidth / videoRatio;
          } else {
            // Portrait video
            displayHeight = Math.min(maxH, maxW / videoRatio);
            displayWidth = displayHeight * videoRatio;
          }

          console.log('Calculated display size:', displayWidth, 'x', displayHeight);
          setVideoDimensions({ width: displayWidth, height: displayHeight });
          setIsLoading(false);
        }, { once: true });

        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error('HLS Error:', data);
          if (data.fatal) {
            setIsLoading(false);
          }
        });
      } else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoUrl;
        video.addEventListener('loadedmetadata', () => {
          const maxH = window.innerHeight * 0.75;
          const maxW = window.innerWidth * 0.9;
          const videoRatio = video.videoWidth / video.videoHeight;
          let displayWidth, displayHeight;
          if (videoRatio > 1) {
            displayWidth = Math.min(maxW, maxH * videoRatio);
            displayHeight = displayWidth / videoRatio;
          } else {
            displayHeight = Math.min(maxH, maxW / videoRatio);
            displayWidth = displayHeight * videoRatio;
          }
          setVideoDimensions({ width: displayWidth, height: displayHeight });
          setIsLoading(false);
          video.play().catch(console.error);
        }, { once: true });
      } else {
        video.src = videoUrl;
        video.addEventListener('loadedmetadata', () => {
          const maxH = window.innerHeight * 0.75;
          const maxW = window.innerWidth * 0.9;
          const videoRatio = video.videoWidth / video.videoHeight;
          let displayWidth, displayHeight;
          if (videoRatio > 1) {
            displayWidth = Math.min(maxW, maxH * videoRatio);
            displayHeight = displayWidth / videoRatio;
          } else {
            displayHeight = Math.min(maxH, maxW / videoRatio);
            displayWidth = displayHeight * videoRatio;
          }
          setVideoDimensions({ width: displayWidth, height: displayHeight });
          setIsLoading(false);
          video.play().catch(console.error);
        }, { once: true });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [shouldRender, videoUrl]);

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
        className={`relative z-10 w-full max-w-4xl transition-all duration-300 ease-out ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
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
        <div className="flex justify-center">
          <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            {/* Loading State */}
            {isLoading && (
              <div className="w-[300px] h-[200px] flex flex-col items-center justify-center bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-accent-600/20 rounded-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
                  </div>
                  <p className="text-white/60 text-sm">ვიდეო იტვირთება...</p>
                </div>
              </div>
            )}

            {/* Video */}
            <video
              ref={videoRef}
              controls
              playsInline
              className={isLoading ? 'hidden' : 'block'}
              style={videoDimensions ? {
                width: `${videoDimensions.width}px`,
                height: `${videoDimensions.height}px`,
              } : undefined}
            />
          </div>
        </div>

        {/* Hint */}
        <p className="text-center text-white/40 text-xs sm:text-sm mt-4">
          დააჭირეთ <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60 font-mono text-xs">ESC</kbd> ან ფონს დასახურად
        </p>
      </div>
    </div>
  );
}
