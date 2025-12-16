'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { publicApi } from '@/lib/api/publicApi';

type SortOption = 'popular' | 'newest' | 'price_low' | 'price_high' | 'rating';

// Loading component
function CoursesLoading() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-primary-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-10 bg-primary-400/50 rounded w-64 mx-auto mb-4" />
            <div className="h-4 bg-primary-400/50 rounded w-96 mx-auto" />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-80 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Main page wrapper with Suspense
export default function CoursesPage() {
  return (
    <Suspense fallback={<CoursesLoading />}>
      <CoursesContent />
    </Suspense>
  );
}

function CoursesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [sort, setSort] = useState<SortOption>((searchParams.get('sort') as SortOption) || 'popular');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: publicApi.getCategories,
  });

  // Fetch courses
  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['courses', { page, search, category: selectedCategory, sort }],
    queryFn: () => publicApi.getCourses({ page, limit: 12, search, category: selectedCategory, sort }),
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (selectedCategory) params.set('category', selectedCategory);
    if (sort !== 'popular') params.set('sort', sort);
    if (page > 1) params.set('page', page.toString());

    const queryString = params.toString();
    router.push(`/courses${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [search, selectedCategory, sort, page, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSort('popular');
    setPage(1);
  };

  const sortOptions = [
    { value: 'popular', label: 'პოპულარული' },
    { value: 'newest', label: 'უახლესი' },
    { value: 'rating', label: 'რეიტინგით' },
    { value: 'price_low', label: 'ფასი: დაბალი' },
    { value: 'price_high', label: 'ფასი: მაღალი' },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="bg-primary-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white text-center">
            კურსების კატალოგი
          </h1>
          <p className="mt-4 text-lg text-primary-100 text-center max-w-2xl mx-auto">
            იპოვე შენთვის საუკეთესო კურსი და დაიწყე სწავლა დღესვე
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mt-8 max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="მოძებნე კურსი..."
                className="w-full px-6 py-4 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-accent-500 text-white px-6 py-2 rounded-lg hover:bg-accent-600 transition-colors"
              >
                ძებნა
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">ფილტრები</h3>
                {(search || selectedCategory || sort !== 'popular') && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary-900 hover:text-primary-800"
                  >
                    გასუფთავება
                  </button>
                )}
              </div>

              {/* Categories */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">კატეგორია</h4>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                      setPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      !selectedCategory
                        ? 'bg-primary-100 text-primary-800'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    ყველა კატეგორია
                  </button>
                  {/* Parent categories */}
                  {categories
                    ?.filter((cat: any) => !cat.parent)
                    .map((parentCat: any) => {
                      const children = categories?.filter((c: any) => c.parent?.id === parentCat.id) || [];
                      const isParentSelected = selectedCategory === parentCat.slug;
                      const isChildSelected = children.some((c: any) => c.slug === selectedCategory);
                      const isExpanded = expandedCategories.has(parentCat.id) || isParentSelected || isChildSelected;

                      const toggleExpand = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        setExpandedCategories(prev => {
                          const next = new Set(prev);
                          if (next.has(parentCat.id)) {
                            next.delete(parentCat.id);
                          } else {
                            next.add(parentCat.id);
                          }
                          return next;
                        });
                      };

                      return (
                        <div key={parentCat.id}>
                          {/* Parent category */}
                          <div className="flex items-center">
                            {children.length > 0 && (
                              <button
                                onClick={toggleExpand}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                              >
                                <svg
                                  className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedCategory(parentCat.slug);
                                setPage(1);
                              }}
                              className={`flex-1 text-left px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isParentSelected
                                  ? 'bg-primary-100 text-primary-800'
                                  : 'text-gray-700 hover:bg-gray-100'
                              } ${children.length === 0 ? 'ml-5' : ''}`}
                            >
                              {parentCat.name}
                              <span className="text-gray-400 ml-1 font-normal">({parentCat._count?.courses || 0})</span>
                            </button>
                          </div>

                          {/* Child categories - collapsible */}
                          {children.length > 0 && isExpanded && (
                            <div className="ml-5 border-l-2 border-gray-200 pl-2 space-y-1 mt-1">
                              {children.map((child: any) => (
                                <button
                                  key={child.id}
                                  onClick={() => {
                                    setSelectedCategory(child.slug);
                                    setPage(1);
                                  }}
                                  className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                    selectedCategory === child.slug
                                      ? 'bg-primary-100 text-primary-800'
                                      : 'text-gray-600 hover:bg-gray-100'
                                  }`}
                                >
                                  {child.name}
                                  <span className="text-gray-400 ml-1">({child._count?.courses || 0})</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Sort (Mobile) */}
              <div className="lg:hidden mb-6">
                <h4 className="font-medium text-gray-900 mb-3">სორტირება</h4>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as SortOption);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Sort Bar (Desktop) */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <p className="text-gray-600">
                {coursesData?.total || 0} კურსი ნაპოვნია
              </p>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">სორტირება:</span>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as SortOption);
                    setPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Course Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl h-80 animate-pulse" />
                ))}
              </div>
            ) : coursesData?.courses?.length ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {coursesData.courses.map((course: any) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>

                {/* Pagination */}
                {coursesData.totalPages > 1 && (
                  <div className="mt-12 flex justify-center">
                    <nav className="flex items-center space-x-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        წინა
                      </button>

                      {[...Array(coursesData.totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        if (
                          pageNum === 1 ||
                          pageNum === coursesData.totalPages ||
                          (pageNum >= page - 1 && pageNum <= page + 1)
                        ) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum)}
                              className={`w-10 h-10 rounded-lg ${
                                page === pageNum
                                  ? 'bg-accent-500 text-white'
                                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (pageNum === page - 2 || pageNum === page + 2) {
                          return <span key={pageNum} className="text-gray-400">...</span>;
                        }
                        return null;
                      })}

                      <button
                        onClick={() => setPage((p) => Math.min(coursesData.totalPages, p + 1))}
                        disabled={page === coursesData.totalPages}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        შემდეგი
                      </button>
                    </nav>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">კურსები ვერ მოიძებნა</h3>
                <p className="mt-2 text-gray-600">სცადე სხვა საძიებო სიტყვები ან ფილტრები</p>
                <button
                  onClick={clearFilters}
                  className="mt-4 text-primary-900 hover:text-primary-800 font-medium"
                >
                  ფილტრების გასუფთავება
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Course Card Component
const CourseCard = ({ course }: { course: any }) => {
  return (
    <Link href={`/courses/${course.slug}`} className="group">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all h-full flex flex-col">
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
        <div className="p-5 flex-1 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-900 transition-colors line-clamp-2">
            {course.title}
          </h3>
          <p className="mt-2 text-sm text-gray-600 line-clamp-2 flex-1">
            {course.shortDescription}
          </p>
          <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
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
