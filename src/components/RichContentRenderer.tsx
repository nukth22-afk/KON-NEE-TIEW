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

function renderInlineFormatting(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex =
    /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
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
            className="text-[#244B3A] font-medium underline underline-offset-4 decoration-[#244B3A]/50 hover:decoration-[#244B3A] transition-colors"
          >
            {linkMatch[1]}
          </a>,
        );
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

type Block =
  | { type: 'h2'; id: string; text: string }
  | { type: 'h3'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'image'; alt: string; url: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'paragraph'; text: string; align: 'left' | 'center' };

function parseContentBlocks(raw: string): Block[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraphLines: string[] = [];
  let ulItems: string[] = [];
  let olItems: string[] = [];
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

  const flushAll = () => {
    flushParagraph();
    flushUl();
    flushOl();
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushAll();
      continue;
    }

    const imgMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line);
    if (imgMatch) {
      flushAll();
      const alt = imgMatch[1].trim();
      const url = imgMatch[2].trim();
      if (isSafeImageUrl(url)) {
        blocks.push({ type: 'image', alt, url });
      }
      continue;
    }

    if (line.startsWith('::center::')) {
      flushAll();
      const centeredText = line.slice('::center::'.length).trim();
      if (centeredText) {
        blocks.push({ type: 'paragraph', text: centeredText, align: 'center' });
      }
      continue;
    }

    if (line.startsWith('### ')) {
      flushAll();
      blocks.push({ type: 'h3', text: line.slice(4).trim() });
      continue;
    }

    if (line.startsWith('## ')) {
      flushAll();
      blocks.push({
        type: 'h2',
        id: `story-section-${h2Counter++}`,
        text: line.slice(3).trim(),
      });
      continue;
    }

    if (line.startsWith('> ')) {
      flushAll();
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

  flushAll();

  return blocks;
}

export function extractContentHeadings(raw: string): ContentHeading[] {
  return parseContentBlocks(raw)
    .filter((b): b is Extract<Block, { type: 'h2' }> => b.type === 'h2')
    .map((b) => ({ id: b.id, text: b.text }));
}

export function RichContentRenderer({ content, onImageClick }: RichContentRendererProps) {
  const blocks = parseContentBlocks(content);

  return (
    <div className="space-y-6 text-[16px] sm:text-[17px] leading-[1.85] text-[#2D312D]">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'h2':
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
                className="font-editorial text-xl sm:text-[22px] font-semibold text-[#252525] pt-4 leading-snug"
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

          case 'image':
            return (
              <figure key={index} className="my-9">
                <button
                  type="button"
                  onClick={() => onImageClick?.(block.url, block.alt)}
                  className={`block w-full overflow-hidden rounded-2xl bg-[#EAE6DC] border border-[#E5E2DA] ${
                    onImageClick ? 'cursor-zoom-in' : 'cursor-default'
                  }`}
                >
                  <SafeImage
                    src={block.url}
                    alt={block.alt || 'ภาพประกอบการเดินทาง'}
                    fallbackTitle={block.alt}
                    className="w-full max-h-[560px] object-cover transition-transform duration-300 hover:scale-[1.015]"
                  />
                </button>
                {block.alt && (
                  <figcaption className="mt-3 text-center text-xs sm:text-sm text-[#5C615C] leading-relaxed">
                    {block.alt}
                  </figcaption>
                )}
              </figure>
            );

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
