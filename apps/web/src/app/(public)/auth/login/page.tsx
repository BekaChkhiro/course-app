'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
    clearError();
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'ელ-ფოსტა აუცილებელია';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'არასწორი ელ-ფოსტის ფორმატი';
    }

    if (!formData.password) {
      errors.password = 'პაროლი აუცილებელია';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      await login(formData);

      const { user } = useAuthStore.getState();

      if (user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-400/20 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <div className="max-w-md text-center">
            {/* Logo/Icon */}
            <div className="mb-8">
              <Image
                src="/kursebi-logo.png"
                alt="Kursebi Online"
                width={220}
                height={55}
                className="h-14 w-auto brightness-0 invert mx-auto"
              />
            </div>

            <h1 className="text-4xl font-bold mb-4">
              კეთილი იყოს შენი მობრძანება
            </h1>
            <p className="text-lg text-primary-100 mb-8">
              შემოგვიერთდი და აღმოაჩინე საუკეთესო კურსები შენი განვითარებისთვის
            </p>

            {/* Features */}
            <div className="space-y-4 text-left">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-primary-100">100+ პროფესიონალური კურსი</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-primary-100">გამოცდილი ინსტრუქტორები</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-primary-100">სერტიფიკატი დასრულების შემდეგ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Image
              src="/kursebi-logo.png"
              alt="Kursebi Online"
              width={180}
              height={45}
              className="h-12 w-auto mx-auto"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                შესვლა ანგარიშში
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                ჯერ არ გაქვს ანგარიში?{' '}
                <Link
                  href="/auth/register"
                  className="font-semibold text-primary-900 hover:text-primary-500 transition-colors"
                >
                  რეგისტრაცია
                </Link>
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    ელ-ფოსტა
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className={`block w-full pl-10 pr-4 py-3 border ${formErrors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-primary-500 focus:border-primary-500'} rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors`}
                      placeholder="example@email.com"
                    />
                  </div>
                  {formErrors.email && (
                    <p className="mt-1.5 text-sm text-red-600">{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    პაროლი
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className={`block w-full pl-10 pr-4 py-3 border ${formErrors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-primary-500 focus:border-primary-500'} rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors`}
                      placeholder="შეიყვანე პაროლი"
                    />
                  </div>
                  {formErrors.password && (
                    <p className="mt-1.5 text-sm text-red-600">{formErrors.password}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary-900 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    დამახსოვრება
                  </span>
                </label>

                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-medium text-primary-900 hover:text-primary-500 transition-colors"
                >
                  დაგავიწყდა პაროლი?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-accent-500 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-accent-500/25"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    იტვირთება...
                  </>
                ) : (
                  <>
                    შესვლა
                    <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-gray-500">
            შესვლით ეთანხმები ჩვენს{' '}
            <Link href="/terms" className="text-primary-900 hover:text-primary-500">
              წესებს
            </Link>{' '}
            და{' '}
            <Link href="/privacy" className="text-primary-900 hover:text-primary-500">
              კონფიდენციალურობის პოლიტიკას
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
