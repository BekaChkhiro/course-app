'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Mail, Facebook, Linkedin, User, Star, Users, ArrowLeft } from 'lucide-react';
import { publicApi } from '@/lib/api/publicApi';
import { stripHtmlTags } from '@/utils/string';

type Course = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  thumbnail: string | null;
  price: number;
  category: { id: string; name: string; slug: string } | null;
  averageRating: number;
  reviewCount: number;
  studentCount: number;
  chapterCount: number;
};

interface InstructorDetail {
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
  courses: Course[];
}

function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
    >
      {/* Thumbnail */}
      <div className="relative h-48 bg-gray-200 overflow-hidden">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-primary-900 flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-white/50" />
          </div>
        )}
        {course.category && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-gray-700">
            {course.category.name}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-900 transition-colors line-clamp-2">
          {course.title}
        </h3>
        {course.shortDescription && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{stripHtmlTags(course.shortDescription)}</p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              {course.averageRating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {course.studentCount}
            </span>
          </div>
          <div className="text-lg font-bold text-primary-900">
            {course.price === 0 ? 'უფასო' : `${course.price} ₾`}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function InstructorDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: instructor, isLoading, error } = useQuery<InstructorDetail>({
    queryKey: ['instructor', slug],
    queryFn: () => publicApi.getInstructor(slug),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-primary-900 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center gap-8 animate-pulse">
              <div className="w-48 h-48 rounded-full bg-primary-800" />
              <div className="text-center md:text-left space-y-4">
                <div className="h-8 bg-primary-800 rounded w-64" />
                <div className="h-6 bg-primary-800 rounded w-48" />
                <div className="h-20 bg-primary-800 rounded w-96" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !instructor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="w-20 h-20 mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ლექტორი ვერ მოიძებნა</h1>
          <p className="text-gray-600 mb-6">მოთხოვნილი ლექტორი არ არსებობს ან წაშლილია</p>
          <Link
            href="/instructors"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-900 text-white rounded-xl hover:bg-primary-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            ყველა ლექტორი
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <Link
            href="/instructors"
            className="inline-flex items-center gap-2 text-primary-200 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            ყველა ლექტორი
          </Link>

          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar */}
            <div className="relative w-48 h-48 rounded-full overflow-hidden bg-primary-800 flex-shrink-0 ring-4 ring-primary-700">
              {instructor.avatar ? (
                <Image
                  src={instructor.avatar}
                  alt={`${instructor.firstName} ${instructor.lastName}`}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-24 h-24 text-primary-600" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-center md:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                {instructor.firstName} {instructor.lastName}
              </h1>
              <p className="mt-2 text-xl text-primary-300">{instructor.profession}</p>

              {instructor.bio && (
                <p className="mt-4 text-primary-100 max-w-2xl">{instructor.bio}</p>
              )}

              {/* Social Links */}
              <div className="mt-6 flex items-center justify-center md:justify-start gap-3">
                {instructor.email && (
                  <a
                    href={`mailto:${instructor.email}`}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">ელ-ფოსტა</span>
                  </a>
                )}
                {instructor.facebook && (
                  <a
                    href={instructor.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                  >
                    <Facebook className="w-4 h-4" />
                    <span className="text-sm">Facebook</span>
                  </a>
                )}
                {instructor.linkedin && (
                  <a
                    href={instructor.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg text-white transition-colors"
                  >
                    <Linkedin className="w-4 h-4" />
                    <span className="text-sm">LinkedIn</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            კურსები ({instructor.courses?.length || 0})
          </h2>
        </div>

        {instructor.courses && instructor.courses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {instructor.courses.map((course: Course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl">
            <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">ლექტორს ჯერ არ აქვს კურსები</p>
          </div>
        )}
      </div>
    </div>
  );
}
