import { ArrowUpRight, Bookmark, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchPublishedArticles } from '../lib/api';
import { formatThaiDate } from '../lib/format';
import { TRAVEL_STYLES, type Article, type TravelStyle } from '../types/blog';
import { SafeImage } from './SafeImage';

interface TravelDiscoveryBarProps {
  savedIds: Set<number>;
  onToggleSave: (articleId: number) => void;
  onSelectArticle: (article: Article) => void;
}

export function TravelDiscoveryBar({
  savedIds,
  onToggleSave,
  onSelectArticle,
}: TravelDiscoveryBarProps) {
  const [query, setQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<TravelStyle | 'all'>('all');
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  const isFiltering = query.trim().length > 0 || selectedStyle !== 'all';

  useEffect(() => {
    if (!isFiltering) {
      setResults([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const { articles: list } = await fetchPublishedArticles({
          search: query.trim() || undefined,
          style: selectedStyle === 'all' ? undefined : selectedStyle,
        });
        if (active) setResults(list);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, selectedStyle, isFiltering]);

  const handleReset = () => {
    setQuery('');
    setSelectedStyle('all');
  };

  return (
    <div className="mb-12">
      <div className="bg-white rounded-2xl border border-[#E5E2DA] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-[#757B74] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาสถานที่ จังหวัด หรือบรรยากาศ เช่น ทับลาน, ทะเลหมอก, เกาะกูด..."
            aria-label="ค้นหาบทความท่องเที่ยว"
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E2DA] text-sm text-[#141614] placeholder:text-[#757B74] focus:outline-none focus:border-[#1E4D3B] focus:bg-white transition-colors"
          />
          {query && (
            <button
              type="button"
              aria-label="ล้างคำค้นหา"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#757B74] hover:text-[#141614] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Interactive Travel Style Segmented Filter */}
        <div
          role="group"
          aria-label="กรองตามสไตล์การท่องเที่ยว"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 lg:pb-0"
        >
          <button
            type="button"
            onClick={() => setSelectedStyle('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedStyle === 'all'
                ? 'bg-[#1E4D3B] text-[#FAF9F5]'
                : 'bg-[#FAF9F5] text-[#4B524B] hover:bg-[#EFECE4] hover:text-[#141614]'
            }`}
          >
            ทุกสไตล์
          </button>
          {TRAVEL_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() =>
                setSelectedStyle((prev) => (prev === style ? 'all' : style))
              }
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedStyle === style
                  ? 'bg-[#1E4D3B] text-[#FAF9F5]'
                  : 'bg-[#FAF9F5] text-[#4B524B] hover:bg-[#EFECE4] hover:text-[#141614]'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Live Search / Style Results Drawer Area */}
      {isFiltering && (
        <div className="mt-6 p-6 sm:p-7 rounded-2xl bg-[#F4F1EA]/85 border border-[#E5E2DA]">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E5E2DA]">
            <p className="text-sm font-medium text-[#141614]">
              {loading
                ? 'กำลังค้นหาเส้นทางท่องเที่ยว...'
                : `พบ ${results.length} บทความที่ตรงกับเงื่อนไข`}
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-[#1E4D3B] hover:underline cursor-pointer"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>

          {!loading && results.length === 0 ? (
            <div className="py-10 text-center">
              <p className="font-editorial text-lg text-[#141614]">
                ยังไม่พบบทความที่ตรงกับคำค้นหานี้
              </p>
              <p className="mt-1 text-xs sm:text-sm text-[#565C55]">
                ลองเปลี่ยนคำค้นหา หรือเลือกดูบทความตามภูมิภาคด้านล่าง
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {results.map((article) => {
                const isSaved = savedIds.has(article.id);
                return (
                  <article
                    key={article.id}
                    className="group bg-white rounded-xl overflow-hidden border border-[#E5E2DA] flex flex-col"
                  >
                    <div
                      onClick={() => onSelectArticle(article)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectArticle(article);
                        }
                      }}
                      className="relative aspect-[4/3] w-full overflow-hidden bg-[#EAE6DC] cursor-pointer"
                    >
                      <SafeImage
                        src={article.cover_image}
                        alt={article.place_name}
                        fallbackTitle={article.place_name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                      <span
                        aria-hidden="true"
                        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 text-[#141614] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs text-[#565C55]">
                          <span className="truncate">
                            <strong className="font-medium text-[#1E4D3B]">
                              {article.province}
                            </strong>{' '}
                            · {article.travel_style}
                          </span>
                          <button
                            type="button"
                            aria-label={
                              isSaved
                                ? 'นำออกจากทริปที่อยากไป'
                                : 'บันทึกเข้าทริปที่อยากไป'
                            }
                            onClick={() => onToggleSave(article.id)}
                            className={`p-1 rounded-full cursor-pointer shrink-0 ${
                              isSaved ? 'text-[#B83259]' : 'text-[#757B74] hover:text-[#141614]'
                            }`}
                          >
                            <Bookmark
                              className="w-3.5 h-3.5"
                              fill={isSaved ? 'currentColor' : 'none'}
                            />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectArticle(article)}
                          className="mt-1.5 text-left font-editorial text-base font-semibold text-[#141614] hover:text-[#1E4D3B] line-clamp-2 cursor-pointer"
                        >
                          {article.place_name}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-[#757B74]">
                        {formatThaiDate(article.travel_date)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
