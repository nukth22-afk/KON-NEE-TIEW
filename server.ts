import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  createAdminArticle,
  createArticleComment,
  createMediaAsset,
  deleteAdminArticle,
  deleteAdminComment,
  deleteMediaAssetRecord,
  getAdminArticleById,
  getMediaBinaryByFilename,
  getPublishedArticleBySlugOrId,
  getSiteOverview,
  getSiteSettings,
  incrementArticleLike,
  listAdminArticles,
  listAllAdminComments,
  listApprovedComments,
  listMediaAssets,
  listPublishedArticles,
  setArticleFeaturedFlag,
  setCommentApproval,
  updateAdminArticle,
  updateSiteSettings,
} from './src/db/repository.ts';
import { requireAdmin, type AuthRequest } from './src/middleware/auth.ts';
import {
  deleteFromCloudinaryByFilename,
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
} from './src/lib/cloudinary.ts';
import {
  THAI_REGIONS,
  TRAVEL_STYLES,
  type ArticleInput,
  type GalleryImage,
  type SiteSettingsInput,
  type ThaiRegion,
  type TravelStyle,
} from './src/types/blog.ts';

const PORT = Number(process.env.PORT || 3000);
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ---------- Validation Helpers ----------

function isSafeImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('/src/assets/images/') ||
    trimmed.startsWith('/assets/')
  ) {
    return !trimmed.includes('..');
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isSafeExternalUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function detectImageType(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: '.jpg' };
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { mime: 'image/png', ext: '.png' };
  }
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return { mime: 'image/gif', ext: '.gif' };
  }
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: '.webp' };
  }
  return null;
}

function validateArticleBody(body: unknown): {
  data?: ArticleInput;
  error?: string;
} {
  if (!body || typeof body !== 'object') {
    return { error: 'รูปแบบข้อมูลไม่ถูกต้อง' };
  }
  const b = body as Record<string, unknown>;
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  const slug = typeof b.slug === 'string' ? b.slug.trim().slice(0, 100) : '';
  const place_name = typeof b.place_name === 'string' ? b.place_name.trim() : '';
  const province = typeof b.province === 'string' ? b.province.trim() : '';
  const region = typeof b.region === 'string' ? b.region.trim() : '';
  const travel_date = typeof b.travel_date === 'string' ? b.travel_date.trim() : '';
  const rawStyle = typeof b.travel_style === 'string' ? b.travel_style.trim() : '';
  const travel_style: TravelStyle = TRAVEL_STYLES.includes(rawStyle as TravelStyle)
    ? (rawStyle as TravelStyle)
    : 'ภูเขาและป่าไม้';
  const best_season =
    typeof b.best_season === 'string' ? b.best_season.trim().slice(0, 120) : '';
  const duration =
    typeof b.duration === 'string' ? b.duration.trim().slice(0, 80) : '';
  const budget_estimate =
    typeof b.budget_estimate === 'string' ? b.budget_estimate.trim().slice(0, 120) : '';
  const highlights =
    typeof b.highlights === 'string' ? b.highlights.trim().slice(0, 320) : '';
  const google_maps_url =
    typeof b.google_maps_url === 'string'
      ? b.google_maps_url.trim().slice(0, 600)
      : '';
  const is_featured = Boolean(b.is_featured);
  const excerpt = typeof b.excerpt === 'string' ? b.excerpt.trim() : '';
  const cover_image = typeof b.cover_image === 'string' ? b.cover_image.trim() : '';
  const content = typeof b.content === 'string' ? b.content.trim() : '';
  const status = b.status === 'published' ? 'published' : 'draft';

  if (!title || title.length > 220) {
    return { error: 'กรุณาระบุชื่อบทความ (ไม่เกิน 220 ตัวอักษร)' };
  }
  if (!place_name || place_name.length > 160) {
    return { error: 'กรุณาระบุชื่อสถานที่ท่องเที่ยว' };
  }
  if (!province || province.length > 80) {
    return { error: 'กรุณาระบุจังหวัด' };
  }
  if (!THAI_REGIONS.includes(region as ThaiRegion)) {
    return { error: 'กรุณาเลือกภูมิภาคที่ถูกต้อง' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(travel_date)) {
    return { error: 'กรุณาระบุวันที่เดินทางในรูปแบบที่ถูกต้อง' };
  }
  if (!isSafeExternalUrl(google_maps_url)) {
    return { error: 'ลิงก์ Google Maps ต้องขึ้นต้นด้วย https:// หรือ http://' };
  }
  if (!cover_image || !isSafeImageUrl(cover_image)) {
    return { error: 'กรุณาอัปโหลดหรือเลือกรูปภาพหน้าปกที่ถูกต้อง' };
  }
  if (!content || content.length > 100_000) {
    return { error: 'กรุณาเขียนเนื้อหาบทความ' };
  }

  const rawGallery = Array.isArray(b.gallery_images) ? b.gallery_images : [];
  const gallery_images: GalleryImage[] = [];
  for (const item of rawGallery.slice(0, 30)) {
    if (item && typeof item === 'object') {
      const url =
        typeof (item as Record<string, unknown>).url === 'string'
          ? ((item as Record<string, unknown>).url as string).trim()
          : '';
      const caption =
        typeof (item as Record<string, unknown>).caption === 'string'
          ? ((item as Record<string, unknown>).caption as string).trim().slice(0, 300)
          : '';
      if (url && isSafeImageUrl(url)) {
        gallery_images.push({ url, caption });
      }
    }
  }

  const autoExcerpt =
    excerpt ||
    content
      .replace(/:::place[\s\S]*?:::/g, '')
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/^[#>\-*0-9.]+\s*/gm, '')
      .replace(/[*_~]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);

  return {
    data: {
      title,
      slug,
      place_name,
      province,
      region: region as ThaiRegion,
      travel_date,
      travel_style,
      best_season,
      duration,
      budget_estimate,
      highlights,
      google_maps_url,
      is_featured,
      excerpt: autoExcerpt.slice(0, 320),
      cover_image,
      content,
      gallery_images,
      status,
    },
  };
}

function validateSettingsBody(body: unknown): {
  data?: SiteSettingsInput;
  error?: string;
} {
  if (!body || typeof body !== 'object') {
    return { error: 'รูปแบบข้อมูลไม่ถูกต้อง' };
  }
  const b = body as Record<string, unknown>;
  const str = (key: string, max: number) =>
    typeof b[key] === 'string' ? (b[key] as string).trim().slice(0, max) : '';

  const site_name = str('site_name', 80);
  const site_name_en = str('site_name_en', 80);
  const slogan = str('slogan', 220);
  const logo_url = str('logo_url', 500);
  const hero_image = str('hero_image', 500);
  const hero_title = str('hero_title', 120);
  const hero_subtitle = str('hero_subtitle', 220);
  const hero_description = str('hero_description', 360);
  const intro_title = str('intro_title', 160);
  const intro_description = str('intro_description', 600);
  const about_image = str('about_image', 500);
  const about_story = str('about_story', 5000);
  const camera_gear = str('camera_gear', 3000);
  const contact_email = str('contact_email', 160);
  const facebook_url = str('facebook_url', 300);
  const instagram_url = str('instagram_url', 300);
  const youtube_url = str('youtube_url', 300);

  if (!site_name) return { error: 'กรุณาระบุชื่อเว็บไซต์' };
  if (!hero_title) return { error: 'กรุณาระบุข้อความหลักบน Hero Banner' };
  if (!hero_image || !isSafeImageUrl(hero_image)) {
    return { error: 'กรุณาเลือกรูปภาพ Hero Banner ที่ถูกต้อง' };
  }
  if (logo_url && !isSafeImageUrl(logo_url)) {
    return { error: 'ลิงก์รูปโลโก้ไม่ถูกต้อง' };
  }
  if (about_image && !isSafeImageUrl(about_image)) {
    return { error: 'ลิงก์รูปภาพหน้าเกี่ยวกับเราไม่ถูกต้อง' };
  }
  if (
    !isSafeExternalUrl(facebook_url) ||
    !isSafeExternalUrl(instagram_url) ||
    !isSafeExternalUrl(youtube_url)
  ) {
    return { error: 'ลิงก์ Social Media ต้องขึ้นต้นด้วย https:// หรือ http://' };
  }

  return {
    data: {
      site_name,
      site_name_en: site_name_en || 'KON NEE TIEW',
      slogan,
      logo_url,
      hero_image,
      hero_title,
      hero_subtitle,
      hero_description,
      intro_title,
      intro_description,
      about_image,
      about_story,
      camera_gear,
      contact_email,
      facebook_url,
      instagram_url,
      youtube_url,
    },
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ---------- Lightweight Rate Limiter ----------

const rateLimitStore = new Map<string, number[]>();

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = (rateLimitStore.get(key) || []).filter((ts) => now - ts < windowMs);
  if (existing.length >= maxRequests) {
    rateLimitStore.set(key, existing);
    return true;
  }
  existing.push(now);
  rateLimitStore.set(key, existing);
  if (rateLimitStore.size > 1000) {
    for (const [k, timestamps] of rateLimitStore.entries()) {
      const fresh = timestamps.filter((ts) => now - ts < windowMs);
      if (fresh.length === 0) rateLimitStore.delete(k);
    }
  }
  return false;
}

// ---------- Express Server ----------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const allowedOrigins = new Set<string>([
    'https://kon-nee-tiew.netlify.app',
    'https://nukth22-afk.github.io',
    'https://konneetiew.ai.studio',
    ...(process.env.CORS_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ]);

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
      );
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
    }
    next();
  });

  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }),
  );

  // Durable PostgreSQL fallback when Cloud Run ephemeral disk restarts
  app.get('/uploads/:filename', async (req, res) => {
    const filename = path.basename(String(req.params.filename));
    if (!filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
      res.status(400).end();
      return;
    }

    try {
      const record = await getMediaBinaryByFilename(filename);
      if (!record || !record.contentBase64) {
        res.status(404).end();
        return;
      }

      const buffer = Buffer.from(record.contentBase64, 'base64');
      const destPath = path.resolve(UPLOADS_DIR, filename);
      if (destPath.startsWith(UPLOADS_DIR + path.sep)) {
        fs.writeFile(destPath, buffer, () => {
          // Best-effort warm local cache
        });
      }

      res.setHeader('Content-Type', record.mimeType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(buffer);
    } catch (err) {
      console.error('Failed to stream media from PostgreSQL:', err);
      res.status(500).end();
    }
  });

  // ---------- SEO Endpoints (/robots.txt & /sitemap.xml) ----------

  app.get('/robots.txt', (req, res) => {
    const baseUrl =
      process.env.APP_URL?.replace(/\/$/, '') ||
      `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${baseUrl}/sitemap.xml\n`,
    );
  });

  app.get('/sitemap.xml', async (req, res) => {
    try {
      const baseUrl =
        process.env.APP_URL?.replace(/\/$/, '') ||
        `${req.protocol}://${req.get('host')}`;
      const { articles: published } = await listPublishedArticles({ limit: 500 });
      const urls = [
        { loc: `${baseUrl}/`, lastmod: new Date().toISOString() },
        { loc: `${baseUrl}/destinations`, lastmod: new Date().toISOString() },
        { loc: `${baseUrl}/about`, lastmod: new Date().toISOString() },
        ...published.map((a) => ({
          loc: `${baseUrl}/article/${encodeURIComponent(a.slug)}`,
          lastmod: a.updated_at || a.published_at || a.created_at,
        })),
      ];

      const xml =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        urls
          .map(
            (u) =>
              `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${escapeXml(
                u.lastmod,
              )}</lastmod>\n  </url>`,
          )
          .join('\n') +
        `\n</urlset>`;

      res.type('application/xml').send(xml);
    } catch (error) {
      console.error('Failed to generate sitemap:', error);
      res.status(500).type('text/plain').send('Failed to generate sitemap');
    }
  });

  // ---------- Public API Routes ----------

  app.get('/api/settings', async (_req, res) => {
    try {
      const settings = await getSiteSettings();
      res.json({ settings });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'ไม่สามารถโหลดการตั้งค่าเว็บไซต์ได้';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/overview', async (_req, res) => {
    try {
      const overview = await getSiteOverview();
      res.json(overview);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'ไม่สามารถโหลดภาพรวมเว็บไซต์ได้';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/articles', async (req, res) => {
    try {
      const regionParam = typeof req.query.region === 'string' ? req.query.region.trim() : '';
      const province = typeof req.query.province === 'string' ? req.query.province.trim() : '';
      const styleParam = typeof req.query.style === 'string' ? req.query.style.trim() : '';
      const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 80) : '';
      const sort = req.query.sort === 'oldest' ? 'oldest' : 'newest';
      const limit =
        typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 0;
      const offset =
        typeof req.query.offset === 'string' ? Number.parseInt(req.query.offset, 10) : 0;

      const result = await listPublishedArticles({
        region: THAI_REGIONS.includes(regionParam as ThaiRegion)
          ? (regionParam as ThaiRegion)
          : undefined,
        province: province || undefined,
        style: TRAVEL_STYLES.includes(styleParam as TravelStyle)
          ? (styleParam as TravelStyle)
          : undefined,
        search: search || undefined,
        sort,
        limit: Number.isInteger(limit) && limit > 0 && limit <= 200 ? limit : undefined,
        offset: Number.isInteger(offset) && offset > 0 ? offset : undefined,
      });

      res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'ไม่สามารถโหลดบทความท่องเที่ยวได้';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/articles/:idOrSlug', async (req, res) => {
    try {
      const result = await getPublishedArticleBySlugOrId(String(req.params.idOrSlug));
      if (!result) {
        res.status(404).json({ error: 'ไม่พบบทความท่องเที่ยวที่ต้องการ' });
        return;
      }
      res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'ไม่สามารถโหลดรายละเอียดบทความได้';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/articles/:id/like', async (req, res) => {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'รหัสบทความไม่ถูกต้อง' });
      return;
    }

    const ip = getClientIp(req);
    if (isRateLimited(`like:${ip}:${id}`, 5, 10 * 60 * 1000)) {
      res.status(429).json({ error: 'คุณกดถูกใจบทความนี้ไปแล้ว กรุณารอสักครู่' });
      return;
    }

    try {
      const likesCount = await incrementArticleLike(id);
      if (likesCount === null) {
        res.status(404).json({ error: 'ไม่พบบทความที่ต้องการ' });
        return;
      }
      res.json({ likes_count: likesCount });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'ไม่สามารถบันทึกการถูกใจได้';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/articles/:id/comments', async (req, res) => {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'รหัสบทความไม่ถูกต้อง' });
      return;
    }
    try {
      const comments = await listApprovedComments(id);
      res.json({ comments });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'ไม่สามารถโหลดความคิดเห็นได้';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/articles/:id/comments', async (req, res) => {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'รหัสบทความไม่ถูกต้อง' });
      return;
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;

    // Hidden honeypot field check against spam bots
    const honeypot = typeof body.website === 'string' ? body.website.trim() : '';
    if (honeypot) {
      res.status(201).json({
        message: 'ส่งความคิดเห็นเรียบร้อยแล้ว รอผู้ดูแลตรวจสอบก่อนแสดงผล',
      });
      return;
    }

    const ip = getClientIp(req);
    if (isRateLimited(`comment:${ip}`, 5, 10 * 60 * 1000)) {
      res.status(429).json({
        error: 'คุณส่งความคิดเห็นบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
      });
      return;
    }

    const authorName =
      typeof body.author_name === 'string' ? body.author_name.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (authorName.length < 2 || authorName.length > 60) {
      res.status(400).json({ error: 'กรุณาระบุชื่อของคุณ (2–60 ตัวอักษร)' });
      return;
    }
    if (message.length < 4 || message.length > 1000) {
      res.status(400).json({ error: 'กรุณาเขียนข้อความอย่างน้อย 4 ตัวอักษร (ไม่เกิน 1,000 ตัวอักษร)' });
      return;
    }

    try {
      const comment = await createArticleComment(id, authorName, message);
      if (!comment) {
        res.status(404).json({ error: 'ไม่พบบทความที่ต้องการแสดงความคิดเห็น' });
        return;
      }
      res.status(201).json({
        comment,
        message: 'ส่งความคิดเห็นเรียบร้อยแล้ว รอผู้ดูแลตรวจสอบก่อนแสดงผล',
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'ไม่สามารถส่งความคิดเห็นได้';
      res.status(500).json({ error: msg });
    }
  });

  // ---------- Admin Protected Routes (Firebase ID Token + PostgreSQL Admin Role) ----------

  app.get('/api/auth/me', requireAdmin, (req: AuthRequest, res) => {
    res.json({
      user: {
        uid: req.dbUser?.uid,
        email: req.dbUser?.email,
        displayName: req.dbUser?.displayName,
        role: req.dbUser?.role,
      },
    });
  });

  app.get('/api/admin/articles', requireAdmin, async (req, res) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 80) : '';
      const region = typeof req.query.region === 'string' ? req.query.region.trim() : '';
      const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
      const list = await listAdminArticles({ search, region, status });
      res.json({ articles: list });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'ไม่สามารถโหลดรายการบทความได้';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/admin/articles/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number.parseInt(String(req.params.id), 10);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: 'รหัสบทความไม่ถูกต้อง' });
        return;
      }
      const article = await getAdminArticleById(id);
      if (!article) {
        res.status(404).json({ error: 'ไม่พบบทความที่ต้องการแก้ไข' });
        return;
      }
      res.json({ article });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลบทความได้';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/admin/articles', requireAdmin, async (req, res) => {
    const { data, error } = validateArticleBody(req.body);
    if (error || !data) {
      res.status(400).json({ error: error || 'ข้อมูลไม่ครบถ้วน' });
      return;
    }
    try {
      const article = await createAdminArticle(data);
      res.status(201).json({ article });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถสร้างบทความได้';
      res.status(500).json({ error: msg });
    }
  });

  app.put('/api/admin/articles/:id', requireAdmin, async (req, res) => {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'รหัสบทความไม่ถูกต้อง' });
      return;
    }
    const { data, error } = validateArticleBody(req.body);
    if (error || !data) {
      res.status(400).json({ error: error || 'ข้อมูลไม่ครบถ้วน' });
      return;
    }
    try {
      const article = await updateAdminArticle(id, data);
      if (!article) {
        res.status(404).json({ error: 'ไม่พบบทความที่ต้องการแก้ไข' });
        return;
      }
      res.json({ article });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถบันทึกการแก้ไขได้';
      res.status(500).json({ error: msg });
    }
  });

  app.patch('/api/admin/articles/:id/featured', requireAdmin, async (req, res) => {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'รหัสบทความไม่ถูกต้อง' });
      return;
    }
    try {
      const article = await setArticleFeaturedFlag(id, Boolean(req.body?.is_featured));
      if (!article) {
        res.status(404).json({ error: 'ไม่พบบทความที่ต้องการ' });
        return;
      }
      res.json({ article });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถอัปเดตบทความแนะนำได้';
      res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/admin/articles/:id', requireAdmin, async (req, res) => {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'รหัสบทความไม่ถูกต้อง' });
      return;
    }
    try {
      const deleted = await deleteAdminArticle(id);
      if (!deleted) {
        res.status(404).json({ error: 'ไม่พบบทความที่ต้องการลบ' });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถลบบทความได้';
      res.status(500).json({ error: msg });
    }
  });

  app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    const { data, error } = validateSettingsBody(req.body);
    if (error || !data) {
      res.status(400).json({ error: error || 'ข้อมูลการตั้งค่าไม่ถูกต้อง' });
      return;
    }
    try {
      const settings = await updateSiteSettings(data);
      res.json({ settings });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถบันทึกการตั้งค่าได้';
      res.status(500).json({ error: msg });
    }
  });

  // ---------- Admin Protected Comments Moderation Routes ----------

  app.get('/api/admin/comments', requireAdmin, async (_req, res) => {
    try {
      const comments = await listAllAdminComments();
      res.json({ comments });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดความคิดเห็นได้';
      res.status(500).json({ error: msg });
    }
  });

  app.patch('/api/admin/comments/:id', requireAdmin, async (req, res) => {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'รหัสความคิดเห็นไม่ถูกต้อง' });
      return;
    }
    try {
      const comment = await setCommentApproval(id, Boolean(req.body?.is_approved));
      if (!comment) {
        res.status(404).json({ error: 'ไม่พบความคิดเห็นที่ต้องการอัปเดต' });
        return;
      }
      res.json({ comment });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถอัปเดตสถานะความคิดเห็นได้';
      res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/admin/comments/:id', requireAdmin, async (req, res) => {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'รหัสความคิดเห็นไม่ถูกต้อง' });
      return;
    }
    try {
      const deleted = await deleteAdminComment(id);
      if (!deleted) {
        res.status(404).json({ error: 'ไม่พบความคิดเห็นที่ต้องการลบ' });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถลบความคิดเห็นได้';
      res.status(500).json({ error: msg });
    }
  });

  // ---------- Admin Protected Media Routes ----------

  app.get('/api/admin/media', requireAdmin, async (_req, res) => {
    try {
      const list = await listMediaAssets();
      res.json({
        media: list,
        storageMode: isCloudinaryConfigured() ? 'cloudinary' : 'database',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดคลังรูปภาพได้';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/admin/media/external', requireAdmin, async (req, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
    const rawLabel = typeof body.label === 'string' ? body.label.trim().slice(0, 180) : '';

    if (!rawUrl || rawUrl.length > 600 || !isSafeExternalUrl(rawUrl)) {
      res.status(400).json({
        error: 'กรุณาระบุลิงก์รูปภาพภายนอกที่ขึ้นต้นด้วย https:// หรือ http://',
      });
      return;
    }

    let fallbackLabel = 'external-image';
    try {
      const parsed = new URL(rawUrl);
      const lastSegment = decodeURIComponent(
        parsed.pathname.split('/').filter(Boolean).pop() || '',
      );
      if (lastSegment) {
        fallbackLabel = lastSegment.slice(0, 180);
      } else if (parsed.hostname) {
        fallbackLabel = parsed.hostname.slice(0, 180);
      }
    } catch {
      res.status(400).json({ error: 'รูปแบบลิงก์รูปภาพไม่ถูกต้อง' });
      return;
    }

    try {
      const filename = `ext-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
      const asset = await createMediaAsset({
        filename,
        originalName: rawLabel || fallbackLabel,
        mimeType: 'image/external',
        size: 0,
        url: rawUrl,
        contentBase64: '',
      });
      res.status(201).json({ asset });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถบันทึกลิงก์รูปภาพได้';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/uploads', requireAdmin, (req, res) => {
    upload.array('files', 10)(req, res, async (err) => {
      if (err) {
        res.status(400).json({
          error:
            err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
              ? 'ขนาดไฟล์รูปภาพต้องไม่เกิน 10 MB ต่อไฟล์'
              : 'ไม่สามารถอัปโหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง',
        });
        return;
      }

      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) {
        res.status(400).json({ error: 'กรุณาเลือกไฟล์รูปภาพอย่างน้อย 1 รูป' });
        return;
      }

      try {
        const useCloudinary = isCloudinaryConfigured();
        const uploaded = [];
        for (const file of files) {
          const detected = detectImageType(file.buffer);
          if (!detected) {
            res.status(400).json({
              error: 'รองรับเฉพาะไฟล์รูปภาพ JPG, PNG, WebP หรือ GIF ที่ถูกต้องเท่านั้น',
            });
            return;
          }

          if (useCloudinary) {
            const publicIdBase = `cld-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
            const safeName = `${publicIdBase}${detected.ext}`;
            const originalName = (file.originalname || safeName).slice(0, 180);

            const cloudRes = await uploadBufferToCloudinary(
              file.buffer,
              detected.mime,
              publicIdBase,
              detected.ext,
            );

            // Store ONLY lightweight URL metadata in PostgreSQL (0 bytes binary in Cloud SQL)
            const savedAsset = await createMediaAsset({
              filename: safeName,
              originalName,
              mimeType: detected.mime,
              size: cloudRes.bytes,
              url: cloudRes.secureUrl,
              contentBase64: '',
            });
            uploaded.push(savedAsset);
          } else {
            const safeName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${detected.ext}`;
            const destPath = path.resolve(UPLOADS_DIR, safeName);
            if (!destPath.startsWith(UPLOADS_DIR + path.sep)) {
              res.status(400).json({ error: 'ชื่อไฟล์ไม่ถูกต้อง' });
              return;
            }

            fs.writeFileSync(destPath, file.buffer);
            const url = `/uploads/${safeName}`;
            const originalName = (file.originalname || safeName).slice(0, 180);

            const savedAsset = await createMediaAsset({
              filename: safeName,
              originalName,
              mimeType: detected.mime,
              size: file.size,
              url,
              contentBase64: file.buffer.toString('base64'),
            });
            uploaded.push(savedAsset);
          }
        }

        res.status(201).json({ files: uploaded });
      } catch (uploadErr) {
        const msg =
          uploadErr instanceof Error ? uploadErr.message : 'ไม่สามารถบันทึกรูปภาพได้';
        res.status(500).json({ error: msg });
      }
    });
  });

  app.delete('/api/uploads/:filename', requireAdmin, async (req, res) => {
    const filename = path.basename(String(req.params.filename));
    if (!filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
      res.status(400).json({ error: 'ชื่อไฟล์ไม่ถูกต้อง' });
      return;
    }

    const targetPath = path.resolve(UPLOADS_DIR, filename);
    if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
      res.status(400).json({ error: 'เส้นทางไฟล์ไม่ถูกต้อง' });
      return;
    }

    try {
      if (filename.startsWith('cld-')) {
        await deleteFromCloudinaryByFilename(filename);
      } else if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
      await deleteMediaAssetRecord(filename);
      res.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถลบไฟล์รูปภาพได้';
      res.status(500).json({ error: msg });
    }
  });

  // ---------- Frontend Serving ----------

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ฅนหนีเที่ยว (PostgreSQL + Cloud SQL) running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
