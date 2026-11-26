import { Bookmark, Compass, Trash2, X } from 'lucide-react';
import { useEffect } from 'react';
import { formatThaiDate } from '../lib/format';
import type { Article } from '../types/blog';
import { SafeImage } from './SafeImage';

interface SavedTripsDrawerProps {
  open: boolean;
  savedArticles: Article[];
  onClose: () => void;
  onSelectArticle: (article: Article) => void;
  onRemoveSaved: (articleId: number) => void;
}

export function SavedTripsDrawer({
  open,
  savedArticles,
  onClose,
  onSelectArticle,
  onRemoveSaved,
}: SavedTripsDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-trips-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#FAF9F5] h-full shadow-2xl border-l border-[#E5E2DA] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 bg-white border-b border-[#E5E2DA] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Bookmark className="w-5 h-5 text-[#1E4D3B]" />
            <div>
              <h2
                id="saved-trips-title"
                className="font-editorial text-lg font-semibold text-[#141614]"
              >
                ทริปที่อยากไป
              </h2>
              <p className="text-xs text-[#565C55] tabular-nums">
                บันทึกไว้ {savedArticles.length} สถานที่
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="ปิดรายการทริปที่อยากไป"
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-[#F4F1EA] flex items-center justify-center text-[#565C55] hover:text-[#141614] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {savedArticles.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#EFECE4] text-[#1E4D3B] flex items-center justify-center mb-4">
                <Compass className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <p className="font-editorial text-lg font-medium text-[#141614]">
                ยังไม่มีทริปที่บันทึกไว้
              </p>
              <p className="mt-2 text-sm text-[#565C55] leading-relaxed">
                กดปุ่มไอคอนบันทึกบนการ์ดสถานที่หรือหน้าบทความ เพื่อเก็บสถานที่ที่อยากออกไปสัมผัสไว้กลับมาอ่านได้ทุกเมื่อ
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {savedArticles.map((article) => (
                <div
                  key={article.id}
                  className="bg-white rounded-xl border border-[#E5E2DA] p-3.5 flex items-center gap-3.5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectArticle(article);
                    }}
                    className="w-20 h-16 rounded-lg overflow-hidden bg-[#EAE6DC] shrink-0 cursor-pointer"
                  >
                    <SafeImage
                      src={article.cover_image}
                      alt={article.place_name}
                      className="w-full h-full object-cover"
                    />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#565C55] truncate">
                      <span className="font-medium text-[#1E4D3B]">{article.province}</span> ·{' '}
                      {article.region}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectArticle(article);
                      }}
                      className="mt-0.5 text-left font-editorial text-sm font-semibold text-[#141614] hover:text-[#1E4D3B] line-clamp-2 cursor-pointer"
                    >
                      {article.place_name}
                    </button>
                    <p className="mt-0.5 text-[11px] text-[#757B74]">
                      {article.duration || formatThaiDate(article.travel_date)}
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label={`ลบ ${article.place_name} ออกจากรายการ`}
                    onClick={() => onRemoveSaved(article.id)}
                    className="p-2 rounded-lg text-[#757B74] hover:text-[#B83259] hover:bg-[#FDF2F5] cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
