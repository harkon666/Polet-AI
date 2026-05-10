import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
});

globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});

import { useLocale } from './use-locale';

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('lang');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useLocale', () => {
  test('defaults to English when no stored locale and navigator is non-Indonesian', () => {
    Object.defineProperty(window.navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });

    const { result } = renderHook(() => useLocale());

    expect(result.current.locale).toBe('en');
    expect(result.current.t('hero.cta.primary')).toBe('Start building');
  });

  test('detects Indonesian locale from navigator.language', () => {
    Object.defineProperty(window.navigator, 'language', {
      value: 'id-ID',
      configurable: true,
    });

    const { result } = renderHook(() => useLocale());

    expect(result.current.locale).toBe('id');
    expect(result.current.t('hero.cta.primary')).toBe('Mulai bangun');
  });

  test('reads stored locale from localStorage even if navigator says otherwise', () => {
    window.localStorage.setItem('polet.locale', 'id');
    Object.defineProperty(window.navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });

    const { result } = renderHook(() => useLocale());

    expect(result.current.locale).toBe('id');
  });

  test('setLocale persists to localStorage and updates html lang attribute', () => {
    Object.defineProperty(window.navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });

    const { result } = renderHook(() => useLocale());

    act(() => {
      result.current.setLocale('id');
    });

    expect(result.current.locale).toBe('id');
    expect(window.localStorage.getItem('polet.locale')).toBe('id');
    expect(document.documentElement.getAttribute('lang')).toBe('id');
  });

  test('t() returns Indonesian string when locale is id', () => {
    window.localStorage.setItem('polet.locale', 'id');
    const { result } = renderHook(() => useLocale());

    expect(result.current.t('hero.kicker')).toBe('Lapisan wallet rahasia untuk AI agent');
    expect(result.current.t('manifesto.kicker')).toBe('Masalah delegasi');
    expect(result.current.t('cta.primary')).toBe('Buka App');
  });

  test('t() returns English string when locale is en', () => {
    window.localStorage.setItem('polet.locale', 'en');
    const { result } = renderHook(() => useLocale());

    expect(result.current.t('hero.kicker')).toBe('Confidential wallet layer for AI agents');
    expect(result.current.t('manifesto.kicker')).toBe('The delegation problem');
    expect(result.current.t('cta.primary')).toBe('Open App');
  });

  test('multiple useLocale instances stay in sync via custom event', () => {
    Object.defineProperty(window.navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });

    const { result: a } = renderHook(() => useLocale());
    const { result: b } = renderHook(() => useLocale());

    expect(a.current.locale).toBe('en');
    expect(b.current.locale).toBe('en');

    act(() => {
      a.current.setLocale('id');
    });

    // Both instances should reflect the change
    expect(a.current.locale).toBe('id');
    expect(b.current.locale).toBe('id');
  });
});
