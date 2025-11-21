import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for Next.js routes
 *
 * Note: This middleware primarily handles server-side concerns.
 * Admin authentication/authorization is handled client-side in AdminLayout
 * because tokens are stored in localStorage (not accessible in middleware).
 */
export function middleware(request: NextRequest) {
  // Currently passing through all requests
  // Client-side protection is handled in AdminLayout component
  return NextResponse.next();
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    '/admin/:path*',
  ],
};
