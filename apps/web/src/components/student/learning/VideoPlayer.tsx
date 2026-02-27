'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { Bookmark } from '@/lib/api/studentApi';

interface VideoPlayerProps {
  video: {
    id: string | null;
    duration: number | null;
    hlsMasterUrl: string | null;
  } | null;
  progress: {
    isCompleted: boolean;
    watchPercentage: number;
    lastPosition: number;
    canSkipAhead: boolean;
  };
  bookmarks: Bookmark[];
  onProgressUpdate: (data: { watchPercentage?: number; lastPosition?: number }) => void;
  onCreateBookmark: (timestamp: number, title: string, description?: string) => void;
}

// Helper function to extract YouTube video ID
const getYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

// Check if URL is a YouTube URL
const isYouTubeUrl = (url: string): boolean => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

export default function VideoPlayer({
  video,
  progress,
  bookmarks,
  onProgressUpdate,
  onCreateBookmark,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkTimestamp, setBookmarkTimestamp] = useState(0);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkDescription, setBookmarkDescription] = useState('');
  const [showControls, setShowControls] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Double-tap state for mobile skip
  const lastTapRef = useRef<number>(0);
  const lastTapXRef = useRef<number>(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [skipAnimation, setSkipAnimation] = useState<{
    show: boolean;
    direction: 'left' | 'right';
    x: number;
    y: number;
  } | null>(null);

  // Pinch-to-zoom state for mobile
  const [videoScale, setVideoScale] = useState(1);
  const [videoTranslate, setVideoTranslate] = useState({ x: 0, y: 0 });
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const lastPanPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isPinchingRef = useRef(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobileDevice = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(isMobileDevice || (isTouchDevice && window.innerWidth < 1024));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // HLS instance ref
  const hlsRef = useRef<Hls | null>(null);

  // Initialize video player with HLS.js
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !video?.hlsMasterUrl) return;

    const handleLoadedMetadata = () => {
      setDuration(videoEl.duration);
      if (progress.lastPosition > 0 && progress.lastPosition < videoEl.duration) {
        videoEl.currentTime = progress.lastPosition;
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(videoEl.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      onProgressUpdate({ watchPercentage: 100 });
    };

    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoEl.addEventListener('timeupdate', handleTimeUpdate);
    videoEl.addEventListener('play', handlePlay);
    videoEl.addEventListener('pause', handlePause);
    videoEl.addEventListener('ended', handleEnded);

    // Check if URL is HLS (.m3u8)
    const isHLS = video.hlsMasterUrl.includes('.m3u8');

    if (isHLS && Hls.isSupported()) {
      // Use HLS.js for browsers that don't support HLS natively (Chrome, Firefox)
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hlsRef.current = hls;

      hls.loadSource(video.hlsMasterUrl);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Set initial position if there's saved progress
        if (progress.lastPosition > 0) {
          videoEl.currentTime = progress.lastPosition;
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('HLS network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('HLS media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Unrecoverable HLS error:', data);
              hls.destroy();
              break;
          }
        }
      });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari has native HLS support
      videoEl.src = video.hlsMasterUrl;
      if (progress.lastPosition > 0) {
        videoEl.currentTime = progress.lastPosition;
      }
    } else {
      // Fallback for non-HLS URLs (direct video files, YouTube, etc.)
      videoEl.src = video.hlsMasterUrl;
      if (progress.lastPosition > 0) {
        videoEl.currentTime = progress.lastPosition;
      }
    }

    return () => {
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoEl.removeEventListener('timeupdate', handleTimeUpdate);
      videoEl.removeEventListener('play', handlePlay);
      videoEl.removeEventListener('pause', handlePause);
      videoEl.removeEventListener('ended', handleEnded);

      // Cleanup HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video?.hlsMasterUrl, progress.lastPosition, onProgressUpdate]);

  // Mobile fullscreen handling
  useEffect(() => {
    if (!isMobile) return;

    const videoEl = videoRef.current;
    const container = containerRef.current;
    if (!videoEl || !container) return;

    // Request fullscreen on mobile when video starts playing
    const handlePlay = () => {
      // Check if already in fullscreen
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        return;
      }

      // Try to enter fullscreen
      const enterFullscreen = async () => {
        try {
          // For iOS Safari - use webkit video fullscreen
          if ((videoEl as any).webkitEnterFullscreen) {
            // iOS Safari native video fullscreen
            (videoEl as any).webkitEnterFullscreen();
          } else if ((videoEl as any).webkitRequestFullscreen) {
            await (videoEl as any).webkitRequestFullscreen();
          } else if (container.requestFullscreen) {
            await container.requestFullscreen();
          } else if ((container as any).webkitRequestFullscreen) {
            await (container as any).webkitRequestFullscreen();
          }
          setIsFullscreen(true);
        } catch (error) {
          // Fullscreen request may fail due to user gesture requirements
          console.log('Fullscreen request failed:', error);
        }
      };

      enterFullscreen();
    };

    videoEl.addEventListener('play', handlePlay);

    // Handle fullscreen change events
    const handleFullscreenChange = () => {
      const isNowFullscreen =
        !!document.fullscreenElement ||
        !!(document as any).webkitFullscreenElement ||
        !!(videoEl as any).webkitDisplayingFullscreen;
      setIsFullscreen(isNowFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    videoEl.addEventListener('webkitbeginfullscreen', handleFullscreenChange);
    videoEl.addEventListener('webkitendfullscreen', handleFullscreenChange);

    return () => {
      videoEl.removeEventListener('play', handlePlay);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      videoEl.removeEventListener('webkitbeginfullscreen', handleFullscreenChange);
      videoEl.removeEventListener('webkitendfullscreen', handleFullscreenChange);
    };
  }, [isMobile]);

  // Auto-save progress every 30 seconds
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        const videoEl = videoRef.current;
        if (videoEl && videoEl.duration > 0) {
          const watchPercentage = (videoEl.currentTime / videoEl.duration) * 100;
          onProgressUpdate({
            watchPercentage,
            lastPosition: Math.floor(videoEl.currentTime),
          });
        }
      }, 30000);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, onProgressUpdate]);

  // Save progress on pause or when leaving
  useEffect(() => {
    const handleBeforeUnload = () => {
      const videoEl = videoRef.current;
      if (videoEl && videoEl.duration > 0) {
        const watchPercentage = (videoEl.currentTime / videoEl.duration) * 100;
        onProgressUpdate({
          watchPercentage,
          lastPosition: Math.floor(videoEl.currentTime),
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [onProgressUpdate]);

  // Track fullscreen state changes (for desktop)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const videoEl = videoRef.current;
      const isNowFullscreen =
        !!document.fullscreenElement ||
        !!(document as any).webkitFullscreenElement ||
        !!(videoEl && (videoEl as any).webkitDisplayingFullscreen);
      setIsFullscreen(isNowFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle landscape orientation for auto-fullscreen on mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleOrientationChange = () => {
      const videoEl = videoRef.current;
      const container = containerRef.current;
      if (!videoEl || !container) return;

      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      const isVideoPlaying = !videoEl.paused && !videoEl.ended;

      if (isLandscape && isVideoPlaying && !isFullscreen) {
        // Auto-enter fullscreen when rotating to landscape while playing
        const enterFullscreen = async () => {
          try {
            if ((videoEl as any).webkitEnterFullscreen) {
              (videoEl as any).webkitEnterFullscreen();
            } else if (container.requestFullscreen) {
              await container.requestFullscreen();
            } else if ((container as any).webkitRequestFullscreen) {
              await (container as any).webkitRequestFullscreen();
            }
          } catch (error) {
            console.log('Auto fullscreen on landscape failed:', error);
          }
        };
        enterFullscreen();
      }
    };

    // Use both orientationchange and resize for better compatibility
    window.addEventListener('orientationchange', handleOrientationChange);
    const mediaQuery = window.matchMedia('(orientation: landscape)');
    mediaQuery.addEventListener('change', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      mediaQuery.removeEventListener('change', handleOrientationChange);
    };
  }, [isMobile, isFullscreen]);

  // Cleanup double-tap timeout on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  // Pinch-to-zoom handling for mobile
  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePinchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      isPinchingRef.current = true;
      initialPinchDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
      initialScaleRef.current = videoScale;
    } else if (e.touches.length === 1 && videoScale > 1) {
      // Start panning when zoomed in
      lastPanPositionRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  }, [videoScale]);

  const handlePinchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = (currentDistance / initialPinchDistanceRef.current) * initialScaleRef.current;
      // Limit scale between 1x and 3x
      const clampedScale = Math.min(Math.max(scale, 1), 3);
      setVideoScale(clampedScale);

      // Reset translation if scale is back to 1
      if (clampedScale === 1) {
        setVideoTranslate({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && videoScale > 1 && lastPanPositionRef.current) {
      // Pan when zoomed in
      e.preventDefault();
      const deltaX = e.touches[0].clientX - lastPanPositionRef.current.x;
      const deltaY = e.touches[0].clientY - lastPanPositionRef.current.y;

      // Calculate max translation based on scale
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const maxTranslateX = (rect.width * (videoScale - 1)) / 2;
        const maxTranslateY = (rect.height * (videoScale - 1)) / 2;

        setVideoTranslate(prev => ({
          x: Math.min(Math.max(prev.x + deltaX, -maxTranslateX), maxTranslateX),
          y: Math.min(Math.max(prev.y + deltaY, -maxTranslateY), maxTranslateY),
        }));
      }

      lastPanPositionRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  }, [videoScale]);

  const handlePinchEnd = useCallback(() => {
    initialPinchDistanceRef.current = null;
    lastPanPositionRef.current = null;
    isPinchingRef.current = false;
  }, []);

  // Reset zoom on double tap when zoomed in
  const resetZoom = useCallback(() => {
    setVideoScale(1);
    setVideoTranslate({ x: 0, y: 0 });
  }, []);

  // Hide controls after inactivity
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  // Format time as mm:ss or hh:mm:ss
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Toggle play/pause
  const togglePlay = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isPlaying) {
      videoEl.pause();
    } else {
      videoEl.play();
    }
  };

  // Seek video
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const newTime = parseFloat(e.target.value);

    // Check if user can skip ahead
    if (!progress.canSkipAhead && newTime > videoEl.currentTime) {
      const maxAllowedTime = (progress.watchPercentage / 100) * duration + 30;
      if (newTime > maxAllowedTime) {
        return; // Prevent skipping ahead
      }
    }

    videoEl.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Toggle mute
  const toggleMute = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    videoEl.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Change volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const newVolume = parseFloat(e.target.value);
    videoEl.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    const videoEl = videoRef.current;
    const container = containerRef.current;
    if (!container || !videoEl) return;

    const isCurrentlyFullscreen =
      !!document.fullscreenElement ||
      !!(document as any).webkitFullscreenElement ||
      !!(videoEl as any).webkitDisplayingFullscreen;

    if (!isCurrentlyFullscreen) {
      // Enter fullscreen
      const enterFullscreen = async () => {
        try {
          // For iOS Safari - use webkit video fullscreen (best experience on iOS)
          if (isMobile && (videoEl as any).webkitEnterFullscreen) {
            (videoEl as any).webkitEnterFullscreen();
          } else if (container.requestFullscreen) {
            await container.requestFullscreen();
          } else if ((container as any).webkitRequestFullscreen) {
            await (container as any).webkitRequestFullscreen();
          } else if ((videoEl as any).webkitEnterFullscreen) {
            // Fallback for iOS
            (videoEl as any).webkitEnterFullscreen();
          }
          setIsFullscreen(true);
        } catch (error) {
          console.log('Fullscreen request failed:', error);
        }
      };
      enterFullscreen();
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((videoEl as any).webkitExitFullscreen) {
        (videoEl as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
    }
  }, [isMobile]);

  // Handle double-tap for 10-second skip (mobile)
  const handleDoubleTap = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!isMobile) return;
      // Ignore if was pinching (2+ fingers were involved)
      if (isPinchingRef.current) return;

      const now = Date.now();
      const touch = e.changedTouches[0];
      if (!touch) return;

      const tapX = touch.clientX;
      const tapY = touch.clientY;
      const container = containerRef.current;
      const videoEl = videoRef.current;

      if (!container || !videoEl) return;

      const rect = container.getBoundingClientRect();
      const relativeX = tapX - rect.left;
      const screenWidth = rect.width;

      // Use halves for skip, but center third for zoom reset when zoomed
      const isLeftHalf = relativeX < screenWidth / 2;
      const isCenter = relativeX > screenWidth / 3 && relativeX < (screenWidth * 2) / 3;

      const DOUBLE_TAP_DELAY = 300; // ms

      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        // Clear single tap timeout to prevent play/pause toggle
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
        }

        // Double tap detected
        // If zoomed in and double tap center, reset zoom instead of skip
        if (videoScale > 1 && isCenter) {
          resetZoom();
          lastTapRef.current = 0;
          return;
        }

        const skipSeconds = 10;

        if (isLeftHalf) {
          // Skip backward (left half of screen)
          videoEl.currentTime = Math.max(0, videoEl.currentTime - skipSeconds);
          setSkipAnimation({
            show: true,
            direction: 'left',
            x: relativeX,
            y: tapY - rect.top,
          });
        } else {
          // Skip forward (right half of screen, respect canSkipAhead)
          const newTime = Math.min(duration, videoEl.currentTime + skipSeconds);
          if (
            progress.canSkipAhead ||
            newTime <= (progress.watchPercentage / 100) * duration + 30
          ) {
            videoEl.currentTime = newTime;
            setSkipAnimation({
              show: true,
              direction: 'right',
              x: relativeX,
              y: tapY - rect.top,
            });
          }
        }

        // Hide animation after delay
        setTimeout(() => {
          setSkipAnimation(null);
        }, 500);

        lastTapRef.current = 0; // Reset to prevent triple-tap issues
      } else {
        // First tap - wait to see if it's a double tap
        lastTapRef.current = now;
        lastTapXRef.current = tapX;

        // Set timeout to handle single tap (show controls or toggle play)
        tapTimeoutRef.current = setTimeout(() => {
          setShowControls(true);
          tapTimeoutRef.current = null;
        }, DOUBLE_TAP_DELAY);
      }
    },
    [isMobile, duration, progress.canSkipAhead, progress.watchPercentage, videoScale, resetZoom]
  );

  // Handle video tap (for single tap play/pause on mobile)
  const handleVideoTap = useCallback(
    (_e: React.MouseEvent<HTMLVideoElement>) => {
      // On mobile, single tap is handled by double-tap logic
      if (isMobile) return;
      togglePlay();
    },
    [isMobile]
  );

  // Open bookmark modal
  const handleAddBookmark = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    setBookmarkTimestamp(Math.floor(videoEl.currentTime));
    setBookmarkTitle(`Bookmark at ${formatTime(videoEl.currentTime)}`);
    setBookmarkDescription('');
    setShowBookmarkModal(true);
    videoEl.pause();
  };

  // Save bookmark
  const handleSaveBookmark = () => {
    onCreateBookmark(bookmarkTimestamp, bookmarkTitle, bookmarkDescription);
    setShowBookmarkModal(false);
    setBookmarkTitle('');
    setBookmarkDescription('');
  };

  // Jump to bookmark
  const handleJumpToBookmark = (timestamp: number) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    videoEl.currentTime = timestamp;
    setCurrentTime(timestamp);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const videoEl = videoRef.current;
      if (!videoEl) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowleft':
          e.preventDefault();
          videoEl.currentTime = Math.max(0, videoEl.currentTime - 10);
          // Show visual feedback for keyboard seek
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setSkipAnimation({
              show: true,
              direction: 'left',
              x: rect.width * 0.25,
              y: rect.height / 2,
            });
            setTimeout(() => setSkipAnimation(null), 500);
          }
          break;
        case 'arrowright':
          e.preventDefault();
          const newTime = Math.min(duration, videoEl.currentTime + 10);
          if (progress.canSkipAhead || newTime <= (progress.watchPercentage / 100) * duration + 30) {
            videoEl.currentTime = newTime;
            // Show visual feedback for keyboard seek
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              setSkipAnimation({
                show: true,
                direction: 'right',
                x: rect.width * 0.75,
                y: rect.height / 2,
              });
              setTimeout(() => setSkipAnimation(null), 500);
            }
          }
          break;
        case 'arrowup':
          e.preventDefault();
          videoEl.volume = Math.min(1, videoEl.volume + 0.1);
          setVolume(videoEl.volume);
          break;
        case 'arrowdown':
          e.preventDefault();
          videoEl.volume = Math.max(0, videoEl.volume - 0.1);
          setVolume(videoEl.volume);
          break;
        case 'b':
          e.preventDefault();
          handleAddBookmark();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, progress.canSkipAhead, progress.watchPercentage, togglePlay, toggleFullscreen, toggleMute, handleAddBookmark]);

  if (!video) {
    return (
      <div className={`${isMobile ? 'px-0 py-0' : 'px-6 py-6'}`}>
        <div className={`bg-gray-900 flex items-center justify-center ${
          isMobile ? 'min-h-[50vh] mx-0 rounded-none' : 'aspect-video rounded-xl max-w-3xl mx-auto'
        }`}>
          <div className="text-center text-white">
            <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg">No video available for this chapter</p>
          </div>
        </div>
      </div>
    );
  }

  if (!video.hlsMasterUrl) {
    return (
      <div className={`${isMobile ? 'px-0 py-0' : 'px-6 py-6'}`}>
        <div className={`bg-gray-900 flex items-center justify-center ${
          isMobile ? 'min-h-[50vh] mx-0 rounded-none' : 'aspect-video rounded-xl max-w-3xl mx-auto'
        }`}>
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
            <p className="text-lg">Video is being processed...</p>
            <p className="text-sm text-gray-400 mt-2">Please check back later</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if it's a YouTube video
  const youtubeVideoId = isYouTubeUrl(video.hlsMasterUrl) ? getYouTubeVideoId(video.hlsMasterUrl) : null;

  // Render YouTube embed
  if (youtubeVideoId) {
    return (
      <div className={`${isMobile ? 'px-0 py-0' : 'px-6 py-6'}`}>
        <div className={`relative bg-black overflow-hidden ${isMobile ? 'rounded-none' : 'rounded-xl max-w-3xl mx-auto'}`}>
          <iframe
            className={`w-full ${isMobile ? 'min-h-[50vh] max-h-screen' : 'aspect-video'}`}
            src={`https://www.youtube.com/embed/${youtubeVideoId}?rel=0&modestbranding=1&playsinline=1`}
            title="Video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
          />
        </div>
        <p className={`text-sm text-gray-500 mt-2 text-center ${isMobile ? 'px-4' : ''}`}>
          YouTube ვიდეო - პროგრესის თვალყურის დევნება მიუწვდომელია
        </p>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'px-0 py-0' : 'px-6 py-6'}`}>
      {/* Video Container */}
      <div
        ref={containerRef}
        className={`relative bg-black overflow-hidden group ${
          isMobile
            ? 'rounded-none w-full'
            : 'rounded-xl max-w-3xl mx-auto'
        } ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowControls(false)}
      >
        <video
          ref={videoRef}
          className={`w-full cursor-pointer transition-transform duration-100 ${
            isMobile
              ? 'min-h-[50vh] max-h-screen object-contain'
              : 'aspect-video'
          } ${isFullscreen ? 'h-full object-contain' : ''}`}
          style={isMobile && videoScale > 1 ? {
            transform: `scale(${videoScale}) translate(${videoTranslate.x / videoScale}px, ${videoTranslate.y / videoScale}px)`,
            transformOrigin: 'center center',
          } : undefined}
          onClick={handleVideoTap}
          playsInline
          webkit-playsinline="true"
          x-webkit-airplay="allow"
        />

        {/* Mobile Touch Overlay - handles pinch zoom and double tap */}
        {isMobile && (
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              touchAction: 'none',
              bottom: '70px', // Leave space for controls
            }}
            onTouchStart={handlePinchStart}
            onTouchMove={handlePinchMove}
            onTouchEnd={(e) => {
              handlePinchEnd();
              handleDoubleTap(e);
            }}
          />
        )}

        {/* Zoom Indicator */}
        {isMobile && videoScale > 1 && (
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={resetZoom}
              className="bg-black bg-opacity-60 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 backdrop-blur-sm"
            >
              <span>{videoScale.toFixed(1)}x</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Double-tap Skip Animation Overlay */}
        {skipAnimation && (
          <div
            className={`absolute pointer-events-none ${
              skipAnimation.direction === 'left' ? 'left-0' : 'right-0'
            } top-0 bottom-0 w-1/2 flex items-center justify-center animate-fade-in-out`}
          >
            <div className="flex flex-col items-center animate-bounce-in">
              <div className="w-16 h-16 rounded-full bg-white bg-opacity-30 flex items-center justify-center backdrop-blur-sm">
                {skipAnimation.direction === 'left' ? (
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                  </svg>
                )}
              </div>
              <span className="text-white text-lg font-bold mt-2 drop-shadow-lg">
                {skipAnimation.direction === 'left' ? '-10' : '+10'}
              </span>
            </div>
          </div>
        )}

        {/* Play/Pause Overlay */}
        {!isPlaying && !skipAnimation && (
          <div
            className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black bg-opacity-30"
            onClick={!isMobile ? togglePlay : undefined}
            onTouchEnd={isMobile ? (e) => {
              // On mobile, only toggle play on single tap in center area
              const touch = e.changedTouches[0];
              const container = containerRef.current;
              if (!container) return;
              const rect = container.getBoundingClientRect();
              const relativeX = touch.clientX - rect.left;
              const centerStart = rect.width * 0.33;
              const centerEnd = rect.width * 0.67;
              // Single tap in center area = play
              if (relativeX > centerStart && relativeX < centerEnd) {
                const now = Date.now();
                if (now - lastTapRef.current > 300) {
                  togglePlay();
                }
              }
            } : undefined}
          >
            <div className="w-20 h-20 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110">
              <svg className="w-10 h-10 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Bookmarks on timeline */}
        {bookmarks.length > 0 && duration > 0 && (
          <div className="absolute bottom-16 left-0 right-0 px-4">
            {bookmarks.map((bookmark) => (
              <button
                key={bookmark.id}
                onClick={() => handleJumpToBookmark(bookmark.timestamp || 0)}
                className="absolute w-3 h-3 bg-yellow-400 rounded-full transform -translate-x-1/2 hover:scale-125 transition-transform"
                style={{ left: `${((bookmark.timestamp || 0) / duration) * 100}%` }}
                title={bookmark.title}
              />
            ))}
          </div>
        )}

        {/* Controls */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent px-4 py-4 transition-opacity duration-300 ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Progress bar */}
          <div className="mb-3">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-thumb-indigo"
              style={{
                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`,
              }}
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
              {/* Play/Pause */}
              <button onClick={togglePlay} className="hover:text-primary-400 transition-colors">
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              {/* Volume */}
              <div className="flex items-center space-x-2 group/volume">
                <button onClick={toggleMute} className="hover:text-primary-400 transition-colors">
                  {isMuted || volume === 0 ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                      <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-0 group-hover/volume:w-20 transition-all duration-200 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Time */}
              <span className="text-sm tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {/* Add Bookmark */}
              <button
                onClick={handleAddBookmark}
                className="hover:text-yellow-400 transition-colors"
                title="Add Bookmark (B)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="hover:text-primary-400 transition-colors"
                title="Fullscreen (F)"
              >
                {isFullscreen ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M3.75 3.75a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5a.75.75 0 01.75-.75zm0 15a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75zm15-15a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5a.75.75 0 01.75-.75zm0 15a.75.75 0 01-.75-.75v-4.5a.75.75 0 011.5 0v4.5a.75.75 0 01-.75.75zm-15-15a.75.75 0 00-.75.75v4.5a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M15 3.75a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0V5.56l-3.97 3.97a.75.75 0 11-1.06-1.06l3.97-3.97h-2.69a.75.75 0 01-.75-.75zm-12 0A.75.75 0 013.75 3h4.5a.75.75 0 010 1.5H5.56l3.97 3.97a.75.75 0 01-1.06 1.06L4.5 5.56v2.69a.75.75 0 01-1.5 0v-4.5zm11.47 11.78a.75.75 0 111.06-1.06l3.97 3.97v-2.69a.75.75 0 011.5 0v4.5a.75.75 0 01-.75.75h-4.5a.75.75 0 010-1.5h2.69l-3.97-3.97zm-4.94-1.06a.75.75 0 010 1.06L5.56 19.5h2.69a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75v-4.5a.75.75 0 011.5 0v2.69l3.97-3.97a.75.75 0 011.06 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bookmarks List */}
      {bookmarks.length > 0 && (
        <div className={`mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden ${isMobile ? 'mx-4' : 'max-w-3xl mx-auto'}`}>
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-medium text-gray-900">Bookmarks</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {bookmarks.map((bookmark) => (
              <li key={bookmark.id}>
                <button
                  onClick={() => handleJumpToBookmark(bookmark.timestamp || 0)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center"
                >
                  <span className="text-sm font-medium text-primary-900 w-16">
                    {formatTime(bookmark.timestamp || 0)}
                  </span>
                  <span className="text-sm text-gray-900">{bookmark.title}</span>
                  {bookmark.description && (
                    <span className="text-sm text-gray-500 ml-2">- {bookmark.description}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bookmark Modal */}
      {showBookmarkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Bookmark</h3>
              <p className="text-sm text-gray-500 mt-1">at {formatTime(bookmarkTimestamp)}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={bookmarkTitle}
                  onChange={(e) => setBookmarkTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter bookmark title"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={bookmarkDescription}
                  onChange={(e) => setBookmarkDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="Add a note about this moment"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setShowBookmarkModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBookmark}
                disabled={!bookmarkTitle.trim()}
                className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Bookmark
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
