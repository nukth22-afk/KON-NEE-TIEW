export const THAI_REGIONS = [
  'ภาคเหนือ',
  'ภาคกลาง',
  'ภาคใต้',
  'ภาคตะวันออก',
  'ภาคตะวันออกเฉียงเหนือ',
  'ภาคตะวันตก',
] as const;

export type ThaiRegion = (typeof THAI_REGIONS)[number];

export const TRAVEL_STYLES = [
  'ภูเขาและป่าไม้',
  'ทะเลและเกาะ',
  'จุดชมวิวและทะเลหมอก',
  'น้ำตกและธรรมชาติ',
  'หมู่บ้านและวิถีชีวิต',
] as const;

export type TravelStyle = (typeof TRAVEL_STYLES)[number];

export type ArticleStatus = 'published' | 'draft';

export interface GalleryImage {
  id?: number;
  url: string;
  caption: string;
  sort_order?: number;
}

export interface ArticleComment {
  id: number;
  article_id: number;
  article_title?: string;
  article_slug?: string;
  author_name: string;
  message: string;
  is_approved: boolean;
  created_at: string;
}

export interface ArticleSummaryNav {
  id: number;
  slug: string;
  title: string;
  place_name: string;
  province: string;
  cover_image: string;
}

export interface Article {
  id: number;
  slug: string;
  title: string;
  place_name: string;
  province: string;
  region: ThaiRegion;
  travel_date: string;
  travel_style: TravelStyle;
  best_season: string;
  duration: string;
  budget_estimate: string;
  highlights: string;
  google_maps_url: string;
  is_featured: boolean;
  views: number;
  likes_count: number;
  excerpt: string;
  cover_image: string;
  content: string;
  gallery_images: GalleryImage[];
  status: ArticleStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleInput {
  title: string;
  slug?: string;
  place_name: string;
  province: string;
  region: ThaiRegion;
  travel_date: string;
  travel_style: TravelStyle;
  best_season: string;
  duration: string;
  budget_estimate: string;
  highlights: string;
  google_maps_url: string;
  is_featured: boolean;
  excerpt: string;
  cover_image: string;
  content: string;
  gallery_images: GalleryImage[];
  status: ArticleStatus;
}

export interface SiteSettings {
  id: number;
  site_name: string;
  site_name_en: string;
  slogan: string;
  logo_url: string;
  hero_image: string;
  hero_title: string;
  hero_subtitle: string;
  hero_description: string;
  intro_title: string;
  intro_description: string;
  about_image: string;
  about_story: string;
  camera_gear: string;
  contact_email: string;
  facebook_url: string;
  instagram_url: string;
  youtube_url: string;
  updated_at: string;
}

export type SiteSettingsInput = Omit<SiteSettings, 'id' | 'updated_at'>;

export interface PhotoPostcard {
  url: string;
  caption: string;
  place_name: string;
  province: string;
  article_slug: string;
  article_id: number;
}

export interface ProvinceFootprint {
  province: string;
  region: ThaiRegion;
  count: number;
  latestSlug: string;
  latestPlace: string;
}

export interface SiteOverview {
  stats: {
    totalArticles: number;
    totalProvinces: number;
    coveredRegions: number;
    totalRegions: number;
  };
  regionCounts: Record<ThaiRegion, number>;
  provinces: string[];
  provinceFootprints?: ProvinceFootprint[];
  featuredArticle: Article | null;
  postcards: PhotoPostcard[];
}

export interface MediaAsset {
  id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  created_at: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: string;
}

export const HERO_IMAGE_PATH = '/src/assets/images/hero_thap_lan_1795675253339.jpg';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: 1,
  site_name: 'ฅนหนีเที่ยว',
  site_name_en: 'KON NEE TIEW',
  slogan: 'ออกเดินทางไปเก็บความทรงจำ แล้วกลับมาเล่าให้ฟัง',
  logo_url: '',
  hero_image: HERO_IMAGE_PATH,
  hero_title: 'ฅนหนีเที่ยว',
  hero_subtitle: 'บางครั้งความสุขก็เริ่มต้นจากการออกเดินทาง',
  hero_description: 'เรื่องราวการเดินทาง สถานที่สวย ๆ และประสบการณ์ที่อยากแบ่งปัน',
  intro_title: 'ทุกการเดินทาง มีเรื่องราวเสมอ',
  intro_description:
    'ที่นี่คือพื้นที่เล็ก ๆ สำหรับบันทึกการเดินทางของเรา รวมสถานที่ที่เคยไป วิวที่เคยเห็น ความประทับใจระหว่างทาง และเรื่องราวที่อยากเก็บไว้ในความทรงจำ',
  about_image: '/src/assets/images/dest_pha_keb_tawan_1795675255672.jpg',
  about_story:
    'ฅนหนีเที่ยว เกิดจากความตั้งใจอยากเก็บเรื่องราวและภาพถ่ายจากทุกสถานที่ที่เคยได้ออกเดินทางไปสัมผัสจริง ไม่ว่าจะเป็นยอดดอยในสายหมอก ผืนป่ามรดกโลก น้ำตกกลางหุบเขา หรือชายหาดเงียบสงบ เพื่อให้ที่นี่เป็นสมุดบันทึกการเดินทางและแรงบันดาลใจสำหรับทุกคนที่อยากลองเก็บกระเป๋าออกเดินทางดูสักครั้ง',
  camera_gear:
    'กล้อง Mirrorless Full-Frame — บันทึกภาพทิวทัศน์และแสงธรรมชาติ\nเลนส์มุมกว้าง 16–35mm — เก็บความยิ่งใหญ่ของภูเขาและทะเลหมอก\nเลนส์ระยะอเนกประสงค์ 24–70mm — ถ่ายทอดบรรยากาศระหว่างทางและวิถีชีวิต\nขาตั้งกล้องคาร์บอนน้ำหนักเบา — สำหรับแสงเช้า แสงเย็น และภาพน้ำตก',
  contact_email: '',
  facebook_url: '',
  instagram_url: '',
  youtube_url: '',
  updated_at: new Date().toISOString(),
};
