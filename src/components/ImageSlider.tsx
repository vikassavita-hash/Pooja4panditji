import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GalleryItem } from '../types';

interface ImageSliderProps {
  images: GalleryItem[];
  autoplayInterval?: number;
}

export default function ImageSlider({ images, autoplayInterval = 5000 }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);

  if (!images || images.length === 0) {
    return null;
  }

  useEffect(() => {
    if (!isAutoplay) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, autoplayInterval);

    return () => clearInterval(timer);
  }, [isAutoplay, images.length, autoplayInterval]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setIsAutoplay(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setIsAutoplay(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoplay(false);
  };

  const currentImage = images[currentIndex];

  return (
    <div className="relative w-full bg-gradient-to-b from-orange-50 to-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Main Slider Container */}
        <div className="relative h-96 md:h-[500px] rounded-lg overflow-hidden shadow-2xl group bg-slate-200">
          {/* Images */}
          {images.map((img, index) => (
            <div
              key={img.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={img.imageUrl}
                alt={img.title}
                className="w-full h-full object-cover"
              />
              {/* Overlay with Title and Description */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-6">
                <h3 className="text-white text-2xl md:text-3xl font-bold mb-2">
                  {img.title}
                </h3>
                <p className="text-white/90 text-sm md:text-base line-clamp-2">
                  {img.description}
                </p>
              </div>
            </div>
          ))}

          {/* Previous Button */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-orange-600 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
            aria-label="Previous slide"
          >
            <ChevronLeft size={28} />
          </button>

          {/* Next Button */}
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-orange-600 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
            aria-label="Next slide"
          >
            <ChevronRight size={28} />
          </button>

          {/* Autoplay Toggle */}
          <button
            onClick={() => setIsAutoplay(!isAutoplay)}
            className="absolute bottom-4 right-4 z-20 bg-white/80 hover:bg-white text-orange-600 px-3 py-1 rounded-full text-sm font-medium transition-all"
          >
            {isAutoplay ? '⏸ Pause' : '▶ Play'}
          </button>
        </div>

        {/* Dot Indicators */}
        <div className="flex justify-center items-center gap-2 mt-6">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-3 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-orange-600 w-8'
                  : 'bg-orange-200 w-3 hover:bg-orange-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Slide Counter */}
        <div className="text-center mt-4 text-gray-600 text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  );
}
