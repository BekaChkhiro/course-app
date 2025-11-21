'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  FolderTree,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Toast from '../ui/Toast';
import { useAuthStore } from '@/store/authStore';
import { PageLoader } from '../ui/LoadingSpinner';

const navigation = [
  { name: 'მთავარი', href: '/admin', icon: LayoutDashboard },
  { name: 'კურსები', href: '/admin/courses', icon: BookOpen },
  { name: 'კატეგორიები', href: '/admin/categories', icon: FolderTree }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, fetchProfile, logout } = useAuthStore();

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        // No token, redirect to login
        router.push(`/auth/login?redirect=${pathname}`);
        return;
      }

      // Fetch user profile if not already loaded
      if (!user) {
        await fetchProfile();
      }

      setIsChecking(false);
    };

    checkAuth();
  }, []);

  // Check if user has admin role
  useEffect(() => {
    if (!isChecking && user) {
      if (user.role !== 'ADMIN') {
        // User is authenticated but not admin, redirect to home or show error
        router.push('/');
        return;
      }
    }
  }, [isChecking, user, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  // Show loader while checking authentication
  if (isChecking) {
    return <PageLoader />;
  }

  // Don't render admin layout if not authenticated or not admin
  if (!isAuthenticated || !user || user.role !== 'ADMIN') {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200',
          'transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <Link href="/admin" className="text-xl font-bold text-gray-900">
            ადმინ პანელი
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            // Fix active state: Dashboard only active on exact match, others on prefix match
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            გასვლა
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-full px-4 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 lg:ml-0" />

            <div className="flex items-center gap-4">
              {/* Notifications, profile, etc. can go here */}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
