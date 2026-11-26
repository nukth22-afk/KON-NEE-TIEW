import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Share2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { estimateReadingMinutes, formatThaiDate } from '../lib/format';
import type { Article, SiteSettings } from '../types/blog';
import {
  extractContentHeadings,
  RichContentRenderer,
} from './RichContentRenderer';
import { SafeImage } from './SafeImage';

interface ArticleDetailProps {
  article: Article;
  related: Article[];
  settings: SiteSettings;
  isSaved: boolean;
  onToggleSave: (articleId: number) => void;
  onBack: () => void;
  onSelectArticle: (article: Article) => void;
}

interface LightboxPhoto {
  url: string;
  caption: string;
}

function setMetaTag(attr: 'name' | 'property', key: string, value: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

export function ArticleDetail({
  article,
  related,
  settings,
  isSaved,
  onToggleSave,
  onBack,
  onSelectArticle,
}: ArticleDetailProps) {
  const [copied, setCopied] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [readProgress, setReadProgress] = useState(0);

  const headings = useMemo(
    () => extractContentHeadings(article.content),
    [article.content],
  );

  const highlightsList = useMemo(
    () =>
      article.highlights
        .split(/[,،\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [article.highlights],
  );

  const hasTripGuide = Boolean(
    article.best_season ||
      article.duration ||
      article.budget_estimate ||
      highlightsList.length > 0,
  );

  // Per-article SEO meta tags + JSON-LD BlogPosting
  useEffect(() => {
    const siteName = settings.site_name || 'ฅนหนีเที่ยว';
    const pageTitle = `${article.title} | ${siteName}`;
    const desc = article.excerpt || `${article.place_name} จังหวัด${article.province}`;
    const canonicalUrl = `${window.location.origin}/article/${encodeURIComponent(article.slug)}`;
    const imageUrl = article.cover_image.startsWith('http')
      ? article.cover_image
      : `${window.location.origin}${article.cover_image}`;

    document.title = pageTitle;
    setMetaTag('name', 'description', desc);
    setMetaTag('property', 'og:title', pageTitle);
    setMetaTag('property', 'og:description', desc);
    setMetaTag('property', 'og:type', 'article');
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:image', imageUrl);

    const scriptId = 'article-jsonld-schema';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title,
      description: desc,
      image: [imageUrl],
      datePublished: article.published_at || article.created_at,
      dateModified: article.updated_at,
      author: {
        '@type': 'Person',
        name: siteName,
      },
      publisher: {
        '@type': 'Organization',
        name: siteName,
      },
      mainEntityOfPage: canonicalUrl,
      contentLocation: {
        '@type': 'Place',
        name: `${article.place_name}, ${article.province}, Thailand`,
      },
    });

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [article, settings.site_name]);

  useEffect(() => {
    const updateProgress = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      if (total <= 0) {
        setReadProgress(0);
        return;
      }
      setReadProgress(Math.min(100, Math.max(0, (window.scrollY / total) * 100)));
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    return () => window.removeEventListener('scroll', updateProgress);
  }, [article.id]);

  const allPhotos = useMemo<LightboxPhoto[]>(() => {
    const map = new Map<string, LightboxPhoto>();
    map.set(article.cover_image, {
      url: article.cover_image,
      caption: `${article.place_name} · ${article.province}`,
    });
    for (const img of article.gallery_images) {
      if (!map.has(img.url)) {
        map.set(img.url, {
          url: img.url,
          caption: img.caption || article.place_name,
        });
      }
    }
    const inlineRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = inlineRegex.exec(article.content)) !== null) {
      const caption = m[1].trim();
      const url = m[2].trim();
      if (url && !map.has(url)) {
        map.set(url, { url, caption: caption || article.place_name });
      }
    }
    return Array.from(map.values());
  }, [article]);

  const openLightboxByUrl = (url: string, caption?: string) => {
    const idx = allPhotos.findIndex((p) => p.url === url);
    if (idx >= 0) {
      setLightboxIndex(idx);
    } else if (url) {
      allPhotos.push({ url, caption: caption || article.place_name });
      setLightboxIndex(allPhotos.length - 1);
    }
  };

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev + 1) % allPhotos.length,
        );
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev - 1 + allPhotos.length) % allPhotos.length,
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIndex, allPhotos.length]);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/article/${encodeURIComponent(article.slug)}`
      : '';
  const facebookShareHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl,
  )}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2600);
    } catch {
      setCopied(false);
    }
  };

  const readingMinutes = estimateReadingMinutes(article.content);

  return (
    <article className="pt-24 pb-20 sm:pt-28 sm:pb-24 bg-[#FAFAF7]">
      {/* Subtle 2px Editorial Reading Progress Bar */}
      <div
        aria-hidden="true"
        className="fixed top-16 left-0 right-0 h-[2px] bg-transparent z-40 pointer-events-none"
      >
        <div
          className="h-full bg-[#244B3A] transition-[width] duration-75 ease-out"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      <div className="max-w-[960px] mx-auto px-5 sm:px-8">
        {/* Top Navigation + Save / Share Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#4B524B] hover:text-[#252525] transition-colors cursor-pointer py-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้าก่อนหน้า</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleSave(article.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isSaved
                  ? 'border-[#F3C5D8] bg-[#FEF4F8] text-[#E94C8A]'
                  : 'border-[#DCD7CB] bg-white hover:border-[#244B3A] text-[#252525]'
              }`}
            >
              <Bookmark
                className="w-4 h-4"
                fill={isSaved ? 'currentColor' : 'none'}
              />
              <span>{isSaved ? 'บันทึกไว้แล้ว' : 'บันทึกทริปนี้'}</span>
            </button>

            <a
              href={facebookShareHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#DCD7CB] bg-white hover:border-[#244B3A] text-xs sm:text-sm font-medium text-[#252525] transition-colors whitespace-nowrap"
            >
              <Share2 className="w-4 h-4 text-[#244B3A]" />
              <span>แชร์ Facebook</span>
            </a>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#DCD7CB] bg-white hover:border-[#244B3A] text-xs sm:text-sm font-medium text-[#252525] transition-colors cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#244B3A]" />
                  <span className="text-[#244B3A]">คัดลอกลิงก์แล้ว</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#5C615C]" />
                  <span>คัดลอกลิงก์</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Unboxed Editorial Metadata Header */}
        <div className="text-center max-w-[780px] mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-[#5C615C]">
            <span className="font-medium text-[#244B3A]">{article.region}</span>
            <span aria-hidden="true">·</span>
            <span>จังหวัด{article.province}</span>
            <span aria-hidden="true">·</span>
            <span>{article.travel_style}</span>
            <span aria-hidden="true">·</span>
            <span>อ่านประมาณ {readingMinutes} นาที</span>
          </div>

          <h1 className="mt-4 font-editorial text-3xl sm:text-4xl md:text-[44px] font-bold text-[#252525] leading-[1.28] tracking-tight">
            {article.title}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-[#4B524B] leading-relaxed">
            {article.excerpt}
          </p>

          <div className="mt-6 pt-5 border-t border-[#E5E2DA] inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs sm:text-sm text-[#5C615C]">
            <span>
              สถานที่:{' '}
              <strong className="font-medium text-[#252525]">{article.place_name}</strong>
            </span>
            <span aria-hidden="true">/</span>
            <span>เดินทาง {formatThaiDate(article.travel_date)}</span>
            {article.published_at && (
              <>
                <span aria-hidden="true">/</span>
                <span>เผยแพร่ {formatThaiDate(article.published_at)}</span>
              </>
            )}
            {article.views > 0 && (
              <>
                <span aria-hidden="true">/</span>
                <span className="tabular-nums">
                  เข้าชม {article.views.toLocaleString('th-TH')} ครั้ง
                </span>
              </>
            )}
          </div>
        </div>

        {/* Large Cover Photography */}
        <figure className="mt-10 sm:mt-12">
          <button
            type="button"
            onClick={() => openLightboxByUrl(article.cover_image, article.place_name)}
            className="block w-full aspect-[16/10] overflow-hidden rounded-2xl bg-[#EAE6DC] border border-[#E5E2DA] cursor-zoom-in"
          >
            <SafeImage
              src={article.cover_image}
              alt={article.place_name}
              fallbackTitle={article.place_name}
              loading="eager"
              className="w-full h-full object-cover"
            />
          </button>
          <figcaption className="mt-3 text-center text-xs sm:text-sm text-[#5C615C]">
            {article.place_name} · จังหวัด{article.province} ({article.region})
          </figcaption>
        </figure>

        {/* Trip Quick Guide / Field Notes Card */}
        {hasTripGuide && (
          <section
            aria-label="ข้อมูลการเดินทางฉบับย่อ"
            className="mt-10 max-w-[780px] mx-auto bg-white rounded-2xl border border-[#E5E2DA] overflow-hidden"
          >
            <div className="px-6 py-4 bg-[#DDE8DD]/45 border-b border-[#E5E2DA] flex items-center justify-between gap-3">
              <p className="font-editorial text-base font-semibold text-[#252525]">
                บันทึกข้อมูลทริปฉบับย่อ
              </p>
              <span className="text-xs text-[#244B3A] font-medium">Field Notes</span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#EFECE4]">
              <div className="p-5">
                <dt className="text-xs text-[#7D827D]">ช่วงเวลาที่เหมาะที่สุด</dt>
                <dd className="mt-1 text-sm font-medium text-[#252525]">
                  {article.best_season || 'เที่ยวได้ตลอดปี'}
                </dd>
              </div>
              <div className="p-5">
                <dt className="text-xs text-[#7D827D]">ระยะเวลาทริป</dt>
                <dd className="mt-1 text-sm font-medium text-[#252525]">
                  {article.duration || 'ตามสะดวก'}
                </dd>
              </div>
              <div className="p-5">
                <dt className="text-xs text-[#7D827D]">งบประมาณโดยประมาณ</dt>
                <dd className="mt-1 text-sm font-medium text-[#244B3A] tabular-nums">
                  {article.budget_estimate || 'ขึ้นอยู่กับการเดินทาง'}
                </dd>
              </div>
            </dl>

            {highlightsList.length > 0 && (
              <div className="px-6 py-4 border-t border-[#EFECE4] bg-[#FAFAF7]/70">
                <p className="text-xs text-[#7D827D] mb-1.5">ไฮไลท์ห้ามพลาด</p>
                <p className="text-sm text-[#2D312D] leading-relaxed">
                  {highlightsList.join('  ·  ')}
                </p>
              </div>
            )}
          </section>
        )}

        {/* In-Article Chapter Outline / TOC */}
        {headings.length >= 2 && (
          <nav
            aria-label="สารบัญบทความ"
            className="mt-8 max-w-[720px] mx-auto py-4 px-5 rounded-xl bg-[#F4F2EC]/80 border border-[#E5E2DA]"
          >
            <p className="text-xs font-medium tracking-[0.14em] text-[#244B3A] mb-2.5">
              สารบัญเรื่องราว
            </p>
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-[#3D423D]">
              {headings.map((h, i) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className="hover:text-[#244B3A] hover:underline underline-offset-4 transition-colors"
                  >
                    <span className="text-xs text-[#8D928B] tabular-nums mr-1.5">
                      {String(i + 1).padStart(2, '0')}.
                    </span>
                    {h.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Main Travel Narrative */}
        <div className="mt-11 sm:mt-13 max-w-[720px] mx-auto">
          <RichContentRenderer
            content={article.content}
            onImageClick={(url, caption) => openLightboxByUrl(url, caption)}
          />
        </div>

        {/* Additional Gallery Photos */}
        {article.gallery_images.length > 0 && (
          <section
            aria-labelledby="article-gallery-heading"
            className="mt-16 pt-12 border-t border-[#E5E2DA]"
          >
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs font-medium tracking-[0.18em] text-[#244B3A] mb-1">
                  PHOTO JOURNAL
                </p>
                <h2
                  id="article-gallery-heading"
                  className="font-editorial text-2xl font-semibold text-[#252525]"
                >
                  อัลบั้มภาพจากการเดินทาง
                </h2>
              </div>
              <span className="text-xs text-[#5C615C] tabular-nums">
                {article.gallery_images.length} ภาพ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {article.gallery_images.map((photo, idx) => (
                <figure key={`${photo.url}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => openLightboxByUrl(photo.url, photo.caption)}
                    className="block w-full aspect-[4/3] overflow-hidden rounded-xl bg-[#EAE6DC] border border-[#E5E2DA] cursor-zoom-in"
                  >
                    <SafeImage
                      src={photo.url}
                      alt={photo.caption || `${article.place_name} ภาพที่ ${idx + 1}`}
                      fallbackTitle={article.place_name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                    />
                  </button>
                  {photo.caption && (
                    <figcaption className="mt-2.5 text-xs sm:text-sm text-[#5C615C] leading-relaxed">
                      {photo.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* Bottom Share & Save Strip */}
        <div className="mt-14 py-7 px-6 sm:px-8 rounded-2xl bg-[#DDE8DD]/45 border border-[#D3DED3] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-editorial text-lg font-semibold text-[#252525]">
              ชอบบันทึกการเดินทางนี้ไหม?
            </p>
            <p className="text-sm text-[#4B524B] mt-0.5">
              เก็บไว้ในรายการทริปที่อยากไป หรือแชร์แรงบันดาลใจให้เพื่อนร่วมทางของคุณ
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onToggleSave(article.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isSaved
                  ? 'border-[#F3C5D8] bg-[#FEF4F8] text-[#E94C8A]'
                  : 'border-[#DCD7CB] bg-white hover:border-[#244B3A] text-[#252525]'
              }`}
            >
              <Bookmark
                className="w-4 h-4"
                fill={isSaved ? 'currentColor' : 'none'}
              />
              <span>{isSaved ? 'อยู่ในทริปที่อยากไปแล้ว' : 'บันทึกทริปนี้'}</span>
            </button>

            <a
              href={facebookShareHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#DCD7CB] bg-white hover:border-[#244B3A] text-[#252525] text-sm font-medium transition-colors whitespace-nowrap"
            >
              <Share2 className="w-4 h-4 text-[#244B3A]" />
              <span>แชร์ Facebook</span>
            </a>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#244B3A] hover:bg-[#1B3A2C] text-[#FAFAF7] text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>คัดลอกลิงก์แล้ว</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>คัดลอกลิงก์</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Related Articles Section */}
      {related.length > 0 && (
        <section
          aria-labelledby="related-articles-heading"
          className="mt-20 pt-16 border-t border-[#E5E2DA] max-w-[1280px] mx-auto px-5 sm:px-8"
        >
          <div className="flex items-end justify-between mb-9">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-[#244B3A] mb-1.5">
                CONTINUE EXPLORING
              </p>
              <h2
                id="related-articles-heading"
                className="font-editorial text-2xl sm:text-3xl font-semibold text-[#252525]"
              >
                เรื่องราวการเดินทางที่เกี่ยวข้อง
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {related.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectArticle(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectArticle(item);
                  }
                }}
                tabIndex={0}
                role="button"
                className="group cursor-pointer flex flex-col focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#244B3A] rounded-xl"
              >
                <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#EAE6DC]">
                  <SafeImage
                    src={item.cover_image}
                    alt={item.place_name}
                    fallbackTitle={item.place_name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-[#5C615C]">
                  <span className="font-medium text-[#244B3A]">{item.province}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.region}</span>
                </div>
                <h3 className="mt-1.5 font-editorial text-lg font-semibold text-[#252525] group-hover:text-[#244B3A] transition-colors line-clamp-2">
                  {item.place_name}
                </h3>
                <p className="mt-1.5 text-sm text-[#5C615C] line-clamp-2 leading-relaxed">
                  {item.excerpt}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fullscreen Lightbox Viewer */}
      {lightboxIndex !== null && allPhotos[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ดูภาพขนาดใหญ่"
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            aria-label="ปิดหน้าต่างรูปภาพ"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {allPhotos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="ภาพก่อนหน้า"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(
                    (lightboxIndex - 1 + allPhotos.length) % allPhotos.length,
                  );
                }}
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                aria-label="ภาพถัดไป"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % allPhotos.length);
                }}
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div
            className="max-w-5xl w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <SafeImage
              src={allPhotos[lightboxIndex].url}
              alt={allPhotos[lightboxIndex].caption}
              className="max-h-[78vh] max-w-full rounded-xl object-contain"
            />
            <p className="mt-4 text-center text-sm text-white/85 max-w-2xl">
              {allPhotos[lightboxIndex].caption}
            </p>
            <p className="mt-1 text-xs text-white/55 tabular-nums">
              {lightboxIndex + 1} / {allPhotos.length}
            </p>
          </div>
        </div>
      )}
    </article>
  );
}
