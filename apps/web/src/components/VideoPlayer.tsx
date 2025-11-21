'use client';

import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import Player from 'video.js/dist/types/player';

interface VideoPlayerProps {
  videoId: string;
  chapterId: string;
  onProgressUpdate?: (progress: {
    currentPosition: number;
    totalDuration: number;
    watchPercentage: number;
  }) => void;
  onComplete?: () => void;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoId,
  chapterId,
  onProgressUpdate,
  onComplete,
  className = '',
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [lastPosition, setLastPosition] = useState<number>(0);
  const [canSkipAhead, setCanSkipAhead] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionId = useRef<string>(`session_${Date.now()}_${Math.random()}`);

  // Fetch access token and video URL
  useEffect(() => {
    const fetchVideoAccess = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get saved progress first
        const progressRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/progress/chapters/${chapterId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
          }
        );

        if (progressRes.ok) {
          const progressData = await progressRes.json();
          if (progressData.success) {
            setLastPosition(progressData.data.lastPosition || 0);
            setCanSkipAhead(progressData.data.canSkipAhead || false);
          }
        }

        // Get video access token
        const tokenRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/videos/${videoId}/access-token`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
          }
        );

        if (!tokenRes.ok) {
          throw new Error('Failed to get video access token');
        }

        const tokenData = await tokenRes.json();
        if (tokenData.success) {
          setAccessToken(tokenData.data.token);
          setHlsUrl(tokenData.data.hlsMasterUrl);
        } else {
          throw new Error(tokenData.message || 'Failed to get video access');
        }
      } catch (err) {
        console.error('Error fetching video access:', err);
        setError(err instanceof Error ? err.message : 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchVideoAccess();
  }, [videoId, chapterId]);

  // Initialize Video.js player
  useEffect(() => {
    if (!videoRef.current || !hlsUrl || !accessToken) return;

    // Video.js options with Georgian UI
    const options = {
      controls: true,
      responsive: true,
      fluid: true,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      controlBar: {
        children: [
          'playToggle',
          'volumePanel',
          'currentTimeDisplay',
          'timeDivider',
          'durationDisplay',
          'progressControl',
          'remainingTimeDisplay',
          'playbackRateMenuButton',
          'pictureInPictureToggle',
          'fullscreenToggle',
        ],
      },
      html5: {
        vhs: {
          overrideNative: true,
        },
        nativeVideoTracks: false,
        nativeAudioTracks: false,
        nativeTextTracks: false,
      },
    };

    // Initialize player
    const player = videojs(videoRef.current.querySelector('video')!, options);
    playerRef.current = player;

    // Set HLS source
    player.src({
      src: `${hlsUrl}?token=${accessToken}`,
      type: 'application/x-mpegURL',
    });

    // Resume from last position
    if (lastPosition > 0) {
      player.one('loadedmetadata', () => {
        player.currentTime(lastPosition);
      });
    }

    // Disable seeking ahead on first watch
    if (!canSkipAhead) {
      let highestPosition = lastPosition;

      player.on('timeupdate', () => {
        const currentTime = player.currentTime();
        if (currentTime > highestPosition) {
          highestPosition = currentTime;
        }
      });

      player.on('seeking', () => {
        const currentTime = player.currentTime();
        if (currentTime > highestPosition + 2) {
          // Allow 2 second buffer
          player.currentTime(highestPosition);
          showNotification('თავიდან უნდა ნახოთ ვიდეო სრულად სკიპის გარეშე');
        }
      });
    }

    // Auto-pause when tab loses focus
    const handleVisibilityChange = () => {
      if (document.hidden && !player.paused()) {
        player.pause();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (player.paused()) {
            player.play();
          } else {
            player.pause();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          player.currentTime(Math.max(0, player.currentTime() - 5));
          break;
        case 'ArrowRight':
          e.preventDefault();
          player.currentTime(Math.min(player.duration(), player.currentTime() + 5));
          break;
        case 'ArrowUp':
          e.preventDefault();
          player.volume(Math.min(1, player.volume() + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          player.volume(Math.max(0, player.volume() - 0.1));
          break;
        case 'f':
          e.preventDefault();
          if (player.isFullscreen()) {
            player.exitFullscreen();
          } else {
            player.requestFullscreen();
          }
          break;
        case 'm':
          e.preventDefault();
          player.muted(!player.muted());
          break;
      }
    };
    document.addEventListener('keydown', handleKeyPress);

    // Track progress every 30 seconds
    progressIntervalRef.current = setInterval(() => {
      if (!player.paused() && !player.ended()) {
        const currentPosition = player.currentTime();
        const totalDuration = player.duration();
        const watchPercentage = (currentPosition / totalDuration) * 100;

        // Send progress to backend
        updateProgress(currentPosition, totalDuration, watchPercentage);

        // Call callback
        if (onProgressUpdate) {
          onProgressUpdate({
            currentPosition,
            totalDuration,
            watchPercentage,
          });
        }

        // Check if completed (90% threshold)
        if (watchPercentage >= 90 && onComplete) {
          onComplete();
        }
      }
    }, 30000); // Every 30 seconds

    // Track when video ends
    player.on('ended', () => {
      const totalDuration = player.duration();
      updateProgress(totalDuration, totalDuration, 100);
      if (onComplete) {
        onComplete();
      }
    });

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyPress);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [hlsUrl, accessToken, lastPosition, canSkipAhead]);

  // Update progress function
  const updateProgress = async (
    currentPosition: number,
    totalDuration: number,
    watchPercentage: number
  ) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/progress/chapters/${chapterId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({
            currentPosition,
            totalDuration,
            watchPercentage,
          }),
        }
      );

      // Track analytics
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/videos/${videoId}/analytics`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({
            sessionId: sessionId.current,
            watchDuration: Math.floor(currentPosition),
            completionRate: watchPercentage,
          }),
        }
      );
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  // Show notification
  const showNotification = (message: string) => {
    // You can replace this with a proper toast notification
    alert(message);
  };

  // Prevent right-click and context menu
  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const videoElement = videoRef.current?.querySelector('video');
    if (videoElement) {
      videoElement.addEventListener('contextmenu', preventContextMenu);
      return () => {
        videoElement.removeEventListener('contextmenu', preventContextMenu);
      };
    }
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 rounded-lg ${className}`}>
        <div className="text-white">იტვირთება...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 rounded-lg p-8 ${className}`}>
        <div className="text-center">
          <p className="text-red-500 mb-2">შეცდომა</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={videoRef} className={className} data-vjs-player>
      <video className="video-js vjs-big-play-centered" />

      <style jsx global>{`
        .video-js .vjs-control-bar {
          background-color: rgba(0, 0, 0, 0.7);
        }

        .video-js .vjs-big-play-button {
          border-color: #3b82f6;
          background-color: rgba(59, 130, 246, 0.8);
        }

        .video-js .vjs-big-play-button:hover {
          background-color: rgba(59, 130, 246, 1);
        }

        .video-js .vjs-play-progress {
          background-color: #3b82f6;
        }

        .video-js .vjs-volume-level {
          background-color: #3b82f6;
        }

        /* Disable text selection on video */
        .video-js {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
      `}</style>
    </div>
  );
};

export default VideoPlayer;
