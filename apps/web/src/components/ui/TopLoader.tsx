'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

// Configure NProgress
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.1,
});

export default function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  useEffect(() => {
    // Handle route change start
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor) {
        const href = anchor.getAttribute('href');
        const targetAttr = anchor.getAttribute('target');

        // Don't show loader for external links, hash links, or new tab links
        if (
          href &&
          !href.startsWith('#') &&
          !href.startsWith('mailto:') &&
          !href.startsWith('tel:') &&
          !href.startsWith('http') &&
          targetAttr !== '_blank'
        ) {
          // Check if it's a different page
          const currentPath = window.location.pathname;
          const newPath = href.split('?')[0].split('#')[0];

          if (currentPath !== newPath) {
            NProgress.start();
          }
        }
      }
    };

    // Handle browser back/forward buttons
    const handlePopState = () => {
      NProgress.start();
    };

    document.addEventListener('click', handleAnchorClick);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleAnchorClick);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return null;
}
