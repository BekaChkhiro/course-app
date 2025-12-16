'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuthStore();

  const navigation = [
    { name: 'მთავარი', href: '/' },
    { name: 'კურსები', href: '/courses' },
    { name: 'გახდი ინსტრუქტორი', href: '/submit-course' },
    { name: 'ჩვენ შესახებ', href: '/about' },
    { name: 'კონტაქტი', href: '/contact' },
  ];

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/kursebi-logo.png"
                alt="Kursebi Online"
                width={180}
                height={45}
                className="h-10 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-base font-medium text-gray-600 hover:text-primary-900 transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {isAuthenticated ? (
              <Link
                href={user?.role === 'ADMIN' ? '/admin' : '/dashboard'}
                className="inline-flex items-center justify-center px-4 py-2 text-base font-medium text-white bg-accent-600 hover:bg-accent-700 rounded-lg transition-colors"
              >
                პანელი
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-base font-medium text-gray-600 hover:text-primary-900 transition-colors"
                >
                  შესვლა
                </Link>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center px-4 py-2 text-base font-medium text-white bg-accent-600 hover:bg-accent-700 rounded-lg transition-colors"
                >
                  რეგისტრაცია
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-base font-medium text-gray-600 hover:text-primary-900 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                {isAuthenticated ? (
                  <Link
                    href={user?.role === 'ADMIN' ? '/admin' : '/dashboard'}
                    className="block w-full text-center px-4 py-2 text-base font-medium text-white bg-accent-600 hover:bg-accent-700 rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    პანელი
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="block text-center text-base font-medium text-gray-600 hover:text-primary-900 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      შესვლა
                    </Link>
                    <Link
                      href="/auth/register"
                      className="block w-full text-center px-4 py-2 text-base font-medium text-white bg-accent-600 hover:bg-accent-700 rounded-lg transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      რეგისტრაცია
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
