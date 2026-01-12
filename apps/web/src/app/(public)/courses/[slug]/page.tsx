'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Mail, Facebook, Linkedin, User, Zap, ArrowRight, Clock, Play } from 'lucide-react';
import { publicApi } from '@/lib/api/publicApi';
import { studentApiClient } from '@/lib/api/studentApi';
import { useAuthStore } from '@/store/authStore';
import BuyButton from '@/components/payment/BuyButton';
import BookingModal from '@/components/booking/BookingModal';
import VideoPreviewModal from '@/components/ui/VideoPreviewModal';
import toast from 'react-hot-toast';

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = params.slug as string;
  const { isAuthenticated } = useAuthStore();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const { data: course, isLoading, error } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => publicApi.getCourse(slug),
  });

  const handleEnroll = async () => {
    if (!course?.id) return;

    setIsEnrolling(true);
    setEnrollError(null);

    try {
      const result = await studentApiClient.enrollInCourse(course.id);
      if (result.success) {
        // Invalidate course query to update isEnrolled status
        queryClient.invalidateQueries({ queryKey: ['course', slug] });
        // Redirect to learning page
        router.push(`/dashboard/courses/${course.slug}/learn`);
      } else {
        setEnrollError(result.message || 'შეცდომა ჩარიცხვისას');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'შეცდომა ჩარიცხვისას';
      setEnrollError(message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleUpgrade = async () => {
    if (!course?.id || !course?.upgradeInfo) return;

    setIsUpgrading(true);
    try {
      const result = await studentApiClient.initiateUpgrade(
        course.id,
        course.upgradeInfo.availableVersionId
      );
      if (result.success && result.data?.redirectUrl) {
        window.location.href = result.data.redirectUrl;
      } else if (result.success && course.upgradeInfo.upgradePrice === 0) {
        // Free upgrade - redirect to learn page
        queryClient.invalidateQueries({ queryKey: ['course', slug] });
        router.push(`/dashboard/courses/${course.slug}/learn`);
        toast.success('კურსი წარმატებით განახლდა!');
      } else {
        toast.error(result.message || 'განახლების დაწყება ვერ მოხერხდა');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'განახლების დაწყება ვერ მოხერხდა');
    } finally {
      setIsUpgrading(false);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">კურსი ვერ მოიძებნა</h1>
          <p className="mt-2 text-gray-600">სამწუხაროდ, ეს კურსი არ არსებობს ან წაშლილია</p>
          <Link href="/courses" className="mt-4 inline-block text-primary-900 hover:underline">
            კურსებზე დაბრუნება
          </Link>
        </div>
      </div>
    );
  }

  // Purchase Card Component - reusable for mobile and desktop
  const PurchaseCard = ({ className = '' }: { className?: string }) => (
    <div className={`bg-white rounded-2xl shadow-xl overflow-hidden ${className}`}>
      {/* Course Image with Video Preview */}
      <div className="relative h-48 bg-gray-200 group/thumbnail">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-primary-900 flex items-center justify-center">
            <svg className="w-20 h-20 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Play Button for Demo Video - Always Visible */}
        {course.demoVideoUrl && (
          <button
            onClick={() => setIsVideoModalOpen(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/30"
          >
            <div className="w-16 h-16 bg-accent-600 hover:bg-accent-700 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110">
              <Play className="w-7 h-7 text-white ml-1" fill="white" />
            </div>
          </button>
        )}
      </div>

      <div className="p-6">
        {/* Price - ყოველთვის ჩანს */}
        <div className="text-3xl font-bold mb-4">
          {course.price === 0 ? (
            <span className="text-green-600">უფასო</span>
          ) : (
            <span className="text-gray-900">{course.price} ₾</span>
          )}
        </div>

        {/* CTA Button */}
        {isAuthenticated ? (
          course.isEnrolled ? (
            course.upgradeInfo ? (
              // User owns an older version - show upgrade option
              <div className="space-y-3">
                <div className="bg-accent-50 border border-accent-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-accent-700 mb-2">
                    <Zap className="w-5 h-5" />
                    <span className="font-semibold">ახალი ვერსია!</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">v{course.upgradeInfo.currentVersionNumber}</span>
                    <ArrowRight className="w-4 h-4 text-accent-500" />
                    <span className="font-mono bg-accent-100 text-accent-700 px-2 py-0.5 rounded font-medium">v{course.upgradeInfo.availableVersionNumber}</span>
                  </div>
                  <p className="text-sm text-gray-600">{course.upgradeInfo.availableVersionTitle}</p>
                  {course.upgradeInfo.hasDiscount && course.upgradeInfo.discountEndsAt && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                      <Clock className="w-3 h-3" />
                      <span>ფასდაკლება შეზღუდული დროით!</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  className="block w-full text-center bg-accent-600 text-white py-3 rounded-xl font-medium hover:bg-accent-700 transition-colors disabled:opacity-50"
                >
                  {isUpgrading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      მიმდინარეობს...
                    </span>
                  ) : (
                    <>
                      განახლება
                      {course.upgradeInfo.upgradePrice > 0 && (
                        <span className="ml-2">{course.upgradeInfo.upgradePrice.toFixed(2)} ₾</span>
                      )}
                    </>
                  )}
                </button>
                <Link
                  href={`/dashboard/courses/${course.slug}/learn`}
                  className="block w-full text-center text-gray-600 py-2 text-sm hover:text-gray-900"
                >
                  ან გააგრძელე ძველი ვერსია
                </Link>
              </div>
            ) : course.progressPercentage === 100 ? (
              <Link
                href={`/dashboard/courses/${course.slug}/learn`}
                className="block w-full text-center bg-gray-600 text-white py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
              >
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  დასრულებული
                </span>
              </Link>
            ) : (
              <Link
                href={`/dashboard/courses/${course.slug}/learn`}
                className="block w-full text-center bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-colors"
              >
                {course.progressPercentage && course.progressPercentage > 0 ? (
                  <>
                    <span>გაგრძელება</span>
                    <span className="ml-2 text-green-200">({course.progressPercentage}%)</span>
                  </>
                ) : (
                  'დაწყება'
                )}
              </Link>
            )
          ) : course.price > 0 ? (
            <BuyButton
              courseId={course.id}
              price={course.price}
            />
          ) : (
            <>
              <button
                onClick={handleEnroll}
                disabled={isEnrolling}
                className="block w-full text-center bg-accent-600 text-white py-3 rounded-xl font-medium hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEnrolling ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    მიმდინარეობს...
                  </span>
                ) : (
                  'დაიწყე უფასოდ'
                )}
              </button>
              {enrollError && (
                <p className="mt-2 text-sm text-red-600 text-center">{enrollError}</p>
              )}
            </>
          )
        ) : (
          <Link
            href={`/auth/login?redirect=/courses/${course.slug}`}
            className="block w-full text-center bg-accent-600 text-white py-3 rounded-xl font-medium hover:bg-accent-700 transition-colors"
          >
            {course.price === 0 ? 'დაიწყე უფასოდ' : 'ყიდვა'}
          </Link>
        )}

        {/* Features */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-5 h-5 mr-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            შეუზღუდავი წვდომა
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-5 h-5 mr-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            სერტიფიკატი დასრულებისას
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-5 h-5 mr-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            პრაქტიკული დავალებები
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Course Info & Content */}
          <div className="lg:col-span-2">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 -mx-4 sm:-mx-6 lg:-mx-0 lg:rounded-2xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-0 lg:mt-10">
              <nav className="text-sm mb-4">
                <ol className="flex items-center space-x-2 text-gray-400">
                  <li>
                    <Link href="/courses" className="hover:text-white">
                      კურსები
                    </Link>
                  </li>
                  <li>/</li>
                  {course.category?.parent && (
                    <>
                      <li>
                        <Link href={`/courses?category=${course.category.parent.slug}`} className="hover:text-white">
                          {course.category.parent.name}
                        </Link>
                      </li>
                      <li>/</li>
                    </>
                  )}
                  {course.category && (
                    <>
                      <li>
                        <Link href={`/courses?category=${course.category.slug}`} className="hover:text-white">
                          {course.category.name}
                        </Link>
                      </li>
                      <li>/</li>
                    </>
                  )}
                  <li className="text-gray-300 truncate">{course.title}</li>
                </ol>
              </nav>

              <h1 className="text-3xl sm:text-4xl font-bold text-white">{course.title}</h1>
              <p className="mt-4 text-lg text-gray-300" dangerouslySetInnerHTML={{ __html: course.shortDescription || '' }} />

              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-300">
                {/* Rating */}
                <div className="flex items-center space-x-1">
                  <span className="text-yellow-400 font-bold">{course.averageRating?.toFixed(1) || '0.0'}</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${i < Math.round(course.averageRating || 0) ? 'text-yellow-400' : 'text-gray-600'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span>({course.reviewCount || 0} შეფასება)</span>
                </div>

                {/* Students */}
                <div className="flex items-center space-x-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>{course.studentCount || 0} სტუდენტი</span>
                </div>

                {/* Duration */}
                {course.totalDuration && (
                  <div className="flex items-center space-x-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{formatDuration(course.totalDuration)}</span>
                  </div>
                )}

                {/* Chapters */}
                {course.chapterCount && (
                  <div className="flex items-center space-x-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <span>{course.chapterCount} თავი</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Purchase Card - visible only on mobile */}
            <div className="lg:hidden mt-6 space-y-4">
              <PurchaseCard />
            </div>

            {/* Content Section */}
            <div className="py-6 lg:py-8 space-y-6 lg:space-y-8">
              {/* Description */}
              <section className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">კურსის აღწერა</h2>
                <div className="prose max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: course.description || '' }} />
              </section>

              {/* Instructor Section */}
              {course.instructor && (
                <section className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">ლექტორი</h2>
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Instructor Avatar */}
                    <Link
                      href={`/instructors/${course.instructor.slug}`}
                      className="flex-shrink-0"
                    >
                      <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100 mx-auto sm:mx-0 ring-4 ring-primary-100 hover:ring-primary-200 transition-all">
                        {course.instructor.avatar ? (
                          <Image
                            src={course.instructor.avatar}
                            alt={`${course.instructor.firstName} ${course.instructor.lastName}`}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary-100">
                            <User className="w-16 h-16 text-primary-300" />
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Instructor Info */}
                    <div className="flex-1 text-center sm:text-left">
                      <Link
                        href={`/instructors/${course.instructor.slug}`}
                        className="group"
                      >
                        <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-900 transition-colors">
                          {course.instructor.firstName} {course.instructor.lastName}
                        </h3>
                      </Link>
                      <p className="mt-1 text-primary-600 font-medium">{course.instructor.profession}</p>

                      {course.instructor.bio && (
                        <p className="mt-3 text-gray-600 line-clamp-3">{course.instructor.bio}</p>
                      )}

                      {/* Social Links */}
                      <div className="mt-4 flex items-center justify-center sm:justify-start gap-3">
                        {course.instructor.email && (
                          <a
                            href={`mailto:${course.instructor.email}`}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
                            title="ელ-ფოსტა"
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                        {course.instructor.facebook && (
                          <a
                            href={course.instructor.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                            title="Facebook"
                          >
                            <Facebook className="w-4 h-4" />
                          </a>
                        )}
                        {course.instructor.linkedin && (
                          <a
                            href={course.instructor.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-blue-700 transition-colors"
                            title="LinkedIn"
                          >
                            <Linkedin className="w-4 h-4" />
                          </a>
                        )}
                        <Link
                          href={`/instructors/${course.instructor.slug}`}
                          className="ml-auto text-sm text-primary-600 hover:text-primary-800 font-medium"
                        >
                          სრულად ნახვა →
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 bg-accent-50 border border-accent-100 rounded-2xl p-4 sm:p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-white text-accent-500 flex items-center justify-center shadow-sm">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-accent-600 uppercase tracking-wide">ინდივიდუალური სწავლება</p>
                          <p className="text-sm text-accent-700 mt-1">დაჯავშნეთ ინდივიდუალური სესია ლექტორთან და მიიღეთ პერსონალური მხარდაჭერა.</p>
                          <p className="text-lg font-bold text-accent-800 mt-2">
                            {course.individualSessionPrice
                              ? `${Number(course.individualSessionPrice).toFixed(0)} ₾ / სესია`
                              : 'შეთანხმებით'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsBookingModalOpen(true)}
                        className="w-full lg:w-auto flex items-center justify-center gap-2 bg-accent-500 text-white px-5 py-3 rounded-xl font-semibold shadow-md hover:bg-accent-600 transition-colors"
                      >
                        <span>დაჯავშნე ახლა</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* What You'll Learn */}
              {course.learningOutcomes && course.learningOutcomes.length > 0 && (
                <section className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">რას ისწავლი</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {course.learningOutcomes.map((outcome: string, index: number) => (
                      <div key={index} className="flex items-start space-x-3">
                        <svg className="w-5 h-5 mt-0.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-600">{outcome}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Course Content */}
              {course.chapters && course.chapters.length > 0 && (
                <section className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-primary-600">კურსის შინაარსი</p>
                      <h2 className="text-2xl font-bold text-gray-900 mt-1">კურსის შინაარსი</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 text-primary-900 font-medium">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        {course.chapterCount} თავი
                      </span>
                      {course.totalDuration && course.totalDuration > 0 && (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-50 text-accent-600 font-medium">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDuration(course.totalDuration)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    {course.chapters.map((chapter: any, index: number) => (
                      <div
                        key={chapter.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-gray-100 p-4 hover:border-primary-200 hover:bg-primary-50/40 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="min-w-[3rem] px-3 h-11 rounded-xl bg-primary-50 text-primary-900 font-semibold flex items-center justify-center text-base">
                            {String(index + 1).padStart(2, '0')}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{chapter.title}</h3>
                            {chapter.description && (
                              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{chapter.description}</p>
                            )}
                          </div>
                        </div>
                        {chapter.duration && (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-accent-100 text-accent-600 text-sm font-medium shadow-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatDuration(chapter.duration)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Reviews */}
              <ReviewsSection courseId={course.id} />
            </div>
          </div>

          {/* Right Column - Desktop Purchase Card (Sticky) */}
          <div className="hidden lg:block lg:col-span-1 lg:pb-8">
            <div className="lg:sticky lg:top-[70px] lg:bottom-[70px] pt-0 lg:pt-[34px] space-y-4">
              <PurchaseCard />
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        courseId={course.id}
        courseTitle={course.title}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />

      {/* Video Preview Modal */}
      {course.demoVideoUrl && (
        <VideoPreviewModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          videoUrl={course.demoVideoUrl}
          title={course.title}
          thumbnailUrl={course.thumbnail}
        />
      )}
    </div>
  );
}

// Reviews Section Component
function ReviewsSection({ courseId }: { courseId: string }) {
  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['course-reviews', courseId],
    queryFn: () => publicApi.getCourseReviews(courseId),
  });

  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">შეფასებები</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  const reviews = reviewsData?.reviews || [];

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        შეფასებები ({reviewsData?.total || 0})
      </h2>

      {reviews.length === 0 ? (
        <p className="text-gray-600">ჯერ არ არის შეფასებები</p>
      ) : (
        <div className="space-y-6">
          {reviews.map((review: any) => (
            <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {review.user.avatar ? (
                      <img src={review.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-primary-900 font-medium">
                        {review.user.firstName?.[0] || '?'}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">
                        {review.user.firstName} {review.user.lastName}
                      </h4>
                      {review.completionPercentage >= 100 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          დასრულებული
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString('ka-GE')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title */}
              {review.title && (
                <h5 className="font-semibold text-gray-900 mb-2">{review.title}</h5>
              )}

              {/* Comment */}
              {review.comment && (
                <p className="text-gray-600">{review.comment}</p>
              )}

              {/* Admin Response */}
              {review.response && (
                <div className="mt-3 bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-blue-700">ინსტრუქტორის პასუხი</span>
                    <span className="text-xs text-blue-500">
                      {new Date(review.response.createdAt).toLocaleDateString('ka-GE')}
                    </span>
                  </div>
                  <p className="text-sm text-blue-800">{review.response.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2">
            {/* Hero Skeleton */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 -mx-4 sm:-mx-6 lg:-mx-0 lg:rounded-2xl px-4 sm:px-6 lg:px-8 py-12 mt-0 lg:mt-10">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-48 mb-4" />
                <div className="h-10 bg-gray-700 rounded w-3/4 mb-4" />
                <div className="h-4 bg-gray-700 rounded w-full mb-2" />
                <div className="h-4 bg-gray-700 rounded w-2/3 mb-6" />
                <div className="flex gap-4">
                  <div className="h-4 bg-gray-700 rounded w-24" />
                  <div className="h-4 bg-gray-700 rounded w-24" />
                  <div className="h-4 bg-gray-700 rounded w-24" />
                </div>
              </div>
            </div>

            {/* Content Skeleton */}
            <div className="py-8 space-y-8">
              <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
                <div className="space-y-3">
                  <div className="h-16 bg-gray-200 rounded" />
                  <div className="h-16 bg-gray-200 rounded" />
                  <div className="h-16 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Purchase Card Skeleton */}
          <div className="lg:col-span-1">
            <div className="pt-0 lg:pt-[34px]">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-6">
                  <div className="h-8 bg-gray-200 rounded w-24 mb-4" />
                  <div className="h-12 bg-gray-200 rounded mb-6" />
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} წთ`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} სთ ${mins} წთ` : `${hours} სთ`;
}
