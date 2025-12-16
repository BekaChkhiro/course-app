'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '@/lib/api/publicApi';

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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight">
            <span className="block">შეისწავლე ახალი უნარები</span>
            <span className="block text-primary-300 mt-2">განავითარე კარიერა</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-primary-100">
            პროფესიონალური ონლაინ კურსები საუკეთესო ინსტრუქტორებისგან. დაიწყე სწავლა დღესვე და გახდი ექსპერტი შენს სფეროში.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/courses"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-primary-900 bg-white rounded-xl hover:bg-primary-50 transition-all shadow-lg hover:shadow-xl"
            >
              კურსების ნახვა
              <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-accent-600 rounded-xl hover:bg-accent-700 transition-all border-2 border-primary-400"
            >
              უფასო რეგისტრაცია
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '1,000+', label: 'სტუდენტი' },
            { value: '50+', label: 'კურსი' },
            { value: '20+', label: 'ინსტრუქტორი' },
            { value: '95%', label: 'კმაყოფილება' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white">{stat.value}</div>
              <div className="mt-1 text-primary-100">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Features Section
const FeaturesSection = () => {
  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      title: 'ვიდეო გაკვეთილები',
      description: 'მაღალი ხარისხის ვიდეო კონტენტი, რომელიც ხელმისაწვდომია ნებისმიერ დროს და ადგილზე.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'ტესტები და დავალებები',
      description: 'შეამოწმე შენი ცოდნა ინტერაქტიული ტესტებით და პრაქტიკული დავალებებით.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      title: 'სერტიფიკატი',
      description: 'მიიღე სერტიფიკატი კურსის დასრულების შემდეგ და გაიზარდე კარიერაში.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'საკუთარი ტემპი',
      description: 'ისწავლე შენი ტემპით, როცა გინდა და სადაც გინდა, შეუზღუდავი წვდომით.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: 'საზოგადოება',
      description: 'შეუერთდი მოტივირებულ სტუდენტებს და დისკუსიების საშუალებით გააღრმავე ცოდნა.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'მხარდაჭერა',
      description: '24/7 მხარდაჭერა შენი კითხვებისთვის და პრობლემების გადაჭრისთვის.',
    },
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">რატომ უნდა აირჩიო ჩვენ</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            ჩვენი პლატფორმა გთავაზობთ საუკეთესო გამოცდილებას ონლაინ სწავლისთვის
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-900">
                {feature.icon}
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Popular Courses Section
const PopularCoursesSection = () => {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['popular-courses'],
    queryFn: () => publicApi.getPopularCourses(6),
  });

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">პოპულარული კურსები</h2>
            <p className="mt-2 text-lg text-gray-600">ყველაზე მოთხოვნადი კურსები ჩვენს პლატფორმაზე</p>
          </div>
          <Link
            href="/courses"
            className="inline-flex items-center text-primary-900 hover:text-primary-800 font-medium"
          >
            ყველას ნახვა
            <svg className="ml-1 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        ) : courses?.length ? (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course: any) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="mt-12 text-center py-12 bg-gray-50 rounded-2xl">
            <p className="text-gray-600">კურსები მალე დაემატება</p>
          </div>
        )}
      </div>
    </section>
  );
};

// Course Card Component
const CourseCard = ({ course }: { course: any }) => {
  return (
    <Link href={`/courses/${course.slug}`} className="group">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all">
        <div className="relative h-48 bg-gray-200">
          {course.thumbnail ? (
            <Image
              src={course.thumbnail}
              alt={course.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-primary-900 flex items-center justify-center">
              <svg className="w-16 h-16 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
          {course.category && (
            <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-gray-700">
              {course.category.name}
            </span>
          )}
        </div>
        <div className="p-5">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-900 transition-colors line-clamp-2">
            {course.title}
          </h3>
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{course.shortDescription}</p>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">
                {course.averageRating?.toFixed(1) || '0.0'}
              </span>
              <span className="text-sm text-gray-500">({course.reviewCount || 0})</span>
            </div>
            <div className="text-lg font-bold text-primary-900">
              {course.price === 0 ? 'უფასო' : `${course.price} ₾`}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

// Categories Section
const CategoriesSection = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: publicApi.getCategories,
  });

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">კატეგორიები</h2>
          <p className="mt-4 text-lg text-gray-600">აირჩიე შენთვის საინტერესო სფერო</p>
        </div>

        {isLoading ? (
          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-xl h-32 animate-pulse" />
            ))}
          </div>
        ) : categories?.length ? (
          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.slice(0, 8).map((category: any) => (
              <Link
                key={category.id}
                href={`/courses?category=${category.slug}`}
                className="group bg-white rounded-xl p-6 text-center shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div className="w-14 h-14 mx-auto bg-primary-100 rounded-xl flex items-center justify-center text-primary-900 group-hover:bg-accent-700 group-hover:text-white transition-colors">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{category.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{category._count?.courses || 0} კურსი</p>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

// CTA Section
const CTASection = () => {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-primary-900 rounded-3xl p-8 sm:p-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            მზად ხარ სწავლის დასაწყებად?
          </h2>
          <p className="mt-4 text-lg text-primary-100 max-w-2xl mx-auto">
            შეუერთდი ათასობით სტუდენტს, რომლებმაც უკვე შეცვალეს თავიანთი კარიერა ჩვენი კურსების დახმარებით.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-primary-900 bg-white rounded-xl hover:bg-primary-50 transition-all"
            >
              დაიწყე უფასოდ
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white border-2 border-white rounded-xl hover:bg-white/10 transition-all"
            >
              კურსების ნახვა
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

// Main Page Component
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <PopularCoursesSection />
      <CategoriesSection />
      <CTASection />
    </>
  );
}
