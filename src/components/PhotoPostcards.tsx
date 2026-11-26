import { ArrowUpRight } from 'lucide-react';
import type { PhotoPostcard } from '../types/blog';
import { SafeImage } from './SafeImage';

interface PhotoPostcardsProps {
  postcards: PhotoPostcard[];
  onOpenBySlug: (slug: string) => void;
}

export function PhotoPostcards({ postcards, onOpenBySlug }: PhotoPostcardsProps) {
  if (postcards.length < 2) return null;

  return (
    <section
      aria-labelledby="photo-postcards-heading"
      className="py-20 sm:py-24 px-5 sm:px-8 max-w-[1280px] mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#E5E2DA]">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[#1E4D3B] mb-2">
            THROUGH THE LENS
          </p>
          <h2
            id="photo-postcards-heading"
            className="font-editorial text-3xl sm:text-4xl font-semibold text-[#141614] tracking-tight"
          >
            ภาพบันทึกจากระหว่างทาง
          </h2>
        </div>
        <p className="text-sm text-[#565C55] max-w-md leading-relaxed">
          เฟรมความทรงจำที่เก็บกลับมาจากการเดินทาง คลิกที่ภาพเพื่อเปิดอ่านเรื่องราวของสถานที่นั้น
        </p>
      </div>

      {/* Editorial Asymmetric Bento Grid */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-[230px]">
        {postcards.map((photo, idx) => {
          const isWideHero = idx === 0;
          return (
            <button
              key={`${photo.url}-${idx}`}
              type="button"
              onClick={() => onOpenBySlug(photo.article_slug)}
              className={`group relative overflow-hidden rounded-2xl bg-[#1A241E] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E4D3B] ${
                isWideHero ? 'sm:col-span-2 sm:row-span-2' : 'col-span-1 row-span-1'
              }`}
            >
              <SafeImage
                src={photo.url}
                alt={photo.place_name}
                fallbackTitle={photo.place_name}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent opacity-85 group-hover:opacity-95 transition-opacity duration-200"
              />
              <span
                aria-hidden="true"
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/90 text-[#141614] flex items-center justify-center opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200"
              >
                <ArrowUpRight className="w-4 h-4" />
              </span>
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-[11px] font-medium text-white/80">
                  จังหวัด{photo.province}
                </p>
                <h3
                  className={`mt-0.5 font-editorial font-semibold text-white leading-snug line-clamp-2 ${
                    isWideHero ? 'text-xl sm:text-2xl' : 'text-base'
                  }`}
                >
                  {photo.place_name}
                </h3>
                {isWideHero && photo.caption && (
                  <p className="mt-2 text-xs sm:text-sm text-white/82 line-clamp-2 max-w-lg">
                    {photo.caption}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
