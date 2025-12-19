'use client';

import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, BookOpen, User } from 'lucide-react';
import { publicApi } from '@/lib/api/publicApi';

type Instructor = {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  profession: string;
  avatar: string | null;
  courseCount: number;
};

function InstructorCard({ instructor }: { instructor: Instructor }) {
  return (
    <Link
      href={`/instructors/${instructor.slug}`}
      className="group flex-shrink-0 w-64 bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
    >
      {/* Avatar */}
      <div className="relative h-64 bg-gray-100 overflow-hidden">
        {instructor.avatar ? (
          <Image
            src={instructor.avatar}
            alt={`${instructor.firstName} ${instructor.lastName}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary-100">
            <User className="w-20 h-20 text-primary-300" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 text-center">
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-900 transition-colors">
          {instructor.firstName} {instructor.lastName}
        </h3>
        <p className="mt-1 text-sm text-primary-600 font-medium">{instructor.profession}</p>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-sm text-gray-500">
          <BookOpen className="w-4 h-4" />
          <span>{instructor.courseCount} კურსი</span>
        </div>
      </div>
    </Link>
  );
}

export default function InstructorsSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: instructors, isLoading } = useQuery({
    queryKey: ['homepage-instructors'],
    queryFn: publicApi.getInstructors,
  });

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 280; // card width + gap
      const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      scrollContainerRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="h-10 bg-gray-200 rounded w-64 mx-auto animate-pulse" />
            <div className="h-6 bg-gray-200 rounded w-96 mx-auto mt-4 animate-pulse" />
          </div>
          <div className="flex gap-6 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-64 bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-64 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!instructors || instructors.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
          <div className="text-center sm:text-left">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">ჩვენი ლექტორები</h2>
            <p className="mt-2 text-lg text-gray-600">გამოცდილი პროფესიონალები შენი განვითარებისთვის</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                className="p-2 rounded-full bg-white shadow-sm hover:shadow-md transition-shadow text-gray-600 hover:text-primary-900"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-2 rounded-full bg-white shadow-sm hover:shadow-md transition-shadow text-gray-600 hover:text-primary-900"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <Link
              href="/instructors"
              className="inline-flex items-center text-primary-900 hover:text-primary-800 font-medium"
            >
              ყველას ნახვა
              <ChevronRight className="w-5 h-5 ml-1" />
            </Link>
          </div>
        </div>

        {/* Carousel */}
        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {instructors.map((instructor: Instructor) => (
            <div key={instructor.id} className="snap-start">
              <InstructorCard instructor={instructor} />
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
