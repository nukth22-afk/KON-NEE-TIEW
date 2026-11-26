import { ArrowDown } from 'lucide-react';
import { HERO_IMAGE_PATH, type SiteSettings } from '../types/blog';
import { SafeImage } from './SafeImage';

interface HeroBannerProps {
  settings: SiteSettings;
  onExplore: () => void;
}

export function HeroBanner({ settings, onExplore }: HeroBannerProps) {
  const heroImage = settings.hero_image || HERO_IMAGE_PATH;
  const heroTitle = settings.hero_title || settings.site_name || 'ฅนหนีเที่ยว';
  const heroSubtitle =
    settings.hero_subtitle || 'บางครั้งความสุขก็เริ่มต้นจากการออกเดินทาง';
  const heroDescription =
    settings.hero_description ||
    'เรื่องราวการเดินทาง สถานที่สวย ๆ และประสบการณ์ที่อยากแบ่งปัน';

  return (
    <section
      aria-label="แบนเนอร์หน้าแรก ฅนหนีเที่ยว"
      className="relative w-full min-h-[82vh] sm:min-h-[88vh] flex items-end sm:items-center justify-center overflow-hidden bg-[#13221B]"
    >
      {/* Full-width Thap Lan National Park / Custom Hero Photography */}
      <SafeImage
        src={heroImage}
        alt={`ทิวทัศน์ธรรมชาติ ${heroTitle}`}
        fallbackTitle={heroTitle}
        loading="eager"
        className="absolute inset-0 w-full h-full object-cover object-center scale-[1.01]"
      />

      {/* Contrast Scrim Overlay for Crisp Legibility */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/52 via-black/32 to-black/75"
      />

      {/* Centered Editorial Copy */}
      <div className="relative z-10 w-full max-w-[920px] mx-auto px-6 sm:px-10 pt-28 pb-16 sm:py-24 text-center text-white">
        <p className="text-xs sm:text-sm font-medium tracking-[0.22em] text-[#DDE8DD] mb-4 uppercase">
          {settings.site_name_en || 'KON NEE TIEW'} · PERSONAL TRAVEL JOURNAL
        </p>

        <h1 className="font-editorial text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.38)] leading-[1.15]">
          {heroTitle}
        </h1>

        <p className="mt-5 font-editorial text-lg sm:text-2xl font-medium text-[#FAFAF7] leading-snug">
          “{heroSubtitle}”
        </p>

        <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base md:text-lg leading-relaxed text-[#FAFAF7]/88 font-normal">
          {heroDescription}
        </p>

        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={onExplore}
            className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-full bg-[#FAFAF7] text-[#252525] hover:bg-[#244B3A] hover:text-[#FAFAF7] text-sm sm:text-base font-medium transition-colors duration-200 shadow-[0_12px_32px_rgba(0,0,0,0.3)] cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <span>ออกเดินทางไปด้วยกัน</span>
            <ArrowDown
              className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5"
              strokeWidth={2}
            />
          </button>
        </div>
      </div>

      {/* Subtle Photo Location Credit */}
      <div className="hidden sm:block absolute bottom-6 right-8 z-10 text-xs text-white/75 tracking-wide">
        อุทยานแห่งชาติทับลาน · ประเทศไทย
      </div>
    </section>
  );
}
