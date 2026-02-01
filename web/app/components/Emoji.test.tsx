import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Emoji, getEmojiUrl } from './Emoji';

const R2_BASE = 'https://td-uploads-public.tampa.dev/emoji';

// ═══════════════════════════════════════════════════════════════════════════
// getEmojiUrl (codepoint → R2 image URL resolution)
// ═══════════════════════════════════════════════════════════════════════════

describe('getEmojiUrl', () => {
  it('resolves a simple emoji to its R2 URL', () => {
    // 🏆 = U+1F3C6
    const url = getEmojiUrl('🏆');
    expect(url).toBe(`${R2_BASE}/1f3c6.webp`);
  });

  it('resolves a multi-codepoint emoji (ZWJ sequence)', () => {
    // 👨‍💻 = U+1F468 U+200D U+1F4BB
    const url = getEmojiUrl('👨‍💻');
    expect(url).toBe(`${R2_BASE}/1f468-200d-1f4bb.webp`);
  });

  it('handles emoji with FE0F variation selector in the string', () => {
    // ©️ may appear as U+00A9 U+FE0F — FE0F is stripped for the lookup key
    // and the map resolves to the correct filename (which may include fe0f)
    const url = getEmojiUrl('\u00A9\uFE0F');
    expect(url).not.toBeNull();
    expect(url).toMatch(/^https:\/\/td-uploads-public\.tampa\.dev\/emoji\/.+\.webp$/);
  });

  it('handles emoji without FE0F variation selector', () => {
    // © as just U+00A9 (no FE0F) should still resolve
    const url = getEmojiUrl('\u00A9');
    expect(url).not.toBeNull();
    expect(url).toMatch(/^https:\/\/td-uploads-public\.tampa\.dev\/emoji\/.+\.webp$/);
  });

  it('resolves flag emoji (regional indicator pairs)', () => {
    // 🇺🇸 = U+1F1FA U+1F1F8
    const url = getEmojiUrl('🇺🇸');
    expect(url).toBe(`${R2_BASE}/1f1fa-1f1f8.webp`);
  });

  it('resolves skin tone variant emoji', () => {
    // 🎅🏽 = U+1F385 U+1F3FD
    const url = getEmojiUrl('🎅🏽');
    expect(url).toBe(`${R2_BASE}/1f385-1f3fd.webp`);
  });

  it('returns null for an unknown/unsupported string', () => {
    const url = getEmojiUrl('abc');
    expect(url).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// <Emoji> component rendering
// ═══════════════════════════════════════════════════════════════════════════

describe('Emoji component', () => {
  it('renders an <img> for a known emoji', () => {
    const { container } = render(<Emoji emoji="🏆" />);
    const img = container.querySelector('img');

    expect(img).not.toBeNull();
    expect(img!.src).toContain('/emoji/1f3c6.webp');
    expect(img!.alt).toBe('🏆');
  });

  it('uses default size of 20', () => {
    const { container } = render(<Emoji emoji="🏆" />);
    const img = container.querySelector('img')!;

    expect(img.width).toBe(20);
    expect(img.height).toBe(20);
  });

  it('respects custom size prop', () => {
    const { container } = render(<Emoji emoji="🏆" size={64} />);
    const img = container.querySelector('img')!;

    expect(img.width).toBe(64);
    expect(img.height).toBe(64);
  });

  it('applies custom className', () => {
    const { container } = render(<Emoji emoji="🏆" className="drop-shadow-lg" />);
    const img = container.querySelector('img')!;

    expect(img.className).toContain('drop-shadow-lg');
    expect(img.className).toContain('inline-block');
  });

  it('sets loading="lazy" and draggable="false"', () => {
    const { container } = render(<Emoji emoji="🏆" />);
    const img = container.querySelector('img')!;

    expect(img.loading).toBe('lazy');
    expect(img.getAttribute('draggable')).toBe('false');
  });

  it('renders a <span> fallback for an unknown emoji', () => {
    const { container } = render(<Emoji emoji="xyz_not_an_emoji" />);

    expect(container.querySelector('img')).toBeNull();
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span!.textContent).toBe('xyz_not_an_emoji');
  });

  it('img onError replaces the image with a native emoji span', () => {
    const { container } = render(<Emoji emoji="🏆" size={32} />);
    const img = container.querySelector('img')!;

    // Simulate image load failure
    fireEvent.error(img);

    // The img should be replaced by a span
    expect(container.querySelector('img')).toBeNull();
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span!.textContent).toBe('🏆');
    expect(span!.style.fontSize).toBe('32px');
  });
});
