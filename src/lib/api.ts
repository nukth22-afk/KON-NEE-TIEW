import staticArticlesRaw from '../data/staticFallback.json';
import {
  DEFAULT_SITE_SETTINGS,
  THAI_REGIONS,
  type AdminUser,
  type Article,
  type ArticleInput,
  type MediaAsset,
  type PhotoPostcard,
  type SiteOverview,
  type SiteSettings,
  type SiteSettingsInput,
  type ThaiRegion,
  type TravelStyle,
} from '../types/blog';

const API_BASE = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
).replace(/\/+$/, '');

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

class BackendUnavailableError extends Error {
  constructor() {
    super('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ฐานข้อมูลได้ (กำลังทำงานในโหมด Static Hosting)');
    this.name = 'BackendUnavailableError';
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new BackendUnavailableError();
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new BackendUnavailableError();
  }
  if (!res.ok) {
    const msg =
      typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
    throw new Error(msg);
  }
  return data as T;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}

// ---------- Static Hosting Fallback (only used when no /api backend is reachable) ----------

const STATIC_ARTICLES = staticArticlesRaw as Article[];

function getFallbackOverview(): SiteOverview {
  const regionCounts = THAI_REGIONS.reduce(
    (acc, r) => {
      acc[r] = 0;
      return acc;
    },
    {} as Record<ThaiRegion, number>,
  );

  const provinceSet = new Set<string>();
  const coveredRegions = new Set<string>();
  const postcards: PhotoPostcard[] = [];

  for (const a of STATIC_ARTICLES) {
    if (a.region in regionCounts) {
      regionCounts[a.region] += 1;
    }
    if (a.province) provinceSet.add(a.province);
    coveredRegions.add(a.region);
    if (postcards.length < 6) {
      postcards.push({
        url: a.cover_image,
        caption: a.excerpt,
        place_name: a.place_name,
        province: a.province,
        article_slug: a.slug,
        article_id: a.id,
      });
    }
  }

  const featuredArticle =
    STATIC_ARTICLES.find((a) => a.is_featured) ?? STATIC_ARTICLES[0] ?? null;

  return {
    stats: {
      totalArticles: STATIC_ARTICLES.length,
      totalProvinces: provinceSet.size,
      coveredRegions: coveredRegions.size,
      totalRegions: THAI_REGIONS.length,
    },
    regionCounts,
    provinces: Array.from(provinceSet).sort((a, b) => a.localeCompare(b, 'th')),
    featuredArticle,
    postcards,
  };
}

function getFallbackArticles(params?: {
  region?: ThaiRegion;
  province?: string;
  style?: TravelStyle;
  search?: string;
  sort?: 'newest' | 'oldest';
  limit?: number;
  offset?: number;
}): { articles: Article[]; total: number } {
  let list = [...STATIC_ARTICLES];

  if (params?.region) {
    list = list.filter((a) => a.region === params.region);
  }
  if (params?.province) {
    list = list.filter((a) => a.province === params.province);
  }
  if (params?.style) {
    list = list.filter((a) => a.travel_style === params.style);
  }
  if (params?.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    list = list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.place_name.toLowerCase().includes(q) ||
        a.province.toLowerCase().includes(q) ||
        a.region.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q),
    );
  }

  list.sort((a, b) => {
    const da = a.published_at || a.travel_date;
    const db = b.published_at || b.travel_date;
    return params?.sort === 'oldest' ? da.localeCompare(db) : db.localeCompare(da);
  });

  const total = list.length;
  const offset = params?.offset ?? 0;
  const limit = params?.limit ?? list.length;
  return {
    articles: list.slice(offset, offset + limit),
    total,
  };
}

function getFallbackArticleDetail(idOrSlug: string | number): {
  article: Article;
  related: Article[];
} {
  const key = String(idOrSlug);
  const article = STATIC_ARTICLES.find(
    (a) => a.slug === key || String(a.id) === key,
  );
  if (!article) {
    throw new Error('ไม่พบบทความท่องเที่ยวที่ต้องการ');
  }
  const related = STATIC_ARTICLES.filter((a) => a.id !== article.id).slice(0, 3);
  return { article, related };
}

// ---------- Public API ----------

export async function fetchSiteSettings(): Promise<SiteSettings> {
  try {
    const res = await fetch(apiUrl('/api/settings'));
    const data = await parseJson<{ settings: SiteSettings }>(res);
    return data.settings;
  } catch (err) {
    if (err instanceof BackendUnavailableError || err instanceof TypeError) {
      return DEFAULT_SITE_SETTINGS;
    }
    throw err;
  }
}

export async function fetchSiteOverview(): Promise<SiteOverview> {
  try {
    const res = await fetch(apiUrl('/api/overview'));
    return await parseJson<SiteOverview>(res);
  } catch (err) {
    if (err instanceof BackendUnavailableError || err instanceof TypeError) {
      return getFallbackOverview();
    }
    throw err;
  }
}

export async function fetchPublishedArticles(params?: {
  region?: ThaiRegion;
  province?: string;
  style?: TravelStyle;
  search?: string;
  sort?: 'newest' | 'oldest';
  limit?: number;
  offset?: number;
}): Promise<{ articles: Article[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.region) qs.set('region', params.region);
  if (params?.province) qs.set('province', params.province);
  if (params?.style) qs.set('style', params.style);
  if (params?.search?.trim()) qs.set('search', params.search.trim());
  if (params?.sort) qs.set('sort', params.sort);
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit));
  if (typeof params?.offset === 'number') qs.set('offset', String(params.offset));
  const query = qs.toString();

  try {
    const res = await fetch(apiUrl(`/api/articles${query ? `?${query}` : ''}`));
    return await parseJson<{ articles: Article[]; total: number }>(res);
  } catch (err) {
    if (err instanceof BackendUnavailableError || err instanceof TypeError) {
      return getFallbackArticles(params);
    }
    throw err;
  }
}

export async function fetchArticleDetail(idOrSlug: string | number): Promise<{
  article: Article;
  related: Article[];
}> {
  try {
    const res = await fetch(
      apiUrl(`/api/articles/${encodeURIComponent(String(idOrSlug))}`),
    );
    return await parseJson<{ article: Article; related: Article[] }>(res);
  } catch (err) {
    if (err instanceof BackendUnavailableError || err instanceof TypeError) {
      return getFallbackArticleDetail(idOrSlug);
    }
    throw err;
  }
}

// ---------- Auth API (Firebase ID Token verified on server) ----------

export async function verifyAdminSession(token: string): Promise<AdminUser> {
  try {
    const res = await fetch(apiUrl('/api/auth/me'), {
      headers: authHeaders(token),
    });
    const data = await parseJson<{ user: AdminUser }>(res);
    return data.user;
  } catch (err) {
    if (err instanceof BackendUnavailableError || err instanceof TypeError) {
      throw new Error(
        'ระบบหลังบ้านต้องเชื่อมต่อ Backend API ก่อน (ตั้งค่า proxy /api/* ใน netlify.toml หรือ VITE_API_BASE_URL)',
      );
    }
    throw err;
  }
}

// ---------- Admin Protected API ----------

export async function fetchAdminArticles(
  token: string,
  params?: { search?: string; region?: string; status?: string },
): Promise<Article[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.region) qs.set('region', params.region);
  if (params?.status) qs.set('status', params.status);
  const query = qs.toString();
  const res = await fetch(apiUrl(`/api/admin/articles${query ? `?${query}` : ''}`), {
    headers: authHeaders(token),
  });
  const data = await parseJson<{ articles: Article[] }>(res);
  return data.articles;
}

export async function createArticle(
  token: string,
  input: ArticleInput,
): Promise<Article> {
  const res = await fetch(apiUrl('/api/admin/articles'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ article: Article }>(res);
  return data.article;
}

export async function updateArticle(
  token: string,
  id: number,
  input: ArticleInput,
): Promise<Article> {
  const res = await fetch(apiUrl(`/api/admin/articles/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ article: Article }>(res);
  return data.article;
}

export async function toggleArticleFeatured(
  token: string,
  id: number,
  is_featured: boolean,
): Promise<Article> {
  const res = await fetch(apiUrl(`/api/admin/articles/${id}/featured`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify({ is_featured }),
  });
  const data = await parseJson<{ article: Article }>(res);
  return data.article;
}

export async function deleteArticle(token: string, id: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/articles/${id}`), {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  await parseJson<{ ok: boolean }>(res);
}

export async function updateSiteSettings(
  token: string,
  input: Partial<SiteSettingsInput>,
): Promise<SiteSettings> {
  const res = await fetch(apiUrl('/api/admin/settings'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ settings: SiteSettings }>(res);
  return data.settings;
}

export async function uploadImages(
  token: string,
  files: FileList | File[],
): Promise<MediaAsset[]> {
  const formData = new FormData();
  const list = Array.from(files);
  for (const file of list) {
    formData.append('files', file);
  }
  const res = await fetch(apiUrl('/api/uploads'), {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  });
  const data = await parseJson<{ files: MediaAsset[] }>(res);
  return data.files;
}

export async function fetchAdminMedia(token: string): Promise<MediaAsset[]> {
  const res = await fetch(apiUrl('/api/admin/media'), {
    headers: authHeaders(token),
  });
  const data = await parseJson<{ media: MediaAsset[] }>(res);
  return data.media;
}

export async function deleteMediaAsset(
  token: string,
  filename: string,
): Promise<void> {
  const res = await fetch(apiUrl(`/api/uploads/${encodeURIComponent(filename)}`), {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  await parseJson<{ ok: boolean }>(res);
}
