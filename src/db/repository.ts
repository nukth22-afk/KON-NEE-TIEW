import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import {
  DEFAULT_SITE_SETTINGS,
  THAI_REGIONS,
  TRAVEL_STYLES,
  type Article,
  type ArticleInput,
  type GalleryImage,
  type MediaAsset,
  type PhotoPostcard,
  type SiteOverview,
  type SiteSettings,
  type SiteSettingsInput,
  type ThaiRegion,
  type TravelStyle,
} from '../types/blog.ts';
import { db } from './index.ts';
import { articleImages, articles, media, siteSettings } from './schema.ts';

type ArticleRow = typeof articles.$inferSelect;
type ArticleImageRow = typeof articleImages.$inferSelect;
type SiteSettingsRow = typeof siteSettings.$inferSelect;
type MediaRow = typeof media.$inferSelect;

function mapArticle(row: ArticleRow, images: ArticleImageRow[]): Article {
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const region = THAI_REGIONS.includes(row.region as ThaiRegion)
    ? (row.region as ThaiRegion)
    : 'ภาคกลาง';
  const style = TRAVEL_STYLES.includes(row.travelStyle as TravelStyle)
    ? (row.travelStyle as TravelStyle)
    : 'ภูเขาและป่าไม้';

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    place_name: row.locationName,
    province: row.province,
    region,
    travel_date: row.travelDate,
    travel_style: style,
    best_season: row.bestSeason,
    duration: row.duration,
    budget_estimate: row.budgetEstimate,
    highlights: row.highlights,
    is_featured: row.isFeatured,
    views: row.views,
    excerpt: row.excerpt,
    cover_image: row.coverImage,
    content: row.content,
    gallery_images: sorted.map((img) => ({
      id: img.id,
      url: img.imageUrl,
      caption: img.caption,
      sort_order: img.sortOrder,
    })),
    status: row.status === 'published' ? 'published' : 'draft',
    published_at: row.publishedAt ? row.publishedAt.toISOString() : null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function mapSettings(row: SiteSettingsRow): SiteSettings {
  return {
    id: row.id,
    site_name: row.siteName,
    site_name_en: row.siteNameEn,
    slogan: row.slogan,
    logo_url: row.logoUrl,
    hero_image: row.heroImage,
    hero_title: row.heroTitle,
    hero_subtitle: row.heroSubtitle,
    hero_description: row.heroDescription,
    intro_title: row.introTitle,
    intro_description: row.introDescription,
    about_image: row.aboutImage,
    about_story: row.aboutStory,
    contact_email: row.contactEmail,
    facebook_url: row.facebookUrl,
    instagram_url: row.instagramUrl,
    youtube_url: row.youtubeUrl,
    updated_at: row.updatedAt.toISOString(),
  };
}

function mapMedia(row: MediaRow): MediaAsset {
  return {
    id: row.id,
    filename: row.filename,
    original_name: row.originalName,
    mime_type: row.mimeType,
    size: row.size,
    url: row.url,
    created_at: row.createdAt.toISOString(),
  };
}

export function slugifyText(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^\u0E00-\u0E7Fa-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
  return cleaned || `story-${Date.now().toString(36).slice(-5)}`;
}

async function ensureUniqueSlug(desired: string, excludeId?: number): Promise<string> {
  const base = slugifyText(desired);
  let candidate = base;
  let counter = 2;

  while (counter <= 20) {
    const matches = await db
      .select({ id: articles.id })
      .from(articles)
      .where(
        excludeId
          ? and(eq(articles.slug, candidate), ne(articles.id, excludeId))
          : eq(articles.slug, candidate),
      )
      .limit(1);

    if (matches.length === 0) return candidate;
    candidate = `${base}-${counter++}`;
  }

  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

async function attachImages(rows: ArticleRow[]): Promise<Article[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const imageRows = await db
    .select()
    .from(articleImages)
    .where(inArray(articleImages.articleId, ids))
    .orderBy(asc(articleImages.sortOrder), asc(articleImages.id));

  const byArticle = new Map<number, ArticleImageRow[]>();
  for (const img of imageRows) {
    const list = byArticle.get(img.articleId) ?? [];
    list.push(img);
    byArticle.set(img.articleId, list);
  }

  return rows.map((row) => mapArticle(row, byArticle.get(row.id) ?? []));
}

// ---------- Site Settings ----------

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const rows = await db
      .select()
      .from(siteSettings)
      .orderBy(asc(siteSettings.id))
      .limit(1);

    if (rows[0]) {
      return mapSettings(rows[0]);
    }

    const [created] = await db
      .insert(siteSettings)
      .values({
        siteName: DEFAULT_SITE_SETTINGS.site_name,
        siteNameEn: DEFAULT_SITE_SETTINGS.site_name_en,
        slogan: DEFAULT_SITE_SETTINGS.slogan,
        logoUrl: DEFAULT_SITE_SETTINGS.logo_url,
        heroImage: DEFAULT_SITE_SETTINGS.hero_image,
        heroTitle: DEFAULT_SITE_SETTINGS.hero_title,
        heroSubtitle: DEFAULT_SITE_SETTINGS.hero_subtitle,
        heroDescription: DEFAULT_SITE_SETTINGS.hero_description,
        introTitle: DEFAULT_SITE_SETTINGS.intro_title,
        introDescription: DEFAULT_SITE_SETTINGS.intro_description,
        aboutImage: DEFAULT_SITE_SETTINGS.about_image,
        aboutStory: DEFAULT_SITE_SETTINGS.about_story,
        contactEmail: DEFAULT_SITE_SETTINGS.contact_email,
        facebookUrl: DEFAULT_SITE_SETTINGS.facebook_url,
        instagramUrl: DEFAULT_SITE_SETTINGS.instagram_url,
        youtubeUrl: DEFAULT_SITE_SETTINGS.youtube_url,
      })
      .returning();

    return mapSettings(created);
  } catch (error) {
    console.error('Failed to load site settings:', error);
    throw new Error('ไม่สามารถโหลดการตั้งค่าเว็บไซต์ได้', { cause: error });
  }
}

export async function updateSiteSettings(input: SiteSettingsInput): Promise<SiteSettings> {
  try {
    const current = await getSiteSettings();
    const [updated] = await db
      .update(siteSettings)
      .set({
        siteName: input.site_name,
        siteNameEn: input.site_name_en,
        slogan: input.slogan,
        logoUrl: input.logo_url,
        heroImage: input.hero_image,
        heroTitle: input.hero_title,
        heroSubtitle: input.hero_subtitle,
        heroDescription: input.hero_description,
        introTitle: input.intro_title,
        introDescription: input.intro_description,
        aboutImage: input.about_image,
        aboutStory: input.about_story,
        contactEmail: input.contact_email,
        facebookUrl: input.facebook_url,
        instagramUrl: input.instagram_url,
        youtubeUrl: input.youtube_url,
        updatedAt: new Date(),
      })
      .where(eq(siteSettings.id, current.id))
      .returning();

    return mapSettings(updated);
  } catch (error) {
    console.error('Failed to update site settings:', error);
    throw new Error('ไม่สามารถบันทึกการตั้งค่าเว็บไซต์ได้', { cause: error });
  }
}

// ---------- Public Articles & Overview ----------

export async function listPublishedArticles(filters: {
  region?: ThaiRegion;
  province?: string;
  style?: TravelStyle;
  search?: string;
  sort?: 'newest' | 'oldest';
  limit?: number;
  offset?: number;
}): Promise<{ articles: Article[]; total: number }> {
  try {
    const conditions = [eq(articles.status, 'published')];

    if (filters.region) {
      conditions.push(eq(articles.region, filters.region));
    }
    if (filters.province) {
      conditions.push(eq(articles.province, filters.province));
    }
    if (filters.style) {
      conditions.push(eq(articles.travelStyle, filters.style));
    }
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      const searchCond = or(
        ilike(articles.title, pattern),
        ilike(articles.locationName, pattern),
        ilike(articles.province, pattern),
        ilike(articles.region, pattern),
        ilike(articles.excerpt, pattern),
        ilike(articles.highlights, pattern),
      );
      if (searchCond) conditions.push(searchCond);
    }

    const whereClause = and(...conditions);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(articles)
      .where(whereClause);

    const orderByClauses =
      filters.sort === 'oldest'
        ? [asc(articles.publishedAt), asc(articles.id)]
        : [desc(articles.publishedAt), desc(articles.id)];

    let query = db
      .select()
      .from(articles)
      .where(whereClause)
      .orderBy(...orderByClauses)
      .$dynamic();

    if (filters.limit && filters.limit > 0) {
      query = query.limit(filters.limit);
    }
    if (filters.offset && filters.offset > 0) {
      query = query.offset(filters.offset);
    }

    const rows = await query;
    const mapped = await attachImages(rows);
    return { articles: mapped, total: count };
  } catch (error) {
    console.error('Failed to query published articles:', error);
    throw new Error('ไม่สามารถโหลดบทความท่องเที่ยวได้', { cause: error });
  }
}

export async function getPublishedArticleBySlugOrId(idOrSlug: string): Promise<{
  article: Article;
  related: Article[];
} | null> {
  try {
    const isNumeric = /^\d+$/.test(idOrSlug);
    const whereClause = isNumeric
      ? and(eq(articles.id, Number.parseInt(idOrSlug, 10)), eq(articles.status, 'published'))
      : and(eq(articles.slug, idOrSlug), eq(articles.status, 'published'));

    const rows = await db.select().from(articles).where(whereClause).limit(1);
    if (!rows[0]) return null;

    const [incremented] = await db
      .update(articles)
      .set({ views: sql`${articles.views} + 1` })
      .where(eq(articles.id, rows[0].id))
      .returning();

    const [article] = await attachImages([incremented ?? rows[0]]);

    const relatedRows = await db
      .select()
      .from(articles)
      .where(and(eq(articles.status, 'published'), ne(articles.id, article.id)))
      .orderBy(
        sql`CASE WHEN ${articles.region} = ${article.region} THEN 0 WHEN ${articles.travelStyle} = ${article.travel_style} THEN 1 ELSE 2 END`,
        desc(articles.publishedAt),
      )
      .limit(3);

    const related = await attachImages(relatedRows);
    return { article, related };
  } catch (error) {
    console.error('Failed to load article detail:', error);
    throw new Error('ไม่สามารถโหลดรายละเอียดบทความได้', { cause: error });
  }
}

export async function getSiteOverview(): Promise<SiteOverview> {
  try {
    const { articles: allPublished } = await listPublishedArticles({ limit: 200 });

    const provincesSet = new Set<string>();
    const regionCounts = THAI_REGIONS.reduce(
      (acc, r) => {
        acc[r] = 0;
        return acc;
      },
      {} as Record<ThaiRegion, number>,
    );

    for (const a of allPublished) {
      if (a.province.trim()) provincesSet.add(a.province.trim());
      regionCounts[a.region] = (regionCounts[a.region] || 0) + 1;
    }

    const coveredRegions = THAI_REGIONS.filter((r) => regionCounts[r] > 0).length;
    const featuredArticle = allPublished.find((a) => a.is_featured) ?? null;

    const postcards: PhotoPostcard[] = [];
    const seenUrls = new Set<string>();

    for (const a of allPublished) {
      if (!seenUrls.has(a.cover_image)) {
        seenUrls.add(a.cover_image);
        postcards.push({
          url: a.cover_image,
          caption: a.excerpt,
          place_name: a.place_name,
          province: a.province,
          article_slug: a.slug,
          article_id: a.id,
        });
      }
      for (const g of a.gallery_images) {
        if (postcards.length >= 6) break;
        if (!seenUrls.has(g.url)) {
          seenUrls.add(g.url);
          postcards.push({
            url: g.url,
            caption: g.caption || a.place_name,
            place_name: a.place_name,
            province: a.province,
            article_slug: a.slug,
            article_id: a.id,
          });
        }
      }
      if (postcards.length >= 6) break;
    }

    return {
      stats: {
        totalArticles: allPublished.length,
        totalProvinces: provincesSet.size,
        coveredRegions,
        totalRegions: THAI_REGIONS.length,
      },
      regionCounts,
      provinces: Array.from(provincesSet).sort((a, b) => a.localeCompare(b, 'th')),
      featuredArticle,
      postcards: postcards.slice(0, 6),
    };
  } catch (error) {
    console.error('Failed to compute site overview:', error);
    throw new Error('ไม่สามารถโหลดภาพรวมเว็บไซต์ได้', { cause: error });
  }
}

// ---------- Admin Articles CRUD ----------

export async function listAdminArticles(filters: {
  search?: string;
  region?: string;
  status?: string;
}): Promise<Article[]> {
  try {
    const conditions = [];
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      const cond = or(
        ilike(articles.title, pattern),
        ilike(articles.locationName, pattern),
        ilike(articles.province, pattern),
      );
      if (cond) conditions.push(cond);
    }
    if (filters.region && THAI_REGIONS.includes(filters.region as ThaiRegion)) {
      conditions.push(eq(articles.region, filters.region));
    }
    if (filters.status === 'published' || filters.status === 'draft') {
      conditions.push(eq(articles.status, filters.status));
    }

    const rows = await db
      .select()
      .from(articles)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(articles.updatedAt), desc(articles.id));

    return await attachImages(rows);
  } catch (error) {
    console.error('Failed to list admin articles:', error);
    throw new Error('ไม่สามารถโหลดรายการบทความทั้งหมดได้', { cause: error });
  }
}

export async function getAdminArticleById(id: number): Promise<Article | null> {
  try {
    const rows = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
    if (!rows[0]) return null;
    const [mapped] = await attachImages([rows[0]]);
    return mapped;
  } catch (error) {
    console.error('Failed to get admin article by id:', error);
    throw new Error('ไม่สามารถโหลดข้อมูลบทความได้', { cause: error });
  }
}

async function replaceArticleImages(articleId: number, gallery: GalleryImage[]) {
  await db.delete(articleImages).where(eq(articleImages.articleId, articleId));
  if (gallery.length > 0) {
    await db.insert(articleImages).values(
      gallery.map((img, idx) => ({
        articleId,
        imageUrl: img.url,
        caption: img.caption,
        sortOrder: idx,
      })),
    );
  }
}

export async function createAdminArticle(input: ArticleInput): Promise<Article> {
  try {
    const now = new Date();
    const publishedAt = input.status === 'published' ? now : null;
    const uniqueSlug = await ensureUniqueSlug(input.slug?.trim() || input.title);

    if (input.is_featured) {
      await db.update(articles).set({ isFeatured: false });
    }

    const [created] = await db
      .insert(articles)
      .values({
        slug: uniqueSlug,
        title: input.title,
        locationName: input.place_name,
        province: input.province,
        region: input.region,
        travelDate: input.travel_date,
        travelStyle: input.travel_style,
        bestSeason: input.best_season,
        duration: input.duration,
        budgetEstimate: input.budget_estimate,
        highlights: input.highlights,
        coverImage: input.cover_image,
        excerpt: input.excerpt,
        content: input.content,
        status: input.status,
        isFeatured: input.is_featured,
        publishedAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await replaceArticleImages(created.id, input.gallery_images);
    const [mapped] = await attachImages([created]);
    return mapped;
  } catch (error) {
    console.error('Failed to create article:', error);
    throw new Error('ไม่สามารถสร้างบทความใหม่ได้', { cause: error });
  }
}

export async function updateAdminArticle(
  id: number,
  input: ArticleInput,
): Promise<Article | null> {
  try {
    const existingRows = await db
      .select()
      .from(articles)
      .where(eq(articles.id, id))
      .limit(1);
    const existing = existingRows[0];
    if (!existing) return null;

    const now = new Date();
    const publishedAt =
      input.status === 'published' ? existing.publishedAt ?? now : null;
    const desiredSlug = input.slug?.trim() || existing.slug;
    const uniqueSlug = await ensureUniqueSlug(desiredSlug, id);

    if (input.is_featured) {
      await db.update(articles).set({ isFeatured: false }).where(ne(articles.id, id));
    }

    const [updated] = await db
      .update(articles)
      .set({
        slug: uniqueSlug,
        title: input.title,
        locationName: input.place_name,
        province: input.province,
        region: input.region,
        travelDate: input.travel_date,
        travelStyle: input.travel_style,
        bestSeason: input.best_season,
        duration: input.duration,
        budgetEstimate: input.budget_estimate,
        highlights: input.highlights,
        coverImage: input.cover_image,
        excerpt: input.excerpt,
        content: input.content,
        status: input.status,
        isFeatured: input.is_featured,
        publishedAt,
        updatedAt: now,
      })
      .where(eq(articles.id, id))
      .returning();

    await replaceArticleImages(id, input.gallery_images);
    const [mapped] = await attachImages([updated]);
    return mapped;
  } catch (error) {
    console.error('Failed to update article:', error);
    throw new Error('ไม่สามารถบันทึกการแก้ไขบทความได้', { cause: error });
  }
}

export async function setArticleFeaturedFlag(
  id: number,
  isFeatured: boolean,
): Promise<Article | null> {
  try {
    const existing = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
    if (!existing[0]) return null;

    if (isFeatured) {
      await db.update(articles).set({ isFeatured: false });
    }
    const [updated] = await db
      .update(articles)
      .set({ isFeatured, updatedAt: new Date() })
      .where(eq(articles.id, id))
      .returning();

    const [mapped] = await attachImages([updated]);
    return mapped;
  } catch (error) {
    console.error('Failed to update featured flag:', error);
    throw new Error('ไม่สามารถอัปเดตบทความแนะนำได้', { cause: error });
  }
}

export async function deleteAdminArticle(id: number): Promise<boolean> {
  try {
    const deleted = await db
      .delete(articles)
      .where(eq(articles.id, id))
      .returning({ id: articles.id });
    return deleted.length > 0;
  } catch (error) {
    console.error('Failed to delete article:', error);
    throw new Error('ไม่สามารถลบบทความได้', { cause: error });
  }
}

// ---------- Media Library ----------

export async function listMediaAssets(): Promise<MediaAsset[]> {
  try {
    const rows = await db
      .select()
      .from(media)
      .orderBy(desc(media.createdAt))
      .limit(100);
    return rows.map(mapMedia);
  } catch (error) {
    console.error('Failed to list media assets:', error);
    throw new Error('ไม่สามารถโหลดคลังรูปภาพได้', { cause: error });
  }
}

export async function createMediaAsset(input: {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}): Promise<MediaAsset> {
  try {
    const [created] = await db.insert(media).values(input).returning();
    return mapMedia(created);
  } catch (error) {
    console.error('Failed to record media asset:', error);
    throw new Error('ไม่สามารถบันทึกข้อมูลไฟล์รูปภาพได้', { cause: error });
  }
}

export async function deleteMediaAssetRecord(filename: string): Promise<void> {
  try {
    await db.delete(media).where(eq(media.filename, filename));
  } catch (error) {
    console.error('Failed to delete media asset record:', error);
    throw new Error('ไม่สามารถลบข้อมูลรูปภาพออกจากฐานข้อมูลได้', { cause: error });
  }
}
