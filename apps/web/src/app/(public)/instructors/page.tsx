'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Mail, Facebook, Linkedin, User } from 'lucide-react';
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
    <Link
      href={`/instructors/${instructor.slug}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
    >
      {/* Avatar */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {instructor.avatar ? (
          <Image
            src={instructor.avatar}
            alt={`${instructor.firstName} ${instructor.lastName}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary-100">
            <User className="w-24 h-24 text-primary-300" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-900 transition-colors">
          {instructor.firstName} {instructor.lastName}
        </h3>
        <p className="mt-1 text-primary-600 font-medium">{instructor.profession}</p>

        {instructor.bio && (
          <p className="mt-3 text-sm text-gray-600 line-clamp-2">{instructor.bio}</p>
        )}

        {/* Stats & Social */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <BookOpen className="w-4 h-4" />
            <span>{instructor.courseCount} კურსი</span>
          </div>

          <div className="flex items-center gap-2">
            {instructor.email && (
              <span className="p-1.5 bg-gray-100 rounded-lg text-gray-600">
                <Mail className="w-4 h-4" />
              </span>
            )}
            {instructor.facebook && (
              <span className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                <Facebook className="w-4 h-4" />
              </span>
            )}
            {instructor.linkedin && (
              <span className="p-1.5 bg-blue-100 rounded-lg text-blue-700">
                <Linkedin className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function InstructorsPage() {
  const { data: instructors, isLoading } = useQuery({
    queryKey: ['public-instructors'],
    queryFn: publicApi.getInstructors,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">ჩვენი ლექტორები</h1>
          <p className="mt-4 text-lg text-primary-100 max-w-2xl mx-auto">
            გაიცანით გამოცდილი პროფესიონალები, რომლებიც გასწავლიან ახალ უნარებს და დაგეხმარებიან კარიერულ განვითარებაში
          </p>
        </div>
      </div>

      {/* Instructors Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-6 space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : instructors && instructors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {instructors.map((instructor: Instructor) => (
              <InstructorCard key={instructor.id} instructor={instructor} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">ლექტორები მალე დაემატება</p>
          </div>
        )}
      </div>
    </div>
  );
}
