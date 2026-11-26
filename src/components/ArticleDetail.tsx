import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Heart,
  MapPin,
  MessageCircle,
  Navigation,
  Send,
  Share2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { likeArticle, submitArticleComment } from '../lib/api';
import {
  estimateReadingMinutes,
  formatThaiDate,
  isSafeExternalUrl,
} from '../lib/format';
import type {
  Article,
  ArticleComment,
  ArticleSummaryNav,
  SiteSettings,
} from '../types/blog';
import {
  extractContentHeadings,
  RichContentRenderer,
} from './RichContentRenderer';
import { SafeImage } from './SafeImage';

interface ArticleDetailProps {
  article: Article;
  related: Article[];
  prevArticle: ArticleSummaryNav | null;
  nextArticle: ArticleSummaryNav | null;
  initialComments: ArticleComment[];
  settings: SiteSettings;
  isSaved: boolean;
  onToggleSave: (articleId: number) => void;
  onBack: () => void;
  onSelectArticle: (article: Article) => void;
  onSelectSlug: (slug: string) => void;
}

const LIKED_ARTICLES_KEY = 'khonneethiao_liked_articles_v1';

function loadLikedArticleIds(): number[] {
  try {
    const raw = window.localStorage.getItem(LIKED_ARTICLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is number => typeof id === 'number' && id > 0)
      : [];
  } catch {
    return [];
  }
}

function saveLikedArticleId(articleId: number) {
  try {
    const current = loadLikedArticleIds();
    if (!current.includes(articleId)) {
      window.localStorage.setItem(
        LIKED_ARTICLES_KEY,
        JSON.stringify([articleId, ...current].slice(0, 200)),
      );
    }
  } catch {
    // Ignore storage quota errors
  }
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
  prevArticle,
  nextArticle,
  initialComments,
  settings,
  isSaved,
  onToggleSave,
  onBack,
  onSelectArticle,
  onSelectSlug,
}: ArticleDetailProps) {
  const [copied, setCopied] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [readProgress, setReadProgress] = useState(0);

  // Like / Heart state
  const [likesCount, setLikesCount] = useState<number>(article.likes_count || 0);
  const [hasLiked, setHasLiked] = useState<boolean>(() =>
    loadLikedArticleIds().includes(article.id),
  );
  const [liking, setLiking] = useState(false);

  // Reader Comments / Guestbook state
  const [comments, setComments] = useState<ArticleComment[]>(initialComments);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentMessage, setCommentMessage] = useState('');
  const [honeypotWebsite, setHoneypotWebsite] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState('');
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    setLikesCount(article.likes_count || 0);
    setHasLiked(loadLikedArticleIds().includes(article.id));
    setComments(initialComments);
    setCommentSuccess('');
    setCommentError('');
  }, [article.id, article.likes_count, initialComments]);

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

  const safeMapsUrl =
    article.google_maps_url && isSafeExternalUrl(article.google_maps_url)
      ? article.google_maps_url.trim()
      : '';

  const hasTripGuide = Boolean(
    article.best_season ||
      article.duration ||
      article.budget_estimate ||
      highlightsList.length > 0 ||
      safeMapsUrl,
  );

  // Per-article SEO meta tags + JSON-LD BlogPosting
  useEffect(() => {
    const siteName = settings.site_name || 'ฅนหนีเที่ยว';
    const siteNameEn = settings.site_name_en || 'KON NEE TIEW';
    const desc = article.excerpt || `${article.place_name} จังหวัด${article.province}`;
    const canonicalUrl = `${window.location.origin}/article/${encodeURIComponent(article.slug)}`;
    const imageUrl = article.cover_image.startsWith('http')
      ? article.cover_image
      : `${window.location.origin}${article.cover_image}`;

    document.title = `${siteName} ${siteNameEn}`.trim();
    setMetaTag('name', 'description', desc);
    setMetaTag('property', 'og:title', `${article.title} | ${siteName}`);
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
  }, [article, settings.site_name, settings.site_name_en]);

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
    typeof window !== 'undefined' ? window.location.href : '';
  const facebookShareHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl,
  )}`;
  const lineShareHref = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(
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

  const handleLikeArticle = async () => {
    if (hasLiked || liking) return;
    setLiking(true);
    setHasLiked(true);
    setLikesCount((prev) => prev + 1);
    saveLikedArticleId(article.id);
    try {
      const res = await likeArticle(article.id);
      setLikesCount(res.likes_count);
    } catch {
      // Keep optimistic count gracefully if offline
    } finally {
      setLiking(false);
    }
  };

  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();
    setCommentError('');
    setCommentSuccess('');
    if (commentAuthor.trim().length < 2) {
      setCommentError('กรุณาระบุชื่อของคุณอย่างน้อย 2 ตัวอักษร');
      return;
    }
    if (commentMessage.trim().length < 4) {
      setCommentError('กรุณาเขียนข้อความอย่างน้อย 4 ตัวอักษร');
      return;
    }
    setCommentSubmitting(true);
    try {
      const res = await submitArticleComment(article.id, {
        author_name: commentAuthor.trim(),
        message: commentMessage.trim(),
        website: honeypotWebsite,
      });
      setCommentSuccess(
        res.message || 'ส่งความคิดเห็นเรียบร้อยแล้ว รอผู้ดูแลตรวจสอบก่อนแสดงผล',
      );
      setCommentAuthor('');
      setCommentMessage('');
      setHoneypotWebsite('');
    } catch (err) {
      setCommentError(
        err instanceof Error ? err.message : 'ไม่สามารถส่งความคิดเห็นได้ในขณะนี้',
      );
    } finally {
      setCommentSubmitting(false);
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
        {/* Top Navigation + Save / Like / Share Actions */}
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
              onClick={handleLikeArticle}
              disabled={hasLiked}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                hasLiked
                  ? 'border-[#F3C5D8] bg-[#FEF4F8] text-[#D9437E] cursor-default'
                  : 'border-[#DCD7CB] bg-white hover:border-[#D9437E] hover:text-[#D9437E] text-[#252525] cursor-pointer'
              }`}
            >
              <Heart className="w-4 h-4" fill={hasLiked ? 'currentColor' : 'none'} />
              <span className="tabular-nums">{likesCount}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleSave(article.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
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
              href={lineShareHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#C6E5CD] bg-[#F2FBF4] hover:border-[#06C755] text-xs sm:text-sm font-medium text-[#059440] transition-colors whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4" />
              <span>แชร์ LINE</span>
            </a>

            <a
              href={facebookShareHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#DCD7CB] bg-white hover:border-[#244B3A] text-xs sm:text-sm font-medium text-[#252525] transition-colors whitespace-nowrap"
            >
              <Share2 className="w-4 h-4 text-[#244B3A]" />
              <span>แชร์ Facebook</span>
            </a>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#DCD7CB] bg-white hover:border-[#244B3A] text-xs sm:text-sm font-medium text-[#252525] transition-colors cursor-pointer whitespace-nowrap"
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

            {safeMapsUrl && (
              <div className="px-6 py-4 border-t border-[#EFECE4] bg-white flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-[#4B524B]">
                  <MapPin className="w-4 h-4 text-[#244B3A] shrink-0" />
                  <span>
                    พิกัดการเดินทาง: <strong className="font-medium text-[#252525]">{article.place_name}</strong>
                  </span>
                </div>
                <a
                  href={safeMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#244B3A] hover:bg-[#1B3A2C] text-[#FAFAF7] text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>เปิดนำทางใน Google Maps</span>
                </a>
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

        {/* Bottom Share, Like & Save Strip */}
        <div className="mt-14 py-7 px-6 sm:px-8 rounded-2xl bg-[#DDE8DD]/45 border border-[#D3DED3] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-editorial text-lg font-semibold text-[#252525]">
              ชอบบันทึกการเดินทางนี้ไหม?
            </p>
            <p className="text-sm text-[#4B524B] mt-0.5">
              กดหัวใจให้กำลังใจผู้เขียน เก็บไว้ในทริปที่อยากไป หรือแชร์ให้เพื่อนร่วมทาง
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleLikeArticle}
              disabled={hasLiked}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-colors whitespace-nowrap ${
                hasLiked
                  ? 'border-[#F3C5D8] bg-[#FEF4F8] text-[#D9437E] cursor-default'
                  : 'border-[#DCD7CB] bg-white hover:border-[#D9437E] hover:text-[#D9437E] text-[#252525] cursor-pointer'
              }`}
            >
              <Heart className="w-4 h-4" fill={hasLiked ? 'currentColor' : 'none'} />
              <span className="tabular-nums">
                {hasLiked ? `ถูกใจแล้ว (${likesCount})` : `ถูกใจ (${likesCount})`}
              </span>
            </button>

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
              href={lineShareHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#C6E5CD] bg-[#F2FBF4] hover:border-[#06C755] text-[#059440] text-sm font-medium transition-colors whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4" />
              <span>แชร์ LINE</span>
            </a>

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

        {/* Previous / Next Article Navigation */}
        {(prevArticle || nextArticle) && (
          <nav
            aria-label="อ่านบทความก่อนหน้าและถัดไป"
            className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {prevArticle ? (
              <button
                type="button"
                onClick={() => onSelectSlug(prevArticle.slug)}
                className="group text-left p-4 rounded-2xl bg-white border border-[#E5E2DA] hover:border-[#244B3A] transition-colors cursor-pointer flex items-center gap-4"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#EAE6DC] shrink-0">
                  <SafeImage
                    src={prevArticle.cover_image}
                    alt={prevArticle.place_name}
                    fallbackTitle={prevArticle.place_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1 text-xs text-[#5C615C]">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>เรื่องราวก่อนหน้า</span>
                  </p>
                  <p className="mt-1 font-editorial text-base font-semibold text-[#252525] group-hover:text-[#244B3A] line-clamp-1">
                    {prevArticle.place_name}
                  </p>
                  <p className="text-xs text-[#7D827D] truncate">
                    จังหวัด{prevArticle.province}
                  </p>
                </div>
              </button>
            ) : (
              <div className="hidden sm:block" />
            )}

            {nextArticle && (
              <button
                type="button"
                onClick={() => onSelectSlug(nextArticle.slug)}
                className="group text-right p-4 rounded-2xl bg-white border border-[#E5E2DA] hover:border-[#244B3A] transition-colors cursor-pointer flex items-center justify-end gap-4"
              >
                <div className="min-w-0">
                  <p className="inline-flex items-center justify-end gap-1 text-xs text-[#5C615C]">
                    <span>เรื่องราวถัดไป</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </p>
                  <p className="mt-1 font-editorial text-base font-semibold text-[#252525] group-hover:text-[#244B3A] line-clamp-1">
                    {nextArticle.place_name}
                  </p>
                  <p className="text-xs text-[#7D827D] truncate">
                    จังหวัด{nextArticle.province}
                  </p>
                </div>
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#EAE6DC] shrink-0">
                  <SafeImage
                    src={nextArticle.cover_image}
                    alt={nextArticle.place_name}
                    fallbackTitle={nextArticle.place_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </button>
            )}
          </nav>
        )}

        {/* Reader Comments / Guestbook Section */}
        <section
          aria-labelledby="comments-heading"
          className="mt-16 pt-12 border-t border-[#E5E2DA] max-w-[780px] mx-auto"
        >
          <div className="flex items-end justify-between gap-3 mb-6">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-[#244B3A] mb-1 uppercase">
                READER GUESTBOOK
              </p>
              <h2
                id="comments-heading"
                className="font-editorial text-2xl font-semibold text-[#252525]"
              >
                ความคิดเห็นจากผู้อ่าน
              </h2>
            </div>
            <span className="text-xs text-[#5C615C] tabular-nums">
              {comments.length} ความคิดเห็น
            </span>
          </div>

          {/* Comment Submission Form */}
          <form
            onSubmit={handleSubmitComment}
            className="bg-white rounded-2xl border border-[#E5E2DA] p-5 sm:p-6 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="comment-author"
                  className="block text-xs font-medium text-[#4B524B] mb-1.5"
                >
                  ชื่อของคุณ *
                </label>
                <input
                  id="comment-author"
                  type="text"
                  required
                  maxLength={60}
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  placeholder="เช่น ต้นกล้า, นักเดินทาง"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAF7] border border-[#E5E2DA] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
                />
              </div>

              {/* Hidden Honeypot Anti-Spam Input */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="comment-website">Website</label>
                <input
                  id="comment-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypotWebsite}
                  onChange={(e) => setHoneypotWebsite(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="comment-message"
                className="block text-xs font-medium text-[#4B524B] mb-1.5"
              >
                ฝากข้อความหรือสอบถามเส้นทาง *
              </label>
              <textarea
                id="comment-message"
                rows={3}
                required
                maxLength={1000}
                value={commentMessage}
                onChange={(e) => setCommentMessage(e.target.value)}
                placeholder="เล่าความประทับใจหรือถามข้อมูลเพิ่มเติมเกี่ยวกับทริปนี้ได้เลย..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAF7] border border-[#E5E2DA] text-sm text-[#252525] leading-relaxed focus:outline-none focus:border-[#244B3A] focus:bg-white resize-y"
              />
            </div>

            {commentError && (
              <p className="text-xs text-[#9E2A2B] bg-[#FDECEC] border border-[#F5C6C6] rounded-xl px-3.5 py-2.5">
                {commentError}
              </p>
            )}
            {commentSuccess && (
              <p className="text-xs text-[#244B3A] bg-[#DDE8DD]/65 border border-[#C7D8C7] rounded-xl px-3.5 py-2.5">
                {commentSuccess}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-xs text-[#7D827D]">
                ความคิดเห็นจะแสดงผลหลังจากผู้ดูแลตรวจสอบเรียบร้อยแล้ว
              </p>
              <button
                type="submit"
                disabled={commentSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#244B3A] hover:bg-[#1B3A2C] disabled:opacity-60 text-[#FAFAF7] text-sm font-medium transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{commentSubmitting ? 'กำลังส่ง...' : 'ส่งความคิดเห็น'}</span>
              </button>
            </div>
          </form>

          {/* Approved Comments List */}
          {comments.length > 0 ? (
            <div className="mt-6 space-y-3.5">
              {comments.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-[#E5E2DA] p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-[#DDE8DD] text-[#244B3A] text-xs font-semibold flex items-center justify-center shrink-0">
                        {item.author_name.slice(0, 1).toUpperCase()}
                      </span>
                      <p className="text-sm font-semibold text-[#252525]">
                        {item.author_name}
                      </p>
                    </div>
                    <time className="text-xs text-[#7D827D]">
                      {formatThaiDate(item.created_at)}
                    </time>
                  </div>
                  <p className="mt-3 text-sm text-[#3D423D] leading-relaxed whitespace-pre-line">
                    {item.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-center text-sm text-[#7D827D] py-6">
              ยังไม่มีความคิดเห็นในบทความนี้ — มาเป็นคนแรกที่ร่วมพูดคุยกันได้เลย
            </p>
          )}
        </section>
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
