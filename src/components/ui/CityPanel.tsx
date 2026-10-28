'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { useLenis } from '@/components/providers/SmoothScroll';
import { useFootprintsStore } from '@/stores/footprintsStore';
import { memories } from '@/data/memories';
import { cities, type CityMarker } from '@/data/cities';

/**
 * A city, opened as a full-viewport modal over the Footprints stage.
 *
 * ── The history, because both previous versions are instructive ──
 * v1 was a `fixed inset-0` modal: a 440px card floating dead-centre over a
 * BLURRED BLACK BACKDROP, with the story and the photos split across two tiers
 * you had to click between. It did not feel immersive: the one thing this
 * section exists to show, the Earth, got blurred out at the exact moment you
 * engaged with it.
 *
 * v2 over-corrected. It dropped the overlay entirely and docked the panel as
 * one column of the section's split stage — inline content, in the document
 * flow, scrolling inside a definite-height box. That fixed the blur, and broke
 * the physics: two scroll surfaces competed under one gesture, and on this
 * site it was worse than the usual nested-scroller mush:
 * Lenis owns the wheel (it preventDefaults and animates window scroll itself),
 * and nothing marked that inner box as its own scroller — so a wheel gesture
 * aimed at the photo roll scrolled the PAGE and dragged the camera off Earth,
 * while the roll only moved if you grabbed its scrollbar. That scrollbar was a
 * control that mostly did not respond to the wheel.
 *
 * ── v3, this file: overlay again, but keeping what v2 got right ──
 * The panel is once more a `fixed` layer, so there is only ever one scroller
 * active: while it is open the page is frozen and the roll scrolls, and while
 * it is closed the page scrolls and this does not exist. What is NOT restored
 * from v1 is the part that failed — there is no blurred full-screen
 * backdrop. The overlay reuses the stage's own two-column geometry: the left
 * half stays completely transparent and unblurred, still a clean window onto
 * the Earth, and only the card on the right paints a surface. Clicking that
 * transparent half closes, which is the dismissal gesture the empty half was
 * always implying.
 *
 * ── Why it must be a portal, and why that is the whole point ──
 * The camera itinerary (cameraKeyframes in lib/constants.ts, marked LOCKED) is
 * keyed to hardcoded FRACTIONS of total document height, so anything that
 * changes the height of the Footprints section silently re-times every planet
 * visit after Earth. Rendering into document.body, `position: fixed`, means
 * this subtree contributes exactly zero to layout: the section's DOM is
 * byte-identical whether a city is open or closed, and the document height
 * cannot move by construction rather than by careful sizing. That is a
 * stronger guarantee than v2's definite-height column ever had.
 *
 * ── And it IS a dialog again ──
 * v2's header said it deliberately dropped role="dialog", aria-modal and the
 * focus trap, on the reasoning that trapping focus inside a region that is not
 * covering anything harms a keyboard user. That reasoning was sound for inline
 * content and is simply false now: this covers the viewport and freezes the
 * page, so the trap is what makes it honest. Escape still closes; focus is
 * moved in on open and handed back to the chip that opened it by Footprints.
 */
export function CityPanel({ cityId }: { cityId: string }) {
  const city = cities.find((c) => c.id === cityId);
  // Guard before the dialog mounts, not inside it: an unknown id must not get
  // as far as locking the page behind a panel that renders nothing.
  if (!city) return null;
  return <CityDialog city={city} />;
}

/**
 * Freeze the page for as long as this is mounted, and give it back untouched.
 *
 * Two mechanisms, because there are two scroll owners on this site and neither
 * one covers the other's inputs:
 *
 *  1. Lenis. On a desktop pointer with motion allowed, Lenis owns the wheel and
 *     touch: it preventDefaults them and animates window.scrollTo itself. Its
 *     own `stop()` is the right lever — while stopped it keeps swallowing those
 *     gestures but moves nothing (lenis.mjs: `if (this.isStopped) { preventDefault(); return }`).
 *     Crucially it touches no CSS and no scroll offset, so `start()` on close
 *     resumes at the exact pixel we left, with no jump to undo.
 *  2. `overflow: hidden` on <html>, for everything Lenis never intercepted —
 *     keyboard scrolling, dragging the scrollbar, and the touch/reduced-motion
 *     visitors for whom SmoothScroll.tsx never constructs a Lenis at all.
 *     Deliberately NOT the `position: fixed; top: -scrollY` trick: that one
 *     unloads the scroll offset into a style and is the classic source of the
 *     jump-to-top on close. `overflow: hidden` keeps the offset where it is.
 *
 * `scrollbar-gutter: stable` rides along with (2) so that hiding a classic
 * scrollbar does not hand its ~15px back to the layout and reflow the page
 * sideways under the overlay.
 */
function usePageScrollLock() {
  const lenis = useLenis();

  useEffect(() => {
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    const prevGutter = root.style.getPropertyValue('scrollbar-gutter');

    lenis?.stop();
    root.style.overflow = 'hidden';
    root.style.setProperty('scrollbar-gutter', 'stable');

    return () => {
      // CSS first, then Lenis: Lenis re-measures on start, and it should do
      // that against the restored, scrollable document.
      root.style.overflow = prevOverflow;
      if (prevGutter) root.style.setProperty('scrollbar-gutter', prevGutter);
      else root.style.removeProperty('scrollbar-gutter');
      lenis?.start();
    };
  }, [lenis]);
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function CityDialog({ city }: { city: CityMarker }) {
  const closeAll = useFootprintsStore((s) => s.closeAll);
  const photos = memories.filter((m) => m.city === city.id);

  const reduceMotion = useReducedMotion();
  const headingId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  usePageScrollLock();

  // Focus lands on the heading so a keyboard user is reading the story rather
  // than still standing on the chip they pressed. preventScroll is not
  // optional even now that the page is frozen: the focused node lives inside
  // the roll's scroll container, and a default focus() would scroll THAT.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [city.id]);

  // Escape is bound at the window, not the dialog, so it still closes if focus
  // has wandered out to browser chrome and back onto <body>.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeAll]);

  // ── Focus trap ──
  // The page is still fully rendered and tabbable behind this; aria-modal tells
  // assistive tech to ignore it, and this keeps a sighted keyboard user from
  // tabbing onto city chips they cannot see. Queried on each Tab rather than
  // cached, because the roll's images mount as they load.
  const onKeyDownCapture = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const root = dialogRef.current;
    if (!root) return;

    const focusable = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    // -1 for anything focused that is not itself tabbable. On open that is
    // ALWAYS the case: focus is put on the heading, which carries tabIndex={-1}
    // and is therefore excluded from FOCUSABLE by construction.
    const index = focusable.indexOf(active as HTMLElement);

    // ── Backwards wraps to the back ──
    // `index <= 0` rather than `active === first` is the fix, and the bug it
    // closes was one keystroke deep. The heading is not `first` — it is not in
    // this list at all — yet it is where focus starts and it sits before every
    // control in the card. So the first Shift+Tab after opening fell through
    // this branch, the browser ran its own backwards move, and because this
    // subtree is portalled to the END of <body> that move landed on the last
    // tabbable node of the page BEHIND the overlay: content the visitor cannot
    // see, that aria-modal has told their screen reader to ignore.
    //
    // And it was one-way. This handler is bound to the dialog, so a keydown
    // only reaches it while focus is inside; once focus was out, no later Tab
    // could pull it back. Measured on the live page: dispatching Shift+Tab on
    // the heading left defaultPrevented false, while the same key on `first`
    // was correctly trapped.
    if (e.shiftKey) {
      // Covers all three: the heading (-1), anything focused outside the
      // dialog (also -1), and `first` itself (0).
      if (index <= 0) {
        e.preventDefault();
        last.focus();
      }
      return;
    }

    // ── Forwards wraps to the front ──
    // Only off the back, plus anything focused outside the dialog. An
    // untabbable node INSIDE the card is deliberately left to the browser:
    // its own next stop from the heading is the close button, i.e. already in.
    if (active === last || !root.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  // Rendered only on a click, so document always exists by the time this runs.
  // The guard is for the pathological case (a store rehydrated during SSR),
  // where returning null is strictly better than throwing.
  if (typeof document === 'undefined') return null;

  return createPortal(
    // z-60 sits above the content layer (z-10), the canvas (z-1) and the city
    // marker overlay CityLabel pins to <body> at z-30, and below LoadingScreen
    // (z-100) and the grain (z-9999), both of which should stay on top.
    // Consequence worth naming: the lit marker on the globe is covered while
    // this is open, so its click-to-dismiss is now served by the transparent
    // half below — same gesture, same outcome.
    <div className="fixed inset-0 z-[60]">
      {/* The dismiss surface. From md up it is completely transparent — no
          tint, no blur, no backdrop-filter. That is the layer v1 got wrong, and
          the Earth showing through it at full clarity is the entire reason the
          left half of this stage is empty.
          Below md it carries a scrim, because that argument does not apply
          there: the split stage collapses to one column, the section's Earth
          half is `hidden` anyway, and what shows around the sheet is not the
          globe but the page's own body copy reading through from behind. The
          scrim is a flat alpha rather than a backdrop-filter — it is buying
          legibility, not the frosted look, and a full-screen filter on a phone
          costs a composite of the whole viewport every frame.
          Not focusable and aria-hidden: the X button is the accessible close,
          and a full-screen button in the tab order would just be noise. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-black/55 md:bg-transparent"
        onClick={closeAll}
      />

      {/* Same grid as the section underneath (max-w-7xl, px-6, two columns at
          md) so the card lands exactly where the docked column used to be —
          the panel appears to lift off the page rather than fly in from
          nowhere. pointer-events-none lets clicks fall through the gutters and
          the empty left cell to the dismiss surface. */}
      <div className="pointer-events-none relative mx-auto grid h-full w-full max-w-7xl grid-cols-1 gap-10 px-6 py-[6vh] md:grid-cols-2 md:gap-14 md:py-[8vh]">
        <div aria-hidden className="hidden md:block" />

        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          onKeyDownCapture={onKeyDownCapture}
          // The reveal: it should arrive, not blink. Under
          // prefers-reduced-motion the translate is dropped and the fade is
          // near-instant — the same call CameraController makes about the
          // intro flight, made here with framer-motion's own hook since this
          // is a framer-motion component and the repo has no shared helper.
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 12, scale: 0.985 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={
            reduceMotion
              ? { duration: 0.01 }
              : { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
          }
          className="pointer-events-auto flex h-full min-h-0 flex-col rounded-2xl border border-white/10 bg-black/70 p-5 text-left backdrop-blur-xl sm:p-6"
        >
          {/* ── Header ── stays put while the roll scrolls under it, so you
              never lose track of which city you are inside. */}
          <div className="flex shrink-0 items-start justify-between gap-4">
            <div>
              <h2
                id={headingId}
                ref={headingRef}
                tabIndex={-1}
                className="font-display text-2xl leading-none outline-none sm:text-3xl"
                style={{ color: 'rgba(255,255,255,0.95)' }}
              >
                {city.name}
              </h2>
              {city.tie && (
                <p
                  className="mt-2 font-mono text-[10px] uppercase tracking-[0.28em]"
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  {city.tie}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={closeAll}
              aria-label={`Close ${city.name}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/40 transition-colors duration-200 hover:bg-white/10 hover:text-white/85 focus-visible:outline-2 focus-visible:outline-white/60"
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
                <path d="M1 1L10 10M10 1L1 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* ── The roll ── the ONLY scroller alive while this is open.
              `min-h-0` is load-bearing: a flex child defaults to
              min-height:auto and refuses to shrink below its content, so
              without it this box grows to fit all 17 San Francisco photos
              instead of scrolling. It can no longer push the document taller —
              the overlay is out of flow — but it would push the card off the
              bottom of the screen, which is the same bug wearing a hat.

              `data-lenis-prevent` is the fix for the exact complaint that
              started this rewrite. Lenis inspects the composed path of every
              wheel/touch event and bails out on any node carrying this
              attribute (lenis.mjs onVirtualScroll), handing the gesture back to
              the browser's native scrolling. Without it, Lenis swallows the
              wheel before this box ever sees it — which is why the docked
              version's scrollbar felt inert.

              overscroll-contain then stops a flick at the end of the roll from
              chaining outward. */}
          <div
            data-lenis-prevent
            className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
          >
            <p className="text-[14px] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.72)' }}>
              {city.blurb}
            </p>

            {photos.length > 0 && (
              <>
                {/* 0.50 = 5.28:1. Was 0.35 = 3.01:1, which is the LARGE-text
                    threshold and this is 9px — the smallest type in the card,
                    stretched by 0.3em of tracking. It is content, not chrome:
                    it is the only thing that tells you how long the roll below
                    is before you start scrolling it. */}
                <p
                  className="mt-6 font-mono text-[9px] uppercase tracking-[0.3em]"
                  style={{ color: 'rgba(255,255,255,0.50)' }}
                >
                  {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                </p>

                {/* One column, uniform 4:3. A masonry of mixed orientations
                    reads as a contact sheet; a single consistent column reads
                    as a roll you scroll, which is what this is. */}
                <div className="mt-3 flex flex-col gap-4 pb-2">
                  {photos.map((p) => (
                    <figure key={p.src}>
                      <div className="relative aspect-[4/3] overflow-hidden rounded-xl ring-1 ring-white/10">
                        <Image
                          src={p.src}
                          alt={p.alt}
                          fill
                          // Still one column of a two-column stage — the
                          // overlay reuses the section's grid, so the card is
                          // never more than about half the viewport on desktop.
                          sizes="(min-width: 768px) 42vw, 88vw"
                          className="object-cover"
                        />
                      </div>
                      {/* 0.50 = 5.28:1, up from 0.45 = 4.41:1 — a miss at 10px,
                          where AA is 4.5:1. The caption is the only place a
                          photo is named, so it is text to read, not decoration
                          to skip. */}
                      {p.caption && (
                        <figcaption
                          className="mt-2 font-mono text-[10px] tracking-wide"
                          style={{ color: 'rgba(255,255,255,0.50)' }}
                        >
                          {p.caption}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>,
    document.body,
  );
}
