'use client';

import { useCallback } from 'react';
import { jumpScrollBehavior } from './reducedMotion';

/** Kept in sync with the landing point rendered by app/page.tsx. */
const TARGET_ID = 'main-content';

/**
 * The keyboard bypass. First focusable element on every route.
 *
 * ── Why the target is not <main> itself ──
 * The obvious target is the homepage's `<main>`, and it is the wrong one: the
 * section Navbar renders INSIDE that landmark, so focusing `<main>` puts the
 * next Tab on the first of its ten controls — the exact block the link exists
 * to skip. app/page.tsx therefore carries a zero-height landing point
 * immediately after the Navbar, and that is what `#main-content` points at.
 * (Moving the Navbar out of `<main>` would have been the other fix. It is a
 * `fixed` element nested in a `relative z-10` stacking context, so hoisting it
 * changes what it composites against for a purely cosmetic gain — not a trade
 * worth making for a landmark question.)
 *
 * ── Why there is a click handler at all ──
 * A bare `href="#main-content"` is enough on `/`. It is not enough on
 * `/portfolio` and `/portfolio/[slug]`: those pages own their own `<main>` and
 * do not carry the id, and this link lives in the root layout, so it renders
 * there too. The handler resolves the id first and falls back to the page's
 * `<main>` landmark, which is the correct destination on any route that has
 * one. Without JS the anchor degrades to native fragment navigation on `/` and
 * to a no-op elsewhere — never to a broken jump.
 *
 * The `tabindex="-1"` is applied here rather than baked into every route so
 * that a page only becomes programmatically focusable at the moment it is
 * actually skipped into; `outline` is suppressed for it in globals.css,
 * because a ring drawn around a zero-height div (or around an entire page's
 * `<main>`) is noise, not a focus indicator. The real indication is that the
 * next Tab lands in content.
 */
export function SkipLink() {
  const handleClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    const target =
      document.getElementById(TARGET_ID) ?? document.querySelector('main');
    if (!(target instanceof HTMLElement)) return;

    event.preventDefault();
    target.setAttribute('tabindex', '-1');
    target.setAttribute('data-skip-target', '');
    // Focus first and scroll second, deliberately: `focus()` performs its own
    // instant scroll unless told not to, which would beat the behavior chosen
    // on the next line.
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: jumpScrollBehavior(), block: 'start' });
  }, []);

  return (
    <a href={`#${TARGET_ID}`} className="skip-link" onClick={handleClick}>
      Skip to main content
    </a>
  );
}
