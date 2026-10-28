import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ScrollProgressProvider, useScrollProgress } from './useScrollProgress';

// ── Faking document scroll in jsdom ──
// jsdom parses but never lays out, so `documentElement.scrollTop` is pinned at 0
// and `scrollHeight`/`clientHeight` are getter-only properties that always report
// 0. Redefining them as own data properties is the only way to hand the provider
// a scroll position; they are `configurable` so afterEach can delete them again
// and let the real prototype getters resurface for the next test.
const SCROLL_PROPS = ['scrollTop', 'scrollHeight', 'clientHeight'] as const;

function setDocumentScroll(scrollTop: number, scrollHeight = 3000, clientHeight = 1000) {
  const el = document.documentElement;
  Object.defineProperty(el, 'scrollTop', { value: scrollTop, configurable: true, writable: true });
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true, writable: true });
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true, writable: true });
}

/** Move the document and fire the event the provider actually listens for. */
function scrollTo(scrollTop: number, scrollHeight = 3000, clientHeight = 1000) {
  setDocumentScroll(scrollTop, scrollHeight, clientHeight);
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

function wrapper({ children }: { children: ReactNode }) {
  return <ScrollProgressProvider>{children}</ScrollProgressProvider>;
}

function renderScrollProgress() {
  return renderHook(() => useScrollProgress(), { wrapper });
}

afterEach(() => {
  const el = document.documentElement as unknown as Record<string, unknown>;
  for (const prop of SCROLL_PROPS) delete el[prop];
  vi.restoreAllMocks();
});

describe('useScrollProgress', () => {
  it('reads the current scroll position once on mount', () => {
    // 750 of a 2000px scrollable range (3000 content − 1000 viewport).
    setDocumentScroll(750);
    const { result } = renderScrollProgress();

    expect(result.current.get()).toBe(0.375);
    expect(result.current.progressRef.current).toBe(0.375);
  });

  it('pushes progress to subscribers and updates the ref on scroll', () => {
    setDocumentScroll(0);
    const { result } = renderScrollProgress();

    const received: number[] = [];
    result.current.subscribe((p) => received.push(p));

    scrollTo(500);
    scrollTo(1500);

    // The mount-time read happened before subscribing, so only the two
    // post-subscription scrolls are delivered.
    expect(received).toEqual([0.25, 0.75]);
    expect(result.current.get()).toBe(0.75);
    expect(result.current.progressRef.current).toBe(0.75);
  });

  it('stops delivering to a subscriber once it unsubscribes', () => {
    setDocumentScroll(0);
    const { result } = renderScrollProgress();

    const kept = vi.fn();
    const dropped = vi.fn();
    result.current.subscribe(kept);
    const unsubscribe = result.current.subscribe(dropped);

    scrollTo(1000);
    unsubscribe();
    scrollTo(2000);

    expect(dropped).toHaveBeenCalledTimes(1);
    expect(dropped).toHaveBeenCalledWith(0.5);
    // The surviving subscriber is untouched by the other one's removal.
    expect(kept).toHaveBeenCalledTimes(2);
    expect(kept).toHaveBeenLastCalledWith(1);
  });

  it('clamps progress into 0–1 when the document overscrolls', () => {
    setDocumentScroll(0);
    const { result } = renderScrollProgress();

    const received: number[] = [];
    result.current.subscribe((p) => received.push(p));

    scrollTo(99999); // rubber-band past the bottom
    scrollTo(-500); // rubber-band past the top

    expect(received).toEqual([1, 0]);
  });

  it('reports 0 instead of dividing by zero on an unscrollable page', () => {
    // Content exactly fills the viewport → scrollHeight − clientHeight === 0.
    setDocumentScroll(0, 1000, 1000);
    const { result } = renderScrollProgress();

    expect(result.current.get()).toBe(0);

    const received: number[] = [];
    result.current.subscribe((p) => received.push(p));
    scrollTo(0, 1000, 1000);

    expect(received).toEqual([0]);
    expect(Number.isNaN(result.current.get())).toBe(false);
  });

  it('detaches the scroll listener on unmount', () => {
    setDocumentScroll(0);
    const { result, unmount } = renderScrollProgress();

    const cb = vi.fn();
    result.current.subscribe(cb);

    unmount();
    scrollTo(1000);

    expect(cb).not.toHaveBeenCalled();
  });

  it('throws when used outside ScrollProgressProvider', () => {
    // React logs the render error to console.error before rethrowing it.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useScrollProgress())).toThrow(
      /must be used within ScrollProgressProvider/
    );
  });
});
