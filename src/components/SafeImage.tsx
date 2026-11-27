import { Mountain } from 'lucide-react';
import { useEffect, useState } from 'react';
import { isSafeImageUrl } from '../lib/format';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  loading?: 'eager' | 'lazy';
}

export function SafeImage({
  src,
  alt,
  className = '',
  fallbackTitle,
  loading = 'lazy',
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || !isSafeImageUrl(src) || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#23392E] via-[#1C2F25] to-[#121D18] text-[#FAF9F5]/80 p-6 text-center ${className}`}
      >
        <Mountain className="w-8 h-8 mb-2 opacity-70" strokeWidth={1.5} />
        {fallbackTitle && (
          <span className="font-editorial text-sm tracking-wide line-clamp-2 max-w-[220px]">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  const basePrefix = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  const apiBase = (
    (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
  ).replace(/\/+$/, '');

  let resolvedSrc = src;
  if (apiBase && src.startsWith('/uploads/')) {
    resolvedSrc = `${apiBase}${src}`;
  } else if (
    basePrefix &&
    (src.startsWith('/src/assets/images/') || src.startsWith('/assets/'))
  ) {
    resolvedSrc = `${basePrefix}${src}`;
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
