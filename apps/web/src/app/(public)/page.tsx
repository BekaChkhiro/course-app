'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '@/lib/api/publicApi';
import HeroSlider from '@/components/public/HeroSlider';
import InstructorsSection from '@/components/public/InstructorsSection';
import FAQSection from '@/components/public/FAQSection';

// Hero Section
const HeroSection = () => {
  return (
    <section className="relative bg-primary-900 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24 lg:py-32">
        <div className="text-center">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight">
            <span className="block">შეისწავლე ახალი უნარები</span>
            <span className="block text-primary-300 mt-1 sm:mt-2">განავითარე კარიერა</span>
          </h1>
          <p className="mt-4 sm:mt-6 max-w-2xl mx-auto text-sm sm:text-lg lg:text-xl text-primary-100 px-2">
            პროფესიონალური ონლაინ კურსები საუკეთესო ინსტრუქტორებისგან. დაიწყე სწავლა დღესვე და გახდი ექსპერტი შენს სფეროში.
          </p>
          <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4 sm:px-0">
            <Link
              href="/courses"
              className="inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-medium text-primary-900 bg-white rounded-xl hover:bg-primary-50 transition-all shadow-lg hover:shadow-xl"
            >
              კურსების ნახვა
              <svg className="ml-2 w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-medium text-white bg-accent-600 rounded-xl hover:bg-accent-700 transition-all border-2 border-primary-400"
            >
              უფასო რეგისტრაცია
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-10 sm:mt-16 lg:mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {[
            { value: '1,000+', label: 'სტუდენტი' },
            { value: '50+', label: 'კურსი' },
            { value: '20+', label: 'ინსტრუქტორი' },
            { value: '95%', label: 'კმაყოფილება' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">{stat.value}</div>
              <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm lg:text-base text-primary-100">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Popular Courses Section (Top 3 Grid)
const PopularCoursesSection = () => {
  const { data: featuredCourses, isLoading } = useQuery({
    queryKey: ['featured-courses'],
    queryFn: () => publicApi.getFeaturedCourses(3),
  });

  const displayedCourses = featuredCourses ?? [];

  return (
    <section className="py-10 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-6 sm:mb-8 lg:mb-10">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900">პოპულარული კურსები</h2>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg text-gray-600">ყველაზე მოთხოვნადი კურსები ჩვენს პლატფორმაზე</p>
          </div>
          <Link
            href="/courses"
            className="inline-flex items-center text-sm sm:text-base text-primary-900 hover:text-primary-800 font-medium"
          >
            ყველას ნახვა
            <svg className="ml-1 w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        ) : displayedCourses.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {displayedCourses.map((course: any) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-xl sm:rounded-2xl">
            <p className="text-sm sm:text-base text-gray-600">კურსები მალე დაემატება</p>
          </div>
        )}
      </div>
    </section>
  );
};

// Course Card Component with Hover Syllabus
const CourseCard = ({ course }: { course: any }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`bg-white overflow-hidden shadow-sm transition-all duration-300 rounded-xl sm:rounded-2xl ${isHovered ? 'sm:shadow-xl sm:rounded-t-2xl sm:rounded-b-none' : ''}`}>
        {/* Thumbnail */}
        <Link href={`/courses/${course.slug}`} className="block">
          <div className="relative h-40 sm:h-48 bg-gray-200 overflow-hidden">
            {course.thumbnail ? (
              <Image
                src={course.thumbnail}
                alt={course.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-primary-900 flex items-center justify-center">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            )}
            {course.category && (
              <span className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-white/90 backdrop-blur-sm px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium text-gray-700">
                {course.category.name}
              </span>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="p-3 sm:p-5 flex flex-col">
          <Link href={`/courses/${course.slug}`}>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-primary-900 transition-colors line-clamp-2 min-h-[44px] sm:min-h-[56px]">
              {course.title}
            </h3>
          </Link>
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-600 line-clamp-2 min-h-[32px] sm:min-h-[40px]">{course.shortDescription || '\u00A0'}</p>
          <div className="mt-3 sm:mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                {course.averageRating?.toFixed(1) || '0.0'}
              </span>
              <span className="text-xs sm:text-sm text-gray-500">({course.reviewCount || 0})</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-primary-900">
              {course.price === 0 ? 'უფასო' : `${course.price} ₾`}
            </div>
          </div>

          {/* Mobile Buy Button - always visible on mobile */}
          <Link
            href={`/courses/${course.slug}`}
            className="mt-3 sm:hidden block w-full py-2.5 px-4 bg-accent-600 hover:bg-accent-700 text-white text-center text-sm font-semibold rounded-lg transition-colors"
          >
            {course.price === 0 ? 'უფასოდ დაწყება' : `ყიდვა - ${course.price} ₾`}
          </Link>
        </div>
      </div>

      {/* Hover Dropdown - Desktop only */}
      <div
        className={`hidden sm:block absolute left-0 right-0 top-full z-50 bg-white rounded-b-2xl shadow-xl overflow-hidden transition-all duration-300 ease-out ${
          isHovered ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-2 invisible pointer-events-none'
        }`}
      >
        {/* Syllabus */}
        {course.previewChapters && course.previewChapters.length > 0 && (
          <div className="p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              სილაბუსი
            </h4>
            <ul className="space-y-2">
              {course.previewChapters.map((chapter: any, index: number) => (
                <li key={chapter.id} className="flex items-center text-sm text-gray-600">
                  <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center mr-2 flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="line-clamp-1">{chapter.title}</span>
                </li>
              ))}
            </ul>
            {course.chapterCount > 4 && (
              <p className="mt-2 text-xs text-gray-500">
                + კიდევ {course.chapterCount - 4} თავი
              </p>
            )}
          </div>
        )}

        {/* Buy Button */}
        <div className="p-4 pt-0">
          <Link
            href={`/courses/${course.slug}`}
            className="block w-full py-3 px-4 bg-accent-600 hover:bg-accent-700 text-white text-center font-semibold rounded-xl transition-colors"
          >
            {course.price === 0 ? 'უფასოდ დაწყება' : `ყიდვა - ${course.price} ₾`}
          </Link>
        </div>
      </div>
    </div>
  );
};

// Slider Skeleton for loading state
const SliderSkeleton = () => (
  <section className="w-full py-6">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="aspect-[2/1] sm:aspect-[16/9] lg:aspect-[3/1] relative rounded-xl sm:rounded-2xl overflow-hidden bg-gray-200 animate-pulse" />
    </div>
  </section>
);

// Main Page Component
export default function HomePage() {
  // Fetch hero slides
  const { data: slides, isLoading } = useQuery({
    queryKey: ['hero-slides'],
    queryFn: publicApi.getSliders,
  });

  return (
    <>
      {/* Show skeleton while loading, slider if slides exist, otherwise HeroSection */}
      {isLoading ? (
        <SliderSkeleton />
      ) : slides && slides.length > 0 ? (
        <HeroSlider slides={slides} />
      ) : (
        <HeroSection />
      )}
      <PopularCoursesSection />
      <InstructorsSection />
      <FAQSection />
    </>
  );
}
