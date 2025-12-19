'use client';

import { useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, BookOpen, User, Mail, Facebook, Linkedin, ArrowRight } from 'lucide-react';
import { publicApi } from '@/lib/api/publicApi';

type Instructor = {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  profession: string;
  bio: string | null;
  avatar: string | null;
  email: string | null;
  facebook: string | null;
  linkedin: string | null;
  courseCount: number;
};

function InstructorCard({ instructor }: { instructor: Instructor }) {
  return (
    <div className="group flex-shrink-0 w-80 bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100">
      {/* Top Section - Avatar & Basic Info */}
      <div className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 pt-8 pb-16 px-6">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* Avatar */}
        <div className="relative mx-auto w-28 h-28 rounded-full overflow-hidden ring-4 ring-white/20 group-hover:ring-white/40 transition-all duration-300 shadow-xl">
          {instructor.avatar ? (
            <Image
              src={instructor.avatar}
              alt={`${instructor.firstName} ${instructor.lastName}`}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary-700">
              <User className="w-14 h-14 text-primary-300" />
            </div>
          )}
        </div>

        {/* Name & Profession */}
        <div className="mt-5 text-center relative z-10">
          <h3 className="text-xl font-bold text-white group-hover:text-primary-100 transition-colors">
            {instructor.firstName} {instructor.lastName}
          </h3>
          <p className="mt-1 text-primary-200 font-medium text-sm">{instructor.profession}</p>
        </div>

        {/* Course Badge */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-accent-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" />
          {instructor.courseCount} კურსი
        </div>
      </div>

      {/* Bottom Section - Bio & Social */}
      <div className="pt-8 pb-6 px-6">
        {/* Bio */}
        {instructor.bio ? (
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 min-h-[60px]">
            {instructor.bio}
          </p>
        ) : (
          <p className="text-gray-400 text-sm italic min-h-[60px]">
            გამოცდილი ლექტორი პროფესიონალური გამოცდილებით
          </p>
        )}

        {/* Divider */}
        <div className="my-5 border-t border-gray-100" />

        {/* Social Links & CTA */}
        <div className="flex items-center justify-between">
          {/* Social Icons */}
          <div className="flex items-center gap-2">
            {instructor.email && (
              <a
                href={`mailto:${instructor.email}`}
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-primary-100 hover:text-primary-700 transition-colors"
                title="ელ-ფოსტა"
              >
                <Mail className="w-4 h-4" />
              </a>
            )}
            {instructor.facebook && (
              <a
                href={instructor.facebook}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                title="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
            )}
            {instructor.linkedin && (
              <a
                href={instructor.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 hover:text-sky-700 transition-colors"
                title="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            )}
            {!instructor.email && !instructor.facebook && !instructor.linkedin && (
              <span className="text-xs text-gray-400">სოციალური ბმულები არ არის</span>
            )}
          </div>

          {/* View Profile Button */}
          <Link
            href={`/instructors/${instructor.slug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-800 group/link transition-colors"
          >
            პროფილი
            <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function InstructorsSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { data: instructors, isLoading } = useQuery({
    queryKey: ['homepage-instructors'],
    queryFn: publicApi.getInstructors,
  });

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      return () => container.removeEventListener('scroll', checkScrollButtons);
    }
  }, [instructors]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 340; // card width + gap
      const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      scrollContainerRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="h-10 bg-gray-200 rounded-lg w-72 mx-auto animate-pulse" />
            <div className="h-6 bg-gray-200 rounded-lg w-96 mx-auto mt-4 animate-pulse" />
          </div>
          <div className="flex gap-8 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-80 bg-white rounded-3xl overflow-hidden animate-pulse shadow-lg">
                <div className="h-52 bg-gray-200" />
                <div className="p-6 space-y-4">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mx-auto" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
                  <div className="h-16 bg-gray-100 rounded" />
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
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary-100/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-100/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-16">
          <div>
            <span className="inline-block px-4 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold mb-4">
              გუნდი
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
              ჩვენი <span className="text-primary-600">ლექტორები</span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-xl">
              გამოცდილი პროფესიონალები, რომლებიც დაგეხმარებიან პროფესიული უნარების ათვისებაში
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Navigation Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className={`p-3 rounded-full transition-all duration-300 ${
                  canScrollLeft
                    ? 'bg-white shadow-lg hover:shadow-xl text-gray-700 hover:text-primary-600 hover:bg-primary-50'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className={`p-3 rounded-full transition-all duration-300 ${
                  canScrollRight
                    ? 'bg-white shadow-lg hover:shadow-xl text-gray-700 hover:text-primary-600 hover:bg-primary-50'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* View All Link */}
            <Link
              href="/instructors"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-full font-semibold hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl"
            >
              ყველას ნახვა
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Carousel */}
        <div
          ref={scrollContainerRef}
          className="flex gap-8 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {instructors.map((instructor: Instructor) => (
            <div key={instructor.id} className="snap-start">
              <InstructorCard instructor={instructor} />
            </div>
          ))}
        </div>

        {/* Mobile Scroll Indicator */}
        <div className="flex justify-center mt-6 md:hidden">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ChevronLeft className="w-4 h-4" />
            <span>გადაათრიეთ სანახავად</span>
            <ChevronRight className="w-4 h-4" />
          </div>
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
