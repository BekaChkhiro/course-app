'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, Suspense } from 'react';
import TopLoader from '@/components/ui/TopLoader';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <TopLoader />
      </Suspense>
      {children}
    </QueryClientProvider>
  );
}
