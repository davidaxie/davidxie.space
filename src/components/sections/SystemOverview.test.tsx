import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { SystemOverview } from './SystemOverview';

/**
 * The landing screen has exactly one piece of visible copy: a 9px mono hint at
 * the bottom of the first viewport. Everything else on that screen is the WebGL
 * scene. So if the hint's choreography is mistimed, the site loads looking
 * empty — which is what it did.
 *
 * The old timings all ran from MOUNT, but the page is covered by LoadingScreen's
 * opaque `fixed inset-0 z-[100]` overlay for roughly the first 3.9 seconds
 * (2500ms to stage 'progress' + 400ms to 'exit' + 850ms to visible=false + a
 * 150ms fade). The hint's `delay: 2.5, duration: 1.0` fade-in therefore played
 * out entirely behind that overlay, and its 6000ms auto-dismiss started counting
 * against a page nobody could see yet.
 *
 * These tests pin the fix: the clock is anchored to the overlay actually
 * LEAVING THE DOM, not to a mirrored copy of LoadingScreen's constants.
 *
 * They use real timers on purpose. framer-motion drives opacity off its own
 * rAF loop, and faking that clock would test the mock rather than the fade.
 * The waits are bounded by the component's own constants (0.4s delay + 1.0s
 * fade), not by a guess.
 */

const HINT_TEXT = /click a planet/i;

/** Stand-in for LoadingScreen's overlay. Only the selector contract matters:
 *  role="status" + aria-label="Loading" is the same pair globals.css keys its
 *  `scripting: none` fallback to. */
function mountOverlay(): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'Loading');
  document.body.appendChild(el);
  return el;
}

/** The animated wrapper framer writes inline opacity onto. */
function hintLayer(): HTMLElement {
  const el = screen.getByText(HINT_TEXT).closest('[style*="opacity"]');
  if (!el) throw new Error('hint wrapper did not render');
  return el as HTMLElement;
}

afterEach(() => {
  document.querySelectorAll('[role="status"][aria-label="Loading"]').forEach((el) => el.remove());
});

describe('SystemOverview hint', () => {
  it('stays invisible while the loading overlay still covers the page', async () => {
    mountOverlay();
    render(<SystemOverview />);

    // 2900ms is a measured sample point, not a round number. Rendering the OLD
    // props (initial 0 -> animate 1, delay 2.5, duration 1.0) in this same
    // environment reads opacity "0" at 1600ms, "0.57" at 2900ms and "1" at
    // 3600ms — every one of those frames landing under an overlay that does not
    // lift until ~3900ms. So a sample before ~2600ms proves nothing, and this
    // one sits squarely inside the fade the visitor never got to see.
    await new Promise((r) => setTimeout(r, 2900));
    expect(hintLayer().style.opacity).toBe('0');
  });

  it('fades in once the overlay leaves the DOM', async () => {
    const overlay = mountOverlay();
    render(<SystemOverview />);
    expect(hintLayer().style.opacity).toBe('0');

    await act(async () => {
      overlay.remove();
    });

    await waitFor(
      () => expect(Number(hintLayer().style.opacity)).toBeGreaterThan(0),
      { timeout: 2500 },
    );
  });

  it('does not burn its one dismissal on a click made during loading', async () => {
    const overlay = mountOverlay();
    render(<SystemOverview />);

    // An impatient visitor clicking a black screen. Under the old code the
    // dismiss listeners were armed at mount, so this consumed the hint before
    // it had ever been on screen.
    await act(async () => {
      document.body.click();
    });

    await act(async () => {
      overlay.remove();
    });

    await waitFor(
      () => expect(Number(hintLayer().style.opacity)).toBeGreaterThan(0),
      { timeout: 2500 },
    );
  });

  it('renders the page h1 for screen readers regardless of the hint', () => {
    mountOverlay();
    render(<SystemOverview />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
