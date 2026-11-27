import {
  Clock,
  ExternalLink,
  Globe,
  MapPin,
  Navigation,
  Phone,
  Ticket,
} from 'lucide-react';
import React from 'react';
import { isSafeExternalUrl, isSafeImageUrl } from '../lib/format';
import { SafeImage } from './SafeImage';

interface RichContentRendererProps {
  content: string;
  onImageClick?: (url: string, caption: string) => void;
}

export interface ContentHeading {
  id: string;
  text: string;
}

interface ImageItem {
  alt: string;
  url: string;
}

interface PlaceCardData {
  name: string;
  address?: string;
  hours?: string;
  fee?: string;
  phone?: string;
  social?: string;
  mapsUrl?: string;
  extras: { label: string; value: string }[];
}

function isBareImageUrl(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  if (!isSafeImageUrl(trimmed)) return false;
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/src/assets/images/')) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    const lowerPath = parsed.pathname.toLowerCase();
    if (/\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/.test(lowerPath)) {
      return true;
    }
    if (
      parsed.hostname === 'res.cloudinary.com' &&
      lowerPath.includes('/image/upload/')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex =
    /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s<>()]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={key++} className="font-semibold text-[#252525]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('__') && token.endsWith('__')) {
      nodes.push(
        <u key={key++} className="underline decoration-[#244B3A]/60 underline-offset-4">
          {token.slice(2, -2)}
        </u>,
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={key++} className="italic text-[#333833]">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch && isSafeExternalUrl(linkMatch[2])) {
        nodes.push(
          <a
            key={key++}
            href={linkMatch[2].trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#244B3A] font-medium underline underline-offset-4 decoration-[#244B3A]/50 hover:decoration-[#244B3A] transition-colors break-words"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith('http://') || token.startsWith('https://')) {
      const cleaned = token.replace(/[.,;!?)]+$/, '');
      const trailing = token.slice(cleaned.length);
      if (isSafeExternalUrl(cleaned)) {
        nodes.push(
          <a
            key={key++}
            href={cleaned}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#244B3A] font-medium underline underline-offset-4 decoration-[#244B3A]/50 hover:decoration-[#244B3A] transition-colors break-all"
          >
            {cleaned}
          </a>,
        );
        if (trailing) {
          nodes.push(trailing);
        }
      } else {
        nodes.push(token);
      }
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function parsePlaceBlock(lines: string[]): PlaceCardData | null {
  const data: PlaceCardData = { name: '', extras: [] };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      if (!data.name) {
        data.name = line;
      } else {
        data.extras.push({ label: 'ข้อมูลเพิ่มเติม', value: line });
      }
      continue;
    }

    const label = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (!value) continue;

    const lowerLabel = label.toLowerCase();
    if (
      label === 'ชื่อสถานที่' ||
      label === 'ชื่อร้าน' ||
      label === 'สถานที่' ||
      lowerLabel === 'name'
    ) {
      data.name = value;
    } else if (label.includes('ที่ตั้ง') || label.includes('ที่อยู่') || lowerLabel === 'address') {
      data.address = value;
    } else if (
      label.includes('เปิด') ||
      label.includes('เวลา') ||
      lowerLabel === 'hours'
    ) {
      data.hours = value;
    } else if (label.includes('ค่าเข้า') || label.includes('ราคา')) {
      data.fee = value;
    } else if (
      label.includes('โทร') ||
      label.includes('เบอร์') ||
      lowerLabel === 'phone' ||
      lowerLabel === 'tel'
    ) {
      data.phone = value;
    } else if (
      lowerLabel.includes('facebook') ||
      lowerLabel.includes('fb') ||
      lowerLabel.includes('instagram') ||
      label.includes('เว็บไซต์') ||
      label.includes('เพจ')
    ) {
      data.social = value;
    } else if (
      label.includes('พิกัด') ||
      lowerLabel.includes('gps') ||
      lowerLabel.includes('map')
    ) {
      data.mapsUrl = value;
    } else {
      data.extras.push({ label, value });
    }
  }

  if (
    !data.name &&
    !data.address &&
    !data.hours &&
    !data.phone &&
    !data.mapsUrl &&
    data.extras.length === 0
  ) {
    return null;
  }

  return data;
}

type Block =
  | { type: 'h2'; id: string; text: string; dayTag?: string; dayRest?: string }
  | { type: 'h3'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'images'; items: ImageItem[] }
  | { type: 'place'; data: PlaceCardData }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'paragraph'; text: string; align: 'left' | 'center' };

function parseDayHeading(text: string): { dayTag?: string; dayRest?: string } {
  const match = /^(Day\s*\d+|วันที่\s*\d+)\s*[:\-–—]?\s*(.*)$/i.exec(text.trim());
  if (!match) return {};
  const normalizedTag = match[1].replace(/^day\s*/i, 'DAY ').replace(/^วันที่\s*/, 'วันที่ ');
  return {
    dayTag: normalizedTag.trim(),
    dayRest: match[2].trim(),
  };
}

function parseContentBlocks(raw: string): Block[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraphLines: string[] = [];
  let ulItems: string[] = [];
  let olItems: string[] = [];
  let pendingImages: ImageItem[] = [];
  let inPlaceBlock = false;
  let placeLines: string[] = [];
  let h2Counter = 0;

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: paragraphLines.join(' ').trim(),
        align: 'left',
      });
      paragraphLines = [];
    }
  };

  const flushUl = () => {
    if (ulItems.length > 0) {
      blocks.push({ type: 'ul', items: [...ulItems] });
      ulItems = [];
    }
  };

  const flushOl = () => {
    if (olItems.length > 0) {
      blocks.push({ type: 'ol', items: [...olItems] });
      olItems = [];
    }
  };

  const flushImages = () => {
    if (pendingImages.length > 0) {
      blocks.push({ type: 'images', items: [...pendingImages] });
      pendingImages = [];
    }
  };

  const flushTextLists = () => {
    flushParagraph();
    flushUl();
    flushOl();
  };

  const flushAll = () => {
    flushTextLists();
    flushImages();
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (inPlaceBlock) {
      if (line === ':::') {
        const parsed = parsePlaceBlock(placeLines);
        if (parsed) {
          blocks.push({ type: 'place', data: parsed });
        }
        inPlaceBlock = false;
        placeLines = [];
      } else {
        placeLines.push(rawLine);
      }
      continue;
    }

    if (line === ':::place' || line.startsWith(':::place ')) {
      flushAll();
      inPlaceBlock = true;
      placeLines = [];
      const inlineTitle = line.slice(':::place'.length).trim();
      if (inlineTitle) {
        placeLines.push(`ชื่อสถานที่ : ${inlineTitle}`);
      }
      continue;
    }

    if (!line) {
      // Blank lines separate paragraphs/lists, but allow consecutive images separated by blank lines to stay grouped in a clean photo grid!
      flushTextLists();
      continue;
    }

    const imgMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line);
    if (imgMatch) {
      flushTextLists();
      const alt = imgMatch[1].trim();
      const url = imgMatch[2].trim();
      if (isSafeImageUrl(url)) {
        pendingImages.push({ alt, url });
      }
      continue;
    }

    if (isBareImageUrl(line)) {
      flushTextLists();
      pendingImages.push({ alt: '', url: line });
      continue;
    }

    // Any non-image content flushes pending image group first
    flushImages();

    if (line.startsWith('::center::')) {
      flushTextLists();
      const centeredText = line.slice('::center::'.length).trim();
      if (centeredText) {
        blocks.push({ type: 'paragraph', text: centeredText, align: 'center' });
      }
      continue;
    }

    if (line.startsWith('### ')) {
      flushTextLists();
      blocks.push({ type: 'h3', text: line.slice(4).trim() });
      continue;
    }

    if (line.startsWith('## ')) {
      flushTextLists();
      const headingText = line.slice(3).trim();
      const { dayTag, dayRest } = parseDayHeading(headingText);
      blocks.push({
        type: 'h2',
        id: `story-section-${h2Counter++}`,
        text: headingText,
        dayTag,
        dayRest,
      });
      continue;
    }

    if (line.startsWith('> ')) {
      flushTextLists();
      blocks.push({ type: 'quote', text: line.slice(2).trim() });
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('• ')) {
      flushParagraph();
      flushOl();
      ulItems.push(line.slice(2).trim());
      continue;
    }

    const orderedMatch = /^\d+\.\s+(.+)$/.exec(line);
    if (orderedMatch) {
      flushParagraph();
      flushUl();
      olItems.push(orderedMatch[1].trim());
      continue;
    }

    flushUl();
    flushOl();
    paragraphLines.push(line);
  }

  if (inPlaceBlock && placeLines.length > 0) {
    const parsed = parsePlaceBlock(placeLines);
    if (parsed) {
      blocks.push({ type: 'place', data: parsed });
    }
  }

  flushAll();

  return blocks;
}

export function extractContentHeadings(raw: string): ContentHeading[] {
  return parseContentBlocks(raw)
    .filter((b): b is Extract<Block, { type: 'h2' }> => b.type === 'h2')
    .map((b) => ({ id: b.id, text: b.text }));
}

function PlaceInfoCard({ data }: { data: PlaceCardData }) {
  const safeMapsUrl =
    data.mapsUrl && isSafeExternalUrl(data.mapsUrl) ? data.mapsUrl.trim() : '';
  const safeSocialUrl =
    data.social && isSafeExternalUrl(data.social) ? data.social.trim() : '';
  const sanitizedTel = data.phone ? data.phone.replace(/[^0-9+]/g, '') : '';

  return (
    <aside className="my-7 rounded-2xl border border-[#DFDBD0] bg-[#F7F5EF] p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#E5E0D5]">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#DDE8DD] text-[#244B3A] flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#5C615C]">
              ข้อมูลสถานที่
            </p>
            <h4 className="font-editorial text-lg font-semibold text-[#252525] leading-snug">
              {data.name || 'รายละเอียดสถานที่'}
            </h4>
          </div>
        </div>

        {safeMapsUrl && (
          <a
            href={safeMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#244B3A] hover:bg-[#1B3A2C] text-[#FAFAF7] text-xs font-medium transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>เปิดพิกัด Google Maps</span>
          </a>
        )}
      </div>

      <dl className="mt-4 space-y-2.5 text-sm text-[#2D312D]">
        {data.address && (
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-[#244B3A] shrink-0 mt-0.5" />
            <div>
              <dt className="inline font-semibold text-[#252525]">ที่ตั้ง : </dt>
              <dd className="inline">{data.address}</dd>
            </div>
          </div>
        )}

        {data.hours && (
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-[#244B3A] shrink-0 mt-0.5" />
            <div>
              <dt className="inline font-semibold text-[#252525]">เวลาเปิด-ปิด : </dt>
              <dd className="inline">{data.hours}</dd>
            </div>
          </div>
        )}

        {data.fee && (
          <div className="flex items-start gap-2.5">
            <Ticket className="w-4 h-4 text-[#244B3A] shrink-0 mt-0.5" />
            <div>
              <dt className="inline font-semibold text-[#252525]">ค่าเข้าชม : </dt>
              <dd className="inline">{data.fee}</dd>
            </div>
          </div>
        )}

        {data.phone && (
          <div className="flex items-start gap-2.5">
            <Phone className="w-4 h-4 text-[#244B3A] shrink-0 mt-0.5" />
            <div>
              <dt className="inline font-semibold text-[#252525]">โทรศัพท์ : </dt>
              <dd className="inline">
                {sanitizedTel ? (
                  <a
                    href={`tel:${sanitizedTel}`}
                    className="text-[#244B3A] font-medium hover:underline"
                  >
                    {data.phone}
                  </a>
                ) : (
                  data.phone
                )}
              </dd>
            </div>
          </div>
        )}

        {data.social && (
          <div className="flex items-start gap-2.5">
            <Globe className="w-4 h-4 text-[#244B3A] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <dt className="inline font-semibold text-[#252525]">Facebook / เว็บไซต์ : </dt>
              <dd className="inline break-words">
                {safeSocialUrl ? (
                  <a
                    href={safeSocialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#244B3A] font-medium hover:underline break-all"
                  >
                    <span>{safeSocialUrl.replace(/^https?:\/\/(www\.)?/, '')}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  data.social
                )}
              </dd>
            </div>
          </div>
        )}

        {data.extras.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2.5 pl-6">
            <div>
              <dt className="inline font-semibold text-[#252525]">{item.label} : </dt>
              <dd className="inline">{renderInlineFormatting(item.value)}</dd>
            </div>
          </div>
        ))}
      </dl>
    </aside>
  );
}

export function RichContentRenderer({ content, onImageClick }: RichContentRendererProps) {
  const blocks = parseContentBlocks(content);

  return (
    <div className="space-y-6 text-[16px] sm:text-[17px] leading-[1.85] text-[#2D312D]">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'h2':
            if (block.dayTag) {
              return (
                <div
                  key={index}
                  id={block.id}
                  className="scroll-mt-24 pt-8 pb-2 border-t border-[#E5E2DA] first:border-t-0 first:pt-2"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#244B3A] text-[#FAFAF7] text-xs font-semibold tracking-[0.12em]">
                      {block.dayTag}
                    </span>
                    <h2 className="font-editorial text-2xl sm:text-[28px] font-semibold text-[#252525] leading-snug tracking-tight">
                      {block.dayRest || block.text}
                    </h2>
                  </div>
                </div>
              );
            }
            return (
              <h2
                key={index}
                id={block.id}
                className="scroll-mt-24 font-editorial text-2xl sm:text-[28px] font-semibold text-[#252525] pt-5 pb-1 leading-snug tracking-tight"
              >
                {block.text}
              </h2>
            );

          case 'h3':
            return (
              <h3
                key={index}
                className="font-editorial text-xl sm:text-[23px] font-semibold text-[#244B3A] pt-5 leading-snug"
              >
                {block.text}
              </h3>
            );

          case 'quote':
            return (
              <blockquote
                key={index}
                className="my-8 py-6 px-6 sm:px-8 border-y border-[#D3DED3] bg-[#DDE8DD]/35 text-center"
              >
                <p className="font-editorial text-lg sm:text-xl text-[#244B3A] leading-relaxed">
                  “{renderInlineFormatting(block.text)}”
                </p>
              </blockquote>
            );

          case 'ul':
            return (
              <ul
                key={index}
                className="space-y-2.5 pl-6 list-disc marker:text-[#244B3A]"
              >
                {block.items.map((item, i) => (
                  <li key={i} className="leading-[1.8]">
                    {renderInlineFormatting(item)}
                  </li>
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol
                key={index}
                className="space-y-2.5 pl-6 list-decimal marker:text-[#244B3A] marker:font-medium"
              >
                {block.items.map((item, i) => (
                  <li key={i} className="leading-[1.8]">
                    {renderInlineFormatting(item)}
                  </li>
                ))}
              </ol>
            );

          case 'place':
            return <PlaceInfoCard key={index} data={block.data} />;

          case 'images': {
            if (block.items.length === 1) {
              const img = block.items[0];
              return (
                <figure key={index} className="my-8">
                  <button
                    type="button"
                    onClick={() => onImageClick?.(img.url, img.alt)}
                    className={`block w-full overflow-hidden rounded-2xl bg-[#EAE6DC] border border-[#E5E2DA] ${
                      onImageClick ? 'cursor-zoom-in' : 'cursor-default'
                    }`}
                  >
                    <SafeImage
                      src={img.url}
                      alt={img.alt || 'ภาพประกอบการเดินทาง'}
                      fallbackTitle={img.alt}
                      className="w-full max-h-[560px] object-cover transition-transform duration-300 hover:scale-[1.015]"
                    />
                  </button>
                  {img.alt && (
                    <figcaption className="mt-3 text-center text-xs sm:text-sm text-[#5C615C] leading-relaxed">
                      {img.alt}
                    </figcaption>
                  )}
                </figure>
              );
            }

            const isOddThree = block.items.length === 3;
            return (
              <div
                key={index}
                className="my-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5"
              >
                {block.items.map((img, i) => {
                  const spanWide = isOddThree && i === 0;
                  return (
                    <figure
                      key={`${img.url}-${i}`}
                      className={spanWide ? 'sm:col-span-2' : ''}
                    >
                      <button
                        type="button"
                        onClick={() => onImageClick?.(img.url, img.alt)}
                        className={`block w-full overflow-hidden rounded-2xl bg-[#EAE6DC] border border-[#E5E2DA] ${
                          spanWide ? 'aspect-[16/9]' : 'aspect-[4/3]'
                        } ${onImageClick ? 'cursor-zoom-in' : 'cursor-default'}`}
                      >
                        <SafeImage
                          src={img.url}
                          alt={img.alt || `ภาพประกอบการเดินทาง ${i + 1}`}
                          fallbackTitle={img.alt}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                        />
                      </button>
                      {img.alt && (
                        <figcaption className="mt-2 text-center text-xs text-[#5C615C] leading-relaxed">
                          {img.alt}
                        </figcaption>
                      )}
                    </figure>
                  );
                })}
              </div>
            );
          }

          case 'paragraph':
          default:
            return (
              <p
                key={index}
                className={`leading-[1.9] ${
                  block.align === 'center' ? 'text-center text-[#244B3A] font-medium' : ''
                }`}
              >
                {renderInlineFormatting(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}
