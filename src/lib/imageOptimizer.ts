/**
 * Client-side automatic image optimizer.
 * Resizes large photos to at most 1600px on the longest edge and encodes to WebP (quality 0.84)
 * so uploads stay fast, sharp, and lightweight for durable PostgreSQL storage.
 */

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.84;
const SKIP_UNDER_BYTES = 240 * 1024;

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

export async function optimizeImageFile(file: File): Promise<File> {
  // Preserve GIF animations and non-image files untouched
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  try {
    const img = await loadImageElement(file);
    const origWidth = img.naturalWidth || img.width;
    const origHeight = img.naturalHeight || img.height;
    if (!origWidth || !origHeight) return file;

    const longestSide = Math.max(origWidth, origHeight);
    const needsResize = longestSide > MAX_DIMENSION;

    if (!needsResize && file.type === 'image/webp' && file.size <= SKIP_UNDER_BYTES) {
      return file;
    }

    const scale = needsResize ? MAX_DIMENSION / longestSide : 1;
    const targetWidth = Math.max(1, Math.round(origWidth * scale));
    const targetHeight = Math.max(1, Math.round(origHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const webpBlob = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY);
    if (!webpBlob || webpBlob.size === 0) return file;

    // Only replace if resized OR genuinely smaller than original
    if (!needsResize && webpBlob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([webpBlob], `${baseName}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch {
    // Gracefully fall back to original file if browser canvas decoding fails
    return file;
  }
}
