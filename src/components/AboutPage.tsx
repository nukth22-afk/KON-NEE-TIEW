import { ArrowRight, Calendar, Camera, Mail, MapPin } from 'lucide-react';
import { useMemo } from 'react';
import { formatThaiDate, isSafeExternalUrl } from '../lib/format';
import type { Article, SiteOverview, SiteSettings } from '../types/blog';
import { SafeImage } from './SafeImage';

interface AboutPageProps {
  settings: SiteSettings;
  overview: SiteOverview | null;
  articles: Article[];
  onExploreDestinations: () => void;
  onSelectArticle: (article: Article) => void;
}

export function AboutPage({
  settings,
  overview,
  articles,
  onExploreDestinations,
  onSelectArticle,
}: AboutPageProps) {
  const storyParagraphs = (settings.about_story || '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const gearItems = useMemo(() => {
    return (settings.camera_gear || '')
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const sepIdx = line.search(/\s*[—–-]\s+/);
        if (sepIdx > 0) {
          const name = line.slice(0, sepIdx).trim();
          const note = line.slice(sepIdx).replace(/^\s*[—–-]\s+/, '').trim();
          return { name, note };
        }
        return { name: line, note: '' };
      });
  }, [settings.camera_gear]);

  const timelineByYear = useMemo(() => {
    const groups = new Map<string, Article[]>();
    const sorted = [...articles].sort((a, b) =>
      (b.travel_date || b.published_at || '').localeCompare(
        a.travel_date || a.published_at || '',
      ),
    );
    for (const item of sorted) {
      const dateStr = item.travel_date || item.published_at || item.created_at;
      const yearNum = Number.parseInt(dateStr.slice(0, 4), 10);
      const thaiYear = Number.isFinite(yearNum)
        ? `พ.ศ. ${yearNum + 543}`
        : 'บันทึกการเดินทาง';
      const list = groups.get(thaiYear) ?? [];
      list.push(item);
      groups.set(thaiYear, list);
    }
    return Array.from(groups.entries());
  }, [articles]);

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

      {/* Camera Gear Showcase */}
      {gearItems.length > 0 && (
        <section
          aria-labelledby="camera-gear-heading"
          className="mt-18 pt-14 border-t border-[#E5E2DA]"
        >
          <div className="flex items-center gap-2.5 mb-2">
            <Camera className="w-4 h-4 text-[#244B3A]" />
            <p className="text-xs font-medium tracking-[0.2em] text-[#244B3A] uppercase">
              CAMERA &amp; FIELD GEAR
            </p>
          </div>
          <h2
            id="camera-gear-heading"
            className="font-editorial text-2xl sm:text-3xl font-semibold text-[#252525]"
          >
            อุปกรณ์ถ่ายภาพคู่ใจ
          </h2>
          <p className="mt-2 text-sm text-[#5C615C]">
            ชุดอุปกรณ์ที่พกติดเป้ออกไปเก็บแสงเช้า หมอกบนยอดดอย และความทรงจำระหว่างทาง
          </p>

          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {gearItems.map((gear, idx) => (
              <div
                key={`${gear.name}-${idx}`}
                className="bg-white rounded-2xl border border-[#E5E2DA] p-5 flex items-start gap-3.5"
              >
                <span className="w-9 h-9 rounded-xl bg-[#DDE8DD]/65 text-[#244B3A] text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-editorial text-base font-semibold text-[#252525]">
                    {gear.name}
                  </h3>
                  {gear.note && (
                    <p className="mt-1 text-sm text-[#5C615C] leading-relaxed">
                      {gear.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Chronological Travel Timeline */}
      {timelineByYear.length > 0 && (
        <section
          aria-labelledby="travel-timeline-heading"
          className="mt-18 pt-14 border-t border-[#E5E2DA]"
        >
          <div className="flex items-center gap-2.5 mb-2">
            <Calendar className="w-4 h-4 text-[#244B3A]" />
            <p className="text-xs font-medium tracking-[0.2em] text-[#244B3A] uppercase">
              TRAVEL TIMELINE
            </p>
          </div>
          <h2
            id="travel-timeline-heading"
            className="font-editorial text-2xl sm:text-3xl font-semibold text-[#252525]"
          >
            ไทม์ไลน์การเดินทาง
          </h2>
          <p className="mt-2 text-sm text-[#5C615C]">
            เรียงลำดับทุกทริปสำคัญที่เคยออกไปสัมผัสและจดบันทึกไว้
          </p>

          <div className="mt-8 space-y-8">
            {timelineByYear.map(([yearLabel, yearArticles]) => (
              <div key={yearLabel} className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
                <div className="md:col-span-3">
                  <div className="md:sticky md:top-24 inline-flex items-baseline gap-2">
                    <span className="font-editorial text-2xl font-semibold text-[#244B3A] tabular-nums">
                      {yearLabel}
                    </span>
                    <span className="text-xs text-[#7D827D] tabular-nums">
                      ({yearArticles.length} ทริป)
                    </span>
                  </div>
                </div>

                <div className="md:col-span-9 border-l border-[#DCD7CB] pl-5 sm:pl-6 space-y-4">
                  {yearArticles.map((trip) => (
                    <button
                      key={trip.id}
                      type="button"
                      onClick={() => onSelectArticle(trip)}
                      className="group relative w-full text-left bg-white rounded-2xl border border-[#E5E2DA] hover:border-[#244B3A] p-4 sm:p-5 transition-colors cursor-pointer flex items-center gap-4"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute -left-[27px] sm:-left-[31px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#244B3A] ring-4 ring-[#FAFAF7]"
                      />
                      <div className="w-16 h-16 sm:w-20 sm:h-16 rounded-xl overflow-hidden bg-[#EAE6DC] shrink-0">
                        <SafeImage
                          src={trip.cover_image}
                          alt={trip.place_name}
                          fallbackTitle={trip.place_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[#7D827D]">
                          {formatThaiDate(trip.travel_date)}
                        </p>
                        <h3 className="mt-0.5 font-editorial text-base sm:text-lg font-semibold text-[#252525] group-hover:text-[#244B3A] transition-colors truncate">
                          {trip.place_name}
                        </h3>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#5C615C]">
                          <MapPin className="w-3 h-3 text-[#244B3A]" />
                          <span>
                            จังหวัด{trip.province} · {trip.region}
                          </span>
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#8D928B] group-hover:text-[#244B3A] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
