'use client';

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import StudentLayout from '@/components/student/StudentLayout';
import { studentApiClient, Certificate } from '@/lib/api/studentApi';
import { X, Download, Loader2 } from 'lucide-react';
import CertificateDisplay from '@/components/certificate/CertificateDisplay';

function formatDate(date: string): string {
  const months = [
    'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
    'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
  ];
  const d = new Date(date);
  return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

interface CertificateViewModalProps {
  certificate: Certificate;
  onClose: () => void;
}

function CertificateViewModal({ certificate, onClose }: CertificateViewModalProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;

    setIsDownloading(true);

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`certificate-${certificate.certificateNumber}.pdf`);
      toast.success('PDF ჩამოიტვირთა');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('PDF ჩამოტვირთვა ვერ მოხერხდა');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-[95vw] sm:max-w-4xl w-full overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h3 className="font-semibold text-gray-900">სერტიფიკატი</h3>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isDownloading ? 'იტვირთება...' : 'PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Content */}
        <div className="overflow-auto p-3 sm:p-6 bg-gray-100 flex-1">
          <div
            ref={certificateRef}
            className="bg-white shadow-xl mx-auto max-w-[800px]"
          >
            <CertificateDisplay
              studentName={certificate.studentName}
              courseName={certificate.courseName}
              issuedAt={certificate.issuedAt}
              certificateNumber={certificate.certificateNumber}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CertificateCard({ certificate, onView }: { certificate: Certificate; onView: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all group">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-gray-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-2 mb-1">
              {certificate.courseName}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {certificate.studentName}
            </p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">ქულა</span>
          <span className="font-medium text-gray-900">{Math.round(Number(certificate.score))}%</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">თარიღი</span>
          <span className="text-gray-700">{formatDate(certificate.issuedAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5">
        <button
          onClick={onView}
          className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors text-sm font-medium"
        >
          ნახვა
        </button>
      </div>
    </div>
  );
}

export default function CertificatesPage() {
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);

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
              <CertificateCard
                key={certificate.id}
                certificate={certificate}
                onView={() => setSelectedCertificate(certificate)}
              />
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

      {/* Certificate View Modal */}
      {selectedCertificate && (
        <CertificateViewModal
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}
    </StudentLayout>
  );
}
