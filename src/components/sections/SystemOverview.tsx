'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { SITE_DESCRIPTION } from '@/lib/site';

// ── The hint's clock starts at the REVEAL, not at mount ──
//
// This is the only visible copy on the first screen — a 9px mono block at
// rgba(255,255,255,0.50)/0.60 — so if its choreography is mistimed the landing
// screen reads as empty. It was mistimed, and by more than its own duration.
// (Those alphas were 0.32/0.42 — 2.67:1 and 3.95:1 — until the contrast pass
// below; the copy was thus both mistimed AND unreadable when it did show.)
//
// Every timer here used to run from MOUNT, but the page is not VISIBLE at
// mount: LoadingScreen ships a `fixed inset-0 z-[100] bg-black` overlay whose
// outer element has initial={{opacity:1}}, exit={{opacity:0}} and NO animate
// prop, so it sits fully opaque for its entire mounted life. Its own
// choreography (LoadingScreen.tsx:71,78,86 + the 150ms AnimatePresence fade)
// does not uncover the page until:
//     2500ms (stage 'progress') + 400ms ('exit') + 850ms (visible=false)
//   + 150ms (fade)  ≈ 3900ms
// — the same arithmetic page.tsx mirrors to cue the intro camera flight, and
// the same quantity CanvasStage feeds useIsReading as `initialHoldMs`.
//
// Measured from mount, the old numbers therefore did this:
//   • fade-in delay 2.5s + duration 1.0s — the ENTIRE fade played from 2500ms
//     to 3500ms, behind an opaque overlay. Nobody ever saw it; the hint simply
//     existed, already at full opacity, the moment the veil lifted.
//   • the 6000ms auto-dismiss fired 2.1s after the page became visible and
//     before the intro flight had even landed (~6800ms), so the one invitation
//     on screen started leaving while the camera was still arriving. (It fell
//     over its own bug rather than vanishing outright: framer re-applies the
//     component's `transition` — delay and all — to the fade-OUT, so the exit
//     actually began at 8.5s. Relying on that is not a plan.)
//   • the scroll/click dismiss listeners were armed at mount, so an impatient
//     click on the loading screen burned the hint before it was ever shown.
//
// The fix is not to re-tune the constants — page.tsx already proves how
// brittle a second copy of LoadingScreen's timings is to keep in sync, and its
// OVERLAY_* values are module-local anyway. Instead this observes the REAL
// event: the overlay leaving the DOM. That is correct on a warm load, on a
// cold one, and on the WebGL-failure path where page.tsx's 6000ms ceiling
// pushes the reveal out past 7s — cases no fixed offset from mount can cover.
//
// The selector is LoadingScreen's role/aria-label pair, which globals.css
// already treats as a stable contract (see the `scripting: none` block there).
// Keep the three in sync.
const LOADING_OVERLAY = '[role="status"][aria-label="Loading"]';

// ── "Has the veil lifted?" as an external store ──
// Read through useSyncExternalStore rather than mirrored into state from an
// effect — the same call Navbar makes for its scroll snapshots and
// SmoothScroll makes for the Lenis instance. The DOM is the external system
// here; a setState-in-effect would be a cascading render and, worse, would
// make the first client render claim the page is uncovered when it is not.
//
// `childList` only. Attribute mutations are deliberately NOT observed: the
// overlay animates its opacity and its 25 stars every frame, and watching that
// would fire the snapshot on every one. What we care about is a single
// structural event — AnimatePresence removing the node.
function subscribeToReveal(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

/** Uncovered exactly when LoadingScreen's overlay is no longer in the DOM. */
function getRevealedSnapshot(): boolean {
  return document.querySelector(LOADING_OVERLAY) === null;
}

/** The overlay ships inside the SSR'd HTML, so the server is always covered.
 *  Matching that on the hydration pass keeps the markup identical. */
function getRevealedServerSnapshot(): boolean {
  return false;
}

/** A beat after the veil lifts, so the hint arrives rather than popping in. */
const HINT_DELAY_S = 0.4;
const HINT_FADE_IN_S = 1.0;
/** Faster than it arrived: leaving should not need announcing. */
const HINT_FADE_OUT_S = 0.6;
/** Unchanged in value — it is now 6s of VISIBLE life rather than 6s of clock. */
const HINT_LIFETIME_MS = 6000;

/**
 * Overview hub — first thing the user sees. The canvas behind shows the whole
 * solar system at a wide angle. This section provides the scroll height for
 * that camera position and the on-page text affordance for click + scroll.
 *
 * After the user takes either action (clicks a planet or scrolls), the prompt
 * fades and doesn't return for the rest of the session.
 */
export function SystemOverview() {
  // True from the moment the loading overlay actually leaves the DOM. If it was
  // never there — already unmounted, or upstream never rendered it — the page
  // is by definition uncovered and the hint starts immediately.
  const revealed = useSyncExternalStore(
    subscribeToReveal,
    getRevealedSnapshot,
    getRevealedServerSnapshot,
  );
  const [hideHint, setHideHint] = useState(false);

  // Auto-hide the hint 6 seconds after it becomes visible, or on the first
  // scroll/click after that. Armed on reveal, not on mount: an interaction the
  // visitor made while staring at a black overlay is not "they have started
  // moving", and treating it as such spends the hint before it is shown.
  useEffect(() => {
    if (!revealed) return;
    const dismiss = () => setHideHint(true);
    const t = window.setTimeout(dismiss, HINT_LIFETIME_MS);
    window.addEventListener('scroll', dismiss, { once: true, passive: true });
    window.addEventListener('click', dismiss, { once: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('scroll', dismiss);
      window.removeEventListener('click', dismiss);
    };
  }, [revealed]);

  // ── pointer-events-none on the root ──
  // page.tsx stacks the r3f canvas at `fixed inset-0 z-0` and this content at
  // `relative z-10`, so this full-viewport <section> sat directly on top of
  // the raycaster and ate every click before it reached a planet — while its
  // own copy told the visitor to "click a planet". The children were already
  // opted out individually, which hid the bug: the transparent *section* was
  // the hit target. Anything
  // below that must stay clickable re-opts in with pointer-events-auto.
  return (
    <section
      id="overview"
      className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center pointer-events-none"
    >
      {/* ── The hero is the scene, not a title card ──
          This slot used to hold a 10px "DAVID XIE" eyebrow, the positioning
          line, and an Email / LinkedIn / Portfolio row. All three are gone by
          request: the first screen is now the solar system alone.

          The <h1> stays, screen-reader-only. It is the document's only
          top-level heading, and the description string is still the exact
          sentence behind <meta name="description"> and og:description — so
          removing the visible block costs nothing in the a11y tree or the
          SERP snippet. Nothing else on the homepage supplies an <h1>.

          The three exits are not orphaned: /portfolio lives in the Navbar and
          the TabBar, and email + LinkedIn live in the Contact section. */}
      <h1 className="sr-only">David Xie — {SITE_DESCRIPTION}</h1>

      {/* Click + scroll prompt — auto-dismisses on first interaction or 6s
          after the page is uncovered. Held at opacity 0 until `revealed`, so
          the fade-in cannot be spent behind the loading overlay; see the note
          at the top of this file.

          The two phases carry SEPARATE transitions on purpose. A single
          `transition` prop is framer's default for every animation on the
          component, delay included — which is how the old `delay: 2.5` ended
          up governing the fade-out as well as the fade-in. An exit should
          start when it is asked to. */}
      <motion.div
        className="absolute bottom-[14vh] left-1/2 -translate-x-1/2 text-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: revealed && !hideHint ? 1 : 0 }}
        transition={
          hideHint
            ? { duration: HINT_FADE_OUT_S, ease: 'easeOut' }
            : { delay: HINT_DELAY_S, duration: HINT_FADE_IN_S, ease: 'easeOut' }
        }
      >
        {/* Demoted out of the <h1> block. It's flavour, not a claim, so it
            belongs down here in the 9px decorative stack rather than in the
            one slot above the fold where the value proposition has to live.
            Rides the hint's fade because a mood line has nothing to say once
            the visitor has started moving. */}
        {/* 0.32 -> 0.50 alpha (2.67:1 -> 5.28:1). Supporting copy, so it takes
            the lower of the two passing tiers — but it still has to clear
            4.5:1, because at 9px no text on this site qualifies as "large"
            (24px, or 18.66px bold) and can use the 3:1 floor. */}
        <p
          className="font-mono text-[9px] uppercase tracking-[0.42em] mb-3"
          style={{ color: 'rgba(255,255,255,0.50)' }}
        >
          a solar system in progress
        </p>

        {/* 0.42 -> 0.60 alpha (3.95:1 -> 7.37:1). This is the whole tutorial:
            the site's interaction model is a 3D scene you click and scroll, and
            this line is the only place that is ever said. It also auto-dismisses
            after 6s, so it gets one shot. 0.42 was the site's near-miss value —
            close enough to look deliberate, still short of 4.5:1.

            Raised further than the line above ON PURPOSE. Both now pass, and
            keeping instruction brighter than mood preserves the original
            ranking (2.67 : 3.95 was a 1.48x separation; 5.28 : 7.37 is 1.40x)
            instead of flattening the two into one grey. */}
        <p
          className="font-mono text-[9px] uppercase tracking-[0.4em]"
          style={{ color: 'rgba(255,255,255,0.60)' }}
        >
          {/* The separator stays at 0.18. It is the one genuinely decorative
              glyph here — it carries no information a reader needs, it exists
              to keep two phrases apart, and brightening it would make the
              punctuation compete with the instruction it is punctuating.
              aria-hidden instead, matching PlanetProgress, which declines to
              read its own "·" for the same reason.

              The literal spaces are load-bearing: hiding the span leaves
              "click a planet" and "scroll to begin" as adjacent text nodes with
              no whitespace between them, and assistive tech concatenates that
              into "click a planetscroll to begin" — the exact defect fixed on
              SystemRecap's buttons below. mx-3 -> mx-1 pays for the two new
              spaces (9px each at this size and tracking), so the rendered gap
              is 13px a side against the old 12px. */}
          click a planet{' '}
          <span className="mx-1" style={{ color: 'rgba(255,255,255,0.18)' }} aria-hidden="true">
            ·
          </span>{' '}
          scroll to begin
        </p>

        {/* Down-arrow indicator that gently bobs.
            Infinite motion with no local reduced-motion guard, deliberately:
            layout.tsx wraps the tree in <MotionConfig reducedMotion="user">
            (providers/MotionPreferences), and framer resolves `y` through
            positionalKeys — under `reduce` the whole transition object is
            replaced with `{ type: false }`, so `repeat: Infinity` is discarded
            and the value is set instantly. Verified against framer-motion
            12.34.0 (motion-dom animation/interfaces/visual-element-target).
            A local guard here would be dead code. WCAG 2.2.2 satisfied globally. */}
        <motion.div
          className="mt-4 flex justify-center"
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg width="11" height="14" viewBox="0 0 11 14" fill="none" aria-hidden>
            <path
              d="M5.5 1V13M5.5 13L1 8.5M5.5 13L10 8.5"
              stroke="rgba(255,255,255,0.32)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
