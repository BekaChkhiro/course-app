'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  FolderTree,
  Menu,
  X,
  LogOut,
  BarChart3,
  ChevronDown,
  HelpCircle,
  Images,
  UserCircle,
  Star,
  MessageSquare,
  Film,
  Settings,
  Users,
  FileText,
  UsersRound,
  Globe,
  Cog,
  RefreshCcw,
  Smartphone,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Toast from '../ui/Toast';
import { useAuthStore } from '@/store/authStore';
import { PageLoader } from '../ui/LoadingSpinner';

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

interface NavCategory {
  name: string;
  icon: any;
  items: NavItem[];
}

// Standalone items (no category)
const standaloneItems: NavItem[] = [
  { name: 'მთავარი', href: '/admin', icon: LayoutDashboard },
];

// Categorized navigation
const navigationCategories: NavCategory[] = [
  {
    name: 'კონტენტი',
    icon: FileText,
    items: [
      { name: 'კურსები', href: '/admin/courses', icon: BookOpen },
      { name: 'კატეგორიები', href: '/admin/categories', icon: FolderTree },
      { name: 'მედია', href: '/admin/media', icon: Film },
      { name: 'ლექტორები', href: '/admin/instructors', icon: UserCircle },
    ],
  },
  {
    name: 'მომხმარებლები',
    icon: UsersRound,
    items: [
      { name: 'სტუდენტები', href: '/admin/students', icon: Users },
      { name: 'შეფასებები', href: '/admin/reviews', icon: Star },
      { name: 'შეტყობინებები', href: '/admin/messages', icon: MessageSquare },
      { name: 'დაბრუნებები', href: '/admin/refunds', icon: RefreshCcw },
      { name: 'პრომო კოდები', href: '/admin/promo-codes', icon: Tag },
    ],
  },
  {
    name: 'საიტი',
    icon: Globe,
    items: [
      { name: 'პარამეტრები', href: '/admin/site-settings', icon: Settings },
      { name: 'გვერდები', href: '/admin/pages', icon: FileText },
      { name: 'FAQ', href: '/admin/faqs', icon: HelpCircle },
      { name: 'სლაიდერი', href: '/admin/sliders', icon: Images },
    ],
  },
  {
    name: 'სისტემა',
    icon: Cog,
    items: [
      { name: 'ანალიტიკა', href: '/admin/analytics', icon: BarChart3 },
      { name: 'მოწყობილობები', href: '/admin/devices', icon: Smartphone },
      { name: 'პარამეტრები', href: '/admin/settings', icon: Settings },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const pathname = usePathname();
  const router = useRouter();

  // Auto-expand category containing active item
  useEffect(() => {
    const activeCategory = navigationCategories.find((category) =>
      category.items.some(
        (item) => pathname === item.href || pathname?.startsWith(item.href + '/')
      )
    );
    if (activeCategory && !expandedMenus.includes(activeCategory.name)) {
      setExpandedMenus((prev) => [...prev, activeCategory.name]);
    }
  }, [pathname]);

  const toggleMenu = (name: string) => {
    setExpandedMenus((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };
  const { user, isAuthenticated, fetchProfile, logout } = useAuthStore();

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');

      if (!token) {
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
          'fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-lg',
          'transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <Link href="/" className="flex items-center">
            <Image
              src="/kursebi-logo.png"
              alt="Kursebi Online"
              width={150}
              height={38}
              className="h-9 w-auto"
            />
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
          {/* Standalone items (Dashboard) */}
          {standaloneItems.map((item) => {
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
                    ? 'bg-primary-50 text-primary-900'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}

          {/* Categorized navigation */}
          {navigationCategories.map((category) => {
            const CategoryIcon = category.icon;
            const isExpanded = expandedMenus.includes(category.name);
            // Check if any item in category is active
            const hasActiveItem = category.items.some(
              (item) => pathname === item.href || pathname?.startsWith(item.href + '/')
            );

            return (
              <div key={category.name} className="pt-2">
                <button
                  onClick={() => toggleMenu(category.name)}
                  className={cn(
                    'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    hasActiveItem
                      ? 'bg-primary-50 text-primary-900'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon className="w-5 h-5" />
                    {category.name}
                  </div>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 transition-transform duration-200',
                      isExpanded ? 'rotate-180' : ''
                    )}
                  />
                </button>
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-200',
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-gray-200 pl-3">
                    {category.items.map((item) => {
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                            isActive
                              ? 'bg-primary-100 text-primary-900 font-medium'
                              : 'text-gray-600 hover:bg-gray-100'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t p-4">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              {user?.avatar ? (
                <img
                  className="h-10 w-10 rounded-full object-cover"
                  src={user.avatar}
                  alt={user.name}
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-900 font-medium text-sm">
                    {user?.name?.charAt(0)}{user?.surname?.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name} {user?.surname}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            გასვლა
          </button>
        </div>
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
