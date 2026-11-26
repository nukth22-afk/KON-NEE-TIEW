import { Bookmark, Compass } from 'lucide-react';
import { formatThaiDate } from '../lib/format';
import { THAI_REGIONS, type Article, type ThaiRegion } from '../types/blog';
import { SafeImage } from './SafeImage';

interface RegionExplorerProps {
  selectedRegion: ThaiRegion;
  articles: Article[];
  regionCounts?: Record<ThaiRegion, number>;
  loading: boolean;
  savedIds: Set<number>;
  onToggleSave: (articleId: number) => void;
  onSelectRegion: (region: ThaiRegion) => void;
  onSelectArticle: (article: Article) => void;
}

export function RegionExplorer({
  selectedRegion,
  articles,
  regionCounts,
  loading,
  savedIds,
  onToggleSave,
  onSelectRegion,
  onSelectArticle,
}: RegionExplorerProps) {
  return (
    <section
      id="destination-by-region"
      aria-labelledby="region-explorer-heading"
      className="scroll-mt-20 py-20 sm:py-24 bg-[#F4F2EC]/90 border-y border-[#E5E2DA]"
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8">
        {/* Centered Editorial Heading */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-medium tracking-[0.18em] text-[#244B3A] mb-2">
            สำรวจเส้นทางทั่วประเทศไทย
          </p>
          <h2
            id="region-explorer-heading"
            className="font-editorial text-3xl sm:text-4xl font-semibold text-[#252525] tracking-tight"
          >
            Destination by Region
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#5C615C] leading-relaxed">
            เลือกภูมิภาค แล้วออกไปค้นพบสถานที่ท่องเที่ยวด้วยกัน
          </p>
        </div>

        {/* White Pill Navigation Bar with Subtle Shadow & #E94C8A Active Indicator */}
        <div className="mt-10 flex justify-center">
          <div
            role="tablist"
            aria-label="เลือกภูมิภาคของประเทศไทย"
            className="w-full lg:w-auto max-w-full overflow-x-auto no-scrollbar bg-white rounded-full shadow-[0_8px_30px_rgba(37,37,37,0.06)] border border-[#E5E2DA]/90 p-1.5"
          >
            <div className="flex items-center justify-start lg:justify-center gap-1 min-w-max">
              {THAI_REGIONS.map((region) => {
                const isActive = selectedRegion === region;
                const count = regionCounts?.[region];
                return (
                  <button
                    key={region}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onSelectRegion(region)}
                    className={`relative px-5 py-2.5 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E94C8A] ${
                      isActive
                        ? 'text-[#E94C8A] bg-[#FEF4F8]'
                        : 'text-[#4B524B] hover:text-[#252525] hover:bg-[#FAFAF7]'
                    }`}
                  >
                    <span>{region}</span>
                    {typeof count === 'number' && count > 0 && (
                      <span
                        className={`ml-1.5 text-xs tabular-nums ${
                          isActive ? 'text-[#E94C8A]/85' : 'text-[#8D928B]'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute left-5 right-5 bottom-1 h-[3px] rounded-full bg-[#E94C8A]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Region Articles Grid / Empty State */}
        <div
          className="mt-12"
          role="tabpanel"
          aria-label={`บทความท่องเที่ยว${selectedRegion}`}
        >
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="animate-pulse">
                  <div className="aspect-[4/3] w-full rounded-2xl bg-[#E5E1D6]" />
                  <div className="mt-4 h-3 w-32 bg-[#E5E1D6] rounded" />
                  <div className="mt-2.5 h-6 w-3/4 bg-[#E5E1D6] rounded" />
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="max-w-xl mx-auto py-16 px-8 text-center bg-white rounded-2xl border border-[#E5E2DA]">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#DDE8DD]/65 text-[#244B3A] flex items-center justify-center mb-4">
                <Compass className="w-6 h-6" strokeWidth={1.6} />
              </div>
              <h3 className="font-editorial text-xl font-semibold text-[#252525]">
                ยังไม่มีเรื่องราวการเดินทางในภูมิภาคนี้
              </h3>
              <p className="mt-2 text-sm text-[#5C615C] leading-relaxed">
                เส้นทางท่องเที่ยวใน{selectedRegion}กำลังรอการบันทึกเรื่องราว สามารถเพิ่มบทความใหม่ได้จากระบบหลังบ้าน
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article) => {
                const isSaved = savedIds.has(article.id);
                return (
                  <article
                    key={article.id}
                    className="group bg-white rounded-2xl overflow-hidden border border-[#E5E2DA]/90 transition-transform duration-200 hover:-translate-y-1 flex flex-col"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#EAE6DC]">
                      <button
                        type="button"
                        onClick={() => onSelectArticle(article)}
                        aria-label={`อ่านบทความ ${article.place_name}`}
                        className="block w-full h-full cursor-pointer"
                      >
                        <SafeImage
                          src={article.cover_image}
                          alt={article.place_name}
                          fallbackTitle={article.place_name}
                          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
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
                        className={`absolute top-3.5 right-3.5 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          isSaved
                            ? 'bg-white text-[#E94C8A] shadow-xs'
                            : 'bg-white/85 text-[#252525] hover:bg-white'
                        }`}
                      >
                        <Bookmark
                          className="w-4 h-4"
                          fill={isSaved ? 'currentColor' : 'none'}
                        />
                      </button>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[#5C615C]">
                          <span className="font-medium text-[#244B3A]">
                            {article.province}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{article.travel_style}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatThaiDate(article.travel_date)}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectArticle(article)}
                          className="mt-2 text-left font-editorial text-xl font-semibold text-[#252525] leading-snug group-hover:text-[#244B3A] transition-colors duration-150 line-clamp-2 cursor-pointer"
                        >
                          {article.place_name}
                        </button>

                        <p className="mt-2.5 text-sm text-[#5C615C] leading-relaxed line-clamp-2">
                          {article.excerpt}
                        </p>
                      </div>

                      <div className="mt-5 pt-4 border-t border-[#F0EDE6] flex items-center justify-between gap-2 text-xs">
                        <span className="text-[#7D827D] truncate">
                          {article.duration || article.best_season || article.region}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectArticle(article)}
                          className="font-medium text-[#244B3A] inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>อ่านเรื่องราว</span>
                          <span
                            aria-hidden="true"
                            className="transition-transform duration-150 group-hover:translate-x-1"
                          >
                            →
                          </span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
