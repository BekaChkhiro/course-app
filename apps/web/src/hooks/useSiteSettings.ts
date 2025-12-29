'use client';

import { useQuery } from '@tanstack/react-query';
import { publicApi } from '@/lib/api/publicApi';

export interface SiteSettings {
  email: string;
  phone: string;
  whatsappNumber: string;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
}

const DEFAULT_SETTINGS: SiteSettings = {
  email: 'info@kursebi.online',
  phone: '+995 596 89 91 91',
  whatsappNumber: '995596899191',
  facebookUrl: 'https://www.facebook.com/share/1BshHTH1D8/?mibextid=wwXIfr',
  instagramUrl: 'https://www.instagram.com/kursebi.online?igsh=OW83M3UzZWE5aHkw&utm_source=qr',
  tiktokUrl: 'https://www.tiktok.com/@officeskillsacademy?_r=1&_t=ZS-92GSAdJuWIf',
};

export function useSiteSettings() {
  return useQuery({
    queryKey: ['site-settings-public'],
    queryFn: () => publicApi.getSiteSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: DEFAULT_SETTINGS,
  });
}

export function usePageContent(slug: string) {
  return useQuery({
    queryKey: ['page-content', slug],
    queryFn: () => publicApi.getPageContent(slug),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
