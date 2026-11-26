import { ArrowRight, ArrowUpRight, Bookmark } from 'lucide-react';
import { formatThaiDate } from '../lib/format';
import type { Article } from '../types/blog';
import { SafeImage } from './SafeImage';
import { TravelDiscoveryBar } from './TravelDiscoveryBar';

interface LatestDestinationsProps {
  articles: Article[];
  loading: boolean;
  savedIds: Set<number>;
  onToggleSave: (articleId: number) => void;
  onSelectArticle: (article: Article) => void;
  onViewAllDestinations: () => void;
}

export function LatestDestinations({
  articles,
  loading,
  savedIds,
  onToggleSave,
  onSelectArticle,
  onViewAllDestinations,
}: LatestDestinationsProps) {
  const latestFour = articles.slice(0, 4);

  return (
    <section
      id="latest-destinations"
      aria-labelledby="latest-destinations-heading"
      className="scroll-mt-20 pt-14 sm:pt-18 pb-10 sm:pb-14 px-5 sm:px-8 max-w-[1280px] mx-auto"
    >
      {/* Quick Search & Travel Style Discovery */}
      <TravelDiscoveryBar
        savedIds={savedIds}
        onToggleSave={onToggleSave}
        onSelectArticle={onSelectArticle}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#E5E2DA]">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[#244B3A] mb-2">
            LATEST JOURNEYS
          </p>
          <h2
            id="latest-destinations-heading"
            className="font-editorial text-3xl sm:text-4xl font-semibold text-[#252525] tracking-tight"
          >
            สถานที่ที่เพิ่งไปมา
          </h2>
        </div>
        <p className="text-sm text-[#5C615C] max-w-md leading-relaxed">
          รวมเรื่องราวการเดินทางล่าสุดจาก ฅนหนีเที่ยว พร้อมภาพถ่ายและบันทึกความทรงจำตลอดเส้นทาง
        </p>
      </div>

      {loading ? (
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="animate-pulse">
              <div className="aspect-[4/3] w-full rounded-xl bg-[#EAE6DC]" />
              <div className="mt-4 h-3 w-28 bg-[#EAE6DC] rounded" />
              <div className="mt-2.5 h-5 w-4/5 bg-[#EAE6DC] rounded" />
              <div className="mt-2 h-4 w-full bg-[#EAE6DC] rounded" />
            </div>
          ))}
        </div>
      ) : latestFour.length === 0 ? (
        <div className="mt-10 py-16 text-center bg-[#F4F2EC] rounded-2xl border border-[#E5E2DA]">
          <p className="font-editorial text-xl text-[#252525]">
            ยังไม่มีเรื่องราวการเดินทางที่เผยแพร่
          </p>
          <p className="mt-2 text-sm text-[#5C615C]">
            เข้าสู่ระบบหลังบ้านเพื่อเริ่มเขียนเรื่องราวการเดินทางบทความแรกของคุณ
          </p>
        </div>
      ) : (
        <>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
            {latestFour.map((article) => {
              const isSaved = savedIds.has(article.id);
              const displayDate = formatThaiDate(
                article.published_at || article.travel_date,
              );
              return (
                <article key={article.id} className="group flex flex-col">
                  {/* Uniform 4:3 Image Frame */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#EAE6DC]">
                    <button
                      type="button"
                      onClick={() => onSelectArticle(article)}
                      aria-label={`อ่านบทความ ${article.place_name}`}
                      className="block w-full h-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#244B3A]"
                    >
                      <SafeImage
                        src={article.cover_image}
                        alt={article.place_name}
                        fallbackTitle={article.place_name}
                        className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.05]"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      />
                    </button>

                    <button
                      type="button"
                      aria-label={
                        isSaved ? 'นำออกจากทริปที่อยากไป' : 'บันทึกเข้าทริปที่อยากไป'
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave(article.id);
                      }}
                      className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                        isSaved
                          ? 'bg-white text-[#E94C8A] opacity-100 shadow-xs'
                          : 'bg-white/85 text-[#252525] opacity-0 group-hover:opacity-100 hover:bg-white'
                      }`}
                    >
                      <Bookmark
                        className="w-3.5 h-3.5"
                        fill={isSaved ? 'currentColor' : 'none'}
                      />
                    </button>

                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-[#252525] flex items-center justify-center opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </div>

                  {/* Unboxed Metadata: Province · Region */}
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-[#5C615C] truncate">
                    <span className="font-medium text-[#244B3A]">{article.province}</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{article.region}</span>
                  </div>

                  {/* Place Name */}
                  <button
                    type="button"
                    onClick={() => onSelectArticle(article)}
                    className="mt-1.5 text-left font-editorial text-lg font-semibold text-[#252525] leading-snug group-hover:text-[#244B3A] transition-colors duration-150 line-clamp-2 cursor-pointer"
                  >
                    {article.place_name}
                  </button>

                  {/* Short Excerpt */}
                  <p className="mt-2 text-sm text-[#5C615C] leading-relaxed line-clamp-2">
                    {article.excerpt}
                  </p>

                  {/* Published Date */}
                  <p className="mt-3 text-xs text-[#7D827D]">{displayDate}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-12 flex justify-center">
            <button
              type="button"
              onClick={onViewAllDestinations}
              className="group inline-flex items-center gap-2.5 px-7 py-3 rounded-full border border-[#244B3A] text-[#244B3A] hover:bg-[#244B3A] hover:text-[#FAFAF7] text-sm font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap"
            >
              <span>ดูเรื่องราวการเดินทางทั้งหมด</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
