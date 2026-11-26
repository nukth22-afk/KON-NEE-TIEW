import { ArrowRight, Bookmark } from 'lucide-react';
import { formatThaiDate } from '../lib/format';
import type { Article, SiteOverview } from '../types/blog';
import { SafeImage } from './SafeImage';

interface FeaturedSpotlightProps {
  overview: SiteOverview | null;
  savedIds: Set<number>;
  onToggleSave: (articleId: number) => void;
  onSelectArticle: (article: Article) => void;
}

export function FeaturedSpotlight({
  overview,
  savedIds,
  onToggleSave,
  onSelectArticle,
}: FeaturedSpotlightProps) {
  const featured = overview?.featuredArticle;
  if (!featured || !overview) return null;

  const isSaved = savedIds.has(featured.id);
  const { stats } = overview;

  return (
    <section
      aria-labelledby="featured-story-heading"
      className="py-18 sm:py-24 px-5 sm:px-8 max-w-[1280px] mx-auto"
    >
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[#244B3A] mb-2">
            FEATURED STORY
          </p>
          <h2
            id="featured-story-heading"
            className="font-editorial text-3xl sm:text-4xl font-semibold text-[#252525] tracking-tight"
          >
            เรื่องราวที่อยากให้คุณได้สัมผัส
          </h2>
        </div>
        <p className="text-sm text-[#5C615C]">
          บันทึกการเดินทางพิเศษที่คัดสรรมาจากระบบหลังบ้าน
        </p>
      </div>

      {/* Editorial 2-column spread */}
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch bg-white rounded-2xl overflow-hidden border border-[#E5E2DA]">
        {/* Visual column */}
        <div
          onClick={() => onSelectArticle(featured)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectArticle(featured);
            }
          }}
          aria-label={`เปิดอ่านบทความแนะนำ ${featured.place_name}`}
          className="lg:col-span-7 relative min-h-[300px] sm:min-h-[430px] overflow-hidden bg-[#EAE6DC] cursor-pointer group"
        >
          <SafeImage
            src={featured.cover_image}
            alt={featured.place_name}
            fallbackTitle={featured.place_name}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
          />
          <span className="absolute bottom-5 left-6 text-xs font-medium text-white/95 tracking-wide">
            {featured.place_name} · จังหวัด{featured.province}
          </span>
        </div>

        {/* Narrative column */}
        <div className="lg:col-span-5 p-7 sm:p-10 lg:p-12 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium tracking-[0.16em] text-[#244B3A]">
                {featured.region} · จังหวัด{featured.province}
              </p>
              <button
                type="button"
                aria-label={
                  isSaved ? 'นำออกจากทริปที่อยากไป' : 'บันทึกเข้าทริปที่อยากไป'
                }
                onClick={() => onToggleSave(featured.id)}
                className={`p-2 rounded-full transition-colors cursor-pointer ${
                  isSaved
                    ? 'text-[#E94C8A] bg-[#FEF4F8]'
                    : 'text-[#5C615C] hover:text-[#252525] hover:bg-[#F4F2EC]'
                }`}
              >
                <Bookmark
                  className="w-4 h-4"
                  fill={isSaved ? 'currentColor' : 'none'}
                />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5C615C]">
              <span>{featured.travel_style}</span>
              <span aria-hidden="true">·</span>
              <span>{formatThaiDate(featured.travel_date)}</span>
            </div>

            <h3 className="mt-3 font-editorial text-2xl sm:text-[30px] font-semibold text-[#252525] leading-[1.32] tracking-tight">
              {featured.title}
            </h3>

            <p className="mt-4 text-sm sm:text-[15px] text-[#4B524B] leading-[1.8]">
              {featured.excerpt}
            </p>

            {(featured.best_season || featured.duration) && (
              <dl className="mt-6 pt-5 border-t border-[#EFECE4] grid grid-cols-2 gap-4 text-xs">
                {featured.best_season && (
                  <div>
                    <dt className="text-[#7D827D]">ช่วงเวลาที่เหมาะที่สุด</dt>
                    <dd className="mt-1 font-medium text-[#252525]">
                      {featured.best_season}
                    </dd>
                  </div>
                )}
                {featured.duration && (
                  <div>
                    <dt className="text-[#7D827D]">ระยะเวลาแนะนำ</dt>
                    <dd className="mt-1 font-medium text-[#252525]">
                      {featured.duration}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          <div className="mt-8 pt-2">
            <button
              type="button"
              onClick={() => onSelectArticle(featured)}
              className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#244B3A] hover:bg-[#1B3A2C] text-[#FAFAF7] text-sm font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap"
            >
              <span>อ่านเรื่องราวฉบับเต็ม</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Full-width Travel Footprint Strip */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#D3DED3] bg-[#DDE8DD]/45 rounded-2xl border border-[#D3DED3]">
        <div className="px-6 py-5 flex items-baseline justify-between sm:block">
          <p className="text-xs text-[#4B524B]">บันทึกการเดินทางทั้งหมด</p>
          <p className="sm:mt-1 font-editorial text-2xl sm:text-3xl font-semibold text-[#252525] tabular-nums">
            {stats.totalArticles}{' '}
            <span className="font-sans text-xs font-normal text-[#5C615C]">เรื่องราว</span>
          </p>
        </div>
        <div className="px-6 py-5 flex items-baseline justify-between sm:block">
          <p className="text-xs text-[#4B524B]">จังหวัดที่ออกเดินทางแล้ว</p>
          <p className="sm:mt-1 font-editorial text-2xl sm:text-3xl font-semibold text-[#244B3A] tabular-nums">
            {stats.totalProvinces}{' '}
            <span className="font-sans text-xs font-normal text-[#5C615C]">จังหวัด</span>
          </p>
        </div>
        <div className="px-6 py-5 flex items-baseline justify-between sm:block">
          <p className="text-xs text-[#4B524B]">ภูมิภาคที่บันทึกไว้</p>
          <p className="sm:mt-1 font-editorial text-2xl sm:text-3xl font-semibold text-[#252525] tabular-nums">
            {stats.coveredRegions} / {stats.totalRegions}{' '}
            <span className="font-sans text-xs font-normal text-[#5C615C]">ภูมิภาค</span>
          </p>
        </div>
      </div>
    </section>
  );
}
