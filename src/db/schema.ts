import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default(''),
  role: text('role').notNull().default('viewer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const articles = pgTable(
  'articles',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    locationName: text('location_name').notNull(),
    province: text('province').notNull(),
    region: text('region').notNull(),
    travelDate: text('travel_date').notNull(),
    travelStyle: text('travel_style').notNull().default('ภูเขาและป่าไม้'),
    bestSeason: text('best_season').notNull().default(''),
    duration: text('duration').notNull().default(''),
    budgetEstimate: text('budget_estimate').notNull().default(''),
    highlights: text('highlights').notNull().default(''),
    googleMapsUrl: text('google_maps_url').notNull().default(''),
    coverImage: text('cover_image').notNull(),
    excerpt: text('excerpt').notNull(),
    content: text('content').notNull(),
    status: text('status').notNull().default('draft'),
    isFeatured: boolean('is_featured').notNull().default(false),
    views: integer('views').notNull().default(0),
    likesCount: integer('likes_count').notNull().default(0),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_articles_status_published').on(table.status, table.publishedAt),
    index('idx_articles_region').on(table.region),
    index('idx_articles_province').on(table.province),
  ],
);

export const articleImages = pgTable(
  'article_images',
  {
    id: serial('id').primaryKey(),
    articleId: integer('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    imageUrl: text('image_url').notNull(),
    caption: text('caption').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_article_images_article_sort').on(table.articleId, table.sortOrder),
  ],
);

export const articleComments = pgTable(
  'article_comments',
  {
    id: serial('id').primaryKey(),
    articleId: integer('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    authorName: text('author_name').notNull(),
    message: text('message').notNull(),
    isApproved: boolean('is_approved').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_article_comments_article_approved').on(
      table.articleId,
      table.isApproved,
    ),
  ],
);

export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  siteName: text('site_name').notNull().default('ฅนหนีเที่ยว'),
  siteNameEn: text('site_name_en').notNull().default('KON NEE TIEW'),
  slogan: text('slogan')
    .notNull()
    .default('ออกเดินทางไปเก็บความทรงจำ แล้วกลับมาเล่าให้ฟัง'),
  logoUrl: text('logo_url').notNull().default(''),
  heroImage: text('hero_image')
    .notNull()
    .default('/src/assets/images/hero_thap_lan_1795675253339.jpg'),
  heroTitle: text('hero_title').notNull().default('ฅนหนีเที่ยว'),
  heroSubtitle: text('hero_subtitle')
    .notNull()
    .default('บางครั้งความสุขก็เริ่มต้นจากการออกเดินทาง'),
  heroDescription: text('hero_description')
    .notNull()
    .default('เรื่องราวการเดินทาง สถานที่สวย ๆ และประสบการณ์ที่อยากแบ่งปัน'),
  introTitle: text('intro_title')
    .notNull()
    .default('ทุกการเดินทาง มีเรื่องราวเสมอ'),
  introDescription: text('intro_description')
    .notNull()
    .default(
      'ที่นี่คือพื้นที่เล็ก ๆ สำหรับบันทึกการเดินทางของเรา รวมสถานที่ที่เคยไป วิวที่เคยเห็น ความประทับใจระหว่างทาง และเรื่องราวที่อยากเก็บไว้ในความทรงจำ',
    ),
  aboutImage: text('about_image')
    .notNull()
    .default('/src/assets/images/dest_pha_keb_tawan_1795675255672.jpg'),
  aboutStory: text('about_story')
    .notNull()
    .default(
      'ฅนหนีเที่ยว เกิดจากความตั้งใจอยากเก็บเรื่องราวและภาพถ่ายจากทุกสถานที่ที่เคยได้ออกเดินทางไปสัมผัสจริง ไม่ว่าจะเป็นยอดดอยในสายหมอก ผืนป่ามรดกโลก น้ำตกกลางหุบเขา หรือชายหาดเงียบสงบ เพื่อให้ที่นี่เป็นสมุดบันทึกการเดินทางและแรงบันดาลใจสำหรับทุกคนที่อยากลองเก็บกระเป๋าออกเดินทางดูสักครั้ง',
    ),
  cameraGear: text('camera_gear')
    .notNull()
    .default(
      'กล้อง Mirrorless Full-Frame — บันทึกภาพทิวทัศน์และแสงธรรมชาติ\nเลนส์มุมกว้าง 16–35mm — เก็บความยิ่งใหญ่ของภูเขาและทะเลหมอก\nเลนส์ระยะอเนกประสงค์ 24–70mm — ถ่ายทอดบรรยากาศระหว่างทางและวิถีชีวิต\nขาตั้งกล้องคาร์บอนน้ำหนักเบา — สำหรับแสงเช้า แสงเย็น และภาพน้ำตก',
    ),
  contactEmail: text('contact_email').notNull().default(''),
  facebookUrl: text('facebook_url').notNull().default(''),
  instagramUrl: text('instagram_url').notNull().default(''),
  youtubeUrl: text('youtube_url').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const media = pgTable('media', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull().unique(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  url: text('url').notNull(),
  contentBase64: text('content_base64').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const articlesRelations = relations(articles, ({ many }) => ({
  images: many(articleImages),
  comments: many(articleComments),
}));

export const articleImagesRelations = relations(articleImages, ({ one }) => ({
  article: one(articles, {
    fields: [articleImages.articleId],
    references: [articles.id],
  }),
}));

export const articleCommentsRelations = relations(articleComments, ({ one }) => ({
  article: one(articles, {
    fields: [articleComments.articleId],
    references: [articles.id],
  }),
}));
