// src/components/DealImageCarousel.tsx
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DealImageCarouselProps {
  images: string | string[] | null | undefined;
  title: string;
  onImageClick?: (imageUrl: string, imageIndex: number) => void;
}

const PLACEHOLDER_IMAGE =
  'https://cexezutizzchdpsspghx.supabase.co/storage/v1/object/public/assets/deal-placeholder.jpg';

export const DealImageCarousel: React.FC<DealImageCarouselProps> = ({
  images,
  title,
  onImageClick,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Normalize input to array
  const inputImages = Array.isArray(images)
    ? images
    : images
    ? [images]
    : [];

  // Clean invalid / empty values
  const cleanedImages = inputImages.map((img) =>
    typeof img === 'string' && img.trim() !== ''
      ? img
      : PLACEHOLDER_IMAGE
  );

  // Ensure at least one image always exists
  const displayImages =
    cleanedImages.length > 0 ? cleanedImages : [PLACEHOLDER_IMAGE];

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  const handleImageClick = () => {
    setIsExpanded(true);
    if (onImageClick) {
      onImageClick(displayImages[currentIndex], currentIndex);
    }
  };

  return (
    <>
      <div className="relative w-full">
        <div className="relative overflow-hidden rounded-lg">
          <img
            src={displayImages[currentIndex]}
            alt={`${title} - Image ${currentIndex + 1}`}
            className="w-full h-38 object-cover cursor-pointer transition-transform hover:scale-105"
            style={{ height: '154px' }}
            onClick={handleImageClick}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== PLACEHOLDER_IMAGE) {
                target.src = PLACEHOLDER_IMAGE;
              }
            }}
          />

          {displayImages.length > 1 && (
            <>
              <Button
                onClick={prevImage}
                variant="ghost"
                size="sm"
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 h-8 w-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <Button
                onClick={nextImage}
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {displayImages.length > 1 && (
          <div className="flex justify-center mt-2 gap-1">
            {displayImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {isExpanded && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsExpanded(false)}
        >
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-[70]"
            aria-label="Close expanded view"
          >
            <X className="w-8 h-8" />
          </button>

          <img
            src={displayImages[currentIndex]}
            alt={`${title} - Expanded`}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== PLACEHOLDER_IMAGE) {
                target.src = PLACEHOLDER_IMAGE;
              }
            }}
          />
        </div>
      )}
    </>
  );
};

export default DealImageCarousel;
