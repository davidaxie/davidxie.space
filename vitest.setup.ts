import '@testing-library/jest-dom/vitest';

// ── IntersectionObserver stub ──
// jsdom does not implement it, and framer-motion's `whileInView` (SectionHeader
// and most section copy on this site) constructs one on mount — so without this
// every component test that renders a section dies in a layout effect before it
// can assert anything.
//
// Deliberately inert rather than clever: it never fires a callback, so elements
// stay in their `initial` state. That is the right default for these tests,
// which assert structure and behaviour, not animation. A test that needs an
// element to have entered the viewport should drive that explicitly.
if (!('IntersectionObserver' in globalThis)) {
  class NoopIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds: ReadonlyArray<number> = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  globalThis.IntersectionObserver = NoopIntersectionObserver;
}
