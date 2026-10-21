'use client';

import { useEffect } from 'react';

type TidioChatApi = { hide: () => void; show: () => void };

declare global {
  interface Window {
    tidioChatApi?: TidioChatApi;
  }
}

// Hides the Tidio chat widget (loaded in app/layout.tsx) while the calling page is mounted
export function useHideChatWidget() {
  useEffect(() => {
    const hide = () => window.tidioChatApi?.hide();

    // Widget is loaded lazily, so it may not be ready yet
    if (window.tidioChatApi) hide();
    document.addEventListener('tidioChat-ready', hide);

    return () => {
      document.removeEventListener('tidioChat-ready', hide);
      window.tidioChatApi?.show();
    };
  }, []);
}
