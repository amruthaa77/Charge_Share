/**
 * Canonical Bay Images configuration for ChargeShare India.
 * 10 verified electric two-wheeler charging bay photographs provided by project owner.
 */

export const BAY_IMAGES = [
  '/images/bays/bay-1.webp',
  '/images/bays/bay-2.webp',
  '/images/bays/bay-3.webp',
  '/images/bays/bay-4.webp',
  '/images/bays/bay-5.webp',
  '/images/bays/bay-6.webp',
  '/images/bays/bay-7.webp',
  '/images/bays/bay-8.webp',
  '/images/bays/bay-9.webp',
  '/images/bays/bay-10.webp',
];

export const BAY_THUMBNAILS = [
  '/images/bays/bay-1-thumb.webp',
  '/images/bays/bay-2-thumb.webp',
  '/images/bays/bay-3-thumb.webp',
  '/images/bays/bay-4-thumb.webp',
  '/images/bays/bay-5-thumb.webp',
  '/images/bays/bay-6-thumb.webp',
  '/images/bays/bay-7-thumb.webp',
  '/images/bays/bay-8-thumb.webp',
  '/images/bays/bay-9-thumb.webp',
  '/images/bays/bay-10-thumb.webp',
];

export const BAY_FALLBACK_SVG = '/images/bay-fallback.svg';

/**
 * Derives the 480px thumbnail corresponding to a 1200px hero bay image path.
 */
export function getBayThumbnail(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') return BAY_FALLBACK_SVG;
  if (imagePath.includes('-thumb.')) return imagePath;
  if (imagePath.endsWith('.webp')) {
    return imagePath.replace('.webp', '-thumb.webp');
  }
  return imagePath;
}

/**
 * Computes a stable, deterministic image for any charger by its ID.
 * Guarantees a bay always displays the exact same photo across requests.
 */
export function getBayImageById(id) {
  if (!id) return BAY_IMAGES[0];
  const str = String(id);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % BAY_IMAGES.length;
  return BAY_IMAGES[index];
}

export default BAY_IMAGES;
