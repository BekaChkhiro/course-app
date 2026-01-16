import React from 'react';

interface CertificateDisplayProps {
  studentName: string;
  courseName: string;
  issuedAt: string;
  certificateNumber: string;
  className?: string;
}

function formatDate(date: string): string {
  const months = [
    'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
    'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
  ];
  const d = new Date(date);
  return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

export default function CertificateDisplay({
  studentName,
  courseName,
  issuedAt,
  certificateNumber,
  className = '',
}: CertificateDisplayProps) {
  return (
    <div className={`relative bg-white ${className}`} style={{ aspectRatio: '1.414 / 1' }}>
      {/* Background Image */}
      <img
        src="/certificate.jpeg"
        alt="Certificate Background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-8 sm:px-16 md:px-24 pt-2 sm:pt-3 md:pt-4 pb-16 sm:pb-24 md:pb-32 text-center">
        {/* Logo Section */}
        <div className="mb-3 sm:mb-4 md:mb-6">
          <img
            src="/kursebi-logo.png"
            alt="KURSEBI .ONLINE"
            className="h-8 sm:h-10 md:h-14 w-auto mx-auto"
          />
        </div>

        {/* Title - სერტიფიკატი in large red text */}
        <h1 
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 md:mb-5" 
          style={{ 
            color: '#ff4d40',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          სერტიფიკატი
        </h1>

        {/* Introductory phrase - ადასტურებს, რომ */}
        <p 
          className="text-xs sm:text-sm md:text-base mb-3 sm:mb-4 md:mb-6" 
          style={{ 
            color: '#0e3355',
            textShadow: '0 1px 2px rgba(255,255,255,0.8)'
          }}
        >
          ადასტურებს, რომ
        </p>

        {/* Student Name - Large bold dark blue */}
        <h2 
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 md:mb-6 px-2 sm:px-3 md:px-4" 
          style={{ 
            color: '#0e3355',
            textShadow: '0 1px 2px rgba(255,255,255,0.8)'
          }}
        >
          {studentName}
        </h2>

        {/* Completion statement */}
        <p 
          className="text-xs sm:text-sm md:text-base mb-2 sm:mb-2 md:mb-3 px-2 sm:px-3 md:px-0" 
          style={{ 
            color: '#0e3355',
            textShadow: '0 1px 2px rgba(255,255,255,0.8)'
          }}
        >
          წარმატებით დაასრულა ონლაინ პროგრამა, პლატფორმა{' '}
          <span className="font-semibold">Kursebi.Online-ზე</span>
        </p>

        {/* Course Title - Large red text */}
        <h3 
          className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mt-2 sm:mt-3 md:mt-4 px-2 sm:px-3 md:px-4" 
          style={{ 
            color: '#ff4d40',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          {courseName}
        </h3>

        {/* Footer */}
        <div className="absolute bottom-6 sm:bottom-10 md:bottom-16 left-0 right-0 flex justify-between px-8 sm:px-16 md:px-24">
          {/* Date on left */}
          <div className="text-left">
            <p 
              className="text-[10px] sm:text-xs md:text-sm font-medium mb-0.5 sm:mb-1" 
              style={{ 
                color: '#0e3355',
                textShadow: '0 1px 2px rgba(255,255,255,0.8)'
              }}
            >
              თარიღი:
            </p>
            <p 
              className="text-[10px] sm:text-xs md:text-sm" 
              style={{ 
                color: '#0e3355',
                textShadow: '0 1px 2px rgba(255,255,255,0.8)'
              }}
            >
              {formatDate(issuedAt)}
            </p>
          </div>

          {/* ID on right */}
          <div className="text-right">
            <p 
              className="text-[10px] sm:text-xs md:text-sm font-medium mb-0.5 sm:mb-1" 
              style={{ 
                color: '#0e3355',
                textShadow: '0 1px 2px rgba(255,255,255,0.8)'
              }}
            >
              ID:
            </p>
            <p 
              className="text-[10px] sm:text-xs md:text-sm font-mono" 
              style={{ 
                color: '#0e3355',
                textShadow: '0 1px 2px rgba(255,255,255,0.8)'
              }}
            >
              {certificateNumber}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
