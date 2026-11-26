import {
  ArrowUpRight,
  Bookmark,
  Check,
  Compass,
  Link2,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPublishedArticles } from '../lib/api';
import { formatThaiDate } from '../lib/format';
import {
  THAI_REGIONS,
  TRAVEL_STYLES,
  type Article,
  type ThaiRegion,
  type TravelStyle,
} from '../types/blog';
import { SafeImage } from './SafeImage';

interface AllDestinationsPageProps {
  provinces: string[];
  autoFocusSearch?: boolean;
  queryKey?: string;
  savedIds: Set<number>;
  onToggleSave: (articleId: number) => void;
  onSelectArticle: (article: Article) => void;
}

const PAGE_SIZE = 8;

function readFiltersFromUrl(searchStr: string) {
  const params = new URLSearchParams(searchStr);
  const q = params.get('q') || '';
  const rawRegion = params.get('region') || '';
  const region: ThaiRegion | '' = THAI_REGIONS.includes(rawRegion as ThaiRegion)
    ? (rawRegion as ThaiRegion)
    : '';
  const province = params.get('province') || '';
  const rawStyle = params.get('style') || '';
  const style: TravelStyle | '' = TRAVEL_STYLES.includes(rawStyle as TravelStyle)
    ? (rawStyle as TravelStyle)
    : '';
  const sort: 'newest' | 'oldest' =
    params.get('sort') === 'oldest' ? 'oldest' : 'newest';
  return { q, region, province, style, sort };
}

export function AllDestinationsPage({
  provinces,
  autoFocusSearch = false,
  queryKey = '',
  savedIds,
  onToggleSave,
  onSelectArticle,
}: AllDestinationsPageProps) {
  const initial = readFiltersFromUrl(
    typeof window !== 'undefined' ? window.location.search : '',
  );
  const [search, setSearch] = useState(initial.q);
  const [region, setRegion] = useState<ThaiRegion | ''>(initial.region);
  const [province, setProvince] = useState(initial.province);
  const [style, setStyle] = useState<TravelStyle | ''>(initial.style);
  const [sort, setSort] = useState<'newest' | 'oldest'>(initial.sort);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Sync incoming URL search changes (e.g., clicking a province on Thailand map or browser back/forward)
  useEffect(() => {
    const next = readFiltersFromUrl(
      typeof window !== 'undefined' ? window.location.search : '',
    );
    setSearch(next.q);
    setRegion(next.region);
    setProvince(next.province);
    setStyle(next.style);
    setSort(next.sort);
  }, [queryKey]);

  // Reflect active filter state back to URL query string
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (region) params.set('region', region);
    if (province) params.set('province', province);
    if (style) params.set('style', style);
    if (sort === 'oldest') params.set('sort', 'oldest');

    const qs = params.toString();
    const targetUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (targetUrl !== currentUrl) {
      window.history.replaceState({}, '', targetUrl);
    }
  }, [search, region, province, style, sort]);

  useEffect(() => {
    if (autoFocusSearch) {
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 120);
    }
  }, [autoFocusSearch]);

  const loadPage = useCallback(
    async (offset: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const res = await fetchPublishedArticles({
          search: search.trim() || undefined,
          region: region || undefined,
          province: province || undefined,
          style: style || undefined,
          sort,
          limit: PAGE_SIZE,
          offset,
        });
        setArticles((prev) => (append ? [...prev, ...res.articles] : res.articles));
        setTotal(res.total);
      } catch {
        if (!append) {
          setArticles([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search, region, province, style, sort],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadPage(0, false);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [loadPage]);

  const hasActiveFilters = Boolean(search.trim() || region || province || style);
  const hasMore = articles.length < total;

  const handleReset = () => {
    setSearch('');
    setRegion('');
    setProvince('');
    setStyle('');
    setSort('newest');
  };

  const handleCopyFilteredUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2400);
    } catch {
      setCopiedUrl(false);
    }
  };

  return (
    <section
      aria-labelledby="all-destinations-heading"
      className="pt-28 pb-24 px-5 sm:px-8 max-w-[1280px] mx-auto"
    >
      {/* Page Header */}
      <div className="pb-8 border-b border-[#E5E2DA] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[#244B3A] mb-2">
            ALL DESTINATIONS
          </p>
          <h1
            id="all-destinations-heading"
            className="font-editorial text-3xl sm:text-4xl md:text-5xl font-semibold text-[#252525] tracking-tight"
          >
            สถานที่ท่องเที่ยวทั้งหมด
          </h1>
        </div>
        <p className="text-sm text-[#5C615C] tabular-nums">
          {loading ? 'กำลังโหลดรายการ...' : `พบทั้งหมด ${total} เรื่องราวการเดินทาง`}
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="mt-8 bg-white rounded-2xl border border-[#E5E2DA] p-4 sm:p-5 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-[#7D827D] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อบทความ ชื่อสถานที่ จังหวัด หรือภูมิภาค เช่น ทับลาน, เชียงใหม่, เกาะกูด..."
            aria-label="ค้นหาสถานที่ท่องเที่ยว"
            className="w-full pl-11 pr-10 py-3 rounded-xl bg-[#FAFAF7] border border-[#E5E2DA] text-sm text-[#252525] placeholder:text-[#7D827D] focus:outline-none focus:border-[#244B3A] focus:bg-white transition-colors"
          />
          {search && (
            <button
              type="button"
              aria-label="ล้างคำค้นหา"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#7D827D] hover:text-[#252525] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            aria-label="กรองตามภูมิภาค"
            value={region}
            onChange={(e) => setRegion(e.target.value as ThaiRegion | '')}
            className="px-3.5 py-2.5 rounded-xl bg-[#FAFAF7] border border-[#E5E2DA] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
          >
            <option value="">ทุกภูมิภาค</option>
            {THAI_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            aria-label="กรองตามจังหวัด"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-[#FAFAF7] border border-[#E5E2DA] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
          >
            <option value="">ทุกจังหวัด</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                จังหวัด{p}
              </option>
            ))}
          </select>

          <select
            aria-label="กรองตามสไตล์การท่องเที่ยว"
            value={style}
            onChange={(e) => setStyle(e.target.value as TravelStyle | '')}
            className="px-3.5 py-2.5 rounded-xl bg-[#FAFAF7] border border-[#E5E2DA] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
          >
            <option value="">ทุกสไตล์การเดินทาง</option>
            {TRAVEL_STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <select
              aria-label="เรียงลำดับบทความ"
              value={sort}
              onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#FAFAF7] border border-[#E5E2DA] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
            >
              <option value="newest">เรียงตาม: ล่าสุดก่อน</option>
              <option value="oldest">เรียงตาม: เก่าสุดก่อน</option>
            </select>
            {hasActiveFilters && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyFilteredUrl}
                  title="คัดลอกลิงก์ผลการค้นหา"
                  className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl border border-[#E5E2DA] text-xs font-medium text-[#244B3A] hover:bg-[#DDE8DD]/45 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      <span>แชร์ลิงก์</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  title="ล้างตัวกรองทั้งหมด"
                  className="px-3 py-2.5 rounded-xl border border-[#E5E2DA] text-xs font-medium text-[#4B524B] hover:bg-[#F2EFE8] transition-colors cursor-pointer whitespace-nowrap"
                >
                  ล้างตัวกรอง
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Grid */}
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
      ) : articles.length === 0 ? (
        <div className="mt-12 max-w-xl mx-auto py-16 px-8 text-center bg-white rounded-2xl border border-[#E5E2DA]">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#DDE8DD]/65 text-[#244B3A] flex items-center justify-center mb-4">
            <Compass className="w-6 h-6" strokeWidth={1.6} />
          </div>
          <h2 className="font-editorial text-xl font-semibold text-[#252525]">
            ไม่พบเรื่องราวการเดินทางที่ตรงกับเงื่อนไข
          </h2>
          <p className="mt-2 text-sm text-[#5C615C] leading-relaxed">
            ลองปรับคำค้นหา เลือกภูมิภาคอื่น หรือกดล้างตัวกรองเพื่อชมสถานที่ท่องเที่ยวทั้งหมด
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#244B3A] text-[#FAFAF7] text-sm font-medium hover:bg-[#1B3A2C] cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>แสดงสถานที่ทั้งหมด</span>
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
            {articles.map((article) => {
              const isSaved = savedIds.has(article.id);
              return (
                <article key={article.id} className="group flex flex-col">
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

                  <div className="mt-4 flex items-center gap-1.5 text-xs text-[#5C615C] truncate">
                    <span className="font-medium text-[#244B3A]">{article.province}</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{article.region}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectArticle(article)}
                    className="mt-1.5 text-left font-editorial text-lg font-semibold text-[#252525] leading-snug group-hover:text-[#244B3A] transition-colors line-clamp-2 cursor-pointer"
                  >
                    {article.place_name}
                  </button>

                  <p className="mt-2 text-sm text-[#5C615C] leading-relaxed line-clamp-2">
                    {article.excerpt}
                  </p>

                  <p className="mt-3 text-xs text-[#7D827D]">
                    {formatThaiDate(article.published_at || article.travel_date)}
                  </p>
                </article>
              );
            })}
          </div>

          {hasMore && (
            <div className="mt-14 flex justify-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => loadPage(articles.length, true)}
                className="px-7 py-3 rounded-full border border-[#244B3A] text-[#244B3A] hover:bg-[#244B3A] hover:text-[#FAFAF7] disabled:opacity-50 text-sm font-medium transition-colors cursor-pointer"
              >
                {loadingMore
                  ? 'กำลังโหลดเพิ่มเติม...'
                  : `โหลดเรื่องราวเพิ่มเติม (${articles.length} / ${total})`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
