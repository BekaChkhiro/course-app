'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { publicApi } from '@/lib/api/publicApi';
import VideoPreviewModal from '@/components/ui/VideoPreviewModal';
import { Play } from 'lucide-react';

type SortOption = 'popular' | 'newest' | 'price_low' | 'price_high' | 'rating';

// Loading component
function CoursesLoading() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-primary-900 py-8 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 sm:h-10 bg-primary-400/50 rounded w-48 sm:w-64 mx-auto mb-3 sm:mb-4" />
            <div className="h-4 bg-primary-400/50 rounded w-64 sm:w-96 mx-auto" />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl sm:rounded-2xl h-72 sm:h-80 animate-pulse" />
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
  const [isMobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: publicApi.getCategories,
  });

  // Ensure categories is always an array
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

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

  const hasActiveFilters = Boolean(search || selectedCategory || sort !== 'popular');

  const renderCategoryFilters = () => (
    <div className="mb-4 sm:mb-6">
      <h4 className="font-medium text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">კატეგორია</h4>
      <div className="space-y-1">
        <button
          onClick={() => {
            setSelectedCategory('');
            setPage(1);
          }}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            !selectedCategory ? 'bg-primary-100 text-primary-800' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          ყველა კატეგორია
        </button>
        {categories
          .filter((cat: any) => !cat.parent)
          .map((parentCat: any) => {
            const children = categories.filter((c: any) => c.parent?.id === parentCat.id);
            const isParentSelected = selectedCategory === parentCat.slug;
            const isChildSelected = children.some((c: any) => c.slug === selectedCategory);
            const isExpanded = expandedCategories.has(parentCat.id) || isParentSelected || isChildSelected;

            const toggleExpand = (e: React.MouseEvent) => {
              e.stopPropagation();
              setExpandedCategories((prev) => {
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
                <div className="flex items-center">
                  {children.length > 0 && (
                    <button onClick={toggleExpand} className="p-1 hover:bg-gray-100 rounded transition-colors">
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
                      isParentSelected ? 'bg-primary-100 text-primary-800' : 'text-gray-700 hover:bg-gray-100'
                    } ${children.length === 0 ? 'ml-5' : ''}`}
                  >
                    {parentCat.name}
                    <span className="text-gray-400 ml-1 font-normal">({parentCat._count?.courses || 0})</span>
                  </button>
                </div>

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
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="bg-primary-900 py-8 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white text-center">
            კურსების კატალოგი
          </h1>
          <p className="mt-2 sm:mt-4 text-sm sm:text-base lg:text-lg text-primary-100 text-center max-w-2xl mx-auto px-2">
            იპოვე შენთვის საუკეთესო კურსი და დაიწყე სწავლა დღესვე
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mt-5 sm:mt-8 max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="მოძებნე კურსი..."
                className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-300 text-sm sm:text-base"
              />
              <button
                type="submit"
                className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 bg-accent-600 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-accent-700 transition-colors text-sm sm:text-base"
              >
                ძებნა
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">ფილტრები</h3>
              </div>

              {renderCategoryFilters()}

              <button
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="w-full mt-2 py-3 rounded-xl bg-accent-600 text-white text-sm font-semibold hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                გასუფთავება
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Mobile Controls */}
            <div className="lg:hidden flex items-center justify-between gap-3 mb-4">
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-900 shadow-sm border border-gray-200"
              >
                <svg className="w-5 h-5 text-primary-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M7 12h10M10 18h4" />
                </svg>
                ფილტრები
              </button>
              <span className="text-sm text-gray-600">
                {coursesData?.total || 0} კურსი ნაპოვნია
              </span>
            </div>

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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl sm:rounded-2xl h-72 sm:h-80 animate-pulse" />
                ))}
              </div>
            ) : coursesData?.courses?.length ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
                  {coursesData.courses.map((course: any) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>

                {/* Pagination */}
                {coursesData.totalPages > 1 && (
                  <div className="mt-8 sm:mt-12 flex justify-center">
                    <nav className="flex items-center space-x-1 sm:space-x-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
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
                              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-sm sm:text-base ${
                                page === pageNum
                                  ? 'bg-accent-600 text-white'
                                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (pageNum === page - 2 || pageNum === page + 2) {
                          return <span key={pageNum} className="text-gray-400 text-sm">...</span>;
                        }
                        return null;
                      })}

                      <button
                        onClick={() => setPage((p) => Math.min(coursesData.totalPages, p + 1))}
                        disabled={page === coursesData.totalPages}
                        className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                      >
                        შემდეგი
                      </button>
                    </nav>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-10 sm:py-16 bg-white rounded-xl sm:rounded-2xl">
                <svg
                  className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400"
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
                <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-medium text-gray-900">კურსები ვერ მოიძებნა</h3>
                <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-gray-600">სცადე სხვა საძიებო სიტყვები ან ფილტრები</p>
                <button
                  onClick={clearFilters}
                  className="mt-3 sm:mt-4 text-sm sm:text-base text-primary-900 hover:text-primary-800 font-medium"
                >
                  ფილტრების გასუფთავება
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Panel */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity ${
          isMobileFiltersOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFiltersOpen(false)} />
        <div
          className={`absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl transform transition-transform duration-300 ${
            isMobileFiltersOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="p-5 sm:p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">ფილტრები</h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600"
                aria-label="დახურვა"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>

            {renderCategoryFilters()}

            <div className="mt-6 space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">სორტირება</h4>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((option) => {
                    const isActive = sort === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSort(option.value as SortOption);
                          setPage(1);
                        }}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary-900 border-primary-900 text-white'
                            : 'bg-white border-gray-300 text-gray-600'
                        }`}
                        aria-pressed={isActive}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    clearFilters();
                    setMobileFiltersOpen(false);
                  }}
                  className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-700"
                >
                  გასუფთავება
                </button>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-accent-600 text-white text-sm font-semibold"
                >
                  გაფილტვრა
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Course Card Component with Hover Syllabus and Demo Video
const CourseCard = ({ course }: { course: any }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  return (
    <>
      <div
        className="group relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`bg-white overflow-hidden shadow-sm transition-all duration-300 rounded-xl sm:rounded-2xl ${isHovered ? 'sm:shadow-xl sm:rounded-t-2xl sm:rounded-b-none' : ''}`}>
          {/* Thumbnail with Play Button */}
          <div className="relative">
            <Link href={`/courses/${course.slug}`} className="block">
              <div className="relative h-40 sm:h-48 bg-gray-200 overflow-hidden">
                {/* Thumbnail Image */}
                {course.thumbnail ? (
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    className="object-cover transition-all duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-primary-900 flex items-center justify-center">
                    <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}

                {course.category && (
                  <span className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-white/90 backdrop-blur-sm px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium text-gray-700 z-10">
                    {course.category.name}
                  </span>
                )}
              </div>
            </Link>

            {/* Play Button Overlay (if demo video exists) */}
            {course.demoVideoUrl && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsVideoModalOpen(true);
                }}
                className="absolute inset-0 flex items-center justify-center z-10 group/play"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-accent-600 hover:bg-accent-700 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110">
                  <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white ml-1" fill="white" />
                </div>
              </button>
            )}
          </div>

        {/* Content */}
        <div className="p-3 sm:p-5 flex flex-col">
          <Link href={`/courses/${course.slug}`}>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-primary-900 transition-colors line-clamp-2 min-h-[44px] sm:min-h-[56px]">
              {course.title}
            </h3>
          </Link>
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-600 line-clamp-2 min-h-[32px] sm:min-h-[40px]">
            {course.shortDescription || '\u00A0'}
          </p>
          <div className="mt-3 sm:mt-4 flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
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

      {/* Video Preview Modal */}
      {course.demoVideoUrl && (
        <VideoPreviewModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          videoUrl={course.demoVideoUrl}
          title={course.title}
        />
      )}
    </>
  );
};
