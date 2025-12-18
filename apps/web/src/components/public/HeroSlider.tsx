'use client';

import { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';

interface Slide {
  id: string;
  imageUrl: string;
  linkUrl?: string | null;
}

interface HeroSliderProps {
  slides: Slide[];
}

export default function HeroSlider({ slides }: HeroSliderProps) {
  const swiperRef = useRef<SwiperType | null>(null);

  if (!slides || slides.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="aspect-[2/1] sm:aspect-[16/9] lg:aspect-[1300/650] relative rounded-xl sm:rounded-2xl overflow-hidden group">
          <Swiper
            modules={[Autoplay, Pagination, Navigation]}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
            }}
            pagination={{
              clickable: true,
            }}
            loop={slides.length > 1}
            className="h-full hero-slider"
          >
            {slides.map((slide) => (
              <SwiperSlide key={slide.id}>
                {slide.linkUrl ? (
                  <Link href={slide.linkUrl} className="block w-full h-full relative">
                    <Image
                      src={slide.imageUrl}
                      alt="Hero slide"
                      fill
                      className="object-cover"
                      priority
                    />
                  </Link>
                ) : (
                  <div className="w-full h-full relative">
                    <Image
                      src={slide.imageUrl}
                      alt="Hero slide"
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                )}
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Custom Navigation Buttons */}
          {slides.length > 1 && (
            <>
              <button
                onClick={() => swiperRef.current?.slidePrev()}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-accent-600 hover:bg-accent-700 text-white rounded-xl flex items-center justify-center transition-all duration-200 shadow-lg hover:scale-105 opacity-0 group-hover:opacity-100"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => swiperRef.current?.slideNext()}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-accent-600 hover:bg-accent-700 text-white rounded-xl flex items-center justify-center transition-all duration-200 shadow-lg hover:scale-105 opacity-0 group-hover:opacity-100"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Custom styles for Swiper pagination */}
      <style jsx global>{`
        .hero-slider .swiper-pagination-bullet {
          background: white;
          opacity: 0.6;
          width: 10px;
          height: 10px;
        }
        .hero-slider .swiper-pagination-bullet-active {
          opacity: 1;
          background: var(--color-accent-500, #f97316);
        }
      `}</style>
    </section>
  );
}
