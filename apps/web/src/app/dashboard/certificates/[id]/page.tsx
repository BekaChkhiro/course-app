'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { studentApiClient } from '@/lib/api/studentApi';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';

function formatDate(date: string): string {
  const months = [
    'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
    'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
  ];
  const d = new Date(date);
  return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

export default function CertificateViewPage() {
  const params = useParams();
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const certificateId = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['certificate', certificateId],
    queryFn: () => studentApiClient.getCertificateById(certificateId),
    staleTime: 60000,
  });

  const certificate = data?.data;

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
      pdf.save(`certificate-${certificate?.certificateNumber}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-900" />
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">სერტიფიკატი ვერ მოიძებნა</h2>
          <p className="text-gray-500 mb-6">ეს სერტიფიკატი არ არსებობს ან თქვენ არ გაქვთ მასზე წვდომა.</p>
          <Link
            href="/dashboard/certificates"
            className="inline-flex items-center px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            სერტიფიკატებზე დაბრუნება
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/dashboard/certificates"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">სერტიფიკატებზე დაბრუნება</span>
            <span className="sm:hidden">უკან</span>
          </Link>

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
            <span className="hidden sm:inline">{isDownloading ? 'იტვირთება...' : 'PDF ჩამოტვირთვა'}</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>

      {/* Certificate */}
      <div className="py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Certificate Container */}
          <div
            ref={certificateRef}
            className="bg-white shadow-2xl overflow-hidden aspect-[1.414/1]"
          >
            {/* Certificate Design */}
            <div className="relative w-full h-full flex flex-col" style={{ background: 'linear-gradient(135deg, #fefefe 0%, #f8f9fa 100%)' }}>

              {/* Elegant outer border */}
              <div className="absolute inset-[3%] sm:inset-4 border-2 border-primary-900/30" />
              <div className="absolute inset-[4%] sm:inset-5 border border-primary-900/20" />

              {/* Corner ornaments */}
              <div className="absolute top-[5%] left-[5%] sm:top-8 sm:left-8 w-[8%] sm:w-16 aspect-square">
                <svg viewBox="0 0 100 100" className="w-full h-full text-accent-500/50">
                  <path d="M0 0 L100 0 L100 20 L20 20 L20 100 L0 100 Z" fill="currentColor"/>
                </svg>
              </div>
              <div className="absolute top-[5%] right-[5%] sm:top-8 sm:right-8 w-[8%] sm:w-16 aspect-square rotate-90">
                <svg viewBox="0 0 100 100" className="w-full h-full text-accent-500/50">
                  <path d="M0 0 L100 0 L100 20 L20 20 L20 100 L0 100 Z" fill="currentColor"/>
                </svg>
              </div>
              <div className="absolute bottom-[5%] left-[5%] sm:bottom-8 sm:left-8 w-[8%] sm:w-16 aspect-square -rotate-90">
                <svg viewBox="0 0 100 100" className="w-full h-full text-accent-500/50">
                  <path d="M0 0 L100 0 L100 20 L20 20 L20 100 L0 100 Z" fill="currentColor"/>
                </svg>
              </div>
              <div className="absolute bottom-[5%] right-[5%] sm:bottom-8 sm:right-8 w-[8%] sm:w-16 aspect-square rotate-180">
                <svg viewBox="0 0 100 100" className="w-full h-full text-accent-500/50">
                  <path d="M0 0 L100 0 L100 20 L20 20 L20 100 L0 100 Z" fill="currentColor"/>
                </svg>
              </div>

              {/* Decorative lines at top */}
              <div className="absolute top-[8%] sm:top-14 left-1/2 transform -translate-x-1/2 flex items-center gap-2 sm:gap-3">
                <div className="w-12 sm:w-24 h-px bg-gradient-to-r from-transparent via-accent-500/50 to-transparent" />
                <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-accent-500/50 rotate-45" />
                <div className="w-12 sm:w-24 h-px bg-gradient-to-r from-transparent via-accent-500/50 to-transparent" />
              </div>

              {/* Main Content */}
              <div className="relative flex-1 flex flex-col items-center justify-center text-center z-10 px-4 sm:px-16 py-6 sm:py-12">

                {/* Logo */}
                <div className="mb-2 sm:mb-4">
                  <img
                    src="/kursebi-logo.png"
                    alt="Kursebi.online"
                    className="h-6 sm:h-14 w-auto mx-auto"
                  />
                </div>

                {/* Title with decorative elements */}
                <div className="mb-2 sm:mb-6">
                  <h1 className="text-base sm:text-4xl font-serif font-bold tracking-wider" style={{ color: '#0e3355' }}>
                    სერტიფიკატი
                  </h1>
                </div>

                {/* Decorative divider */}
                <div className="flex items-center gap-1 sm:gap-3 mb-2 sm:mb-6">
                  <div className="w-8 sm:w-20 h-px bg-gradient-to-r from-transparent to-accent-500" />
                  <svg className="w-2.5 h-2.5 sm:w-5 sm:h-5 text-accent-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <div className="w-8 sm:w-20 h-px bg-gradient-to-l from-transparent to-accent-500" />
                </div>

                {/* Student Name */}
                <h2 className="text-sm sm:text-3xl font-serif font-bold mb-1.5 sm:mb-5 px-2" style={{ color: '#0e3355' }}>
                  {certificate.studentName}
                </h2>

                {/* Underline decoration */}
                <div className="w-24 sm:w-64 h-0.5 bg-gradient-to-r from-transparent via-accent-500 to-transparent mb-2 sm:mb-6" />

                {/* Course completion text */}
                <p className="text-gray-500 text-[8px] sm:text-sm mb-0.5 sm:mb-2">წარმატებით დაასრულა კურსი</p>

                {/* Course Name */}
                <h3 className="text-[10px] sm:text-xl font-semibold text-primary-800 mb-2 sm:mb-6 max-w-[150px] sm:max-w-xl px-2 leading-tight">
                  „{certificate.courseName}"
                </h3>

                {/* Score Badge */}
                <div className="flex items-center justify-center gap-1 sm:gap-3 mb-2 sm:mb-6">
                  <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-6 py-0.5 sm:py-2 bg-gradient-to-r from-accent-50 to-accent-100 border border-accent-200 rounded-full">
                    <svg className="w-2.5 h-2.5 sm:w-5 sm:h-5 text-accent-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span className="text-[10px] sm:text-base font-bold text-accent-700">
                      {Math.round(Number(certificate.score))}%
                    </span>
                  </div>
                </div>

                {/* Date and Certificate Info */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-8 text-[7px] sm:text-xs text-gray-400">
                  <div className="flex items-center gap-0.5 sm:gap-1.5">
                    <span className="text-gray-500">თარიღი:</span>
                    <span className="font-medium text-gray-600">{formatDate(certificate.issuedAt)}</span>
                  </div>
                  <div className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full" />
                  <div className="flex items-center gap-0.5 sm:gap-1.5">
                    <span className="text-gray-500">ID:</span>
                    <span className="font-mono text-gray-600 text-[6px] sm:text-xs">{certificate.certificateNumber}</span>
                  </div>
                </div>
              </div>

              {/* Bottom decorative line */}
              <div className="absolute bottom-[8%] sm:bottom-14 left-1/2 transform -translate-x-1/2 flex items-center gap-1.5 sm:gap-2">
                <div className="w-6 sm:w-12 h-px bg-gradient-to-r from-transparent to-primary-900/20" />
                <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-primary-900/20 rounded-full" />
                <div className="w-6 sm:w-12 h-px bg-gradient-to-l from-transparent to-primary-900/20" />
              </div>
            </div>
          </div>

          {/* Certificate Details Card */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              სერტიფიკატის დეტალები
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">სტუდენტი</p>
                <p className="font-medium text-gray-900">{certificate.studentName}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">კურსი</p>
                <p className="font-medium text-gray-900 truncate">{certificate.courseName}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">ქულა</p>
                <p className="font-medium text-gray-900">{Math.round(Number(certificate.score))}%</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">გაცემის თარიღი</p>
                <p className="font-medium text-gray-900">{formatDate(certificate.issuedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
