import { ArrowRight, Mail } from 'lucide-react';
import { isSafeExternalUrl } from '../lib/format';
import type { SiteOverview, SiteSettings } from '../types/blog';
import { SafeImage } from './SafeImage';

interface AboutPageProps {
  settings: SiteSettings;
  overview: SiteOverview | null;
  onExploreDestinations: () => void;
}

export function AboutPage({
  settings,
  overview,
  onExploreDestinations,
}: AboutPageProps) {
  const storyParagraphs = (settings.about_story || '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const socials = [
    { label: 'Facebook', url: settings.facebook_url },
    { label: 'Instagram', url: settings.instagram_url },
    { label: 'YouTube', url: settings.youtube_url },
  ].filter((item) => isSafeExternalUrl(item.url));

  const stats = overview?.stats;

  return (
    <section
      aria-labelledby="about-heading"
      className="pt-28 pb-24 px-5 sm:px-8 max-w-[1100px] mx-auto"
    >
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-xs font-medium tracking-[0.2em] text-[#244B3A] mb-3 uppercase">
          ABOUT {settings.site_name_en || 'KON NEE TIEW'}
        </p>
        <h1
          id="about-heading"
          className="font-editorial text-3xl sm:text-4xl md:text-5xl font-semibold text-[#252525] tracking-tight leading-tight"
        >
          เกี่ยวกับ {settings.site_name || 'ฅนหนีเที่ยว'}
        </h1>
        <p className="mt-4 font-editorial text-lg sm:text-xl text-[#244B3A]">
          “{settings.slogan || 'ออกเดินทางไปเก็บความทรงจำ แล้วกลับมาเล่าให้ฟัง'}”
        </p>
      </div>

      {/* Editorial Photo + Story Layout */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-6">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#EAE6DC] border border-[#E5E2DA]">
            <SafeImage
              src={
                settings.about_image ||
                '/src/assets/images/dest_pha_keb_tawan_1795675255672.jpg'
              }
              alt={`ภาพบรรยากาศการเดินทางของ ${settings.site_name}`}
              fallbackTitle={settings.site_name}
              loading="eager"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="mt-3 text-xs text-[#7D827D] text-center">
            บันทึกภาพและเรื่องราวจากการเดินทางจริงทั่วประเทศไทย
          </p>
        </div>

        <div className="lg:col-span-6 space-y-5">
          <h2 className="font-editorial text-2xl font-semibold text-[#252525] leading-snug">
            {settings.intro_title || 'ทุกการเดินทาง มีเรื่องราวเสมอ'}
          </h2>

          {storyParagraphs.length > 0 ? (
            storyParagraphs.map((paragraph, index) => (
              <p
                key={index}
                className="text-[15px] sm:text-base text-[#3D423D] leading-[1.9]"
              >
                {paragraph}
              </p>
            ))
          ) : (
            <p className="text-[15px] sm:text-base text-[#3D423D] leading-[1.9]">
              {settings.intro_description}
            </p>
          )}

          {(settings.contact_email || socials.length > 0) && (
            <div className="pt-5 border-t border-[#E5E2DA] space-y-3">
              <p className="text-xs font-medium tracking-[0.16em] text-[#244B3A]">
                ช่องทางติดต่อและติดตามเรื่องราว
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {settings.contact_email && (
                  <a
                    href={`mailto:${settings.contact_email}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#DCD7CB] text-xs font-medium text-[#252525] hover:border-[#244B3A] transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#244B3A]" />
                    <span>{settings.contact_email}</span>
                  </a>
                )}
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded-full bg-white border border-[#DCD7CB] text-xs font-medium text-[#252525] hover:border-[#244B3A] transition-colors"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4">
            <button
              type="button"
              onClick={onExploreDestinations}
              className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#244B3A] hover:bg-[#1B3A2C] text-[#FAFAF7] text-sm font-medium transition-colors cursor-pointer"
            >
              <span>ออกสำรวจเรื่องราวการเดินทางทั้งหมด</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Travel Stats */}
      {stats && (
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#D3DED3] bg-[#DDE8DD]/45 rounded-2xl border border-[#D3DED3]">
          <div className="px-6 py-6 text-center">
            <p className="text-xs text-[#4B524B]">เรื่องราวที่เผยแพร่แล้ว</p>
            <p className="mt-1.5 font-editorial text-3xl font-semibold text-[#252525] tabular-nums">
              {stats.totalArticles}
            </p>
          </div>
          <div className="px-6 py-6 text-center">
            <p className="text-xs text-[#4B524B]">จังหวัดที่ไปสัมผัสจริง</p>
            <p className="mt-1.5 font-editorial text-3xl font-semibold text-[#244B3A] tabular-nums">
              {stats.totalProvinces}
            </p>
          </div>
          <div className="px-6 py-6 text-center">
            <p className="text-xs text-[#4B524B]">ภูมิภาคทั่วประเทศไทย</p>
            <p className="mt-1.5 font-editorial text-3xl font-semibold text-[#252525] tabular-nums">
              {stats.coveredRegions} / {stats.totalRegions}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
