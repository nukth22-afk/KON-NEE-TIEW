import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AboutPage } from './components/AboutPage';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';
import { AllDestinationsPage } from './components/AllDestinationsPage';
import { ArticleDetail } from './components/ArticleDetail';
import { ArticleEditor } from './components/ArticleEditor';
import { FeaturedSpotlight } from './components/FeaturedSpotlight';
import { Footer } from './components/Footer';
import { HeroBanner } from './components/HeroBanner';
import { LatestDestinations } from './components/LatestDestinations';
import { Navbar } from './components/Navbar';
import { PhotoPostcards } from './components/PhotoPostcards';
import { RegionExplorer } from './components/RegionExplorer';
import { SavedTripsDrawer } from './components/SavedTripsDrawer';
import {
  fetchArticleDetail,
  fetchPublishedArticles,
  fetchSiteOverview,
  fetchSiteSettings,
  verifyAdminSession,
} from './lib/api';
import { auth } from './lib/firebase';
import {
  DEFAULT_SITE_SETTINGS,
  type AdminUser,
  type Article,
  type SiteOverview,
  type SiteSettings,
  type ThaiRegion,
} from './types/blog';

type RouteView =
  | { name: 'home' }
  | { name: 'destinations'; focusSearch?: boolean }
  | { name: 'about' }
  | { name: 'article'; slug: string }
  | { name: 'admin' }
  | { name: 'admin-editor'; article: Article | null; defaultRegion?: ThaiRegion };

const SAVED_TRIPS_KEY = 'khonneethiao_saved_trips_v1';

function loadSavedTripIds(): number[] {
  try {
    const raw = window.localStorage.getItem(SAVED_TRIPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is number => typeof id === 'number' && id > 0);
    }
    return [];
  } catch {
    return [];
  }
}

function parseLocationRoute(): RouteView {
  const pathname = window.location.pathname;
  if (pathname.startsWith('/admin')) {
    return { name: 'admin' };
  }
  if (pathname === '/destinations') {
    return { name: 'destinations' };
  }
  if (pathname === '/about') {
    return { name: 'about' };
  }
  const articleMatch = /^\/article\/([^/]+)$/.exec(pathname);
  if (articleMatch) {
    return { name: 'article', slug: decodeURIComponent(articleMatch[1]) };
  }
  return { name: 'home' };
}

export default function App() {
  const [route, setRoute] = useState<RouteView>(() => parseLocationRoute());
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  // Admin auth state kept strictly in memory (never localStorage)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const adminTokenRef = useRef<string>('');
  const [adminFlash, setAdminFlash] = useState('');

  // Personal saved trips bucket list (non-sensitive article IDs)
  const [savedIdsList, setSavedIdsList] = useState<number[]>(() => loadSavedTripIds());
  const [savedDrawerOpen, setSavedDrawerOpen] = useState(false);

  // Public homepage & overview data from PostgreSQL
  const [allPublished, setAllPublished] = useState<Article[]>([]);
  const [latestLoading, setLatestLoading] = useState(true);
  const [overview, setOverview] = useState<SiteOverview | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<ThaiRegion>('ภาคเหนือ');
  const [regionArticles, setRegionArticles] = useState<Article[]>([]);
  const [regionLoading, setRegionLoading] = useState(true);

  // Article detail view state
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [articleLoading, setArticleLoading] = useState(false);
  const [articleError, setArticleError] = useState('');

  const savedIds = useMemo(() => new Set(savedIdsList), [savedIdsList]);

  // Listen to Firebase Auth state changes and verify admin role with server
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        adminTokenRef.current = '';
        setAdminUser(null);
        setAuthChecking(false);
        return;
      }
      try {
        const token = await fbUser.getIdToken();
        const verified = await verifyAdminSession(token);
        adminTokenRef.current = token;
        setAdminUser(verified);
      } catch {
        adminTokenRef.current = '';
        setAdminUser(null);
      } finally {
        setAuthChecking(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const getFreshAdminToken = useCallback(async (): Promise<string> => {
    const fbUser = auth.currentUser;
    if (fbUser) {
      const token = await fbUser.getIdToken();
      adminTokenRef.current = token;
      return token;
    }
    if (adminTokenRef.current) {
      return adminTokenRef.current;
    }
    throw new Error('กรุณาเข้าสู่ระบบผู้ดูแลก่อนดำเนินการ');
  }, []);

  const handleAdminLogout = useCallback(async () => {
    await signOut(auth).catch(() => {});
    adminTokenRef.current = '';
    setAdminUser(null);
    setAdminFlash('');
  }, []);

  const toggleSaveTrip = useCallback((articleId: number) => {
    setSavedIdsList((prev) => {
      const next = prev.includes(articleId)
        ? prev.filter((id) => id !== articleId)
        : [articleId, ...prev];
      try {
        window.localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  }, []);

  const savedArticles = useMemo(() => {
    const map = new Map(allPublished.map((a) => [a.id, a]));
    return savedIdsList
      .map((id) => map.get(id))
      .filter((a): a is Article => Boolean(a));
  }, [allPublished, savedIdsList]);

  const navigate = useCallback((nextRoute: RouteView, urlPath: string) => {
    setRoute(nextRoute);
    if (window.location.pathname !== urlPath) {
      window.history.pushState({}, '', urlPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseLocationRoute());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Update document title for non-article pages
  useEffect(() => {
    if (route.name === 'article') return;
    const siteName = siteSettings.site_name || 'ฅนหนีเที่ยว';
    if (route.name === 'destinations') {
      document.title = `สถานที่ท่องเที่ยวทั้งหมด | ${siteName}`;
    } else if (route.name === 'about') {
      document.title = `เกี่ยวกับเรา | ${siteName}`;
    } else if (route.name === 'admin' || route.name === 'admin-editor') {
      document.title = `ระบบจัดการเนื้อหา | ${siteName}`;
    } else {
      document.title = `${siteName} (${siteSettings.site_name_en || 'KON NEE TIEW'}) — ${siteSettings.slogan}`;
    }
  }, [route.name, siteSettings]);

  const loadHomepageData = useCallback(async () => {
    setLatestLoading(true);
    try {
      const [publishedRes, overviewData, settingsData] = await Promise.all([
        fetchPublishedArticles({ limit: 100 }),
        fetchSiteOverview(),
        fetchSiteSettings(),
      ]);
      setAllPublished(publishedRes.articles);
      setOverview(overviewData);
      setSiteSettings(settingsData);
    } catch {
      // Keep graceful defaults
    } finally {
      setLatestLoading(false);
    }
  }, []);

  const loadRegionArticles = useCallback(async (region: ThaiRegion) => {
    setRegionLoading(true);
    try {
      const { articles } = await fetchPublishedArticles({ region });
      setRegionArticles(articles);
    } catch {
      setRegionArticles([]);
    } finally {
      setRegionLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomepageData();
  }, [loadHomepageData]);

  useEffect(() => {
    loadRegionArticles(selectedRegion);
  }, [selectedRegion, loadRegionArticles]);

  useEffect(() => {
    if (route.name !== 'article') return;
    let active = true;
    setArticleLoading(true);
    setArticleError('');
    fetchArticleDetail(route.slug)
      .then(({ article, related }) => {
        if (!active) return;
        setCurrentArticle(article);
        setRelatedArticles(related);
      })
      .catch((err) => {
        if (!active) return;
        setCurrentArticle(null);
        setRelatedArticles([]);
        setArticleError(
          err instanceof Error ? err.message : 'ไม่พบบทความท่องเที่ยวที่ต้องการ',
        );
      })
      .finally(() => {
        if (active) setArticleLoading(false);
      });
    return () => {
      active = false;
    };
  }, [route]);

  const refreshPublicData = useCallback(() => {
    loadHomepageData();
    loadRegionArticles(selectedRegion);
  }, [loadHomepageData, loadRegionArticles, selectedRegion]);

  const handleGoHome = () => {
    navigate({ name: 'home' }, '/');
  };

  const handleGoDestinations = (focusSearch = false) => {
    navigate({ name: 'destinations', focusSearch }, '/destinations');
  };

  const handleGoAbout = () => {
    navigate({ name: 'about' }, '/about');
  };

  const handleScrollToSection = (sectionId: string) => {
    if (route.name !== 'home') {
      setRoute({ name: 'home' });
      window.history.pushState({}, '', '/');
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 90);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectArticle = (article: Article) => {
    setCurrentArticle(article);
    navigate(
      { name: 'article', slug: article.slug },
      `/article/${encodeURIComponent(article.slug)}`,
    );
  };

  const handleOpenArticleBySlug = (slug: string) => {
    const matched = allPublished.find((a) => a.slug === slug) ?? null;
    setCurrentArticle(matched);
    navigate({ name: 'article', slug }, `/article/${encodeURIComponent(slug)}`);
  };

  const handleSelectRegionFromFooter = (region: ThaiRegion) => {
    setSelectedRegion(region);
    handleScrollToSection('destination-by-region');
  };

  const handleOpenAdmin = () => {
    navigate({ name: 'admin' }, '/admin');
  };

  // ---------- Admin Views ----------

  if (route.name === 'admin' || route.name === 'admin-editor') {
    if (authChecking) {
      return (
        <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-6">
          <p className="text-sm text-[#5C615C]">กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...</p>
        </div>
      );
    }

    if (!adminUser) {
      return (
        <AdminLogin
          settings={siteSettings}
          onSuccess={(verifiedUser, token) => {
            adminTokenRef.current = token;
            setAdminUser(verifiedUser);
            setRoute({ name: 'admin' });
          }}
          onCancel={handleGoHome}
        />
      );
    }

    if (route.name === 'admin-editor') {
      return (
        <ArticleEditor
          getToken={getFreshAdminToken}
          initialArticle={route.article}
          defaultRegion={route.defaultRegion}
          onSaved={(_saved, message) => {
            setAdminFlash(message);
            refreshPublicData();
            setRoute({ name: 'admin' });
          }}
          onCancel={() => setRoute({ name: 'admin' })}
        />
      );
    }

    return (
      <AdminDashboard
        user={adminUser}
        getToken={getFreshAdminToken}
        settings={siteSettings}
        onSettingsUpdated={(next) => setSiteSettings(next)}
        onCreateNew={(defaultRegion) =>
          setRoute({ name: 'admin-editor', article: null, defaultRegion })
        }
        onEditArticle={(article) => setRoute({ name: 'admin-editor', article })}
        onViewLiveArticle={handleSelectArticle}
        onGoHome={handleGoHome}
        onLogout={handleAdminLogout}
        onDataChanged={refreshPublicData}
        flashMessage={adminFlash}
        onClearFlash={() => setAdminFlash('')}
      />
    );
  }

  // ---------- Public Views ----------

  const activeNavRoute =
    route.name === 'destinations' ||
    route.name === 'about' ||
    route.name === 'article'
      ? route.name
      : 'home';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF7] text-[#252525]">
      <Navbar
        settings={siteSettings}
        activeRoute={activeNavRoute}
        isAdminLoggedIn={Boolean(adminUser)}
        onGoHome={handleGoHome}
        onGoDestinations={handleGoDestinations}
        onGoAbout={handleGoAbout}
        onScrollToRegions={() => handleScrollToSection('destination-by-region')}
        onOpenAdmin={handleOpenAdmin}
      />

      <main className="flex-1">
        {route.name === 'home' ? (
          <>
            <HeroBanner
              settings={siteSettings}
              onExplore={() => handleScrollToSection('intro-section')}
            />

            {/* Part 3.2: Minimal Editorial Introduction Section */}
            <section
              id="intro-section"
              aria-labelledby="intro-heading"
              className="scroll-mt-20 py-18 sm:py-22 px-5 sm:px-8 border-b border-[#E5E2DA] bg-[#FAFAF7]"
            >
              <div className="max-w-[740px] mx-auto text-center">
                <p className="text-xs font-medium tracking-[0.2em] text-[#244B3A] mb-3 uppercase">
                  TRAVEL JOURNAL
                </p>
                <h2
                  id="intro-heading"
                  className="font-editorial text-2xl sm:text-3xl md:text-4xl font-semibold text-[#252525] leading-snug tracking-tight"
                >
                  {siteSettings.intro_title || 'ทุกการเดินทาง มีเรื่องราวเสมอ'}
                </h2>
                <p className="mt-5 text-base sm:text-[17px] text-[#4B524B] leading-[1.9]">
                  {siteSettings.intro_description}
                </p>
              </div>
            </section>

            <LatestDestinations
              articles={allPublished}
              loading={latestLoading}
              savedIds={savedIds}
              onToggleSave={toggleSaveTrip}
              onSelectArticle={handleSelectArticle}
              onViewAllDestinations={() => handleGoDestinations(false)}
            />

            <RegionExplorer
              selectedRegion={selectedRegion}
              articles={regionArticles}
              regionCounts={overview?.regionCounts}
              loading={regionLoading}
              savedIds={savedIds}
              onToggleSave={toggleSaveTrip}
              onSelectRegion={setSelectedRegion}
              onSelectArticle={handleSelectArticle}
            />

            <FeaturedSpotlight
              overview={overview}
              savedIds={savedIds}
              onToggleSave={toggleSaveTrip}
              onSelectArticle={handleSelectArticle}
            />

            {overview && overview.postcards.length >= 2 && (
              <PhotoPostcards
                postcards={overview.postcards}
                onOpenBySlug={handleOpenArticleBySlug}
              />
            )}
          </>
        ) : route.name === 'destinations' ? (
          <AllDestinationsPage
            provinces={overview?.provinces ?? []}
            autoFocusSearch={Boolean(route.focusSearch)}
            savedIds={savedIds}
            onToggleSave={toggleSaveTrip}
            onSelectArticle={handleSelectArticle}
          />
        ) : route.name === 'about' ? (
          <AboutPage
            settings={siteSettings}
            overview={overview}
            onExploreDestinations={() => handleGoDestinations(false)}
          />
        ) : articleLoading && !currentArticle ? (
          <div className="pt-36 pb-24 max-w-[960px] mx-auto px-5 sm:px-8 animate-pulse">
            <div className="h-4 w-36 bg-[#EAE6DC] rounded mx-auto" />
            <div className="mt-4 h-10 w-3/4 bg-[#EAE6DC] rounded mx-auto" />
            <div className="mt-10 aspect-[16/10] w-full rounded-2xl bg-[#EAE6DC]" />
          </div>
        ) : articleError || !currentArticle ? (
          <div className="pt-36 pb-28 max-w-lg mx-auto px-6 text-center">
            <h1 className="font-editorial text-2xl font-semibold text-[#252525]">
              {articleError || 'ไม่พบบทความที่ต้องการ'}
            </h1>
            <p className="mt-3 text-sm text-[#5C615C]">
              บทความนี้อาจถูกย้ายเป็นฉบับร่างหรือถูกลบออกจากระบบแล้ว
            </p>
            <button
              type="button"
              onClick={handleGoHome}
              className="mt-6 px-6 py-2.5 rounded-full bg-[#244B3A] text-[#FAFAF7] text-sm font-medium hover:bg-[#1B3A2C] cursor-pointer"
            >
              กลับหน้าแรก {siteSettings.site_name || 'ฅนหนีเที่ยว'}
            </button>
          </div>
        ) : (
          <ArticleDetail
            article={currentArticle}
            related={relatedArticles}
            settings={siteSettings}
            isSaved={savedIds.has(currentArticle.id)}
            onToggleSave={toggleSaveTrip}
            onBack={handleGoHome}
            onSelectArticle={handleSelectArticle}
          />
        )}
      </main>

      <Footer
        settings={siteSettings}
        savedCount={savedArticles.length}
        onGoHome={handleGoHome}
        onGoDestinations={() => handleGoDestinations(false)}
        onGoAbout={handleGoAbout}
        onOpenSavedTrips={() => setSavedDrawerOpen(true)}
        onSelectRegionFromFooter={handleSelectRegionFromFooter}
        onOpenAdmin={handleOpenAdmin}
      />

      <SavedTripsDrawer
        open={savedDrawerOpen}
        savedArticles={savedArticles}
        onClose={() => setSavedDrawerOpen(false)}
        onSelectArticle={handleSelectArticle}
        onRemoveSaved={toggleSaveTrip}
      />
    </div>
  );
}
