import { Bookmark, Mail } from 'lucide-react';
import { isSafeExternalUrl } from '../lib/format';
import { THAI_REGIONS, type SiteSettings, type ThaiRegion } from '../types/blog';

interface FooterProps {
  settings: SiteSettings;
  savedCount: number;
  onGoHome: () => void;
  onGoDestinations: () => void;
  onGoAbout: () => void;
  onOpenSavedTrips: () => void;
  onSelectRegionFromFooter: (region: ThaiRegion) => void;
  onOpenAdmin: () => void;
}

export function Footer({
  settings,
  savedCount,
  onGoHome,
  onGoDestinations,
  onGoAbout,
  onOpenSavedTrips,
  onSelectRegionFromFooter,
  onOpenAdmin,
}: FooterProps) {
  const socials = [
    { label: 'Facebook', url: settings.facebook_url },
    { label: 'Instagram', url: settings.instagram_url },
    { label: 'YouTube', url: settings.youtube_url },
  ].filter((item) => isSafeExternalUrl(item.url));

  return (
    <footer className="bg-[#1A241E] text-[#FAFAF7]">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          <div className="md:col-span-5">
            <button
              type="button"
              onClick={onGoHome}
              className="font-editorial text-2xl sm:text-3xl font-semibold tracking-tight text-white cursor-pointer"
            >
              {settings.site_name || 'ฅนหนีเที่ยว'}
            </button>
            <p className="mt-1 text-xs tracking-[0.18em] text-[#DDE8DD]/80 uppercase">
              {settings.site_name_en || 'KON NEE TIEW'}
            </p>
            <p className="mt-4 text-sm text-[#FAFAF7]/78 leading-relaxed max-w-sm">
              “{settings.slogan || 'ออกเดินทางไปเก็บความทรงจำ แล้วกลับมาเล่าให้ฟัง'}”
            </p>

            {(settings.contact_email || socials.length > 0) && (
              <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-[#DDE8DD]">
                {settings.contact_email && (
                  <a
                    href={`mailto:${settings.contact_email}`}
                    className="inline-flex items-center gap-1.5 hover:text-white hover:underline underline-offset-4"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{settings.contact_email}</span>
                  </a>
                )}
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white hover:underline underline-offset-4"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-4">
            <h3 className="font-sans text-xs font-semibold tracking-[0.16em] text-[#FAFAF7]/55 mb-4">
              ภูมิภาคประเทศไทย
            </h3>
            <ul className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm text-[#FAFAF7]/82">
              {THAI_REGIONS.map((region) => (
                <li key={region}>
                  <button
                    type="button"
                    onClick={() => onSelectRegionFromFooter(region)}
                    className="hover:text-white hover:underline underline-offset-4 cursor-pointer text-left"
                  >
                    {region}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3 md:text-right flex flex-col md:items-end gap-3">
            <h3 className="font-sans text-xs font-semibold tracking-[0.16em] text-[#FAFAF7]/55 mb-1">
              เมนูเพิ่มเติม
            </h3>
            <div className="flex flex-col md:items-end gap-2 text-sm text-[#FAFAF7]/82">
              <button
                type="button"
                onClick={onGoDestinations}
                className="hover:text-white hover:underline underline-offset-4 cursor-pointer text-left md:text-right"
              >
                สถานที่ท่องเที่ยวทั้งหมด
              </button>
              <button
                type="button"
                onClick={onGoAbout}
                className="hover:text-white hover:underline underline-offset-4 cursor-pointer text-left md:text-right"
              >
                เกี่ยวกับเรา
              </button>
              <button
                type="button"
                onClick={onOpenSavedTrips}
                className="inline-flex items-center gap-1.5 hover:text-white hover:underline underline-offset-4 cursor-pointer tabular-nums"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>
                  {savedCount > 0 ? `ทริปที่อยากไป (${savedCount})` : 'ทริปที่อยากไป'}
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="mt-2 inline-flex items-center justify-center px-5 py-2 rounded-full border border-white/25 hover:border-white/55 text-xs font-medium text-[#FAFAF7] transition-colors duration-150 cursor-pointer"
            >
              ระบบจัดการบทความ
            </button>
          </div>
        </div>

        <div className="pt-7 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#FAFAF7]/55">
          <p>
            © {new Date().getFullYear()} {settings.site_name || 'ฅนหนีเที่ยว'} (
            {settings.site_name_en || 'KON NEE TIEW'})
          </p>
          <p>ทุกเรื่องราวและภาพถ่ายบันทึกจากการเดินทางจริง</p>
        </div>
      </div>
    </footer>
  );
}
