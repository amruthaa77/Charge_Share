import React, { useState, useEffect } from 'react';
import { BAY_IMAGES, BAY_FALLBACK_SVG, getBayThumbnail } from '../../constants/bayImages';

/**
 * High-performance, zero-CLS BayImage component.
 * Features:
 * - 16:9 fixed aspect ratio with width and height attributes (zero cumulative layout shift).
 * - Multi-tier progressive fallback: on error, tries next BAY_IMAGE, then brand bay-fallback.svg.
 * - Under no circumstance renders a broken-image icon or missing alt box.
 * - Native lazy loading below fold, eager loading for hero.
 * - Responsive WebP srcSet for thumbnail and 1200px hero views.
 */
export const BayImage = ({
  src,
  bayTitle = '',
  alt,
  priority = false,
  isThumbnail = false,
  className = '',
  aspectRatio = 'aspect-[16/9]',
  width,
  height,
  style,
  ...rest
}) => {
  // Normalize candidate source
  const getInitialSource = () => {
    if (src && typeof src === 'string' && src.trim() !== '') {
      return isThumbnail ? getBayThumbnail(src) : src;
    }
    return isThumbnail ? getBayThumbnail(BAY_IMAGES[0]) : BAY_IMAGES[0];
  };

  const [currentSrc, setCurrentSrc] = useState(getInitialSource);
  const [fallbackStep, setFallbackStep] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasTotalFailure, setHasTotalFailure] = useState(false);

  useEffect(() => {
    setCurrentSrc(getInitialSource());
    setFallbackStep(0);
    setIsLoaded(false);
    setHasTotalFailure(false);
  }, [src, isThumbnail]);

  const handleImageError = () => {
    if (fallbackStep === 0) {
      // Step 1: Try alternate bay photo from BAY_IMAGES
      const nextImg = isThumbnail ? getBayThumbnail(BAY_IMAGES[1]) : BAY_IMAGES[1];
      setCurrentSrc(nextImg);
      setFallbackStep(1);
    } else if (fallbackStep === 1) {
      // Step 2: Try neutral brand SVG fallback
      setCurrentSrc(BAY_FALLBACK_SVG);
      setFallbackStep(2);
    } else {
      // Step 3: Complete fallback - show CSS vector shield without broken image
      setHasTotalFailure(true);
    }
  };

  const defaultWidth = width || (isThumbnail ? 480 : 1200);
  const defaultHeight = height || (isThumbnail ? 270 : 675);

  const meaningfulAlt =
    alt ||
    (bayTitle
      ? `Electric scooter charging bay: ${bayTitle}`
      : 'Electric scooter charging bay in Bengaluru');

  // Generate srcSet if using WebP assets
  let srcSet = undefined;
  let sizes = undefined;

  if (currentSrc && currentSrc.includes('/images/bays/bay-') && currentSrc.endsWith('.webp')) {
    const hero = currentSrc.replace('-thumb.webp', '.webp');
    const thumb = getBayThumbnail(hero);
    srcSet = `${thumb} 480w, ${hero} 1200w`;
    sizes = isThumbnail
      ? '(max-width: 640px) 96px, 120px'
      : '(max-width: 768px) 100vw, 1200px';
  }

  if (hasTotalFailure) {
    return (
      <div
        className={`w-full h-full ${aspectRatio} bg-surface-elevated border border-border flex items-center justify-center text-brand/40 overflow-hidden ${className}`}
        aria-label={meaningfulAlt}
        role="img"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="w-8 h-8 opacity-40"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full ${aspectRatio} overflow-hidden bg-bg-soft ${className}`}
      style={style}
    >
      <img
        src={currentSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={meaningfulAlt}
        width={defaultWidth}
        height={defaultHeight}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onError={handleImageError}
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        {...rest}
      />
    </div>
  );
};

export default BayImage;
