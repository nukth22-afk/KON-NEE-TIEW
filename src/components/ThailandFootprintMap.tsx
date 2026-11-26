import thailandMap from '@svg-maps/thailand';
import { ArrowRight, Compass, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  THAI_REGIONS,
  type ProvinceFootprint,
  type SiteOverview,
  type ThaiRegion,
} from '../types/blog';

interface ThailandFootprintMapProps {
  overview: SiteOverview | null;
  onSelectProvince: (province: string) => void;
  onSelectRegion: (region: ThaiRegion) => void;
  onOpenArticleBySlug: (slug: string) => void;
}

interface ProvinceMeta {
  th: string;
  region: ThaiRegion;
}

// Complete 77-province mapping matching @svg-maps/thailand location IDs
const PROVINCE_META_BY_ID: Record<string, ProvinceMeta> = {
  // ภาคเหนือ (9)
  cmi: { th: 'เชียงใหม่', region: 'ภาคเหนือ' },
  cri: { th: 'เชียงราย', region: 'ภาคเหนือ' },
  lpg: { th: 'ลำปาง', region: 'ภาคเหนือ' },
  lpn: { th: 'ลำพูน', region: 'ภาคเหนือ' },
  msn: { th: 'แม่ฮ่องสอน', region: 'ภาคเหนือ' },
  nan: { th: 'น่าน', region: 'ภาคเหนือ' },
  pyo: { th: 'พะเยา', region: 'ภาคเหนือ' },
  pre: { th: 'แพร่', region: 'ภาคเหนือ' },
  utd: { th: 'อุตรดิตถ์', region: 'ภาคเหนือ' },

  // ภาคตะวันออกเฉียงเหนือ (20)
  nma: { th: 'นครราชสีมา', region: 'ภาคตะวันออกเฉียงเหนือ' },
  brm: { th: 'บุรีรัมย์', region: 'ภาคตะวันออกเฉียงเหนือ' },
  srn: { th: 'สุรินทร์', region: 'ภาคตะวันออกเฉียงเหนือ' },
  ssk: { th: 'ศรีสะเกษ', region: 'ภาคตะวันออกเฉียงเหนือ' },
  ubn: { th: 'อุบลราชธานี', region: 'ภาคตะวันออกเฉียงเหนือ' },
  yst: { th: 'ยโสธร', region: 'ภาคตะวันออกเฉียงเหนือ' },
  cpm: { th: 'ชัยภูมิ', region: 'ภาคตะวันออกเฉียงเหนือ' },
  acr: { th: 'อำนาจเจริญ', region: 'ภาคตะวันออกเฉียงเหนือ' },
  bkn: { th: 'บึงกาฬ', region: 'ภาคตะวันออกเฉียงเหนือ' },
  nbp: { th: 'หนองบัวลำภู', region: 'ภาคตะวันออกเฉียงเหนือ' },
  kkn: { th: 'ขอนแก่น', region: 'ภาคตะวันออกเฉียงเหนือ' },
  udn: { th: 'อุดรธานี', region: 'ภาคตะวันออกเฉียงเหนือ' },
  lei: { th: 'เลย', region: 'ภาคตะวันออกเฉียงเหนือ' },
  nki: { th: 'หนองคาย', region: 'ภาคตะวันออกเฉียงเหนือ' },
  mkm: { th: 'มหาสารคาม', region: 'ภาคตะวันออกเฉียงเหนือ' },
  ret: { th: 'ร้อยเอ็ด', region: 'ภาคตะวันออกเฉียงเหนือ' },
  ksn: { th: 'กาฬสินธุ์', region: 'ภาคตะวันออกเฉียงเหนือ' },
  snk: { th: 'สกลนคร', region: 'ภาคตะวันออกเฉียงเหนือ' },
  npm: { th: 'นครพนม', region: 'ภาคตะวันออกเฉียงเหนือ' },
  mdh: { th: 'มุกดาหาร', region: 'ภาคตะวันออกเฉียงเหนือ' },

  // ภาคกลาง (22)
  bkk: { th: 'กรุงเทพมหานคร', region: 'ภาคกลาง' },
  spk: { th: 'สมุทรปราการ', region: 'ภาคกลาง' },
  nbi: { th: 'นนทบุรี', region: 'ภาคกลาง' },
  pte: { th: 'ปทุมธานี', region: 'ภาคกลาง' },
  aya: { th: 'พระนครศรีอยุธยา', region: 'ภาคกลาง' },
  atg: { th: 'อ่างทอง', region: 'ภาคกลาง' },
  lri: { th: 'ลพบุรี', region: 'ภาคกลาง' },
  sbr: { th: 'สิงห์บุรี', region: 'ภาคกลาง' },
  cnt: { th: 'ชัยนาท', region: 'ภาคกลาง' },
  sri: { th: 'สระบุรี', region: 'ภาคกลาง' },
  nyk: { th: 'นครนายก', region: 'ภาคกลาง' },
  nsn: { th: 'นครสวรรค์', region: 'ภาคกลาง' },
  uti: { th: 'อุทัยธานี', region: 'ภาคกลาง' },
  kpt: { th: 'กำแพงเพชร', region: 'ภาคกลาง' },
  sti: { th: 'สุโขทัย', region: 'ภาคกลาง' },
  plk: { th: 'พิษณุโลก', region: 'ภาคกลาง' },
  pct: { th: 'พิจิตร', region: 'ภาคกลาง' },
  pnb: { th: 'เพชรบูรณ์', region: 'ภาคกลาง' },
  spb: { th: 'สุพรรณบุรี', region: 'ภาคกลาง' },
  npt: { th: 'นครปฐม', region: 'ภาคกลาง' },
  skn: { th: 'สมุทรสาคร', region: 'ภาคกลาง' },
  skm: { th: 'สมุทรสงคราม', region: 'ภาคกลาง' },

  // ภาคตะวันออก (7)
  cbi: { th: 'ชลบุรี', region: 'ภาคตะวันออก' },
  ryg: { th: 'ระยอง', region: 'ภาคตะวันออก' },
  cti: { th: 'จันทบุรี', region: 'ภาคตะวันออก' },
  trt: { th: 'ตราด', region: 'ภาคตะวันออก' },
  cco: { th: 'ฉะเชิงเทรา', region: 'ภาคตะวันออก' },
  pri: { th: 'ปราจีนบุรี', region: 'ภาคตะวันออก' },
  skw: { th: 'สระแก้ว', region: 'ภาคตะวันออก' },

  // ภาคตะวันตก (5)
  tak: { th: 'ตาก', region: 'ภาคตะวันตก' },
  kri: { th: 'กาญจนบุรี', region: 'ภาคตะวันตก' },
  rbr: { th: 'ราชบุรี', region: 'ภาคตะวันตก' },
  pbi: { th: 'เพชรบุรี', region: 'ภาคตะวันตก' },
  pkn: { th: 'ประจวบคีรีขันธ์', region: 'ภาคตะวันตก' },

  // ภาคใต้ (14)
  cpn: { th: 'ชุมพร', region: 'ภาคใต้' },
  rng: { th: 'ระนอง', region: 'ภาคใต้' },
  sni: { th: 'สุราษฎร์ธานี', region: 'ภาคใต้' },
  pna: { th: 'พังงา', region: 'ภาคใต้' },
  pkt: { th: 'ภูเก็ต', region: 'ภาคใต้' },
  kbi: { th: 'กระบี่', region: 'ภาคใต้' },
  nrt: { th: 'นครศรีธรรมราช', region: 'ภาคใต้' },
  trg: { th: 'ตรัง', region: 'ภาคใต้' },
  plg: { th: 'พัทลุง', region: 'ภาคใต้' },
  ska: { th: 'สงขลา', region: 'ภาคใต้' },
  stn: { th: 'สตูล', region: 'ภาคใต้' },
  ptn: { th: 'ปัตตานี', region: 'ภาคใต้' },
  yla: { th: 'ยะลา', region: 'ภาคใต้' },
  nwt: { th: 'นราธิวาส', region: 'ภาคใต้' },
};

const THAI_PROVINCE_ALIASES: Record<string, string> = {
  กรุงเทพ: 'กรุงเทพมหานคร',
  'กทม.': 'กรุงเทพมหานคร',
  กทม: 'กรุงเทพมหานคร',
  อยุธยา: 'พระนครศรีอยุธยา',
  โคราช: 'นครราชสีมา',
  พังงา: 'พังงา',
};

function normalizeThaiProvince(raw: string): string {
  const cleaned = raw.trim().replace(/^จ\.\s*/, '').replace(/^จังหวัด\s*/, '');
  return THAI_PROVINCE_ALIASES[cleaned] || cleaned;
}

export function ThailandFootprintMap({
  overview,
  onSelectProvince,
  onSelectRegion,
  onOpenArticleBySlug,
}: ThailandFootprintMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<ThaiRegion | null>(null);
  const [hoveredMapProvince, setHoveredMapProvince] = useState<ProvinceMeta | null>(
    null,
  );
  const [activeVisitedProvince, setActiveVisitedProvince] = useState<string | null>(
    null,
  );

  const footprints = overview?.provinceFootprints ?? [];
  const regionCounts = overview?.regionCounts;

  const footprintByThaiName = useMemo(() => {
    const map = new Map<string, ProvinceFootprint>();
    for (const fp of footprints) {
      map.set(normalizeThaiProvince(fp.province), fp);
    }
    return map;
  }, [footprints]);

  const highlightedFootprint = useMemo(() => {
    if (activeVisitedProvince) {
      const matched = footprintByThaiName.get(
        normalizeThaiProvince(activeVisitedProvince),
      );
      if (matched) return matched;
    }
    return footprints[0] ?? null;
  }, [activeVisitedProvince, footprintByThaiName, footprints]);

  if (!overview || footprints.length === 0) {
    return null;
  }

  return (
    <section
      id="thailand-footprint"
      aria-labelledby="thailand-footprint-heading"
      className="scroll-mt-20 py-20 sm:py-24 px-5 sm:px-8 border-t border-[#E5E2DA] bg-[#FAFAF7]"
    >
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#E5E2DA]">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-[#244B3A] mb-2 uppercase">
              THAILAND TRAVEL FOOTPRINT
            </p>
            <h2
              id="thailand-footprint-heading"
              className="font-editorial text-2xl sm:text-3xl md:text-4xl font-semibold text-[#252525] tracking-tight"
            >
              แผนที่บันทึกการเดินทางทั่วไทย
            </h2>
          </div>
          <p className="text-sm text-[#5C615C]">
            ปักหมุดแล้ว{' '}
            <strong className="font-semibold text-[#244B3A] tabular-nums">
              {overview.stats.totalProvinces}
            </strong>{' '}
            จาก 77 จังหวัด ·{' '}
            <strong className="font-semibold text-[#252525] tabular-nums">
              {overview.stats.coveredRegions}/{overview.stats.totalRegions}
            </strong>{' '}
            ภูมิภาค — คลิกจังหวัดสีเขียวเพื่อเปิดดูเรื่องราว
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Authentic 77-Province Thailand SVG Map */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E2DA] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C615C] mb-3">
              <span className="font-medium text-[#244B3A]">
                แผนที่ประเทศไทย 77 จังหวัด
              </span>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#244B3A]" />
                  เคยไปเยือนแล้ว
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EDEAE1] border border-[#D4CFC2]" />
                  รอออกเดินทาง
                </span>
              </div>
            </div>

            {/* Live Hover Status Strip */}
            <div className="min-h-[34px] mb-2 px-3 py-1.5 rounded-xl bg-[#FAFAF7] border border-[#EFECE4] flex items-center justify-between gap-2 text-xs">
              {hoveredMapProvince ? (
                <>
                  <span className="font-medium text-[#252525] truncate">
                    จังหวัด{hoveredMapProvince.th}{' '}
                    <span className="font-normal text-[#7D827D]">
                      · {hoveredMapProvince.region}
                    </span>
                  </span>
                  {footprintByThaiName.has(hoveredMapProvince.th) ? (
                    <span className="shrink-0 font-medium text-[#244B3A] tabular-nums">
                      {footprintByThaiName.get(hoveredMapProvince.th)?.count} เรื่องราว
                    </span>
                  ) : (
                    <span className="shrink-0 text-[#8A8F8A]">ยังไม่มีบันทึก</span>
                  )}
                </>
              ) : (
                <span className="text-[#7D827D]">
                  ชี้หรือแตะที่จังหวัดบนแผนที่เพื่อดูชื่อจังหวัดและเรื่องราวการเดินทาง
                </span>
              )}
            </div>

            {/* Real Geographic Thailand SVG */}
            <div className="relative mx-auto max-w-[300px] sm:max-w-[320px] py-1">
              <svg
                viewBox={(thailandMap as { viewBox: string }).viewBox}
                className="w-full h-auto select-none drop-shadow-[0_6px_18px_rgba(36,75,58,0.06)]"
                role="img"
                aria-label="แผนที่ประเทศไทย 77 จังหวัด แสดงจังหวัดที่เคยเดินทางไป"
              >
                {(
                  thailandMap as {
                    locations: Array<{ id: string; name: string; path: string }>;
                  }
                ).locations.map((loc) => {
                  // Songkhla Lake water feature
                  if (loc.id === 'lksg') {
                    return (
                      <path
                        key={loc.id}
                        d={loc.path}
                        fill="#F4F7F6"
                        stroke="#E2E9E6"
                        strokeWidth={0.8}
                        className="pointer-events-none"
                      />
                    );
                  }

                  const meta = PROVINCE_META_BY_ID[loc.id];
                  const thaiName = meta?.th ?? loc.name;
                  const region = meta?.region;
                  const fp = footprintByThaiName.get(thaiName);
                  const isVisited = Boolean(fp);
                  const isFocusedVisited =
                    isVisited && highlightedFootprint?.province === fp?.province;
                  const isHoveredProvince = hoveredMapProvince?.th === thaiName;
                  const isRegionHighlighted =
                    Boolean(hoveredRegion) && region === hoveredRegion;

                  let fill = '#EDEAE1';
                  if (isVisited) {
                    fill =
                      isHoveredProvince || isFocusedVisited ? '#173729' : '#244B3A';
                  } else if (isHoveredProvince) {
                    fill = '#C8D9CA';
                  } else if (isRegionHighlighted) {
                    fill = '#DCE7DD';
                  }

                  return (
                    <path
                      key={loc.id}
                      d={loc.path}
                      fill={fill}
                      stroke="#FAFAF7"
                      strokeWidth={isVisited ? 1.4 : 0.9}
                      strokeLinejoin="round"
                      role="button"
                      tabIndex={isVisited ? 0 : -1}
                      aria-label={
                        fp
                          ? `จังหวัด${thaiName} ${fp.count} เรื่องราว`
                          : `จังหวัด${thaiName}`
                      }
                      onMouseEnter={() => {
                        if (meta) setHoveredMapProvince(meta);
                        if (fp) {
                          setActiveVisitedProvince(fp.province);
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredMapProvince(null);
                      }}
                      onFocus={() => {
                        if (meta) setHoveredMapProvince(meta);
                        if (fp) setActiveVisitedProvince(fp.province);
                      }}
                      onClick={() => {
                        if (fp) {
                          onSelectProvince(fp.province);
                        } else if (region) {
                          onSelectRegion(region);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (fp) {
                            onSelectProvince(fp.province);
                          } else if (region) {
                            onSelectRegion(region);
                          }
                        }
                      }}
                      className={`transition-colors duration-150 focus:outline-none ${
                        isVisited ? 'cursor-pointer' : 'cursor-pointer'
                      }`}
                    >
                      <title>
                        {fp
                          ? `จังหวัด${thaiName} (${fp.count} เรื่องราว)`
                          : `จังหวัด${thaiName}`}
                      </title>
                    </path>
                  );
                })}
              </svg>
            </div>

            {highlightedFootprint && (
              <div className="mt-4 pt-4 border-t border-[#EFECE4] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-[#5C615C]">
                    {highlightedFootprint.region}
                  </p>
                  <p className="font-editorial text-base font-semibold text-[#252525] truncate">
                    จังหวัด{highlightedFootprint.province}
                  </p>
                  <p className="text-xs text-[#4B524B] truncate mt-0.5">
                    ล่าสุด: {highlightedFootprint.latestPlace}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onOpenArticleBySlug(highlightedFootprint.latestSlug)
                  }
                  className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#244B3A] hover:bg-[#1B3A2C] text-[#FAFAF7] text-xs font-medium transition-colors cursor-pointer"
                >
                  <span>อ่านเรื่องนี้</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Right Panel: Visited Provinces Directory & 6-Region Coverage */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h3 className="font-editorial text-xl font-semibold text-[#252525]">
                จังหวัดที่มีเรื่องราวการเดินทางแล้ว
              </h3>
              <p className="text-sm text-[#5C615C] mt-1">
                ชี้หรือคลิกที่ชื่อจังหวัดเพื่อไฮไลท์ตำแหน่งจริงบนแผนที่ประเทศไทยและเปิดดูบทความทั้งหมดของจังหวัดนั้น
              </p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {footprints.map((fp) => {
                  const isActive =
                    highlightedFootprint?.province === fp.province;
                  return (
                    <button
                      key={fp.province}
                      type="button"
                      onMouseEnter={() => {
                        setActiveVisitedProvince(fp.province);
                        setHoveredMapProvince({
                          th: normalizeThaiProvince(fp.province),
                          region: fp.region,
                        });
                      }}
                      onMouseLeave={() => {
                        setHoveredMapProvince(null);
                      }}
                      onFocus={() => {
                        setActiveVisitedProvince(fp.province);
                      }}
                      onClick={() => onSelectProvince(fp.province)}
                      className={`group text-left p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isActive
                          ? 'bg-[#DDE8DD]/45 border-[#244B3A]'
                          : 'bg-white border-[#E5E2DA] hover:border-[#244B3A]/60'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#244B3A] shrink-0" />
                          <span className="font-editorial text-base font-semibold text-[#252525] group-hover:text-[#244B3A] transition-colors">
                            จังหวัด{fp.province}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#5C615C] truncate">
                          {fp.region} · {fp.latestPlace}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-[#244B3A] tabular-nums bg-[#FAFAF7] border border-[#E5E2DA] px-2.5 py-1 rounded-full">
                        {fp.count} เรื่อง
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6-Region Coverage Summary */}
            <div className="bg-white rounded-2xl border border-[#E5E2DA] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#244B3A]" />
                  <h4 className="font-editorial text-base font-semibold text-[#252525]">
                    สำรวจแยกตาม 6 ภูมิภาค
                  </h4>
                </div>
                <span className="text-xs text-[#5C615C] tabular-nums">
                  {overview.stats.totalArticles} บทความทั้งหมด
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {THAI_REGIONS.map((region) => {
                  const count = regionCounts?.[region] ?? 0;
                  const active = hoveredRegion === region;
                  return (
                    <button
                      key={region}
                      type="button"
                      onMouseEnter={() => setHoveredRegion(region)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      onClick={() => onSelectRegion(region)}
                      className={`px-3.5 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        active
                          ? 'border-[#244B3A] bg-[#DDE8DD]/55'
                          : count > 0
                            ? 'border-[#E5E2DA] bg-[#FAFAF7] hover:border-[#244B3A]/60'
                            : 'border-[#EFECE4] bg-[#FAFAF7]/50 text-[#8A8F8A] hover:border-[#DCD7CB]'
                      }`}
                    >
                      <p className="text-xs font-medium text-[#252525] truncate">
                        {region}
                      </p>
                      <p className="text-[11px] text-[#5C615C] mt-0.5 tabular-nums">
                        {count > 0 ? `${count} เรื่องราว` : 'กำลังวางแผน'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
