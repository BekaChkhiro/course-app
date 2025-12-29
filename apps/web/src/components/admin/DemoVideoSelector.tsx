'use client';

import React, { useEffect, useState } from 'react';
import { Video, X, Play, Clock, ChevronDown, Check, Loader2 } from 'lucide-react';
import { courseApi } from '@/lib/api/adminApi';

interface DemoVideo {
  id: string;
  chapterTitle: string;
  versionNumber: number;
  originalName: string;
  duration: number | null;
  thumbnailUrl: string | null;
  r2Key: string;
}

interface DemoVideoSelectorProps {
  courseId: string;
  selectedVideoId: string | null;
  onSelect: (videoId: string | null) => void;
}

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function DemoVideoSelector({
  courseId,
  selectedVideoId,
  onSelect,
}: DemoVideoSelectorProps) {
  const [videos, setVideos] = useState<DemoVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await courseApi.getAvailableDemoVideos(courseId);
        setVideos(response.data.data.videos || []);
      } catch (err) {
        console.error('Error fetching demo videos:', err);
        setError('ვიდეოების ჩატვირთვა ვერ მოხერხდა');
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchVideos();
    }
  }, [courseId]);

  const selectedVideo = videos.find((v) => v.id === selectedVideoId);

  const handleSelect = (videoId: string | null) => {
    onSelect(videoId);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span>ვიდეოების ჩატვირთვა...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm py-4">
        {error}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-gray-500 text-sm py-4 text-center">
        <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>კურსს ჯერ არ აქვს ვიდეოები</p>
        <p className="text-xs mt-1">ჯერ დაამატეთ თავები ვიდეოებით</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selected video preview */}
      {selectedVideo && (
        <div className="relative bg-gray-50 rounded-lg p-3 border">
          <div className="flex items-start gap-3">
            <div className="w-24 h-16 bg-gray-200 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
              {selectedVideo.thumbnailUrl ? (
                <img
                  src={selectedVideo.thumbnailUrl}
                  alt={selectedVideo.originalName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Play className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">
                {selectedVideo.originalName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                თავი: {selectedVideo.chapterTitle}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                <span>{formatDuration(selectedVideo.duration)}</span>
                <span className="text-gray-300">|</span>
                <span>ვერსია {selectedVideo.versionNumber}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              title="წაშლა"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      {/* Dropdown selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-lg hover:bg-gray-50 transition-colors text-left"
        >
          <span className="text-sm text-gray-700">
            {selectedVideo ? 'სხვა ვიდეოს არჩევა' : 'აირჩიეთ დემო ვიდეო'}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown menu */}
            <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {videos.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => handleSelect(video.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left ${
                    video.id === selectedVideoId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="w-16 h-10 bg-gray-200 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.originalName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Play className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {video.originalName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {video.chapterTitle} · v{video.versionNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">
                      {formatDuration(video.duration)}
                    </span>
                    {video.id === selectedVideoId && (
                      <Check className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
