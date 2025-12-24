'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '@/lib/api/publicApi';

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const { data: faqs, isLoading } = useQuery({
    queryKey: ['public-faqs'],
    queryFn: () => publicApi.getFAQs(),
  });

  if (isLoading) {
    return (
      <section className="py-10 sm:py-16 lg:py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 sm:mb-12">
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900">ხშირად დასმული კითხვები</h2>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg sm:rounded-xl h-14 sm:h-16 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!faqs || faqs.length === 0) {
    return null;
  }

  return (
    <section className="py-10 sm:py-16 lg:py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 sm:mb-12">
          <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900">ხშირად დასმული კითხვები</h2>
          <p className="mt-2 sm:mt-4 text-sm sm:text-base lg:text-lg text-gray-600">
            პასუხები ყველაზე გავრცელებულ კითხვებზე
          </p>
        </div>

        <div className="space-y-2 sm:space-y-4">
          {faqs.map((faq: any, index: number) => (
            <div
              key={faq.id}
              className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-3 sm:p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-sm sm:text-base text-gray-900 pr-3 sm:pr-4">{faq.question}</span>
                <svg
                  className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === index && (
                <div className="px-3 pb-3 sm:px-5 sm:pb-5">
                  <p className="text-sm sm:text-base text-gray-600 whitespace-pre-line">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
