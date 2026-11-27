import {
  AlignCenter,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bold,
  CalendarPlus,
  Clock,
  Eye,
  FileSpreadsheet,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  MapPin,
  MapPinned,
  PenLine,
  Pilcrow,
  Quote,
  RotateCcw,
  Save,
  Star,
  Trash2,
  Underline,
  Upload,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createArticle,
  fetchAdminMedia,
  updateArticle,
  uploadImages,
} from '../lib/api';
import {
  formatFileSize,
  formatThaiDate,
  isSafeExternalUrl,
  suggestSlug,
} from '../lib/format';
import {
  THAI_REGIONS,
  TRAVEL_STYLES,
  type Article,
  type ArticleStatus,
  type GalleryImage,
  type MediaAsset,
  type ThaiRegion,
  type TravelStyle,
} from '../types/blog';
import { RichContentRenderer } from './RichContentRenderer';
import { SafeImage } from './SafeImage';

interface ArticleEditorProps {
  getToken: () => Promise<string>;
  initialArticle: Article | null;
  defaultRegion?: ThaiRegion;
  onSaved: (article: Article, message: string) => void;
  onCancel: () => void;
}

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function ArticleEditor({
  getToken,
  initialArticle,
  defaultRegion,
  onSaved,
  onCancel,
}: ArticleEditorProps) {
  const isEditing = Boolean(initialArticle);

  const [title, setTitle] = useState(initialArticle?.title ?? '');
  const [slug, setSlug] = useState(initialArticle?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(initialArticle?.slug));
  const [placeName, setPlaceName] = useState(initialArticle?.place_name ?? '');
  const [province, setProvince] = useState(initialArticle?.province ?? '');
  const [region, setRegion] = useState<ThaiRegion>(
    initialArticle?.region ?? defaultRegion ?? 'ภาคตะวันออกเฉียงเหนือ',
  );
  const [travelDate, setTravelDate] = useState(
    initialArticle?.travel_date ?? getTodayIso(),
  );
  const [travelStyle, setTravelStyle] = useState<TravelStyle>(
    initialArticle?.travel_style ?? 'ภูเขาและป่าไม้',
  );
  const [bestSeason, setBestSeason] = useState(initialArticle?.best_season ?? '');
  const [duration, setDuration] = useState(initialArticle?.duration ?? '');
  const [budgetEstimate, setBudgetEstimate] = useState(
    initialArticle?.budget_estimate ?? '',
  );
  const [highlights, setHighlights] = useState(initialArticle?.highlights ?? '');
  const [googleMapsUrl, setGoogleMapsUrl] = useState(
    initialArticle?.google_maps_url ?? '',
  );
  const [isFeatured, setIsFeatured] = useState(initialArticle?.is_featured ?? false);
  const [excerpt, setExcerpt] = useState(initialArticle?.excerpt ?? '');
  const [coverImage, setCoverImage] = useState(initialArticle?.cover_image ?? '');
  const [content, setContent] = useState(initialArticle?.content ?? '');
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(
    initialArticle?.gallery_images ?? [],
  );
  const [status, setStatus] = useState<ArticleStatus>(
    initialArticle?.status ?? 'published',
  );

  // Local Auto-Save Draft state
  const draftStorageKey = useMemo(
    () => `khonneethiao_article_draft_v1_${initialArticle?.id ?? 'new'}`,
    [initialArticle?.id],
  );
  const [pendingLocalDraft, setPendingLocalDraft] = useState<{
    savedAt: string;
    data: {
      title: string;
      slug: string;
      placeName: string;
      province: string;
      region: ThaiRegion;
      travelDate: string;
      travelStyle: TravelStyle;
      bestSeason: string;
      duration: string;
      budgetEstimate: string;
      highlights: string;
      googleMapsUrl: string;
      isFeatured: boolean;
      excerpt: string;
      coverImage: string;
      content: string;
      galleryImages: GalleryImage[];
      status: ArticleStatus;
    };
  } | null>(null);
  const [autoSavedLabel, setAutoSavedLabel] = useState('');
  const hasHydratedRef = useRef(false);

  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingInline, setUploadingInline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mediaLibrary, setMediaLibrary] = useState<MediaAsset[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  // Inline external link popover state (no window.prompt)
  const [showLinkBox, setShowLinkBox] = useState(false);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkError, setLinkError] = useState('');

  // Inline multi-URL image inserter popover
  const [showImageUrlBox, setShowImageUrlBox] = useState(false);
  const [inlineImageUrlsText, setInlineImageUrlsText] = useState('');
  const [inlineImageCaption, setInlineImageCaption] = useState('');
  const [inlineImageUrlError, setInlineImageUrlError] = useState('');

  // Structured Place Info Card builder popover
  const [showPlaceCardBox, setShowPlaceCardBox] = useState(false);
  const [placeCardName, setPlaceCardName] = useState('');
  const [placeCardAddress, setPlaceCardAddress] = useState('');
  const [placeCardHours, setPlaceCardHours] = useState('');
  const [placeCardFee, setPlaceCardFee] = useState('');
  const [placeCardPhone, setPlaceCardPhone] = useState('');
  const [placeCardSocial, setPlaceCardSocial] = useState('');
  const [placeCardMaps, setPlaceCardMaps] = useState('');
  const [placeCardError, setPlaceCardError] = useState('');

  // Multi-day trip template confirmation (no window.confirm)
  const [confirmTemplateReplace, setConfirmTemplateReplace] = useState(false);

  // Direct external image URL inputs (Cloudinary / ImgBB / GitHub raw)
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [coverUrlError, setCoverUrlError] = useState('');
  const [galleryUrlInput, setGalleryUrlInput] = useState('');
  const [galleryUrlError, setGalleryUrlError] = useState('');

  const handleApplyCoverUrl = () => {
    const trimmed = coverUrlInput.trim();
    if (!trimmed || !isSafeExternalUrl(trimmed)) {
      setCoverUrlError('กรุณาวางลิงก์รูปภาพที่ขึ้นต้นด้วย https:// หรือ http://');
      return;
    }
    setCoverImage(trimmed);
    setCoverUrlInput('');
    setCoverUrlError('');
  };

  const handleAddGalleryUrl = () => {
    const trimmed = galleryUrlInput.trim();
    if (!trimmed || !isSafeExternalUrl(trimmed)) {
      setGalleryUrlError('กรุณาวางลิงก์รูปภาพที่ขึ้นต้นด้วย https:// หรือ http://');
      return;
    }
    setGalleryImages((prev) => [...prev, { url: trimmed, caption: '' }]);
    setGalleryUrlInput('');
    setGalleryUrlError('');
  };

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const inlineImgInputRef = useRef<HTMLInputElement | null>(null);

  // Check for existing unsaved local draft on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.savedAt && parsed.data && typeof parsed.data.title === 'string') {
          const isDifferent =
            parsed.data.title !== (initialArticle?.title ?? '') ||
            parsed.data.content !== (initialArticle?.content ?? '') ||
            parsed.data.placeName !== (initialArticle?.place_name ?? '');
          if (isDifferent) {
            setPendingLocalDraft(parsed);
          }
        }
      }
    } catch {
      // Ignore malformed draft
    }
    hasHydratedRef.current = true;
  }, [draftStorageKey, initialArticle?.title, initialArticle?.content, initialArticle?.place_name]);

  // Debounced auto-save to localStorage every 2.5 seconds
  useEffect(() => {
    if (!hasHydratedRef.current || pendingLocalDraft) return;
    if (!title.trim() && !content.trim() && !placeName.trim()) return;

    const timer = window.setTimeout(() => {
      try {
        const now = new Date();
        const payload = {
          savedAt: now.toISOString(),
          data: {
            title,
            slug,
            placeName,
            province,
            region,
            travelDate,
            travelStyle,
            bestSeason,
            duration,
            budgetEstimate,
            highlights,
            googleMapsUrl,
            isFeatured,
            excerpt,
            coverImage,
            content,
            galleryImages,
            status,
          },
        };
        window.localStorage.setItem(draftStorageKey, JSON.stringify(payload));
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        setAutoSavedLabel(`บันทึกร่างอัตโนมัติ ${hh}:${mm}`);
      } catch {
        // Ignore storage quota errors
      }
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [
    draftStorageKey,
    pendingLocalDraft,
    title,
    slug,
    placeName,
    province,
    region,
    travelDate,
    travelStyle,
    bestSeason,
    duration,
    budgetEstimate,
    highlights,
    googleMapsUrl,
    isFeatured,
    excerpt,
    coverImage,
    content,
    galleryImages,
    status,
  ]);

  const handleRestoreLocalDraft = () => {
    if (!pendingLocalDraft) return;
    const d = pendingLocalDraft.data;
    setTitle(d.title);
    setSlug(d.slug);
    setSlugTouched(Boolean(d.slug));
    setPlaceName(d.placeName);
    setProvince(d.province);
    setRegion(d.region);
    setTravelDate(d.travelDate);
    setTravelStyle(d.travelStyle);
    setBestSeason(d.bestSeason);
    setDuration(d.duration);
    setBudgetEstimate(d.budgetEstimate);
    setHighlights(d.highlights);
    setGoogleMapsUrl(d.googleMapsUrl || '');
    setIsFeatured(d.isFeatured);
    setExcerpt(d.excerpt);
    setCoverImage(d.coverImage);
    setContent(d.content);
    setGalleryImages(Array.isArray(d.galleryImages) ? d.galleryImages : []);
    setStatus(d.status);
    setPendingLocalDraft(null);
    setAutoSavedLabel('กู้คืนฉบับร่างเรียบร้อย');
  };

  const handleDiscardLocalDraft = () => {
    try {
      window.localStorage.removeItem(draftStorageKey);
    } catch {
      // Ignore
    }
    setPendingLocalDraft(null);
  };

  useEffect(() => {
    getToken()
      .then((token) => fetchAdminMedia(token))
      .then(setMediaLibrary)
      .catch(() => {
        // Non-fatal
      });
  }, [getToken]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugTouched) {
      setSlug(suggestSlug(val));
    }
  };

  const insertAtCursor = (before: string, after = '', placeholder = '') => {
    const el = textareaRef.current;
    if (!el) {
      setContent((prev) => `${prev}${before}${placeholder}${after}`);
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const selected = content.slice(start, end);
    const middle = selected || placeholder;
    const nextValue =
      content.slice(0, start) + before + middle + after + content.slice(end);
    setContent(nextValue);

    window.requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + before.length;
      const cursorEnd = cursorStart + middle.length;
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const handleConfirmInsertLink = () => {
    setLinkError('');
    if (!isSafeExternalUrl(linkUrl)) {
      setLinkError('กรุณาระบุลิงก์ที่ขึ้นต้นด้วย https:// หรือ http://');
      return;
    }
    const label = linkLabel.trim() || linkUrl.trim();
    insertAtCursor(`[${label}](${linkUrl.trim()})`);
    setShowLinkBox(false);
    setLinkLabel('');
    setLinkUrl('https://');
  };

  const handleCoverFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingCover(true);
    setError('');
    try {
      const token = await getToken();
      const uploaded = await uploadImages(token, [files[0]]);
      if (uploaded[0]) {
        setCoverImage(uploaded[0].url);
        setMediaLibrary((prev) => [uploaded[0], ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถอัปโหลดรูปหน้าปกได้');
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleGalleryFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    setError('');
    try {
      const token = await getToken();
      const uploaded = await uploadImages(token, files);
      setGalleryImages((prev) => [
        ...prev,
        ...uploaded.map((asset) => ({
          url: asset.url,
          caption: '',
        })),
      ]);
      setMediaLibrary((prev) => [...uploaded, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถอัปโหลดรูปภาพประกอบได้');
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleInlineImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingInline(true);
    setError('');
    try {
      const token = await getToken();
      const uploaded = await uploadImages(token, files);
      if (uploaded.length > 0) {
        const caption = uploaded.length === 1 ? placeName.trim() || '' : '';
        const mdLines = uploaded.map((asset) => `![${caption}](${asset.url})`).join('\n');
        insertAtCursor(`\n\n${mdLines}\n\n`);
        setMediaLibrary((prev) => [...uploaded, ...prev]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'ไม่สามารถอัปโหลดรูปภาพแทรกในเนื้อหาได้',
      );
    } finally {
      setUploadingInline(false);
      if (inlineImgInputRef.current) inlineImgInputRef.current.value = '';
    }
  };

  const handleInsertNextDayHeading = () => {
    const matches = content.match(/^##\s*(?:Day\s*\d+|วันที่\s*\d+)/gim);
    const nextDay = (matches ? matches.length : 0) + 1;
    insertAtCursor(`\n\n## Day ${nextDay} : `, '\n\n', 'หัวข้อกิจกรรมวันนี้');
  };

  const handleConfirmInsertImageUrls = () => {
    setInlineImageUrlError('');
    const rawLines = inlineImageUrlsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (rawLines.length === 0) {
      setInlineImageUrlError('กรุณาวางลิงก์รูปภาพอย่างน้อย 1 ลิงก์');
      return;
    }
    for (const url of rawLines) {
      if (!isSafeExternalUrl(url)) {
        setInlineImageUrlError('ทุกลิงก์ต้องขึ้นต้นด้วย https:// หรือ http://');
        return;
      }
    }
    const caption = inlineImageCaption.trim();
    const mdLines = rawLines
      .map((url, idx) => `![${rawLines.length === 1 ? caption : idx === 0 ? caption : ''}](${url})`)
      .join('\n');
    insertAtCursor(`\n\n${mdLines}\n\n`);
    setInlineImageUrlsText('');
    setInlineImageCaption('');
    setShowImageUrlBox(false);
  };

  const handleConfirmInsertPlaceCard = () => {
    setPlaceCardError('');
    const name = placeCardName.trim();
    if (!name) {
      setPlaceCardError('กรุณาระบุชื่อสถานที่ / ร้าน / คาเฟ่ / วัด / ที่พัก');
      return;
    }
    if (placeCardMaps.trim() && !isSafeExternalUrl(placeCardMaps.trim())) {
      setPlaceCardError('ลิงก์พิกัด GPS ต้องขึ้นต้นด้วย https:// หรือ http://');
      return;
    }

    const cardLines: string[] = [':::place', `ชื่อสถานที่ : ${name}`];
    if (placeCardAddress.trim()) cardLines.push(`ที่ตั้ง : ${placeCardAddress.trim()}`);
    if (placeCardHours.trim()) cardLines.push(`เปิด-ปิด : ${placeCardHours.trim()}`);
    if (placeCardFee.trim()) cardLines.push(`ค่าเข้า : ${placeCardFee.trim()}`);
    if (placeCardPhone.trim()) cardLines.push(`โทรศัพท์ : ${placeCardPhone.trim()}`);
    if (placeCardSocial.trim()) cardLines.push(`Facebook : ${placeCardSocial.trim()}`);
    if (placeCardMaps.trim()) cardLines.push(`พิกัด GPS : ${placeCardMaps.trim()}`);
    cardLines.push(':::');

    insertAtCursor(`\n\n${cardLines.join('\n')}\n\n`);
    setPlaceCardName('');
    setPlaceCardAddress('');
    setPlaceCardHours('');
    setPlaceCardFee('');
    setPlaceCardPhone('');
    setPlaceCardSocial('');
    setPlaceCardMaps('');
    setShowPlaceCardBox(false);
  };

  const applyMultiDayTripTemplate = () => {
    const template = `สวัสดีครับเพื่อน ๆ ทริปนี้เราจะพาไปเที่ยวชิล ๆ กันแบบครบรส ทั้งไหว้พระทำบุญ คาเฟ่น่ารัก ร้านอาหารอร่อย และจุดเช็คอินยอดฮิต พร้อมแล้วออกเดินทางกันเลยครับ

## Day 1 : เริ่มต้นทริป เช็คอินคาเฟ่ ไหว้พระ และเดินเล่นยามเย็น

ออกเดินทางกันแต่เช้า เมื่อถึงจุดหมายแล้วก็แวะเติมพลังและเช็คอินกันที่จุดแรกเลย

### ชื่อคาเฟ่หรือจุดเช็คอินที่ 1

เล่าบรรยากาศร้าน มุมถ่ายรูป หรือเมนูประทับใจที่นี่... (สามารถกดปุ่ม "แทรกรูปจาก URL" ด้านบนเพื่อวางรูป 2–4 รูปเรียงเป็นกริดสวย ๆ ได้เลย)

:::place
ชื่อสถานที่ : ชื่อคาเฟ่ / ร้านอาหาร
ที่ตั้ง : ถนน / ตำบล / อำเภอ / จังหวัด
เปิด-ปิด : 09.00 - 18.00 น.
โทรศัพท์ : 08x-xxx-xxxx
Facebook : ชื่อเพจหรือลิงก์ Facebook
พิกัด GPS : https://maps.google.com/
:::

### ชื่อวัดหรือสถานที่ท่องเที่ยวที่ 2

เล่าเรื่องราว ประวัติ หรือความประทับใจของสถานที่นี้...

:::place
ชื่อสถานที่ : ชื่อสถานที่ท่องเที่ยว
ที่ตั้ง : ที่อยู่สถานที่
เปิด-ปิด : 06.00 - 17.00 น.
พิกัด GPS : https://maps.google.com/
:::

## Day 2 : ตะลุยจุดเช็คอินยอดฮิตและร้านอาหารพื้นเมือง

### ชื่อสถานที่ / สวนดอกไม้ / ร้านอร่อย

เล่าบรรยากาศและเมนูแนะนำในวันที่สอง...

:::place
ชื่อสถานที่ : ชื่อสถานที่ท่องเที่ยว
ที่ตั้ง : ที่อยู่สถานที่
ค่าเข้า : 60 บาท
เปิด-ปิด : 08.00 - 20.00 น.
โทรศัพท์ : 09x-xxx-xxxx
พิกัด GPS : https://maps.google.com/
:::

## Day 3 : ไหว้พระขอพรก่อนเดินทางกลับ

เช้าวันสุดท้ายหลังอาหารเช้า แวะไหว้พระขอพรเอาฤกษ์เอาชัยก่อนเดินทางกลับบ้าน

:::place
ชื่อสถานที่ : ชื่อวัด / จุดแวะสุดท้าย
ที่ตั้ง : ที่อยู่สถานที่
เปิด-ปิด : 06.00 - 18.00 น.
พิกัด GPS : https://maps.google.com/
:::

จบทริปแบบอิ่มใจและประทับใจสุด ๆ ใครกำลังมองหาแพลนเที่ยวชิล ๆ ลองนำเส้นทางนี้ไปปรับใช้กันได้เลยครับ`;

    setContent(template);
    if (!duration.trim()) setDuration('3 วัน 2 คืน');
    setConfirmTemplateReplace(false);
  };

  const updateGalleryCaption = (index: number, caption: string) => {
    setGalleryImages((prev) =>
      prev.map((item, i) => (i === index ? { ...item, caption } : item)),
    );
  };

  const moveGalleryItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= galleryImages.length) return;
    setGalleryImages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const removeGalleryItem = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInsertGalleryPhotoIntoContent = (photo: GalleryImage) => {
    const caption =
      photo.caption.trim() || placeName.trim() || 'ภาพบรรยากาศสถานที่ท่องเที่ยว';
    setActiveTab('write');
    insertAtCursor(`\n\n![${caption}](${photo.url})\n\n`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('กรุณากรอกชื่อบทความ');
      return;
    }
    if (!placeName.trim()) {
      setError('กรุณากรอกชื่อสถานที่ท่องเที่ยว');
      return;
    }
    if (!province.trim()) {
      setError('กรุณากรอกชื่อจังหวัด');
      return;
    }
    if (!coverImage.trim()) {
      setError('กรุณาอัปโหลดรูปภาพหน้าปกของบทความ');
      return;
    }
    if (!content.trim()) {
      setError('กรุณาเขียนเนื้อหาเรื่องราวการเดินทาง');
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        place_name: placeName.trim(),
        province: province.trim(),
        region,
        travel_date: travelDate,
        travel_style: travelStyle,
        best_season: bestSeason.trim(),
        duration: duration.trim(),
        budget_estimate: budgetEstimate.trim(),
        highlights: highlights.trim(),
        google_maps_url: googleMapsUrl.trim(),
        is_featured: isFeatured,
        excerpt: excerpt.trim(),
        cover_image: coverImage.trim(),
        content: content.trim(),
        gallery_images: galleryImages,
        status,
      };

      const saved =
        isEditing && initialArticle
          ? await updateArticle(token, initialArticle.id, payload)
          : await createArticle(token, payload);

      try {
        window.localStorage.removeItem(draftStorageKey);
      } catch {
        // Ignore
      }

      const message = isEditing
        ? `บันทึกการแก้ไขบทความ “${saved.title}” เรียบร้อยแล้ว`
        : status === 'published'
          ? `เผยแพร่บทความ “${saved.title}” ขึ้นหน้าเว็บไซต์เรียบร้อยแล้ว`
          : `บันทึกฉบับร่าง “${saved.title}” เรียบร้อยแล้ว`;

      onSaved(saved, message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกบทความได้');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-20">
      {/* Editor Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E2DA]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4B524B] hover:text-[#252525] cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับแดชบอร์ด</span>
            </button>
            <span className="text-[#DCD7CB]" aria-hidden="true">
              /
            </span>
            <h1 className="font-editorial text-base sm:text-lg font-semibold text-[#252525] truncate">
              {isEditing ? 'แก้ไขบทความท่องเที่ยว' : 'เพิ่มบทความท่องเที่ยวใหม่'}
            </h1>
            {autoSavedLabel && (
              <span className="hidden md:inline-flex items-center gap-1 text-xs text-[#5C615C] whitespace-nowrap shrink-0">
                <Clock className="w-3.5 h-3.5 text-[#244B3A]" />
                <span>{autoSavedLabel}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:inline-flex items-center p-1 rounded-xl bg-[#EFECE4] border border-[#E5E2DA]">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  activeTab === 'write'
                    ? 'bg-white text-[#252525] shadow-xs'
                    : 'text-[#5C615C] hover:text-[#252525]'
                }`}
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>เขียนบทความ</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-white text-[#252525] shadow-xs'
                    : 'text-[#5C615C] hover:text-[#252525]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>ดูตัวอย่าง</span>
              </button>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#244B3A] hover:bg-[#1B3A2C] disabled:opacity-60 text-[#FAFAF7] text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              <span>
                {saving
                  ? 'กำลังบันทึก...'
                  : status === 'published'
                    ? 'บันทึกและเผยแพร่'
                    : 'บันทึกฉบับร่าง'}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 sm:px-8 pt-8">
        {pendingLocalDraft && (
          <div className="mb-6 px-4 py-3.5 rounded-xl bg-[#DDE8DD]/60 border border-[#C3D7C3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-[#244B3A]">
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>
                พบฉบับร่างที่บันทึกอัตโนมัติไว้เมื่อ{' '}
                <strong>{formatThaiDate(pendingLocalDraft.savedAt)}</strong> ต้องการกู้คืนหรือไม่?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRestoreLocalDraft}
                className="px-3.5 py-1.5 rounded-lg bg-[#244B3A] hover:bg-[#1B3A2C] text-white text-xs font-medium cursor-pointer"
              >
                กู้คืนฉบับร่างนี้
              </button>
              <button
                type="button"
                onClick={handleDiscardLocalDraft}
                className="px-3 py-1.5 rounded-lg border border-[#B8CEB8] bg-white hover:bg-[#FAFAF7] text-[#4B524B] text-xs font-medium cursor-pointer"
              >
                ทิ้งฉบับร่าง
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 px-4 py-3 rounded-xl bg-[#FEF4F8] border border-[#F3C5D8] text-sm text-[#B82860]"
          >
            {error}
          </div>
        )}

        {/* Mobile Write / Preview switcher */}
        <div className="sm:hidden mb-6 inline-flex items-center p-1 rounded-xl bg-[#EFECE4] border border-[#E5E2DA]">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`px-4 py-2 rounded-lg text-xs font-medium ${
              activeTab === 'write' ? 'bg-white text-[#252525]' : 'text-[#5C615C]'
            }`}
          >
            เขียนบทความ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-lg text-xs font-medium ${
              activeTab === 'preview' ? 'bg-white text-[#252525]' : 'text-[#5C615C]'
            }`}
          >
            ดูตัวอย่าง
          </button>
        </div>

        {activeTab === 'preview' ? (
          <div className="bg-white rounded-2xl border border-[#E5E2DA] p-6 sm:p-12 max-w-[920px] mx-auto">
            <div className="text-center max-w-[740px] mx-auto">
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[#5C615C]">
                <span className="font-medium text-[#244B3A]">{region}</span>
                <span>·</span>
                <span>จังหวัด{province || '—'}</span>
                <span>·</span>
                <span>{travelStyle}</span>
                <span>·</span>
                <span>{formatThaiDate(travelDate)}</span>
              </div>
              <h2 className="mt-3 font-editorial text-3xl sm:text-4xl font-bold text-[#252525] leading-snug">
                {title || 'ยังไม่ได้ระบุชื่อบทความ'}
              </h2>
              {excerpt && (
                <p className="mt-3 text-base text-[#4B524B] leading-relaxed">
                  {excerpt}
                </p>
              )}
            </div>

            {coverImage && (
              <div className="mt-8 aspect-[16/10] w-full overflow-hidden rounded-2xl bg-[#EAE6DC]">
                <SafeImage
                  src={coverImage}
                  alt={placeName || title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {(bestSeason || duration || budgetEstimate || highlights) && (
              <div className="mt-8 max-w-[740px] mx-auto rounded-2xl border border-[#E5E2DA] bg-[#FAFAF7] p-5">
                <p className="font-editorial text-sm font-semibold text-[#252525] mb-3">
                  บันทึกข้อมูลทริปฉบับย่อ
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[#7D827D]">ช่วงเวลาที่เหมาะที่สุด</span>
                    <p className="mt-0.5 font-medium text-[#252525]">
                      {bestSeason || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#7D827D]">ระยะเวลาทริป</span>
                    <p className="mt-0.5 font-medium text-[#252525]">
                      {duration || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#7D827D]">งบประมาณโดยประมาณ</span>
                    <p className="mt-0.5 font-medium text-[#244B3A]">
                      {budgetEstimate || '—'}
                    </p>
                  </div>
                </div>
                {highlights && (
                  <p className="mt-3 pt-3 border-t border-[#E5E2DA] text-xs text-[#2D312D]">
                    <span className="text-[#7D827D] mr-2">ไฮไลท์:</span>
                    {highlights}
                  </p>
                )}
              </div>
            )}

            <div className="mt-10 max-w-[700px] mx-auto">
              {content.trim() ? (
                <RichContentRenderer content={content} />
              ) : (
                <p className="text-center text-sm text-[#7D827D] py-8">
                  ยังไม่มีเนื้อหาบทความ
                </p>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Main Column */}
            <div className="lg:col-span-8 space-y-6">
              {/* Basic Article Information */}
              <section className="bg-white rounded-2xl border border-[#E5E2DA] p-6 space-y-5">
                <h2 className="font-editorial text-lg font-semibold text-[#252525] pb-3 border-b border-[#EFECE4]">
                  ข้อมูลหลักของบทความ
                </h2>

                <div>
                  <label
                    htmlFor="field-title"
                    className="block text-sm font-medium text-[#252525] mb-1.5"
                  >
                    ชื่อบทความ *
                  </label>
                  <input
                    id="field-title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="เช่น ผาเก็บตะวัน ทับลาน: บ่ายแก่ ๆ กับลมเย็นและผืนป่าลานสุดสายตา"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
                  />
                </div>

                {/* Editable URL Slug */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label
                      htmlFor="field-slug"
                      className="block text-xs font-medium text-[#5C615C]"
                    >
                      ลิงก์บทความ (URL Slug)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSlug(suggestSlug(title || placeName));
                        setSlugTouched(false);
                      }}
                      className="text-xs font-medium text-[#244B3A] hover:underline cursor-pointer"
                    >
                      สร้างอัตโนมัติจากชื่อบทความ
                    </button>
                  </div>
                  <div className="flex items-center rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] focus-within:border-[#244B3A] focus-within:bg-white overflow-hidden">
                    <span className="pl-3.5 pr-1 text-xs text-[#7D827D] select-none whitespace-nowrap">
                      /article/
                    </span>
                    <input
                      id="field-slug"
                      type="text"
                      value={slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setSlug(e.target.value);
                      }}
                      placeholder="pha-keb-tawan-thap-lan"
                      className="flex-1 py-2.5 pr-3.5 bg-transparent text-xs sm:text-sm text-[#252525] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="field-place"
                      className="block text-sm font-medium text-[#252525] mb-1.5"
                    >
                      ชื่อสถานที่ท่องเที่ยว *
                    </label>
                    <input
                      id="field-place"
                      type="text"
                      required
                      value={placeName}
                      onChange={(e) => setPlaceName(e.target.value)}
                      placeholder="เช่น อุทยานแห่งชาติทับลาน"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="field-province"
                      className="block text-sm font-medium text-[#252525] mb-1.5"
                    >
                      จังหวัด *
                    </label>
                    <input
                      id="field-province"
                      type="text"
                      required
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="เช่น นครราชสีมา"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="field-region"
                      className="block text-sm font-medium text-[#252525] mb-1.5"
                    >
                      ภูมิภาค *
                    </label>
                    <select
                      id="field-region"
                      value={region}
                      onChange={(e) => setRegion(e.target.value as ThaiRegion)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
                    >
                      {THAI_REGIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="field-style"
                      className="block text-sm font-medium text-[#252525] mb-1.5"
                    >
                      สไตล์การท่องเที่ยว
                    </label>
                    <select
                      id="field-style"
                      value={travelStyle}
                      onChange={(e) => setTravelStyle(e.target.value as TravelStyle)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
                    >
                      {TRAVEL_STYLES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="field-date"
                      className="block text-sm font-medium text-[#252525] mb-1.5"
                    >
                      วันที่เดินทาง *
                    </label>
                    <input
                      id="field-date"
                      type="date"
                      required
                      value={travelDate}
                      onChange={(e) => setTravelDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="field-excerpt"
                    className="block text-sm font-medium text-[#252525] mb-1.5"
                  >
                    คำอธิบายสั้น ๆ (Excerpt แสดงบนการ์ดหน้าแรก)
                  </label>
                  <textarea
                    id="field-excerpt"
                    rows={2}
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="สรุปบรรยากาศสั้น ๆ 1–2 ประโยค (หากเว้นว่าง ระบบจะตัดจากย่อหน้าแรกให้อัตโนมัติ)"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white resize-y"
                  />
                </div>
              </section>

              {/* Trip Quick Guide Fields */}
              <section className="bg-white rounded-2xl border border-[#E5E2DA] p-6 space-y-4">
                <div className="pb-3 border-b border-[#EFECE4]">
                  <h2 className="font-editorial text-lg font-semibold text-[#252525]">
                    บันทึกข้อมูลทริปฉบับย่อ (Trip Quick Guide)
                  </h2>
                  <p className="text-xs text-[#5C615C] mt-0.5">
                    แสดงเป็นการ์ดช่วยวางแผนเที่ยวในหน้าบทความ (ไม่บังคับกรอก)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="field-season"
                      className="block text-xs font-medium text-[#252525] mb-1.5"
                    >
                      ช่วงเวลาที่เหมาะที่สุด
                    </label>
                    <input
                      id="field-season"
                      type="text"
                      value={bestSeason}
                      onChange={(e) => setBestSeason(e.target.value)}
                      placeholder="เช่น ตุลาคม – กุมภาพันธ์"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="field-duration"
                      className="block text-xs font-medium text-[#252525] mb-1.5"
                    >
                      ระยะเวลาทริป
                    </label>
                    <input
                      id="field-duration"
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="เช่น 2 วัน 1 คืน"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="field-budget"
                      className="block text-xs font-medium text-[#252525] mb-1.5"
                    >
                      งบประมาณโดยประมาณ
                    </label>
                    <input
                      id="field-budget"
                      type="text"
                      value={budgetEstimate}
                      onChange={(e) => setBudgetEstimate(e.target.value)}
                      placeholder="เช่น 2,500 – 3,500 บาท"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="field-highlights"
                    className="block text-xs font-medium text-[#252525] mb-1.5"
                  >
                    ไฮไลท์ห้ามพลาด (คั่นแต่ละรายการด้วยเครื่องหมายจุลภาค ,)
                  </label>
                  <input
                    id="field-highlights"
                    type="text"
                    value={highlights}
                    onChange={(e) => setHighlights(e.target.value)}
                    placeholder="เช่น ชมพระอาทิตย์ตกผาเก็บตะวัน, กางเต็นท์ดูหมอก"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="field-google-maps"
                    className="flex items-center gap-1.5 text-xs font-medium text-[#252525] mb-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#244B3A]" />
                    <span>ลิงก์พิกัด Google Maps (สำหรับปุ่ม “เปิดนำทางใน Google Maps”)</span>
                  </label>
                  <input
                    id="field-google-maps"
                    type="url"
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    placeholder="https://maps.google.com/... หรือ https://maps.app.goo.gl/..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
                  />
                </div>
              </section>

              {/* Rich Story Editor */}
              <section className="bg-white rounded-2xl border border-[#E5E2DA] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#EFECE4] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-editorial text-lg font-semibold text-[#252525]">
                      เนื้อหาเรื่องราวการเดินทาง *
                    </h2>
                    <p className="text-xs text-[#7D827D] mt-0.5">
                      ใช้หัวข้อ Day / H2 เพื่อสร้างสารบัญอัตโนมัติ และวางรูปติดกัน 2–4 รูปเพื่อจัดเป็นกริดอัตโนมัติ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (content.trim()) {
                        setConfirmTemplateReplace(true);
                      } else {
                        applyMultiDayTripTemplate();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCD7CB] bg-[#FAFAF7] hover:bg-[#DDE8DD]/60 hover:border-[#B8D1B8] text-xs font-medium text-[#244B3A] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>ใช้โครงร่างทริป (Day 1–3)</span>
                  </button>
                </div>

                {confirmTemplateReplace && (
                  <div className="px-5 py-3 bg-[#FDF8EC] border-b border-[#E6C98B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#6B4E16]">
                    <span>
                      เนื้อหาเดิมในกล่องจะถูกแทนที่ด้วยโครงร่างทริป 3 วัน 2 คืน ต้องการดำเนินการต่อหรือไม่?
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={applyMultiDayTripTemplate}
                        className="px-3 py-1.5 rounded-lg bg-[#244B3A] text-white font-medium hover:bg-[#1B3A2C] cursor-pointer"
                      >
                        ยืนยันใช้โครงร่าง
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmTemplateReplace(false)}
                        className="px-3 py-1.5 rounded-lg border border-[#D8C59B] bg-white text-[#252525] hover:bg-[#FAFAF7] cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                )}

                {/* Rich Formatting Toolbar */}
                <div className="px-4 py-2.5 bg-[#F4F2EC]/90 border-b border-[#E5E2DA] flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    title="เพิ่มหัวข้อวันเดินทาง (Day 1, Day 2, Day 3)"
                    onClick={handleInsertNextDayHeading}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#DDE8DD]/80 text-[#244B3A] hover:bg-[#DDE8DD] border border-[#C6DAC6] cursor-pointer"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>+ วัน (Day)</span>
                  </button>
                  <button
                    type="button"
                    title="แทรกกล่องข้อมูลสถานที่ (ที่ตั้ง เวลาเปิด-ปิด โทร Facebook พิกัด GPS)"
                    onClick={() => {
                      setPlaceCardError('');
                      setShowLinkBox(false);
                      setShowImageUrlBox(false);
                      setShowPlaceCardBox((prev) => !prev);
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                      showPlaceCardBox
                        ? 'bg-[#244B3A] border-[#244B3A] text-white'
                        : 'bg-[#DDE8DD]/80 text-[#244B3A] hover:bg-[#DDE8DD] border-[#C6DAC6]'
                    }`}
                  >
                    <MapPinned className="w-3.5 h-3.5" />
                    <span>+ กล่องข้อมูลสถานที่</span>
                  </button>

                  <div className="h-4 w-px bg-[#D8D4C9] mx-1 hidden sm:block" />

                  <button
                    type="button"
                    title="หัวข้อหลัก (H2)"
                    onClick={() => insertAtCursor('\n\n## ', '\n', 'หัวข้อหลัก')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#252525] hover:bg-white border border-transparent hover:border-[#DCD7CB] cursor-pointer"
                  >
                    <Heading2 className="w-3.5 h-3.5" />
                    <span>H2</span>
                  </button>
                  <button
                    type="button"
                    title="ชื่อร้าน / สถานที่ย่อย (H3)"
                    onClick={() => insertAtCursor('\n\n### ', '\n', 'ชื่อสถานที่ / คาเฟ่')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#252525] hover:bg-white border border-transparent hover:border-[#DCD7CB] cursor-pointer"
                  >
                    <Heading3 className="w-3.5 h-3.5" />
                    <span>H3</span>
                  </button>
                  <button
                    type="button"
                    title="ตัวหนา"
                    onClick={() => insertAtCursor('**', '**', 'ข้อความตัวหนา')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#252525] hover:bg-white border border-transparent hover:border-[#DCD7CB] cursor-pointer"
                  >
                    <Bold className="w-3.5 h-3.5" />
                    <span>หนา</span>
                  </button>
                  <button
                    type="button"
                    title="ตัวเอียง"
                    onClick={() => insertAtCursor('*', '*', 'ข้อความตัวเอียง')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#252525] hover:bg-white border border-transparent hover:border-[#DCD7CB] cursor-pointer"
                  >
                    <Italic className="w-3.5 h-3.5" />
                    <span>เอียง</span>
                  </button>
                  <button
                    type="button"
                    title="ขีดเส้นใต้"
                    onClick={() => insertAtCursor('__', '__', 'ข้อความขีดเส้นใต้')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#252525] hover:bg-white border border-transparent hover:border-[#DCD7CB] cursor-pointer"
                  >
                    <Underline className="w-3.5 h-3.5" />
                    <span>ขีดเส้นใต้</span>
                  </button>
                  <button
                    type="button"
                    title="รายการย่อย (Bullet)"
                    onClick={() => insertAtCursor('\n- ', '', 'ข้อแนะนำในการเดินทาง')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#252525] hover:bg-white border border-transparent hover:border-[#DCD7CB] cursor-pointer"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>รายการ</span>
                  </button>
                  <button
                    type="button"
                    title="รายการตัวเลข"
                    onClick={() => insertAtCursor('\n1. ', '', 'ลำดับการเดินทาง')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#252525] hover:bg-white border border-transparent hover:border-[#DCD7CB] cursor-pointer"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>ตัวเลข</span>
                  </button>
                  <button
                    type="button"
                    title="จัดข้อความกึ่งกลาง"
                    onClick={() =>
                      insertAtCursor('\n\n::center:: ', '\n', 'ข้อความจัดกึ่งกลาง')
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#252525] hover:bg-white border border-transparent hover:border-[#DCD7CB] cursor-pointer"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                    <span>กึ่งกลาง</span>
                  </button>
                  <button
                    type="button"
                    title="คำคม / ข้อความเน้น"
                    onClick={() =>
                      insertAtCursor('\n\n> ', '\n', 'ประโยคประทับใจระหว่างการเดินทาง')
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#252525] hover:bg-white border border-transparent hover:border-[#DCD7CB] cursor-pointer"
                  >
                    <Quote className="w-3.5 h-3.5" />
                    <span>คำคม</span>
                  </button>
                  <button
                    type="button"
                    title="แทรกลิงก์ภายนอก"
                    onClick={() => {
                      setLinkError('');
                      setShowPlaceCardBox(false);
                      setShowImageUrlBox(false);
                      setShowLinkBox((prev) => !prev);
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                      showLinkBox
                        ? 'bg-white border-[#244B3A] text-[#244B3A]'
                        : 'text-[#252525] hover:bg-white border-transparent hover:border-[#DCD7CB]'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>ลิงก์</span>
                  </button>
                  <button
                    type="button"
                    title="ขึ้นย่อหน้าใหม่"
                    onClick={() => insertAtCursor('\n\n')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#252525] hover:bg-white border border-transparent hover:border-[#DCD7CB] cursor-pointer"
                  >
                    <Pilcrow className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-4 w-px bg-[#D8D4C9] mx-1 hidden sm:block" />

                  <button
                    type="button"
                    title="วางลิงก์รูปจาก Cloudinary หรือ URL ภายนอก (วางหลายรูปพร้อมกันได้)"
                    onClick={() => {
                      setInlineImageUrlError('');
                      setShowLinkBox(false);
                      setShowPlaceCardBox(false);
                      setShowImageUrlBox((prev) => !prev);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                      showImageUrlBox
                        ? 'bg-[#244B3A] text-white border-[#244B3A]'
                        : 'bg-white text-[#244B3A] border-[#C6DAC6] hover:bg-[#DDE8DD]/50'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>แทรกรูปจาก URL</span>
                  </button>

                  <button
                    type="button"
                    disabled={uploadingInline}
                    onClick={() => inlineImgInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#244B3A] text-[#FAFAF7] hover:bg-[#1B3A2C] disabled:opacity-60 cursor-pointer"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>
                      {uploadingInline ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปแทรกเนื้อหา'}
                    </span>
                  </button>
                  <input
                    ref={inlineImgInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => handleInlineImageUpload(e.target.files)}
                  />
                </div>

                {/* Inline Link Builder Popover */}
                {showLinkBox && (
                  <div className="px-4 py-3 bg-[#DDE8DD]/40 border-b border-[#D3DED3] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <input
                      type="text"
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                      placeholder="ข้อความลิงก์ (เช่น พิกัด Google Maps)"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-[#DCD7CB] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A]"
                    />
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-[#DCD7CB] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A]"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleConfirmInsertLink}
                        className="px-3.5 py-1.5 rounded-lg bg-[#244B3A] text-white text-xs font-medium hover:bg-[#1B3A2C] cursor-pointer whitespace-nowrap"
                      >
                        แทรกลิงก์
                      </button>
                      <button
                        type="button"
                        aria-label="ปิดหน้าต่างแทรกลิงก์"
                        onClick={() => setShowLinkBox(false)}
                        className="p-1.5 rounded-lg text-[#5C615C] hover:bg-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {linkError && (
                      <p className="w-full text-xs text-[#B82860]">{linkError}</p>
                    )}
                  </div>
                )}

                {/* Inline Multi-URL Image Inserter Popover */}
                {showImageUrlBox && (
                  <div className="px-4 py-3.5 bg-[#DDE8DD]/40 border-b border-[#D3DED3] space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-[#244B3A]">
                        วางลิงก์รูปภาพ (Cloudinary / ImgBB) — วางหลายลิงก์ขึ้นบรรทัดใหม่ทีละรูป ระบบจะจัดเป็นกริด 2 คอลัมน์อัตโนมัติ
                      </p>
                      <button
                        type="button"
                        aria-label="ปิดหน้าต่างแทรกรูปจาก URL"
                        onClick={() => setShowImageUrlBox(false)}
                        className="p-1 rounded-lg text-[#5C615C] hover:bg-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={inlineImageUrlsText}
                      onChange={(e) => {
                        setInlineImageUrlsText(e.target.value);
                        if (inlineImageUrlError) setInlineImageUrlError('');
                      }}
                      placeholder={`https://res.cloudinary.com/.../photo1.jpg\nhttps://res.cloudinary.com/.../photo2.jpg`}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-[#DCD7CB] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A] resize-y"
                    />
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={inlineImageCaption}
                        onChange={(e) => setInlineImageCaption(e.target.value)}
                        placeholder="คำบรรยายภาพ (ไม่บังคับ)"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-[#DCD7CB] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A]"
                      />
                      <button
                        type="button"
                        onClick={handleConfirmInsertImageUrls}
                        className="px-4 py-1.5 rounded-lg bg-[#244B3A] text-white text-xs font-medium hover:bg-[#1B3A2C] cursor-pointer whitespace-nowrap"
                      >
                        แทรกรูปลงเนื้อหา
                      </button>
                    </div>
                    {inlineImageUrlError && (
                      <p className="text-xs text-[#B82860]">{inlineImageUrlError}</p>
                    )}
                  </div>
                )}

                {/* Structured Place Info Card Builder Popover */}
                {showPlaceCardBox && (
                  <div className="px-4 py-4 bg-[#F7F5EF] border-b border-[#DFDBD0] space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#244B3A]">
                        <MapPinned className="w-4 h-4" />
                        <span>เพิ่มกล่องข้อมูลสถานที่ (ร้านอาหาร / คาเฟ่ / วัด / ที่พัก / พิกัด GPS)</span>
                      </div>
                      <button
                        type="button"
                        aria-label="ปิดหน้าต่างกล่องข้อมูลสถานที่"
                        onClick={() => setShowPlaceCardBox(false)}
                        className="p-1 rounded-lg text-[#5C615C] hover:bg-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={placeCardName}
                        onChange={(e) => {
                          setPlaceCardName(e.target.value);
                          if (placeCardError) setPlaceCardError('');
                        }}
                        placeholder="ชื่อสถานที่ * (เช่น Building A Cafe / วัดเจดีย์หลวงฯ)"
                        className="px-3 py-2 rounded-lg bg-white border border-[#DCD7CB] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A]"
                      />
                      <input
                        type="text"
                        value={placeCardHours}
                        onChange={(e) => setPlaceCardHours(e.target.value)}
                        placeholder="เวลาเปิด-ปิด (เช่น 09.00 - 18.00 น. ปิดวันจันทร์)"
                        className="px-3 py-2 rounded-lg bg-white border border-[#DCD7CB] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A]"
                      />
                      <input
                        type="text"
                        value={placeCardAddress}
                        onChange={(e) => setPlaceCardAddress(e.target.value)}
                        placeholder="ที่ตั้ง (เช่น ถ.เจริญเมือง สันป่าข่อย เชียงใหม่)"
                        className="sm:col-span-2 px-3 py-2 rounded-lg bg-white border border-[#DCD7CB] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A]"
                      />
                      <input
                        type="text"
                        value={placeCardPhone}
                        onChange={(e) => setPlaceCardPhone(e.target.value)}
                        placeholder="โทรศัพท์ (เช่น 087-788-3313)"
                        className="px-3 py-2 rounded-lg bg-white border border-[#DCD7CB] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A]"
                      />
                      <input
                        type="text"
                        value={placeCardFee}
                        onChange={(e) => setPlaceCardFee(e.target.value)}
                        placeholder="ค่าเข้าชม (ไม่บังคับ เช่น 60 บาท)"
                        className="px-3 py-2 rounded-lg bg-white border border-[#DCD7CB] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A]"
                      />
                      <input
                        type="text"
                        value={placeCardSocial}
                        onChange={(e) => setPlaceCardSocial(e.target.value)}
                        placeholder="Facebook / เว็บไซต์ (ชื่อเพจหรือ https://...)"
                        className="px-3 py-2 rounded-lg bg-white border border-[#DCD7CB] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A]"
                      />
                      <input
                        type="url"
                        value={placeCardMaps}
                        onChange={(e) => {
                          setPlaceCardMaps(e.target.value);
                          if (placeCardError) setPlaceCardError('');
                        }}
                        placeholder="พิกัด GPS (เช่น https://goo.gl/maps/...)"
                        className="px-3 py-2 rounded-lg bg-white border border-[#DCD7CB] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A]"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {placeCardError ? (
                        <p className="text-xs text-[#B82860]">{placeCardError}</p>
                      ) : (
                        <span className="text-[11px] text-[#7D827D]">
                          แสดงเป็นการ์ดข้อมูลสถานที่พร้อมปุ่มเปิดนำทาง Google Maps ในบทความ
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleConfirmInsertPlaceCard}
                        className="px-4 py-1.5 rounded-lg bg-[#244B3A] text-white text-xs font-medium hover:bg-[#1B3A2C] cursor-pointer whitespace-nowrap"
                      >
                        แทรกกล่องข้อมูลสถานที่
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-5">
                  <textarea
                    ref={textareaRef}
                    rows={18}
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`เล่าเรื่องราวการเดินทางของคุณที่นี่...\n\n## Day 1 : เริ่มต้นทริป\n### ชื่อคาเฟ่หรือจุดเช็คอิน\nบรรยายบรรยากาศ เส้นทาง หรือความรู้สึกที่อยากแบ่งปัน\n\nกดปุ่ม "+ กล่องข้อมูลสถานที่" เพื่อแทรกที่ตั้ง เวลาเปิด-ปิด โทรศัพท์ และพิกัด GPS หรือกด "แทรกรูปจาก URL" เพื่อวางรูปหลายใบจัดเป็นกริดอัตโนมัติ`}
                    className="w-full min-h-[380px] text-sm sm:text-[15px] leading-relaxed text-[#252525] bg-transparent focus:outline-none resize-y"
                  />
                </div>
              </section>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Publish Status & Featured Toggle */}
              <section className="bg-white rounded-2xl border border-[#E5E2DA] p-6 space-y-4">
                <h2 className="font-editorial text-lg font-semibold text-[#252525]">
                  สถานะการเผยแพร่
                </h2>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setStatus('published')}
                    className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                      status === 'published'
                        ? 'border-[#244B3A] bg-[#244B3A] text-[#FAFAF7]'
                        : 'border-[#DCD7CB] bg-[#FAFAF7] text-[#4B524B] hover:border-[#244B3A]'
                    }`}
                  >
                    เผยแพร่ทันที
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('draft')}
                    className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                      status === 'draft'
                        ? 'border-[#252525] bg-[#252525] text-[#FAFAF7]'
                        : 'border-[#DCD7CB] bg-[#FAFAF7] text-[#4B524B] hover:border-[#252525]'
                    }`}
                  >
                    บันทึกฉบับร่าง
                  </button>
                </div>

                <label className="flex items-start gap-3 pt-3 border-t border-[#EFECE4] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#244B3A] rounded cursor-pointer"
                  />
                  <span className="text-xs leading-relaxed text-[#2D312D]">
                    <span className="inline-flex items-center gap-1 font-medium text-[#252525]">
                      <Star className="w-3.5 h-3.5 text-[#B07A19]" />
                      ปักหมุดเป็น “เรื่องราวที่อยากให้คุณได้สัมผัส”
                    </span>
                    <span className="block text-[#7D827D] mt-0.5">
                      แสดงโดดเด่นในโซน Featured Travel บนหน้าแรก
                    </span>
                  </span>
                </label>
              </section>

              {/* Cover Image Upload */}
              <section className="bg-white rounded-2xl border border-[#E5E2DA] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-editorial text-lg font-semibold text-[#252525]">
                    รูปภาพหน้าปก *
                  </h2>
                  {mediaLibrary.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker((prev) => !prev)}
                      className="text-xs font-medium text-[#244B3A] hover:underline cursor-pointer"
                    >
                      {showMediaPicker ? 'ปิดคลังรูป' : 'เลือกจากคลังรูป'}
                    </button>
                  )}
                </div>

                {coverImage ? (
                  <div className="space-y-3">
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#EAE6DC] border border-[#E5E2DA]">
                      <SafeImage
                        src={coverImage}
                        alt="รูปภาพหน้าปก"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={uploadingCover}
                        onClick={() => coverInputRef.current?.click()}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[#DCD7CB] hover:bg-[#F4F2EC] text-xs font-medium text-[#252525] cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingCover ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูปหน้าปก'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoverImage('')}
                        aria-label="ลบรูปหน้าปก"
                        className="p-2 rounded-xl border border-[#F3C5D8] text-[#B82860] hover:bg-[#FEF4F8] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={uploadingCover}
                    onClick={() => coverInputRef.current?.click()}
                    className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-[#D5D1C7] hover:border-[#244B3A] bg-[#FAFAF7] flex flex-col items-center justify-center gap-2 text-center p-5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-6 h-6 text-[#244B3A]" />
                    <span className="text-sm font-medium text-[#252525]">
                      {uploadingCover
                        ? 'กำลังอัปโหลดรูปภาพ...'
                        : 'คลิกเพื่ออัปโหลดรูปหน้าปก'}
                    </span>
                    <span className="text-xs text-[#7D827D]">
                      รองรับ JPG, PNG, WebP (สูงสุด 10 MB)
                    </span>
                  </button>
                )}

                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => handleCoverFileChange(e.target.files)}
                />

                {/* Direct External Cover Image URL */}
                <div className="mt-3 pt-3 border-t border-[#EFECE4] space-y-1.5">
                  <label
                    htmlFor="ed-cover-url"
                    className="block text-[11px] font-medium text-[#5C615C]"
                  >
                    หรือวางลิงก์รูปภาพภายนอก (Cloudinary / ImgBB / URL)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="ed-cover-url"
                      type="url"
                      value={coverUrlInput}
                      onChange={(e) => {
                        setCoverUrlInput(e.target.value);
                        if (coverUrlError) setCoverUrlError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyCoverUrl();
                        }
                      }}
                      placeholder="https://res.cloudinary.com/..."
                      className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#DCD7CB] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoverUrl}
                      className="px-3 py-1.5 rounded-lg bg-[#DDE8DD]/80 hover:bg-[#DDE8DD] text-xs font-medium text-[#244B3A] cursor-pointer whitespace-nowrap shrink-0"
                    >
                      ใช้ลิงก์นี้
                    </button>
                  </div>
                  {coverUrlError && (
                    <p className="text-[11px] text-[#B82860]">{coverUrlError}</p>
                  )}
                </div>

                {showMediaPicker && mediaLibrary.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#EFECE4]">
                    <p className="text-xs font-medium text-[#5C615C] mb-2.5">
                      รูปภาพในคลังสื่อ ({mediaLibrary.length})
                    </p>
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                      {mediaLibrary.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setCoverImage(item.url);
                            setShowMediaPicker(false);
                          }}
                          title={`${item.original_name} (${
                            item.size > 0 ? formatFileSize(item.size) : 'ลิงก์ภายนอก'
                          })`}
                          className="aspect-square rounded-lg overflow-hidden border border-[#E5E2DA] hover:border-[#244B3A] cursor-pointer"
                        >
                          <SafeImage
                            src={item.url}
                            alt={item.original_name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Additional Gallery Photos */}
              <section className="bg-white rounded-2xl border border-[#E5E2DA] p-6">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="font-editorial text-lg font-semibold text-[#252525]">
                      อัลบั้มภาพประกอบ
                    </h2>
                    <p className="text-xs text-[#7D827D]">
                      อัปโหลดได้หลายภาพ จัดเรียงลำดับ และเพิ่มคำบรรยายภาพได้
                    </p>
                  </div>
                  <span className="text-xs text-[#5C615C] tabular-nums shrink-0">
                    {galleryImages.length} ภาพ
                  </span>
                </div>

                <button
                  type="button"
                  disabled={uploadingGallery}
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[#C7C2B6] hover:border-[#244B3A] bg-[#FAFAF7] inline-flex items-center justify-center gap-2 text-xs font-medium text-[#244B3A] cursor-pointer"
                >
                  <ImagePlus className="w-4 h-4" />
                  <span>
                    {uploadingGallery
                      ? 'กำลังอัปโหลดภาพประกอบ...'
                      : 'อัปโหลดรูปภาพประกอบ (เลือกหลายภาพได้)'}
                  </span>
                </button>
                <input
                  ref={galleryInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => handleGalleryFileChange(e.target.files)}
                />

                {/* Direct External Gallery Image URL */}
                <div className="mt-3 pt-3 border-t border-[#EFECE4] space-y-1.5">
                  <label
                    htmlFor="ed-gallery-url"
                    className="block text-[11px] font-medium text-[#5C615C]"
                  >
                    หรือเพิ่มรูปเข้าอัลบั้มจากลิงก์ URL
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="ed-gallery-url"
                      type="url"
                      value={galleryUrlInput}
                      onChange={(e) => {
                        setGalleryUrlInput(e.target.value);
                        if (galleryUrlError) setGalleryUrlError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddGalleryUrl();
                        }
                      }}
                      placeholder="https://res.cloudinary.com/..."
                      className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-[#FAFAF7] border border-[#DCD7CB] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddGalleryUrl}
                      className="px-3 py-1.5 rounded-lg bg-[#DDE8DD]/80 hover:bg-[#DDE8DD] text-xs font-medium text-[#244B3A] cursor-pointer whitespace-nowrap shrink-0"
                    >
                      เพิ่มรูป
                    </button>
                  </div>
                  {galleryUrlError && (
                    <p className="text-[11px] text-[#B82860]">{galleryUrlError}</p>
                  )}
                </div>

                {galleryImages.length > 0 && (
                  <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {galleryImages.map((photo, idx) => (
                      <div
                        key={`${photo.url}-${idx}`}
                        className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E5E2DA] space-y-2.5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-12 rounded-lg overflow-hidden bg-[#EAE6DC] shrink-0">
                            <SafeImage
                              src={photo.url}
                              alt={photo.caption || `ภาพที่ ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex items-center justify-end gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveGalleryItem(idx, -1)}
                              aria-label="เลื่อนภาพขึ้น"
                              className="p-1.5 rounded-lg text-[#5C615C] hover:bg-white disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === galleryImages.length - 1}
                              onClick={() => moveGalleryItem(idx, 1)}
                              aria-label="เลื่อนภาพลง"
                              className="p-1.5 rounded-lg text-[#5C615C] hover:bg-white disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeGalleryItem(idx)}
                              aria-label="ลบรูปประกอบนี้"
                              className="p-1.5 rounded-lg text-[#B82860] hover:bg-[#FEF4F8] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={photo.caption}
                          onChange={(e) => updateGalleryCaption(idx, e.target.value)}
                          placeholder="คำบรรยายภาพ (ไม่บังคับ)"
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#DCD7CB] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A]"
                        />

                        <button
                          type="button"
                          onClick={() => handleInsertGalleryPhotoIntoContent(photo)}
                          className="text-[11px] font-medium text-[#244B3A] hover:underline cursor-pointer"
                        >
                          + แทรกภาพนี้ลงในเนื้อหาบทความ
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
