import {
  Check,
  CheckCircle2,
  Cloud,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileEdit,
  FileText,
  Heart,
  Images,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Settings,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteAdminCommentApi,
  deleteArticle,
  deleteMediaAsset,
  fetchAdminArticles,
  fetchAdminComments,
  fetchAdminMediaInfo,
  registerExternalMediaUrl,
  toggleArticleFeatured,
  updateArticle,
  updateCommentApproval,
  uploadImages,
  type MediaStorageMode,
} from '../lib/api';
import { formatFileSize, formatThaiDate, isSafeExternalUrl } from '../lib/format';
import {
  THAI_REGIONS,
  type AdminUser,
  type Article,
  type ArticleComment,
  type MediaAsset,
  type SiteSettings,
  type ThaiRegion,
} from '../types/blog';
import { SafeImage } from './SafeImage';
import { WebsiteSettingsPanel } from './WebsiteSettingsPanel';

type AdminNavSection =
  | 'dashboard'
  | 'articles'
  | 'comments'
  | 'regions'
  | 'media'
  | 'settings';

interface AdminDashboardProps {
  user: AdminUser;
  getToken: () => Promise<string>;
  settings: SiteSettings;
  onSettingsUpdated: (next: SiteSettings) => void;
  onCreateNew: (defaultRegion?: ThaiRegion) => void;
  onEditArticle: (article: Article) => void;
  onViewLiveArticle: (article: Article) => void;
  onGoHome: () => void;
  onLogout: () => void;
  onDataChanged: () => void;
  flashMessage?: string;
  onClearFlash?: () => void;
}

export function AdminDashboard({
  user,
  getToken,
  settings,
  onSettingsUpdated,
  onCreateNew,
  onEditArticle,
  onViewLiveArticle,
  onGoHome,
  onLogout,
  onDataChanged,
  flashMessage,
  onClearFlash,
}: AdminDashboardProps) {
  const [section, setSection] = useState<AdminNavSection>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [articles, setArticles] = useState<Article[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [mediaStorageMode, setMediaStorageMode] = useState<MediaStorageMode>('database');
  const [externalUrlInput, setExternalUrlInput] = useState('');
  const [externalLabelInput, setExternalLabelInput] = useState('');
  const [savingExternalUrl, setSavingExternalUrl] = useState(false);
  const [externalUrlError, setExternalUrlError] = useState('');
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [commentFilter, setCommentFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [busyCommentId, setBusyCommentId] = useState<number | null>(null);
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<ArticleComment | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [deleteMediaTarget, setDeleteMediaTarget] = useState<MediaAsset | null>(null);

  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const list = await fetchAdminArticles(token);
      setArticles(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดรายการบทความได้';
      setError(msg);
      if (msg.includes('เข้าสู่ระบบ') || msg.includes('ไม่มีสิทธิ์')) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [getToken, onLogout]);

  const loadMedia = useCallback(async () => {
    setMediaLoading(true);
    try {
      const token = await getToken();
      const info = await fetchAdminMediaInfo(token);
      setMedia(info.media);
      setMediaStorageMode(info.storageMode);
    } catch {
      setMedia([]);
    } finally {
      setMediaLoading(false);
    }
  }, [getToken]);

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const token = await getToken();
      const list = await fetchAdminComments(token);
      setComments(list);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadArticles();
    loadMedia();
    loadComments();
  }, [loadArticles, loadMedia, loadComments]);

  const filteredArticles = articles.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (regionFilter && item.region !== regionFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.place_name.toLowerCase().includes(q) ||
        item.province.toLowerCase().includes(q) ||
        item.region.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const publishedCount = articles.filter((a) => a.status === 'published').length;
  const draftCount = articles.filter((a) => a.status === 'draft').length;
  const coveredRegionsCount = new Set(
    articles.filter((a) => a.status === 'published').map((a) => a.region),
  ).size;

  const handleToggleStatus = async (article: Article) => {
    setBusyId(article.id);
    setError('');
    try {
      const token = await getToken();
      const nextStatus = article.status === 'published' ? 'draft' : 'published';
      const updated = await updateArticle(token, article.id, {
        title: article.title,
        slug: article.slug,
        place_name: article.place_name,
        province: article.province,
        region: article.region,
        travel_date: article.travel_date,
        travel_style: article.travel_style,
        best_season: article.best_season,
        duration: article.duration,
        budget_estimate: article.budget_estimate,
        highlights: article.highlights,
        google_maps_url: article.google_maps_url,
        is_featured: article.is_featured,
        excerpt: article.excerpt,
        cover_image: article.cover_image,
        content: article.content,
        gallery_images: article.gallery_images,
        status: nextStatus,
      });
      setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถอัปเดตสถานะบทความได้');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleFeatured = async (article: Article) => {
    setBusyId(article.id);
    setError('');
    try {
      const token = await getToken();
      const nextFeatured = !article.is_featured;
      await toggleArticleFeatured(token, article.id, nextFeatured);
      setArticles((prev) =>
        prev.map((a) => ({
          ...a,
          is_featured:
            a.id === article.id ? nextFeatured : nextFeatured ? false : a.is_featured,
        })),
      );
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถอัปเดตบทความแนะนำได้');
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setError('');
    try {
      const token = await getToken();
      await deleteArticle(token, deleteTarget.id);
      setArticles((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถลบบทความได้');
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkUploadMedia = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingMedia(true);
    setError('');
    try {
      const token = await getToken();
      const uploaded = await uploadImages(token, files);
      setMedia((prev) => [...uploaded, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถอัปโหลดรูปภาพได้');
    } finally {
      setUploadingMedia(false);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
    }
  };

  const handleConfirmDeleteMedia = async () => {
    if (!deleteMediaTarget) return;
    setError('');
    try {
      const token = await getToken();
      await deleteMediaAsset(token, deleteMediaTarget.filename);
      setMedia((prev) => prev.filter((m) => m.id !== deleteMediaTarget.id));
      setDeleteMediaTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถลบไฟล์รูปภาพได้');
    }
  };

  const handleCopyMediaUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      window.setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      setCopiedUrl(null);
    }
  };

  const handleRegisterExternalMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = externalUrlInput.trim();
    if (!trimmedUrl || !isSafeExternalUrl(trimmedUrl)) {
      setExternalUrlError('กรุณาวางลิงก์รูปภาพที่ขึ้นต้นด้วย https:// หรือ http://');
      return;
    }
    setSavingExternalUrl(true);
    setExternalUrlError('');
    try {
      const token = await getToken();
      const created = await registerExternalMediaUrl(
        token,
        trimmedUrl,
        externalLabelInput.trim() || undefined,
      );
      setMedia((prev) => [created, ...prev]);
      setExternalUrlInput('');
      setExternalLabelInput('');
    } catch (err) {
      setExternalUrlError(
        err instanceof Error ? err.message : 'ไม่สามารถบันทึกลิงก์รูปภาพได้',
      );
    } finally {
      setSavingExternalUrl(false);
    }
  };

  const handleToggleCommentApproval = async (comment: ArticleComment) => {
    setBusyCommentId(comment.id);
    setError('');
    try {
      const token = await getToken();
      const nextApproved = !comment.is_approved;
      await updateCommentApproval(token, comment.id, nextApproved);
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id ? { ...c, is_approved: nextApproved } : c,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถอัปเดตสถานะความคิดเห็นได้');
    } finally {
      setBusyCommentId(null);
    }
  };

  const handleConfirmDeleteComment = async () => {
    if (!deleteCommentTarget) return;
    setBusyCommentId(deleteCommentTarget.id);
    setError('');
    try {
      const token = await getToken();
      await deleteAdminCommentApi(token, deleteCommentTarget.id);
      setComments((prev) => prev.filter((c) => c.id !== deleteCommentTarget.id));
      setDeleteCommentTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถลบความคิดเห็นได้');
    } finally {
      setBusyCommentId(null);
    }
  };

  const pendingCommentsCount = comments.filter((c) => !c.is_approved).length;
  const filteredComments = comments.filter((c) => {
    if (commentFilter === 'pending') return !c.is_approved;
    if (commentFilter === 'approved') return c.is_approved;
    return true;
  });

  const selectSection = (next: AdminNavSection) => {
    setSection(next);
    setMobileSidebarOpen(false);
  };

  const navItems: {
    id: AdminNavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    highlightBadge?: boolean;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'articles', label: 'จัดการบทความ', icon: FileText, badge: articles.length },
    { id: 'regions', label: 'จัดการหมวดหมู่/ภูมิภาค', icon: Compass },
    { id: 'media', label: 'คลังรูปภาพ', icon: Images, badge: media.length },
    { id: 'settings', label: 'ตั้งค่าเว็บไซต์', icon: Settings },
  ];

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-[#E5E2DA]">
        <button
          type="button"
          onClick={onGoHome}
          className="font-editorial text-xl font-semibold text-[#244B3A] cursor-pointer text-left block"
        >
          {settings.site_name || 'ฅนหนีเที่ยว'}
        </button>
        <p className="text-[11px] tracking-[0.14em] text-[#7D827D] uppercase mt-0.5">
          ADMIN CMS PANEL
        </p>
      </div>

      <div className="p-4">
        <button
          type="button"
          onClick={() => {
            setMobileSidebarOpen(false);
            onCreateNew();
          }}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#244B3A] hover:bg-[#1B3A2C] text-[#FAFAF7] text-sm font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มบทความใหม่</span>
        </button>
      </div>

      <nav aria-label="เมนูระบบหลังบ้าน" className="px-3 flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectSection(item.id)}
              className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-[#DDE8DD]/75 text-[#244B3A]'
                  : 'text-[#4B524B] hover:bg-[#F4F2EC] hover:text-[#252525]'
              }`}
            >
              <span className="inline-flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.badge === 'number' && (
                <span
                  className={`text-xs tabular-nums ${
                    item.highlightBadge
                      ? 'px-2 py-0.5 rounded-full bg-[#E94C8A] text-white font-semibold'
                      : 'text-[#7D827D]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#E5E2DA] space-y-2">
        <div className="px-2 py-1">
          <p className="text-xs font-medium text-[#252525] truncate">
            {user.displayName || 'ผู้ดูแลเว็บไซต์'}
          </p>
          <p className="text-[11px] text-[#7D827D] truncate">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={onGoHome}
          className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#DCD7CB] text-xs font-medium text-[#252525] hover:bg-[#F4F2EC] cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>ดูหน้าเว็บไซต์</span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-[#B82860] hover:bg-[#FEF4F8] cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-white border-r border-[#E5E2DA] shrink-0 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="lg:hidden fixed inset-0 z-50 flex bg-black/45 backdrop-blur-xs"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] bg-white h-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="ปิดเมนูด้านข้าง"
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-[#5C615C] hover:bg-[#F4F2EC] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E2DA] px-4 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="เปิดเมนูหลังบ้าน"
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-[#252525] cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-editorial font-semibold text-base text-[#252525]">
            ระบบจัดการ {settings.site_name || 'ฅนหนีเที่ยว'}
          </span>
          <button
            type="button"
            onClick={() => onCreateNew()}
            className="p-2 rounded-full bg-[#244B3A] text-white cursor-pointer"
            aria-label="เพิ่มบทความใหม่"
          >
            <Plus className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 max-w-[1160px] w-full mx-auto px-5 sm:px-8 py-8 sm:py-10">
          {/* Flash & Error Feedback */}
          {flashMessage && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-[#DDE8DD]/65 border border-[#B8D1B8] text-sm text-[#244B3A] flex items-center justify-between gap-4">
              <span>{flashMessage}</span>
              {onClearFlash && (
                <button
                  type="button"
                  onClick={onClearFlash}
                  className="text-xs font-medium underline cursor-pointer shrink-0"
                >
                  ปิด
                </button>
              )}
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

          {/* SECTION: DASHBOARD OVERVIEW */}
          {section === 'dashboard' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E5E2DA]">
                <div>
                  <p className="text-xs font-medium tracking-[0.16em] text-[#244B3A] mb-1">
                    DASHBOARD OVERVIEW
                  </p>
                  <h1 className="font-editorial text-3xl font-semibold text-[#252525]">
                    ภาพรวมบล็อก {settings.site_name || 'ฅนหนีเที่ยว'}
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => onCreateNew()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#244B3A] hover:bg-[#1B3A2C] text-[#FAFAF7] text-sm font-medium cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>เขียนบทความใหม่</span>
                </button>
              </div>

              {/* 4 Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-[#E5E2DA] p-5">
                  <p className="text-xs text-[#5C615C]">บทความทั้งหมด</p>
                  <p className="mt-1.5 font-editorial text-3xl font-semibold text-[#252525] tabular-nums">
                    {articles.length}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-[#E5E2DA] p-5">
                  <p className="text-xs text-[#5C615C]">บทความที่เผยแพร่</p>
                  <p className="mt-1.5 font-editorial text-3xl font-semibold text-[#244B3A] tabular-nums">
                    {publishedCount}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-[#E5E2DA] p-5">
                  <p className="text-xs text-[#5C615C]">บทความฉบับร่าง</p>
                  <p className="mt-1.5 font-editorial text-3xl font-semibold text-[#7A6B4F] tabular-nums">
                    {draftCount}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-[#E5E2DA] p-5">
                  <p className="text-xs text-[#5C615C]">จำนวนภูมิภาคที่มีบทความ</p>
                  <p className="mt-1.5 font-editorial text-3xl font-semibold text-[#E94C8A] tabular-nums">
                    {coveredRegionsCount} / {THAI_REGIONS.length}
                  </p>
                </div>
              </div>

              {/* Latest Articles Snapshot */}
              <section className="bg-white rounded-2xl border border-[#E5E2DA] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#EFECE4] flex items-center justify-between gap-4">
                  <h2 className="font-editorial text-lg font-semibold text-[#252525]">
                    บทความล่าสุด
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSection('articles')}
                    className="text-xs font-medium text-[#244B3A] hover:underline cursor-pointer"
                  >
                    ดูทั้งหมด ({articles.length})
                  </button>
                </div>

                {loading ? (
                  <div className="p-10 text-center text-sm text-[#5C615C]">
                    กำลังโหลดข้อมูล...
                  </div>
                ) : articles.length === 0 ? (
                  <div className="p-12 text-center text-sm text-[#5C615C]">
                    ยังไม่มีบทความในระบบ เริ่มเขียนบันทึกการเดินทางเรื่องแรกได้เลย
                  </div>
                ) : (
                  <div className="divide-y divide-[#EFECE4]">
                    {articles.slice(0, 5).map((article) => (
                      <div
                        key={article.id}
                        className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-[#FAFAF7]"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-16 h-12 rounded-lg overflow-hidden bg-[#EAE6DC] shrink-0">
                            <SafeImage
                              src={article.cover_image}
                              alt={article.place_name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-editorial text-sm sm:text-base font-semibold text-[#252525] truncate">
                              {article.title}
                            </p>
                            <p className="text-xs text-[#5C615C] truncate">
                              {article.place_name} · {article.province} · {article.region}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs font-medium ${
                              article.status === 'published'
                                ? 'text-[#244B3A]'
                                : 'text-[#7A6B4F]'
                            }`}
                          >
                            {article.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onEditArticle(article)}
                            className="px-3 py-1.5 rounded-lg bg-[#DDE8DD]/65 text-xs font-medium text-[#244B3A] hover:bg-[#DDE8DD] cursor-pointer"
                          >
                            แก้ไข
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* SECTION: ARTICLES MANAGEMENT */}
          {section === 'articles' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E5E2DA]">
                <div>
                  <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#252525]">
                    จัดการบทความทั้งหมด
                  </h1>
                  <p className="text-xs sm:text-sm text-[#5C615C] mt-1">
                    ค้นหา กรองสถานะ ปักหมุดบทความแนะนำ แก้ไข หรือลบบทความ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onCreateNew()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#244B3A] hover:bg-[#1B3A2C] text-[#FAFAF7] text-sm font-medium cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มบทความใหม่</span>
                </button>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-[#7D827D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหาชื่อบทความ สถานที่ จังหวัด หรือภูมิภาค..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#DCD7CB] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    aria-label="กรองตามภูมิภาค"
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-white border border-[#DCD7CB] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A]"
                  >
                    <option value="">ทุกภูมิภาค</option>
                    {THAI_REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>

                  <div className="inline-flex items-center p-1 rounded-xl bg-[#EFECE4] border border-[#E5E2DA]">
                    {(
                      [
                        { id: 'all', label: 'ทั้งหมด' },
                        { id: 'published', label: 'เผยแพร่แล้ว' },
                        { id: 'draft', label: 'ฉบับร่าง' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStatusFilter(tab.id)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                          statusFilter === tab.id
                            ? 'bg-white text-[#252525] shadow-xs'
                            : 'text-[#5C615C] hover:text-[#252525]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Articles Table / List */}
              <div className="bg-white rounded-2xl border border-[#E5E2DA] overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center text-sm text-[#5C615C]">
                    กำลังโหลดรายการบทความ...
                  </div>
                ) : filteredArticles.length === 0 ? (
                  <div className="p-14 text-center">
                    <FileText
                      className="w-8 h-8 mx-auto text-[#8D928B] mb-3"
                      strokeWidth={1.5}
                    />
                    <p className="font-editorial text-lg font-medium text-[#252525]">
                      ไม่พบบทความที่ตรงกับเงื่อนไข
                    </p>
                    <p className="mt-1 text-sm text-[#5C615C]">
                      ลองเปลี่ยนคำค้นหา หรือกดปุ่ม “เพิ่มบทความใหม่” เพื่อสร้างบันทึกการเดินทาง
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#EFECE4]">
                    {filteredArticles.map((article) => {
                      const isPublished = article.status === 'published';
                      const isBusy = busyId === article.id;

                      return (
                        <div
                          key={article.id}
                          className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center gap-4 hover:bg-[#FAFAF7]/80 transition-colors"
                        >
                          <div className="w-full xl:w-28 aspect-[16/10] xl:aspect-[4/3] rounded-xl overflow-hidden bg-[#EAE6DC] shrink-0">
                            <SafeImage
                              src={article.cover_image}
                              alt={article.place_name}
                              fallbackTitle={article.place_name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5C615C]">
                              <span className="font-medium text-[#244B3A]">
                                {article.region}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>จังหวัด{article.province}</span>
                              <span aria-hidden="true">·</span>
                              <span>{article.place_name}</span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {formatThaiDate(
                                  article.published_at || article.travel_date,
                                )}
                              </span>
                            </div>

                            <h2 className="mt-1 font-editorial text-base sm:text-lg font-semibold text-[#252525] truncate">
                              {article.title}
                            </h2>

                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                              <span
                                className={`inline-flex items-center gap-1 font-medium ${
                                  isPublished ? 'text-[#244B3A]' : 'text-[#7A6B4F]'
                                }`}
                              >
                                {isPublished ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <FileEdit className="w-3.5 h-3.5" />
                                )}
                                <span>{isPublished ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}</span>
                              </span>
                              {article.is_featured && (
                                <>
                                  <span aria-hidden="true" className="text-[#D5D1C7]">
                                    |
                                  </span>
                                  <span className="inline-flex items-center gap-1 font-medium text-[#B07A19]">
                                    <Star className="w-3.5 h-3.5 fill-current" />
                                    <span>บทความแนะนำหน้าแรก</span>
                                  </span>
                                </>
                              )}
                              <span aria-hidden="true" className="text-[#D5D1C7]">
                                |
                              </span>
                              <span className="inline-flex items-center gap-1 text-[#5C615C] tabular-nums">
                                <Eye className="w-3.5 h-3.5" />
                                <span>{article.views.toLocaleString('th-TH')} ครั้ง</span>
                              </span>
                              <span aria-hidden="true" className="text-[#D5D1C7]">
                                |
                              </span>
                              <span className="inline-flex items-center gap-1 text-[#5C615C] tabular-nums">
                                <Heart className="w-3.5 h-3.5 text-[#D9437E]" />
                                <span>{(article.likes_count || 0).toLocaleString('th-TH')}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleFeatured(article)}
                              className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap ${
                                article.is_featured
                                  ? 'border-[#E6C98B] bg-[#FDF8EC] text-[#9A6810]'
                                  : 'border-[#DCD7CB] bg-white hover:bg-[#F4F2EC] text-[#5C615C]'
                              }`}
                            >
                              <Star
                                className="w-3.5 h-3.5"
                                fill={article.is_featured ? 'currentColor' : 'none'}
                              />
                              <span>{article.is_featured ? 'ปักหมุดแล้ว' : 'ปักหมุด'}</span>
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleStatus(article)}
                              className="px-3 py-2 rounded-lg border border-[#DCD7CB] bg-white hover:bg-[#F4F2EC] text-xs font-medium text-[#252525] transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                            >
                              {isPublished ? 'ฉบับร่าง' : 'เผยแพร่'}
                            </button>

                            {isPublished && (
                              <button
                                type="button"
                                onClick={() => onViewLiveArticle(article)}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#DCD7CB] bg-white hover:bg-[#F4F2EC] text-xs font-medium text-[#252525] cursor-pointer whitespace-nowrap"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>ดูตัวอย่าง</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onEditArticle(article)}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#DDE8DD]/75 hover:bg-[#DDE8DD] text-xs font-medium text-[#244B3A] cursor-pointer whitespace-nowrap"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>แก้ไข</span>
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setDeleteTarget(article)}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-[#B82860] hover:bg-[#FEF4F8] cursor-pointer whitespace-nowrap"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>ลบ</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION: COMMENTS MODERATION */}
          {section === 'comments' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E5E2DA]">
                <div>
                  <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#252525]">
                    จัดการความคิดเห็นจากผู้อ่าน
                  </h1>
                  <p className="text-xs sm:text-sm text-[#5C615C] mt-1">
                    ตรวจสอบ อนุมัติให้แสดงผล ซ่อน หรือลบข้อความที่ผู้อ่านส่งเข้ามาในแต่ละบทความ
                  </p>
                </div>

                <div className="inline-flex items-center p-1 rounded-xl bg-[#EFECE4] border border-[#E5E2DA] self-start">
                  {(
                    [
                      { id: 'all', label: `ทั้งหมด (${comments.length})` },
                      { id: 'pending', label: `รอตรวจสอบ (${pendingCommentsCount})` },
                      {
                        id: 'approved',
                        label: `อนุมัติแล้ว (${comments.length - pendingCommentsCount})`,
                      },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCommentFilter(tab.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        commentFilter === tab.id
                          ? 'bg-white text-[#252525] shadow-xs'
                          : 'text-[#5C615C] hover:text-[#252525]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E5E2DA] overflow-hidden">
                {commentsLoading ? (
                  <div className="p-12 text-center text-sm text-[#5C615C]">
                    กำลังโหลดความคิดเห็น...
                  </div>
                ) : filteredComments.length === 0 ? (
                  <div className="p-14 text-center">
                    <MessageSquare
                      className="w-8 h-8 mx-auto text-[#8D928B] mb-3"
                      strokeWidth={1.5}
                    />
                    <p className="font-editorial text-lg font-medium text-[#252525]">
                      ยังไม่มีความคิดเห็นในหมวดนี้
                    </p>
                    <p className="mt-1 text-sm text-[#5C615C]">
                      เมื่อผู้อ่านฝากข้อความหรือถามข้อมูลเส้นทางใต้บทความ รายการจะปรากฏที่นี่เพื่อให้คุณตรวจสอบก่อนแสดงผล
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#EFECE4]">
                    {filteredComments.map((item) => {
                      const isBusy = busyCommentId === item.id;
                      return (
                        <div
                          key={item.id}
                          className="p-5 flex flex-col lg:flex-row lg:items-start justify-between gap-4 hover:bg-[#FAFAF7]/80 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-semibold text-[#252525]">
                                {item.author_name}
                              </span>
                              <span aria-hidden="true" className="text-[#C9C4B8]">
                                ·
                              </span>
                              <span className="text-[#7D827D]">
                                {formatThaiDate(item.created_at)}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  item.is_approved
                                    ? 'bg-[#DDE8DD]/75 text-[#244B3A]'
                                    : 'bg-[#FEF4F8] text-[#B82860]'
                                }`}
                              >
                                {item.is_approved ? 'อนุมัติแล้ว' : 'รอตรวจสอบ'}
                              </span>
                            </div>

                            {item.article_title && (
                              <p className="mt-1 text-xs text-[#5C615C] truncate">
                                บทความ:{' '}
                                <span className="font-medium text-[#244B3A]">
                                  {item.article_title}
                                </span>
                              </p>
                            )}

                            <p className="mt-2.5 text-sm text-[#2D312D] leading-relaxed whitespace-pre-line">
                              {item.message}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleCommentApproval(item)}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap ${
                                item.is_approved
                                  ? 'border border-[#DCD7CB] bg-white hover:bg-[#F4F2EC] text-[#4B524B]'
                                  : 'bg-[#244B3A] hover:bg-[#1B3A2C] text-white'
                              }`}
                            >
                              {item.is_approved ? (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>ซ่อน</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>อนุมัติแสดงผล</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setDeleteCommentTarget(item)}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-[#B82860] hover:bg-[#FEF4F8] cursor-pointer whitespace-nowrap"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>ลบ</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION: REGIONS / CATEGORIES OVERVIEW */}
          {section === 'regions' && (
            <div className="space-y-6">
              <div className="pb-5 border-b border-[#E5E2DA]">
                <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#252525]">
                  จัดการหมวดหมู่และภูมิภาคประเทศไทย
                </h1>
                <p className="text-xs sm:text-sm text-[#5C615C] mt-1">
                  ภาพรวมจำนวนบทความแยกตาม 6 ภูมิภาคของประเทศไทย พร้อมทางลัดสำหรับเพิ่มเรื่องราวในแต่ละภูมิภาค
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {THAI_REGIONS.map((region) => {
                  const regionPublished = articles.filter(
                    (a) => a.region === region && a.status === 'published',
                  ).length;
                  const regionDrafts = articles.filter(
                    (a) => a.region === region && a.status === 'draft',
                  ).length;
                  const provincesInRegion = Array.from(
                    new Set(
                      articles
                        .filter((a) => a.region === region)
                        .map((a) => a.province),
                    ),
                  );

                  return (
                    <div
                      key={region}
                      className="bg-white rounded-2xl border border-[#E5E2DA] p-6 flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-editorial text-xl font-semibold text-[#252525]">
                            {region}
                          </h2>
                          <span className="text-xs font-medium text-[#244B3A] tabular-nums">
                            {regionPublished} เผยแพร่
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#7D827D] tabular-nums">
                          ฉบับร่าง {regionDrafts} บทความ
                        </p>
                        <p className="mt-3 text-xs text-[#5C615C] leading-relaxed">
                          {provincesInRegion.length > 0
                            ? `จังหวัดที่บันทึกแล้ว: ${provincesInRegion.join(', ')}`
                            : 'ยังไม่มีเรื่องราวการเดินทางในภูมิภาคนี้'}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-[#EFECE4] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRegionFilter(region);
                            setStatusFilter('all');
                            setSection('articles');
                          }}
                          className="text-xs font-medium text-[#244B3A] hover:underline cursor-pointer"
                        >
                          ดูบทความในภาคนี้
                        </button>
                        <button
                          type="button"
                          onClick={() => onCreateNew(region)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#DDE8DD]/70 hover:bg-[#DDE8DD] text-xs font-medium text-[#244B3A] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>เพิ่มบทความ</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION: MEDIA LIBRARY */}
          {section === 'media' && (
            <section className="bg-white rounded-2xl border border-[#E5E2DA] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#EFECE4]">
                <div>
                  <h1 className="font-editorial text-2xl font-semibold text-[#252525]">
                    คลังรูปภาพ
                  </h1>
                  <p className="text-xs sm:text-sm text-[#5C615C] mt-1">
                    อัปโหลดภาพถ่าย คัดลอก URL เพื่อนำไปใช้ซ้ำ หรือลบไฟล์ที่ไม่ใช้งาน
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    disabled={uploadingMedia}
                    onClick={() => mediaInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#244B3A] hover:bg-[#1B3A2C] disabled:opacity-60 text-[#FAFAF7] text-xs font-medium cursor-pointer whitespace-nowrap"
                  >
                    <Upload className="w-4 h-4" />
                    <span>
                      {uploadingMedia ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปภาพใหม่'}
                    </span>
                  </button>
                  <input
                    ref={mediaInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => handleBulkUploadMedia(e.target.files)}
                  />
                </div>
              </div>

              {/* Storage Mode Notice + External Image URL Form */}
              <div className="mt-5 space-y-4">
                <div
                  className={`px-4 py-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                    mediaStorageMode === 'cloudinary'
                      ? 'bg-[#DDE8DD]/55 border-[#B8D1B8] text-[#244B3A]'
                      : 'bg-[#FAFAF7] border-[#E5E2DA] text-[#5C615C]'
                  }`}
                >
                  <Cloud className="w-4 h-4 shrink-0 mt-0.5 text-[#244B3A]" />
                  <div>
                    {mediaStorageMode === 'cloudinary' ? (
                      <p>
                        <span className="font-semibold text-[#244B3A]">
                          เชื่อมต่อ Cloudinary CDN แล้ว
                        </span>{' '}
                        — รูปภาพที่อัปโหลดจากเครื่องจะถูกส่งไปเก็บบน Cloudinary โดยอัตโนมัติ (ไม่ใช้พื้นที่เก็บรูปในฐานข้อมูล Cloud SQL)
                      </p>
                    ) : (
                      <p>
                        <span className="font-semibold text-[#252525]">
                          พื้นที่เก็บรูปภาพปัจจุบัน: ฐานข้อมูล Cloud SQL
                        </span>{' '}
                        — สามารถประหยัดพื้นที่ฐานข้อมูลได้ทันทีโดยวางลิงก์รูปภาพจาก Cloudinary / ImgBB ด้านล่าง หรือเชื่อมต่อตัวแปร Cloudinary บนเซิร์ฟเวอร์เพื่อให้ระบบอัปโหลดอัตโนมัติ
                      </p>
                    )}
                  </div>
                </div>

                <form
                  onSubmit={handleRegisterExternalMedia}
                  className="p-4 rounded-xl bg-[#FAFAF7] border border-[#E5E2DA] space-y-3"
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#252525]">
                    <Link2 className="w-3.5 h-3.5 text-[#244B3A]" />
                    <span>เพิ่มลิงก์รูปภาพภายนอกเข้าคลัง (Cloudinary / ImgBB / URL)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                    <input
                      type="url"
                      value={externalUrlInput}
                      onChange={(e) => {
                        setExternalUrlInput(e.target.value);
                        if (externalUrlError) setExternalUrlError('');
                      }}
                      placeholder="วางลิงก์รูปภาพ https://res.cloudinary.com/..."
                      className="md:col-span-6 px-3.5 py-2 rounded-xl bg-white border border-[#DCD7CB] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A]"
                    />
                    <input
                      type="text"
                      value={externalLabelInput}
                      onChange={(e) => setExternalLabelInput(e.target.value)}
                      placeholder="ชื่อเรียกภาพ (ไม่บังคับ เช่น ผาเก็บตะวัน ยามเย็น)"
                      className="md:col-span-4 px-3.5 py-2 rounded-xl bg-white border border-[#DCD7CB] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A]"
                    />
                    <button
                      type="submit"
                      disabled={savingExternalUrl}
                      className="md:col-span-2 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#DDE8DD]/85 hover:bg-[#DDE8DD] disabled:opacity-60 text-xs font-medium text-[#244B3A] cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{savingExternalUrl ? 'กำลังบันทึก...' : 'เพิ่มเข้าคลัง'}</span>
                    </button>
                  </div>
                  {externalUrlError && (
                    <p className="text-xs text-[#B82860]">{externalUrlError}</p>
                  )}
                </form>
              </div>

              {mediaLoading ? (
                <div className="py-14 text-center text-sm text-[#5C615C]">
                  กำลังโหลดคลังรูปภาพ...
                </div>
              ) : media.length === 0 ? (
                <div className="py-16 text-center">
                  <Images
                    className="w-8 h-8 mx-auto text-[#8D928B] mb-3"
                    strokeWidth={1.5}
                  />
                  <p className="font-editorial text-lg font-medium text-[#252525]">
                    ยังไม่มีรูปภาพในคลังสื่อ
                  </p>
                  <p className="mt-1 text-sm text-[#5C615C]">
                    อัปโหลดรูปภาพหรือวางลิงก์รูปภาพภายนอกด้านบน เพื่อเก็บไว้เลือกใช้ซ้ำในบทความได้ตลอดเวลา
                  </p>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {media.map((asset) => (
                    <div
                      key={asset.id}
                      className="rounded-xl border border-[#E5E2DA] overflow-hidden bg-[#FAFAF7] flex flex-col"
                    >
                      <div className="aspect-[4/3] bg-[#EAE6DC] overflow-hidden">
                        <SafeImage
                          src={asset.url}
                          alt={asset.original_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                        <div>
                          <p
                            className="text-xs font-medium text-[#252525] truncate"
                            title={asset.original_name}
                          >
                            {asset.original_name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#7D827D] tabular-nums">
                            {asset.size > 0
                              ? formatFileSize(asset.size)
                              : 'ลิงก์ภายนอก'}{' '}
                            · {formatThaiDate(asset.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EAE6DC]">
                          <button
                            type="button"
                            onClick={() => handleCopyMediaUrl(asset.url)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#244B3A] hover:underline cursor-pointer"
                          >
                            {copiedUrl === asset.url ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>คัดลอกแล้ว</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>คัดลอกลิงก์</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteMediaTarget(asset)}
                            aria-label={`ลบไฟล์ ${asset.original_name}`}
                            className="p-1.5 rounded-lg text-[#B82860] hover:bg-[#FEF4F8] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* SECTION: WEBSITE SETTINGS */}
          {section === 'settings' && (
            <WebsiteSettingsPanel
              getToken={getToken}
              settings={settings}
              onUpdated={onSettingsUpdated}
            />
          )}
        </main>
      </div>

      {/* Delete Article Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-5"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E5E2DA] p-6 shadow-xl">
            <h2
              id="delete-modal-title"
              className="font-editorial text-xl font-semibold text-[#252525]"
            >
              ยืนยันการลบบทความ
            </h2>
            <p className="mt-2 text-sm text-[#5C615C] leading-relaxed">
              คุณต้องการลบบทความ “{deleteTarget.title}” ออกจากฐานข้อมูลอย่างถาวรใช่หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-[#DCD7CB] text-sm font-medium text-[#252525] hover:bg-[#F4F2EC] cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={busyId === deleteTarget.id}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-[#E94C8A] hover:bg-[#C93B74] text-white text-sm font-medium cursor-pointer disabled:opacity-60"
              >
                {busyId === deleteTarget.id ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Media Confirmation Modal */}
      {deleteMediaTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-media-title"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-5"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E5E2DA] p-6 shadow-xl">
            <h2
              id="delete-media-title"
              className="font-editorial text-xl font-semibold text-[#252525]"
            >
              ยืนยันการลบไฟล์รูปภาพ
            </h2>
            <p className="mt-2 text-sm text-[#5C615C] leading-relaxed">
              ต้องการลบไฟล์ “{deleteMediaTarget.original_name}” ออกจากเซิร์ฟเวอร์ใช่หรือไม่? หากบทความใดใช้งานรูปนี้อยู่ รูปภาพในบทความนั้นจะไม่สามารถแสดงผลได้
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteMediaTarget(null)}
                className="px-4 py-2 rounded-lg border border-[#DCD7CB] text-sm font-medium text-[#252525] hover:bg-[#F4F2EC] cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMedia}
                className="px-4 py-2 rounded-lg bg-[#E94C8A] hover:bg-[#C93B74] text-white text-sm font-medium cursor-pointer"
              >
                ยืนยันการลบไฟล์
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Comment Confirmation Modal */}
      {deleteCommentTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-comment-title"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-5"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E5E2DA] p-6 shadow-xl">
            <h2
              id="delete-comment-title"
              className="font-editorial text-xl font-semibold text-[#252525]"
            >
              ยืนยันการลบความคิดเห็น
            </h2>
            <p className="mt-2 text-sm text-[#5C615C] leading-relaxed">
              ต้องการลบความคิดเห็นของ “{deleteCommentTarget.author_name}” ออกจากระบบอย่างถาวรใช่หรือไม่?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteCommentTarget(null)}
                className="px-4 py-2 rounded-lg border border-[#DCD7CB] text-sm font-medium text-[#252525] hover:bg-[#F4F2EC] cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={busyCommentId === deleteCommentTarget.id}
                onClick={handleConfirmDeleteComment}
                className="px-4 py-2 rounded-lg bg-[#E94C8A] hover:bg-[#C93B74] text-white text-sm font-medium cursor-pointer disabled:opacity-60"
              >
                {busyCommentId === deleteCommentTarget.id ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
