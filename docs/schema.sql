-- ============================================================================
-- ฅนหนีเที่ยว (KON NEE TIEW) — PostgreSQL Database Schema & Reference RLS
-- Production Drizzle ORM definitions live in src/db/schema.ts
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user', -- 'admin' | 'user'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  place_name TEXT NOT NULL,
  province TEXT NOT NULL,
  region TEXT NOT NULL,
  travel_date TEXT NOT NULL,
  travel_style TEXT NOT NULL DEFAULT 'ภูเขาและป่าไม้',
  best_season TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  budget_estimate TEXT NOT NULL DEFAULT '',
  highlights TEXT NOT NULL DEFAULT '',
  google_maps_url TEXT NOT NULL DEFAULT '',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  views INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  excerpt TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'published' | 'draft'
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_region ON articles (region);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles (status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles (published_at);

CREATE TABLE IF NOT EXISTS article_images (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_images_article_id ON article_images (article_id);

CREATE TABLE IF NOT EXISTS article_comments (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_comments_article_approved
  ON article_comments (article_id, is_approved);

CREATE TABLE IF NOT EXISTS site_settings (
  id SERIAL PRIMARY KEY,
  site_name TEXT NOT NULL DEFAULT 'ฅนหนีเที่ยว',
  site_name_en TEXT NOT NULL DEFAULT 'KON NEE TIEW',
  slogan TEXT NOT NULL DEFAULT 'ออกเดินทางไปเก็บความทรงจำ แล้วกลับมาเล่าให้ฟัง',
  logo_url TEXT NOT NULL DEFAULT '',
  hero_image TEXT NOT NULL DEFAULT '/src/assets/images/hero_thap_lan_1795675253339.jpg',
  hero_title TEXT NOT NULL DEFAULT 'ฅนหนีเที่ยว',
  hero_subtitle TEXT NOT NULL DEFAULT 'บางครั้งความสุขก็เริ่มต้นจากการออกเดินทาง',
  hero_description TEXT NOT NULL DEFAULT 'เรื่องราวการเดินทาง สถานที่สวย ๆ และประสบการณ์ที่อยากแบ่งปัน',
  intro_title TEXT NOT NULL DEFAULT 'ทุกการเดินทาง มีเรื่องราวเสมอ',
  intro_description TEXT NOT NULL DEFAULT '',
  about_image TEXT NOT NULL DEFAULT '/src/assets/images/dest_pha_keb_tawan_1795675255672.jpg',
  about_story TEXT NOT NULL DEFAULT '',
  camera_gear TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  facebook_url TEXT NOT NULL DEFAULT '',
  instagram_url TEXT NOT NULL DEFAULT '',
  youtube_url TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  url TEXT NOT NULL,
  content_base64 TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Optional Row Level Security (RLS) reference when deploying to Supabase
-- (In this Express + Cloud SQL runtime, access control is enforced server-side
--  via Firebase Admin token verification + PostgreSQL users.role = 'admin'.)
-- ============================================================================
-- ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public can read published articles"
--   ON articles FOR SELECT USING (status = 'published');
-- CREATE POLICY "Admins have full access to articles"
--   ON articles FOR ALL USING (
--     EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role = 'admin')
--   );
