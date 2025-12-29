'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Award, CheckCircle, BookOpen, Loader2, Download, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { studentApiClient } from '@/lib/api/studentApi';
import toast from 'react-hot-toast';

interface CourseCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  completedChapters: number;
  totalChapters: number;
  certificate?: {
    id: string;
    certificateNumber: string;
    studentName?: string;
    issuedAt: string;
    pdfUrl: string | null;
  } | null;
  onCertificateGenerated?: () => void;
}

function formatDate(date: string): string {
  const months = [
    'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
    'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
  ];
  const d = new Date(date);
  return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

const CourseCompletionModal: React.FC<CourseCompletionModalProps> = ({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  completedChapters,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  totalChapters: _totalChapters,
  certificate,
  onCertificateGenerated,
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] = useState(certificate);
  const [viewMode, setViewMode] = useState<'completion' | 'certificate'>('completion');
  const [isDownloading, setIsDownloading] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (certificate) {
      setGeneratedCertificate(certificate);
      if (certificate.studentName) {
        setStudentName(certificate.studentName);
      }
    }
  }, [certificate]);

  useEffect(() => {
    if (isOpen && !showConfetti) {
      setShowConfetti(true);
      // Fire confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#0e3355', '#ff4d40', '#10b981'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#0e3355', '#ff4d40', '#10b981'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isOpen, showConfetti]);

  // Reset view mode when modal closes
  useEffect(() => {
    if (!isOpen) {
      setViewMode('completion');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerateCertificate = async () => {
    if (!studentName.trim()) {
      toast.error('გთხოვთ შეიყვანოთ სახელი და გვარი');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await studentApiClient.generateCertificate(courseId, studentName.trim());
      if (result.success) {
        setGeneratedCertificate(result.data);
        toast.success(result.message || 'სერტიფიკატი შეიქმნა');
        onCertificateGenerated?.();
      } else {
        toast.error(result.message || 'შეცდომა');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'სერტიფიკატის გენერაცია ვერ მოხერხდა');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewCertificate = () => {
    setViewMode('certificate');
  };

  const handleBackToCompletion = () => {
    setViewMode('completion');
  };

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
      pdf.save(`certificate-${generatedCertificate?.certificateNumber}.pdf`);
      toast.success('PDF ჩამოიტვირთა');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('PDF ჩამოტვირთვა ვერ მოხერხდა');
    } finally {
      setIsDownloading(false);
    }
  };

  // Certificate View Mode
  if (viewMode === 'certificate' && generatedCertificate) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
            <button
              onClick={handleBackToCompletion}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>უკან</span>
            </button>

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
          <div className="overflow-auto p-3 sm:p-6 bg-gray-100">
            <div
              ref={certificateRef}
              className="bg-white shadow-xl mx-auto min-h-[380px] sm:min-h-0 aspect-[1/1.3] sm:aspect-[1.414/1] max-w-[800px]"
            >
              {/* Certificate Design */}
              <div className="relative w-full h-full flex flex-col" style={{ background: 'linear-gradient(135deg, #fefefe 0%, #f8f9fa 100%)' }}>

                {/* Elegant outer border - hidden on mobile */}
                <div className="hidden sm:block absolute inset-4 border-2 border-primary-900/30" />
                <div className="hidden sm:block absolute inset-5 border border-primary-900/20" />

                {/* Simple border for mobile */}
                <div className="sm:hidden absolute inset-2 border border-primary-900/20" />

                {/* Corner ornaments - hidden on mobile */}
                <div className="hidden sm:block absolute top-8 left-8 w-14 h-14">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-accent-500/50">
                    <path d="M0 0 L100 0 L100 20 L20 20 L20 100 L0 100 Z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="hidden sm:block absolute top-8 right-8 w-14 h-14 rotate-90">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-accent-500/50">
                    <path d="M0 0 L100 0 L100 20 L20 20 L20 100 L0 100 Z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="hidden sm:block absolute bottom-8 left-8 w-14 h-14 -rotate-90">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-accent-500/50">
                    <path d="M0 0 L100 0 L100 20 L20 20 L20 100 L0 100 Z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="hidden sm:block absolute bottom-8 right-8 w-14 h-14 rotate-180">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-accent-500/50">
                    <path d="M0 0 L100 0 L100 20 L20 20 L20 100 L0 100 Z" fill="currentColor"/>
                  </svg>
                </div>

                {/* Decorative lines at top - hidden on mobile */}
                <div className="hidden sm:flex absolute top-12 left-1/2 transform -translate-x-1/2 items-center gap-2">
                  <div className="w-20 h-px bg-gradient-to-r from-transparent via-accent-500/50 to-transparent" />
                  <div className="w-1.5 h-1.5 bg-accent-500/50 rotate-45" />
                  <div className="w-20 h-px bg-gradient-to-r from-transparent via-accent-500/50 to-transparent" />
                </div>

                {/* Main Content */}
                <div className="relative flex-1 flex flex-col items-center justify-center text-center z-10 px-4 sm:px-12 py-6 sm:py-10">

                  {/* Logo */}
                  <div className="mb-3 sm:mb-3">
                    <img
                      src="/kursebi-logo.png"
                      alt="Kursebi.online"
                      className="h-10 sm:h-12 w-auto mx-auto"
                    />
                  </div>

                  {/* Title with decorative elements */}
                  <div className="mb-4 sm:mb-4">
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-wider" style={{ color: '#0e3355' }}>
                      სერტიფიკატი
                    </h1>
                  </div>

                  {/* Decorative divider */}
                  <div className="flex items-center gap-2 mb-4 sm:mb-4">
                    <div className="w-12 sm:w-16 h-px bg-gradient-to-r from-transparent to-accent-500" />
                    <svg className="w-4 h-4 sm:w-4 sm:h-4 text-accent-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <div className="w-12 sm:w-16 h-px bg-gradient-to-l from-transparent to-accent-500" />
                  </div>

                  {/* Student Name */}
                  <h2 className="text-xl sm:text-2xl font-serif font-bold mb-3 sm:mb-3 px-2" style={{ color: '#0e3355' }}>
                    {generatedCertificate.studentName}
                  </h2>

                  {/* Underline decoration */}
                  <div className="w-40 sm:w-48 h-0.5 bg-gradient-to-r from-transparent via-accent-500 to-transparent mb-4 sm:mb-4" />

                  {/* Course completion text */}
                  <p className="text-gray-500 text-xs sm:text-xs mb-2">წარმატებით დაასრულა კურსი</p>

                  {/* Course Name */}
                  <h3 className="text-base sm:text-lg font-semibold text-primary-800 mb-4 sm:mb-4 max-w-md px-2 leading-snug">
                    „{courseTitle}"
                  </h3>

                  {/* Date and Certificate Info */}
                  <div className="flex flex-col items-center gap-1 sm:gap-0 sm:flex-row sm:justify-center sm:gap-6 text-xs sm:text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">თარიღი:</span>
                      <span className="font-medium text-gray-600">{formatDate(generatedCertificate.issuedAt)}</span>
                    </div>
                    <div className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full" />
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">ID:</span>
                      <span className="font-mono text-gray-600 text-[11px]">{generatedCertificate.certificateNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom decorative line - hidden on mobile */}
                <div className="hidden sm:flex absolute bottom-10 left-1/2 transform -translate-x-1/2 items-center gap-2">
                  <div className="w-10 h-px bg-gradient-to-r from-transparent to-primary-900/20" />
                  <div className="w-1.5 h-1.5 bg-primary-900/20 rounded-full" />
                  <div className="w-10 h-px bg-gradient-to-l from-transparent to-primary-900/20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Completion View Mode (default)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="bg-primary-900 px-8 pt-10 pb-16 text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Award className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">გილოცავთ! 🎉</h2>
          <p className="text-primary-100">კურსი წარმატებით დაასრულეთ</p>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 -mt-8">
          {/* Stats card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">{courseTitle}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xl font-bold">{completedChapters}</span>
                </div>
                <p className="text-xs text-gray-500">თავი გავლილი</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-accent-600 mb-1">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xl font-bold">100%</span>
                </div>
                <p className="text-xs text-gray-500">პროგრესი</p>
              </div>
            </div>
          </div>

          {/* Certificate section */}
          {generatedCertificate ? (
            // Certificate exists - show info and view button
            <div className="bg-gradient-to-r from-accent-50 to-orange-50 border border-accent-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-accent-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-accent-900">სერტიფიკატი მზადაა!</p>
                  <p className="text-xs text-accent-700">#{generatedCertificate.certificateNumber}</p>
                </div>
              </div>
            </div>
          ) : (
            // No certificate - show name input form
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-blue-900">სერტიფიკატის გენერაცია</p>
                  <p className="text-xs text-blue-700">შეიყვანეთ სახელი და გვარი</p>
                </div>
              </div>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="სახელი გვარი"
                className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {generatedCertificate ? (
              <button
                onClick={handleViewCertificate}
                className="w-full flex items-center justify-center gap-2 py-3 bg-accent-600 text-white rounded-xl font-medium hover:bg-accent-700 transition-colors"
              >
                <Award className="w-4 h-4" />
                სერტიფიკატის ნახვა
              </button>
            ) : (
              <button
                onClick={handleGenerateCertificate}
                disabled={isGenerating || !studentName.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-accent-600 text-white rounded-xl font-medium hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    იტვირთება...
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4" />
                    სერტიფიკატის გენერაცია
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 text-gray-500 text-sm hover:text-gray-700 transition-colors"
            >
              დახურვა
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCompletionModal;
