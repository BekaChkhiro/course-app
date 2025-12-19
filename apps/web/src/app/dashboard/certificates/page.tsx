'use client';

import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/student/StudentLayout';
import { studentApiClient, Certificate } from '@/lib/api/studentApi';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ka-GE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function CertificateCard({ certificate }: { certificate: Certificate }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Certificate Preview */}
      <div className="relative h-36 sm:h-48 bg-primary-900 p-4 sm:p-6">
        <div className="absolute inset-0 bg-black bg-opacity-10" />
        <div className="relative text-white">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span className="font-semibold text-xs sm:text-base">სერტიფიკატი</span>
            </div>
          </div>
          <h3 className="text-sm sm:text-lg font-bold line-clamp-2 mb-1 sm:mb-2">{certificate.courseName}</h3>
          <p className="text-xs sm:text-sm text-white text-opacity-80 line-clamp-1">
            გადაეცა: {certificate.studentName}
          </p>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-10 h-10 sm:w-16 sm:h-16 border-2 border-white border-opacity-20 rounded-full" />
        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 w-5 h-5 sm:w-8 sm:h-8 border-2 border-white border-opacity-20 rounded-full" />
      </div>

      {/* Certificate Details */}
      <div className="p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm mb-3 sm:mb-4">
          <div>
            <p className="text-gray-500">ქულა</p>
            <p className="font-medium text-gray-900">{Math.round(Number(certificate.score))}%</p>
          </div>
          <div>
            <p className="text-gray-500">გაცემის თარიღი</p>
            <p className="font-medium text-gray-900">{formatDate(certificate.issuedAt)}</p>
          </div>
        </div>

        <div className="mb-3 sm:mb-4">
          <p className="text-[10px] sm:text-xs text-gray-400">სერტიფიკატის ID</p>
          <p className="text-xs sm:text-sm font-mono text-gray-600 truncate">{certificate.certificateNumber}</p>
        </div>

        <div className="flex gap-2">
          {certificate.pdfUrl && (
            <a
              href={certificate.pdfUrl}
              download
              className="flex-1 inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors text-xs sm:text-sm font-medium"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              ჩამოტვირთვა
            </a>
          )}
          <button
            onClick={() => {
              // Would open share modal or copy link
              if (navigator.share) {
                navigator.share({
                  title: `სერტიფიკატი - ${certificate.courseName}`,
                  text: `დავასრულე ${certificate.courseName} კურსი ${Math.round(Number(certificate.score))}% შედეგით!`,
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('ბმული კოპირებულია!');
              }
            }}
            className="px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm font-medium"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CertificatesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['certificates'],
    queryFn: studentApiClient.getCertificates,
    staleTime: 60000,
  });

  const certificates = data?.data.certificates || [];

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">სერტიფიკატები</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">თქვენი კურსების დასრულების სერტიფიკატები</p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 rounded-xl h-64 sm:h-80 animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6 text-center">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-600 font-medium text-sm sm:text-base">სერტიფიკატების ჩატვირთვა ვერ მოხერხდა</p>
          </div>
        )}

        {/* Certificates Grid */}
        {!isLoading && !error && certificates.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {certificates.map((certificate) => (
              <CertificateCard key={certificate.id} certificate={certificate} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && certificates.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1.5 sm:mb-2">სერტიფიკატები ჯერ არ არის</h3>
            <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6 max-w-md mx-auto">
              დაასრულეთ კურსები და ჩააბარეთ საბოლოო გამოცდები სერტიფიკატების მისაღებად.
            </p>
            <a
              href="/dashboard/courses"
              className="inline-flex items-center px-4 py-2 bg-accent-600 text-white text-sm rounded-lg hover:bg-accent-700 transition-colors"
            >
              სწავლის დაწყება
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
