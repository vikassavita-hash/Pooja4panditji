import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GalleryItem } from '../types';

interface ImageSliderProps {
  images: GalleryItem[];
  autoplayInterval?: number;
}

export default function ImageSlider({ images, autoplayInterval = 5000 }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAutoplay) return;
    const t = setInterval(() => setCurrentIndex((p) => (p + 1) % images.length), autoplayInterval);
    return () => clearInterval(t);
  }, [isAutoplay, images.length, autoplayInterval]);

  // compute shortest offset (wrap-around) between currentIndex and index
  const offsetFor = (index: number) => {
    const len = images.length;
    let diff = index - currentIndex;
    if (diff > len / 2) diff -= len;
    if (diff < -len / 2) diff += len;
    return diff;
  };

  const goPrev = () => { setIsAutoplay(false); setCurrentIndex((p) => (p - 1 + images.length) % images.length); };
  const goNext = () => { setIsAutoplay(false); setCurrentIndex((p) => (p + 1) % images.length); };
  const goTo = (i: number) => { setIsAutoplay(false); setCurrentIndex(i); };

  // touch support
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    let startX = 0; let moved = 0;
    const onTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; moved = 0; };
    const onTouchMove = (e: TouchEvent) => { moved = e.touches[0].clientX - startX; };
    const onTouchEnd = () => { if (moved > 50) goPrev(); else if (moved < -50) goNext(); };
    el.addEventListener('touchstart', onTouchStart); el.addEventListener('touchmove', onTouchMove); el.addEventListener('touchend', onTouchEnd);
    return () => { el.removeEventListener('touchstart', onTouchStart); el.removeEventListener('touchmove', onTouchMove); el.removeEventListener('touchend', onTouchEnd); };
  }, [containerRef.current, images.length]);

  if (!images || images.length === 0) return null;

  return (
    <div className="w-full bg-gradient-to-b from-orange-50 to-white py-12">
      <div className="relative w-full overflow-hidden" ref={containerRef}>
        <div className="relative mx-auto max-w-none w-full" style={{ height: '520px' }}>
          {/* Slides */}
          {images.map((img, idx) => {
            const offset = offsetFor(idx);
            const abs = Math.abs(offset);
            const visible = abs <= 3; // keep only near slides visible
            const translateX = offset * 46; // percent shift per offset
            const rotateY = offset * -18; // degrees
            const scale = 1 - Math.min(0.22, abs * 0.12);
            const zIndex = 50 - abs;
            const opacity = visible ? 1 : 0;

            return (
              <div
                key={img.id}
                className="coverflow-slide absolute top-1/2 left-1/2 pointer-events-auto"
                style={{
                  transform: `translate(-50%, -50%) translateX(${translateX}%) rotateY(${rotateY}deg) scale(${scale})`,
                  transition: 'transform 700ms cubic-bezier(.2,.9,.2,1), opacity 500ms ease',
                  zIndex,
                  opacity
                }}
                onClick={() => goTo(idx)}
                aria-hidden={opacity === 0}
              >
                <div className="relative w-[60vw] max-w-[820px] h-[380px] rounded-2xl overflow-hidden shadow-2xl bg-gray-200">
                  <img src={img.imageUrl} alt={img.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                    <h3 className="text-white text-2xl md:text-4xl font-bold mb-2">{img.title}</h3>
                    <p className="text-white/90 text-sm md:text-base line-clamp-2">{img.description}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Controls */}
          <button onClick={goPrev} className="absolute left-6 top-1/2 -translate-y-1/2 z-40 bg-white/90 p-3 rounded-full shadow-lg">
            <ChevronLeft size={22} />
          </button>
          <button onClick={goNext} className="absolute right-6 top-1/2 -translate-y-1/2 z-40 bg-white/90 p-3 rounded-full shadow-lg">
            <ChevronRight size={22} />
          </button>

          {/* Pagination */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-6 flex items-center gap-2 z-40">
            {images.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} className={`h-3 rounded-full transition-all ${i === currentIndex ? 'bg-orange-600 w-8 slider-dot active' : 'bg-orange-200 w-3'}`} aria-label={`Go to slide ${i+1}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
