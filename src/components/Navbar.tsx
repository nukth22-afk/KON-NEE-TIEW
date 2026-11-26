import { Menu, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SiteSettings } from '../types/blog';
import { SafeImage } from './SafeImage';

interface NavbarProps {
  settings: SiteSettings;
  activeRoute: 'home' | 'destinations' | 'about' | 'article';
  isAdminLoggedIn: boolean;
  onGoHome: () => void;
  onGoDestinations: (focusSearch?: boolean) => void;
  onGoAbout: () => void;
  onScrollToRegions: () => void;
  onOpenAdmin: () => void;
}

function BrandMark({ solid }: { solid: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 transition-colors ${solid ? 'text-[#244B3A]' : 'text-white'}`}
    >
      <path
        d="M3.5 21.5L11.2 8.8L16.3 16.5L19.4 12.2L24.5 21.5H3.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <circle cx="20.5" cy="7.5" r="2" fill="currentColor" />
    </svg>
  );
}

export function Navbar({
  settings,
  activeRoute,
  isAdminLoggedIn,
  onGoHome,
  onGoDestinations,
  onGoAbout,
  onScrollToRegions,
  onOpenAdmin,
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 36);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isHome = activeRoute === 'home';
  const solidHeader = !isHome || scrolled || mobileMenuOpen;

  const handleNavClick = (action: () => void) => {
    setMobileMenuOpen(false);
    action();
  };

  const navLinkClass = (isActive: boolean) =>
    `whitespace-nowrap shrink-0 py-1 transition-colors duration-150 cursor-pointer ${
      solidHeader
        ? isActive
          ? 'text-[#244B3A] font-semibold underline underline-offset-8 decoration-2 decoration-[#244B3A]'
          : 'text-[#4B524B] hover:text-[#252525]'
        : isActive
          ? 'text-white font-semibold underline underline-offset-8 decoration-2 decoration-white'
          : 'text-white/90 hover:text-white'
    }`;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-colors duration-200 ${
        solidHeader
          ? 'bg-[#FAFAF7]/95 backdrop-blur-md border-b border-[#E5E2DA] text-[#252525]'
          : 'bg-transparent text-white'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Logo + Site Name */}
        <button
          type="button"
          onClick={() => handleNavClick(onGoHome)}
          className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#244B3A]"
        >
          {settings.logo_url ? (
            <SafeImage
              src={settings.logo_url}
              alt={settings.site_name}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <BrandMark solid={solidHeader} />
          )}
          <span className="font-editorial text-xl sm:text-2xl font-semibold tracking-tight">
            {settings.site_name || 'ฅนหนีเที่ยว'}
          </span>
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="เมนูหลัก"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          <button
            type="button"
            onClick={() => handleNavClick(onGoHome)}
            className={navLinkClass(activeRoute === 'home')}
          >
            หน้าแรก
          </button>
          <button
            type="button"
            onClick={() => handleNavClick(() => onGoDestinations(false))}
            className={navLinkClass(activeRoute === 'destinations')}
          >
            สถานที่ท่องเที่ยว
          </button>
          <button
            type="button"
            onClick={() => handleNavClick(onScrollToRegions)}
            className={navLinkClass(false)}
          >
            ภูมิภาค
          </button>
          <button
            type="button"
            onClick={() => handleNavClick(onGoAbout)}
            className={navLinkClass(activeRoute === 'about')}
          >
            เกี่ยวกับเรา
          </button>
          <button
            type="button"
            onClick={() => handleNavClick(() => onGoDestinations(true))}
            className={`inline-flex items-center gap-1.5 ${navLinkClass(false)}`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>ค้นหา</span>
          </button>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="hidden md:flex items-center shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick(onOpenAdmin)}
            className={`px-4 py-2 text-xs font-medium rounded-full transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#244B3A] ${
              solidHeader
                ? 'bg-[#244B3A] text-[#FAFAF7] hover:bg-[#1B3A2C]'
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/35 backdrop-blur-sm'
            }`}
          >
            {isAdminLoggedIn ? 'แดชบอร์ดผู้ดูแล' : 'เข้าสู่ระบบผู้ดูแล'}
          </button>
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          aria-label={mobileMenuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FAFAF7] border-b border-[#E5E2DA] px-5 pb-5 pt-2 text-[#252525]">
          <nav className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => handleNavClick(onGoHome)}
              className="text-left py-3 px-2 text-base font-medium border-b border-[#E5E2DA]/60"
            >
              หน้าแรก
            </button>
            <button
              type="button"
              onClick={() => handleNavClick(() => onGoDestinations(false))}
              className="text-left py-3 px-2 text-base font-medium border-b border-[#E5E2DA]/60"
            >
              สถานที่ท่องเที่ยว
            </button>
            <button
              type="button"
              onClick={() => handleNavClick(onScrollToRegions)}
              className="text-left py-3 px-2 text-base font-medium border-b border-[#E5E2DA]/60"
            >
              ภูมิภาค
            </button>
            <button
              type="button"
              onClick={() => handleNavClick(onGoAbout)}
              className="text-left py-3 px-2 text-base font-medium border-b border-[#E5E2DA]/60"
            >
              เกี่ยวกับเรา
            </button>
            <button
              type="button"
              onClick={() => handleNavClick(() => onGoDestinations(true))}
              className="text-left py-3 px-2 text-base font-medium border-b border-[#E5E2DA]/60 inline-flex items-center gap-2"
            >
              <Search className="w-4 h-4 text-[#244B3A]" />
              <span>ค้นหาสถานที่ท่องเที่ยว</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavClick(onOpenAdmin)}
              className="mt-3 w-full py-3 px-4 rounded-full bg-[#244B3A] text-[#FAFAF7] text-sm font-medium text-center"
            >
              {isAdminLoggedIn ? 'แดชบอร์ดผู้ดูแล' : 'เข้าสู่ระบบผู้ดูแล'}
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
