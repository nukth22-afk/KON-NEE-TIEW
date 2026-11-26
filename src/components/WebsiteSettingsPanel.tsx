import { Check, Save, Trash2, Upload } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { updateSiteSettings, uploadImages } from '../lib/api';
import type { SiteSettings, SiteSettingsInput } from '../types/blog';
import { SafeImage } from './SafeImage';

interface WebsiteSettingsPanelProps {
  getToken: () => Promise<string>;
  settings: SiteSettings;
  onUpdated: (next: SiteSettings) => void;
}

export function WebsiteSettingsPanel({
  getToken,
  settings,
  onUpdated,
}: WebsiteSettingsPanelProps) {
  const [form, setForm] = useState<SiteSettingsInput>({
    site_name: settings.site_name,
    site_name_en: settings.site_name_en,
    slogan: settings.slogan,
    logo_url: settings.logo_url,
    hero_image: settings.hero_image,
    hero_title: settings.hero_title,
    hero_subtitle: settings.hero_subtitle,
    hero_description: settings.hero_description,
    intro_title: settings.intro_title,
    intro_description: settings.intro_description,
    about_image: settings.about_image,
    about_story: settings.about_story,
    camera_gear: settings.camera_gear,
    contact_email: settings.contact_email,
    facebook_url: settings.facebook_url,
    instagram_url: settings.instagram_url,
    youtube_url: settings.youtube_url,
  });

  const [uploadingField, setUploadingField] = useState<
    'logo_url' | 'hero_image' | 'about_image' | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [error, setError] = useState('');

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const heroInputRef = useRef<HTMLInputElement | null>(null);
  const aboutInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadAsset = async (
    field: 'logo_url' | 'hero_image' | 'about_image',
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;
    setUploadingField(field);
    setError('');
    try {
      const token = await getToken();
      const uploaded = await uploadImages(token, [files[0]]);
      if (uploaded[0]) {
        setForm((prev) => ({ ...prev, [field]: uploaded[0].url }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถอัปโหลดรูปภาพได้');
    } finally {
      setUploadingField(null);
      if (field === 'logo_url' && logoInputRef.current) logoInputRef.current.value = '';
      if (field === 'hero_image' && heroInputRef.current) heroInputRef.current.value = '';
      if (field === 'about_image' && aboutInputRef.current) aboutInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSavedNotice('');
    try {
      const token = await getToken();
      const updated = await updateSiteSettings(token, form);
      onUpdated(updated);
      setSavedNotice('บันทึกการตั้งค่าเว็บไซต์เรียบร้อยแล้ว การเปลี่ยนแปลงจะแสดงบนหน้าเว็บทันที');
      window.setTimeout(() => setSavedNotice(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกการตั้งค่าได้');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E2DA]">
        <div>
          <h2 className="font-editorial text-2xl font-semibold text-[#252525]">
            ตั้งค่าเว็บไซต์
          </h2>
          <p className="text-xs sm:text-sm text-[#5C615C] mt-1">
            ปรับแต่งชื่อเว็บไซต์ สโลแกน โลโก้ ภาพ Hero Banner เนื้อหาหน้าเกี่ยวกับเรา และช่องทางโซเชียลมีเดีย
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#244B3A] hover:bg-[#1B3A2C] disabled:opacity-60 text-[#FAFAF7] text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
        </button>
      </div>

      {savedNotice && (
        <div className="px-4 py-3 rounded-xl bg-[#DDE8DD]/65 border border-[#B8D1B8] text-sm text-[#244B3A] flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-[#FEF4F8] border border-[#F3C5D8] text-sm text-[#B82860]"
        >
          {error}
        </div>
      )}

      {/* Brand Identity */}
      <section className="bg-white rounded-2xl border border-[#E5E2DA] p-6 space-y-5">
        <h3 className="font-editorial text-lg font-semibold text-[#252525] pb-3 border-b border-[#EFECE4]">
          อัตลักษณ์แบรนด์และโลโก้
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="set-site-name"
              className="block text-xs font-medium text-[#252525] mb-1.5"
            >
              ชื่อเว็บไซต์ (ภาษาไทย)
            </label>
            <input
              id="set-site-name"
              type="text"
              value={form.site_name}
              onChange={(e) => setForm({ ...form, site_name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
            />
          </div>
          <div>
            <label
              htmlFor="set-site-name-en"
              className="block text-xs font-medium text-[#252525] mb-1.5"
            >
              ชื่อเว็บไซต์ (ภาษาอังกฤษ)
            </label>
            <input
              id="set-site-name-en"
              type="text"
              value={form.site_name_en}
              onChange={(e) => setForm({ ...form, site_name_en: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="set-slogan"
            className="block text-xs font-medium text-[#252525] mb-1.5"
          >
            สโลแกนเว็บไซต์
          </label>
          <input
            id="set-slogan"
            type="text"
            value={form.slogan}
            onChange={(e) => setForm({ ...form, slogan: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
          <div className="w-16 h-16 rounded-full border border-[#E5E2DA] bg-[#FAFAF7] overflow-hidden flex items-center justify-center shrink-0">
            {form.logo_url ? (
              <SafeImage
                src={form.logo_url}
                alt="โลโก้เว็บไซต์"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-[#7D827D]">ค่าเริ่มต้น</span>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={uploadingField === 'logo_url'}
                onClick={() => logoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#DCD7CB] hover:bg-[#F4F2EC] text-xs font-medium text-[#252525] cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {uploadingField === 'logo_url' ? 'กำลังอัปโหลด...' : 'อัปโหลดโลโก้'}
                </span>
              </button>
              {form.logo_url && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, logo_url: '' })}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-[#B82860] hover:bg-[#FEF4F8] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ใช้ไอคอนค่าเริ่มต้น</span>
                </button>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => handleUploadAsset('logo_url', e.target.files)}
              />
            </div>
            <input
              type="text"
              aria-label="ลิงก์รูปภาพโลโก้ (URL)"
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              placeholder="หรือวางลิงก์รูปโลโก้ เช่น https://res.cloudinary.com/..."
              className="w-full px-3.5 py-2 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
            />
          </div>
        </div>
      </section>

      {/* Hero Banner & Intro Section */}
      <section className="bg-white rounded-2xl border border-[#E5E2DA] p-6 space-y-5">
        <h3 className="font-editorial text-lg font-semibold text-[#252525] pb-3 border-b border-[#EFECE4]">
          Hero Banner และบทนำหน้าแรก
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-5 space-y-2.5">
            <p className="text-xs font-medium text-[#252525]">ภาพพื้นหลัง Hero Banner</p>
            <div className="aspect-[16/10] w-full rounded-xl overflow-hidden bg-[#EAE6DC] border border-[#E5E2DA]">
              <SafeImage
                src={form.hero_image}
                alt="ภาพ Hero Banner"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              disabled={uploadingField === 'hero_image'}
              onClick={() => heroInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[#DCD7CB] hover:bg-[#F4F2EC] text-xs font-medium text-[#252525] cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {uploadingField === 'hero_image'
                  ? 'กำลังอัปโหลด...'
                  : 'เปลี่ยนภาพ Hero Banner'}
              </span>
            </button>
            <input
              ref={heroInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => handleUploadAsset('hero_image', e.target.files)}
            />
            <input
              type="text"
              aria-label="ลิงก์รูปภาพ Hero Banner (URL)"
              value={form.hero_image}
              onChange={(e) => setForm({ ...form, hero_image: e.target.value })}
              placeholder="หรือวางลิงก์รูปภาพภายนอก (https://...)"
              className="w-full px-3.5 py-2 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
            />
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div>
              <label
                htmlFor="set-hero-title"
                className="block text-xs font-medium text-[#252525] mb-1.5"
              >
                หัวข้อหลักบน Hero Banner
              </label>
              <input
                id="set-hero-title"
                type="text"
                value={form.hero_title}
                onChange={(e) => setForm({ ...form, hero_title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="set-hero-sub"
                className="block text-xs font-medium text-[#252525] mb-1.5"
              >
                ประโยครอง / คำคมบน Hero Banner
              </label>
              <input
                id="set-hero-sub"
                type="text"
                value={form.hero_subtitle}
                onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="set-hero-desc"
                className="block text-xs font-medium text-[#252525] mb-1.5"
              >
                คำอธิบายใต้หัวข้อ Hero Banner
              </label>
              <textarea
                id="set-hero-desc"
                rows={2}
                value={form.hero_description}
                onChange={(e) => setForm({ ...form, hero_description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white resize-y"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#EFECE4] grid grid-cols-1 gap-4">
          <div>
            <label
              htmlFor="set-intro-title"
              className="block text-xs font-medium text-[#252525] mb-1.5"
            >
              หัวข้อส่วนแนะนำเว็บไซต์ (ใต้ Hero Banner)
            </label>
            <input
              id="set-intro-title"
              type="text"
              value={form.intro_title}
              onChange={(e) => setForm({ ...form, intro_title: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
            />
          </div>
          <div>
            <label
              htmlFor="set-intro-desc"
              className="block text-xs font-medium text-[#252525] mb-1.5"
            >
              ข้อความต้อนรับส่วนแนะนำเว็บไซต์
            </label>
            <textarea
              id="set-intro-desc"
              rows={3}
              value={form.intro_description}
              onChange={(e) => setForm({ ...form, intro_description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white resize-y"
            />
          </div>
        </div>
      </section>

      {/* About Page & Social Links */}
      <section className="bg-white rounded-2xl border border-[#E5E2DA] p-6 space-y-5">
        <h3 className="font-editorial text-lg font-semibold text-[#252525] pb-3 border-b border-[#EFECE4]">
          หน้า “เกี่ยวกับเรา” และช่องทางติดต่อ
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-4 space-y-2.5">
            <p className="text-xs font-medium text-[#252525]">ภาพประกอบหน้าเกี่ยวกับเรา</p>
            <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#EAE6DC] border border-[#E5E2DA]">
              <SafeImage
                src={form.about_image}
                alt="ภาพประกอบเกี่ยวกับเรา"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              disabled={uploadingField === 'about_image'}
              onClick={() => aboutInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[#DCD7CB] hover:bg-[#F4F2EC] text-xs font-medium text-[#252525] cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {uploadingField === 'about_image'
                  ? 'กำลังอัปโหลด...'
                  : 'เปลี่ยนภาพหน้าเกี่ยวกับเรา'}
              </span>
            </button>
            <input
              ref={aboutInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => handleUploadAsset('about_image', e.target.files)}
            />
            <input
              type="text"
              aria-label="ลิงก์รูปภาพหน้าเกี่ยวกับเรา (URL)"
              value={form.about_image}
              onChange={(e) => setForm({ ...form, about_image: e.target.value })}
              placeholder="หรือวางลิงก์รูปภาพภายนอก (https://...)"
              className="w-full px-3.5 py-2 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-xs text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
            />
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div>
              <label
                htmlFor="set-about-story"
                className="block text-xs font-medium text-[#252525] mb-1.5"
              >
                เรื่องราวเกี่ยวกับ ฅนหนีเที่ยว (เว้นบรรทัดเพื่อขึ้นย่อหน้าใหม่)
              </label>
              <textarea
                id="set-about-story"
                rows={5}
                value={form.about_story}
                onChange={(e) => setForm({ ...form, about_story: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white resize-y"
              />
            </div>

            <div>
              <label
                htmlFor="set-camera-gear"
                className="block text-xs font-medium text-[#252525] mb-1.5"
              >
                อุปกรณ์ถ่ายภาพคู่ใจ (ขึ้นบรรทัดใหม่สำหรับแต่ละรายการ เช่น ชื่ออุปกรณ์ — คำอธิบาย)
              </label>
              <textarea
                id="set-camera-gear"
                rows={4}
                value={form.camera_gear}
                onChange={(e) => setForm({ ...form, camera_gear: e.target.value })}
                placeholder="กล้อง Mirrorless Full-Frame — บันทึกภาพทิวทัศน์และแสงธรรมชาติ"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white resize-y"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#EFECE4]">
          <div>
            <label
              htmlFor="set-email"
              className="block text-xs font-medium text-[#252525] mb-1.5"
            >
              อีเมลติดต่อ
            </label>
            <input
              id="set-email"
              type="email"
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              placeholder="hello@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
            />
          </div>
          <div>
            <label
              htmlFor="set-fb"
              className="block text-xs font-medium text-[#252525] mb-1.5"
            >
              ลิงก์ Facebook
            </label>
            <input
              id="set-fb"
              type="url"
              value={form.facebook_url}
              onChange={(e) => setForm({ ...form, facebook_url: e.target.value })}
              placeholder="https://facebook.com/..."
              className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
            />
          </div>
          <div>
            <label
              htmlFor="set-ig"
              className="block text-xs font-medium text-[#252525] mb-1.5"
            >
              ลิงก์ Instagram
            </label>
            <input
              id="set-ig"
              type="url"
              value={form.instagram_url}
              onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
              placeholder="https://instagram.com/..."
              className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
            />
          </div>
          <div>
            <label
              htmlFor="set-yt"
              className="block text-xs font-medium text-[#252525] mb-1.5"
            >
              ลิงก์ YouTube
            </label>
            <input
              id="set-yt"
              type="url"
              value={form.youtube_url}
              onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
              placeholder="https://youtube.com/..."
              className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4C9] bg-[#FAFAF7] text-sm text-[#252525] focus:outline-none focus:border-[#244B3A] focus:bg-white"
            />
          </div>
        </div>
      </section>
    </form>
  );
}
