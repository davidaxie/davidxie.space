/**
 * The one place that asks the OS whether this visitor wants less motion.
 *
 * Four files were each carrying their own copy of the same three-line
 * matchMedia read (SmoothScroll, CameraController, CosmicScene, and the
 * scroll-jump call sites). They agreed, which is exactly why the drift was
 * invisible — the comments above two of those copies claimed TiltCard used the
 * same pattern, and it never did: TiltCard only ever queried `(pointer: coarse)`.
 * One export, one query string, nothing to fall out of sync.
 *
 * No 'use client' directive on purpose. This is a plain module with no JSX and
 * no hooks, so it is importable from either environment; both functions guard
 * on `typeof window` and answer `false` / `'auto'` during SSR.
 */

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Live read — evaluated at the moment it is called, not cached.
 *
 * Callers that need a value stable for the lifetime of a component (the camera
 * intro, the calm-on-read damper) still read it once into `useState`, because
 * flipping those mid-session would tear a running animation. Callers that fire
 * on a discrete user action (a click that scrolls the page) should call it at
 * event time, so toggling the OS setting takes effect on the very next click.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.(QUERY).matches ?? false;
}

/**
 * The `behavior` to hand `scrollIntoView` / `scrollTo` for a programmatic jump.
 *
 * CSSOM-View is explicit that an author-supplied `behavior` option beats the
 * `scroll-behavior` CSS property, so globals.css's `scroll-behavior: auto
 * !important` inside the reduced-motion block does NOT reach a call that passes
 * `behavior: 'smooth'`. That guard only ever covered CSS-initiated scrolling.
 *
 * This path is not an edge case for these visitors — it is the ONLY path they
 * take: SmoothScroll.tsx returns early on this same preference, so `lenis` is
 * null and every in-page jump falls to the `scrollIntoView` branch. Without
 * this helper a single nav click animates the viewport across up to ~12,000px.
 */
export function jumpScrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
