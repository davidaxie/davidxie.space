import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { sectionIds, type SectionId } from '@/lib/constants';
import { useSectionInView } from './useSectionInView';

// ── IntersectionObserver stub ──
// jsdom ships no IntersectionObserver at all, so the hook's effect would throw
// on construction. This stub records every observer the hook builds and exposes
// its callback, which is the only way to drive the hook from a test: there is no
// layout in jsdom, so nothing would ever "intersect" on its own.
interface ObserverRecord {
  instance: IntersectionObserver;
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observed: Element[];
  disconnectCount: number;
}

let observers: ObserverRecord[] = [];

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '';
  readonly thresholds: readonly number[] = [];
  private readonly record: ObserverRecord;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.record = { instance: this, callback, options, observed: [], disconnectCount: 0 };
    observers.push(this.record);
  }

  observe(target: Element) {
    this.record.observed.push(target);
  }

  unobserve(target: Element) {
    this.record.observed = this.record.observed.filter((el) => el !== target);
  }

  disconnect() {
    this.record.disconnectCount += 1;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

/** Find the observer watching the element with the given id. */
function observerFor(id: string): ObserverRecord {
  const record = observers.find((o) => o.observed.some((el) => el.id === id));
  if (!record) throw new Error(`no observer registered for #${id}`);
  return record;
}

/**
 * Deliver a single entry at the given visibility ratio, mimicking what the real
 * observer would hand back. `isIntersecting` is derived rather than passed in
 * because the browser derives it the same way — it is true for *any* non-zero
 * overlap, including the 0.25 sliver of a section on its way out. Tests that
 * set the flag by hand cannot express that case at all, which is exactly the
 * case the nav highlight used to get wrong.
 */
function fireIntersection(id: string, intersectionRatio: number) {
  const record = observerFor(id);
  const entry = {
    isIntersecting: intersectionRatio > 0,
    intersectionRatio,
    target: document.getElementById(id),
  } as unknown as IntersectionObserverEntry;

  act(() => {
    record.callback([entry], record.instance);
  });
}

// `readonly SectionId[]`, not `readonly string[]`. As plain strings, the
// fixture ids below outlived the sections they named: when the page was
// restructured these tests kept mounting a section that no longer existed and
// failed at runtime with a confusing count mismatch, rather than failing to
// compile at the one line that was actually wrong.
function mountSections(ids: readonly SectionId[]) {
  for (const id of ids) {
    const el = document.createElement('section');
    el.id = id;
    document.body.appendChild(el);
  }
}

beforeEach(() => {
  observers = [];
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('useSectionInView', () => {
  it('observes exactly the sections that exist in the DOM, at both threshold edges', () => {
    mountSections(['about', 'builder']);

    renderHook(() => useSectionInView());

    // One observer per *present* element — the other six section ids are
    // silently skipped rather than throwing on a null element.
    expect(observers).toHaveLength(2);
    expect(observers.flatMap((o) => o.observed.map((el) => el.id))).toEqual(['about', 'builder']);
    for (const o of observers) {
      expect(o.options).toEqual({ threshold: [0, 0.3] });
    }
  });

  it('creates one observer per section when the whole page is mounted', () => {
    mountSections(sectionIds);

    renderHook(() => useSectionInView());

    expect(observers).toHaveLength(sectionIds.length);
  });

  it('creates no observers and stays null when no sections are present', () => {
    const { result } = renderHook(() => useSectionInView());

    expect(observers).toHaveLength(0);
    expect(result.current).toBeNull();
  });

  it('returns the id of the section that scrolls into view', () => {
    mountSections(['about', 'builder']);

    const { result } = renderHook(() => useSectionInView());
    expect(result.current).toBeNull();

    fireIntersection('about', 0.6);
    expect(result.current).toBe('about');

    fireIntersection('builder', 0.6);
    expect(result.current).toBe('builder');
  });

  it('ignores a section that has only entered as a sliver', () => {
    mountSections(['about', 'builder']);

    const { result } = renderHook(() => useSectionInView());

    // The 0-edge of the threshold list fires the moment a single pixel of the
    // next section appears. Claiming the highlight there would light up a
    // section the user cannot read yet.
    fireIntersection('builder', 0.02);
    expect(result.current).toBeNull();

    fireIntersection('builder', 0.3);
    expect(result.current).toBe('builder');
  });

  it('does not let a section that is scrolling away re-claim the highlight', () => {
    mountSections(['about', 'builder']);

    const { result } = renderHook(() => useSectionInView());

    // Scroll about -> builder. Builder crosses 0.3 first (0.3vh of scroll with
    // 100vh sections); about only falls back through 0.3 much later, at 0.7vh.
    fireIntersection('about', 0.35);
    fireIntersection('builder', 0.35);
    expect(result.current).toBe('builder');

    // The late downward crossing of about. `isIntersecting` is still true here
    // — a quarter of it is on screen — so gating on that flag handed the nav
    // back to the section the user had just left, for the whole stretch where
    // builder filled the screen. The ratio gate is what rejects it.
    fireIntersection('about', 0.25);
    expect(result.current).toBe('builder');
  });

  it('keeps the last active section when one leaves the viewport', () => {
    mountSections(['about', 'builder']);

    const { result } = renderHook(() => useSectionInView());

    fireIntersection('about', 0.6);
    fireIntersection('about', 0);

    // The hook only ever *sets*, on an entry that clears the 0.3 ratio gate —
    // it never clears back to null — so the nav highlight deliberately stays
    // put during the gap where no section covers 30% of the viewport.
    expect(result.current).toBe('about');
  });

  it('disconnects every observer on unmount', () => {
    mountSections(['about', 'builder']);

    const { unmount } = renderHook(() => useSectionInView());
    expect(observers.every((o) => o.disconnectCount === 0)).toBe(true);

    unmount();

    expect(observers).toHaveLength(2);
    expect(observers.every((o) => o.disconnectCount === 1)).toBe(true);
  });
});
