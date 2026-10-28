'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSectionInView } from '@/hooks/useSectionInView';
import { useLenis } from '@/components/providers/SmoothScroll';
import { sectionIds, sectionPlanet, sectionLabels, planetColors } from '@/lib/constants';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { jumpScrollBehavior } from '@/components/providers/reducedMotion';

// This file used to keep its own `navLabels` map — a second, untyped list of
// every section that nothing checked against sectionIds. A renamed section left
// `navLabels[id]` undefined, which is not an error: the aria-label silently
// disappeared and the md+ label rendered as an empty span, so the pill became a
// blank 36px hole. Below md every pill is an identical 8px dot, so the damage
// was invisible on a phone — the device most likely to be used for a quick
// check. It now reads sectionLabels, which is keyed by SectionId, so the same
// mistake fails to compile.
const navLabels = sectionLabels;

/** Minimum downward scroll (px) before hiding — prevents micro-jitter */
const SCROLL_DOWN_THRESHOLD = 10;
/** Minimum upward scroll (px) before revealing */
const SCROLL_UP_THRESHOLD = 5;
/** Always show navbar when scrollY is below this value */
const TOP_ZONE = 100;

// ── Scroll snapshots ──
// `pastHero` and `isScrolled` are pure functions of the current scroll offset,
// so they are read through useSyncExternalStore instead of being mirrored into
// state from inside an effect. That keeps them correct on the very first client
// render (e.g. a reload part-way down the page) without the cascading
// setState-in-effect the scroll handler used to trigger on mount, and React
// bails out of re-rendering for as long as the derived boolean is unchanged —
// so we still only re-render on the flip, not on every scroll event.
function subscribeToScroll(onStoreChange: () => void) {
  window.addEventListener('scroll', onStoreChange, { passive: true });
  return () => window.removeEventListener('scroll', onStoreChange);
}

/** Past the hero once we're more than 2% down the document. */
function getPastHeroSnapshot(): boolean {
  const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
  return totalScroll > 0 ? window.scrollY / totalScroll > 0.02 : false;
}

/** Backdrop style: scrolled vs at-top. */
function getIsScrolledSnapshot(): boolean {
  return window.scrollY > TOP_ZONE;
}

/** The server has no scroll position — render the at-top appearance there. */
function getAtTopSnapshot(): boolean {
  return false;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function Navbar() {
  const activeSection = useSectionInView();
  const lenis = useLenis();

  // Whether the page has scrolled past the hero (controls initial fade-in via AnimatePresence)
  const pastHero = useSyncExternalStore(subscribeToScroll, getPastHeroSnapshot, getAtTopSnapshot);
  // Whether we've scrolled past the top zone (controls backdrop style)
  const isScrolled = useSyncExternalStore(subscribeToScroll, getIsScrolledSnapshot, getAtTopSnapshot);
  // Whether the navbar is visible — this one is *not* derivable from the current
  // offset alone: it accumulates scroll direction across events, so it stays as
  // state driven by the listener below.
  const [isNavVisible, setIsNavVisible] = useState(true);

  const prevScrollY = useRef(0);
  const scrollDelta = useRef(0);

  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    const delta = currentY - prevScrollY.current;

    // Always show navbar near the top of the page
    if (currentY < TOP_ZONE) {
      setIsNavVisible(true);
      scrollDelta.current = 0;
      prevScrollY.current = currentY;
      return;
    }

    // Accumulate scroll delta in the same direction; reset on direction change
    if ((delta > 0 && scrollDelta.current < 0) || (delta < 0 && scrollDelta.current > 0)) {
      scrollDelta.current = 0;
    }
    scrollDelta.current += delta;

    // Scrolling DOWN past threshold → hide
    if (scrollDelta.current > SCROLL_DOWN_THRESHOLD) {
      setIsNavVisible(false);
      scrollDelta.current = 0;
    }
    // Scrolling UP past threshold → show
    if (scrollDelta.current < -SCROLL_UP_THRESHOLD) {
      setIsNavVisible(true);
      scrollDelta.current = 0;
    }

    prevScrollY.current = currentY;
  }, []);

  useEffect(() => {
    // Seed the reference offset before subscribing: left at 0, the first scroll
    // event after a reload part-way down the page would measure one huge
    // downward delta and hide the bar the user never scrolled away from.
    prevScrollY.current = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // ── Reduced motion ──
  // The `else` is not a fallback for these visitors — it is their only branch.
  // SmoothScroll returns early on `prefers-reduced-motion: reduce`, so `lenis`
  // is null for exactly the people who asked for less movement, and every nav
  // click reaches scrollIntoView. A hardcoded `behavior: 'smooth'` there beats
  // globals.css's `scroll-behavior: auto !important` (CSSOM-View gives the
  // author-supplied option priority over the CSS property), so the guard in the
  // stylesheet never reached this call and one click animated the viewport
  // across up to ~12,000px. Read at click time so the setting can be toggled
  // mid-session.
  const scrollTo = (id: string) => {
    if (lenis) {
      lenis.scrollTo(`#${id}`, { offset: 0 });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: jumpScrollBehavior() });
    }
  };

  // Get the active section's planet color
  const activePlanetKey = activeSection ? sectionPlanet[activeSection] : 'sun';
  const activePlanetColor = activePlanetKey ? planetColors[activePlanetKey] : '#D0D0D8';

  return (
    <AnimatePresence>
      {pastHero && (
        <motion.nav
          aria-label="Main navigation"
          initial={{ opacity: 0, y: -20 }}
          animate={{
            opacity: 1,
            y: isNavVisible ? 0 : 'calc(-100% - 40px)',
          }}
          exit={{ opacity: 0, y: -20 }}
          transition={
            isNavVisible
              ? { type: 'spring', damping: 20, stiffness: 300 }
              : { type: 'spring', damping: 25, stiffness: 300 }
          }
          // ── Overflow ──
          // Nine 36px dots + gaps already measure 372px against the 354px this
          // pill gets at a 375px viewport, and `body { overflow-x: hidden }`
          // *clips* that spill rather than letting it scroll — so the tail of
          // the row was already unreachable on a small phone.
          // Only the SECTION ROW scrolls (see the inner div below); the
          // Portfolio link is a sibling of that scroller, not a child, so it
          // stays pinned and visible at every width. Putting it inside the
          // scroller made it the last child of an already-overflowing row,
          // which parked it off-screen below ~1063px — every phone and tablet —
          // reachable only by a horizontal drag with no scrollbar, chevron, or
          // fade to hint at it, on a page where Lenis swallows the usual
          // diagonal trackpad gesture. That hid the entire point of the link.
          // ── Centred with inset-x-0 + mx-auto, NOT left-1/2 + -translate-x-1/2 ──
          // The translate trick centres correctly but lies about available
          // width. For a `position: fixed` box with `left` set and `width:
          // auto`, shrink-to-fit resolves against `containingBlock - left` — so
          // `left: 50%` capped this bar at 50vw, and the `max-w-[95vw]` beside
          // it never applied. Measured: the labelled bar needs 894px, got
          // 831.6px (its min-content width) at every viewport from 1024px to
          // 1788px, and the `overflow-x-auto` section row silently absorbed the
          // whole 62px deficit at scrollLeft 0 — rendering "Contact" as a bare
          // "C" at, among others, a 1382px desktop. The row is `scrollbar-none`
          // and Lenis swallows the wheel, so that tail was unreachable by mouse.
          // `inset-x-0` gives the box the full viewport to shrink-to-fit within
          // and `mx-auto` does the centring, so `max-w-[95vw]` is finally the
          // real cap. `w-fit` keeps it hugging its content rather than filling.
          className="fixed top-4 inset-x-0 mx-auto w-fit z-50 px-2 py-2 sm:px-3 sm:py-2.5 flex items-center gap-1 sm:gap-1.5 max-w-[95vw]"
          style={{
            borderRadius: 9999,
            background: isScrolled ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.85)',
            backdropFilter: isScrolled ? 'blur(24px)' : 'blur(20px)',
            WebkitBackdropFilter: isScrolled ? 'blur(24px)' : 'blur(20px)',
            border: isScrolled
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(255, 255, 255, 0.12)',
            transition: 'background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease',
          }}
        >
          {/* The section row is the only thing that scrolls. `min-w-0` lets it
              actually shrink inside the flex parent; the negative margin plus
              matching padding gives the `nav-active` glow vertical room, since
              `overflow-x: auto` forces `overflow-y` to `auto` and would
              otherwise clip the accent's 12px blur.

              `scrollbar-none` is the EXPLICIT opt-in (globals.css) and this is
              the only element on the site that takes it. globals.css used to
              hide scrollbars on every element in the document, which made an
              opt-out here unnecessary — and made every other inner scroller a
              silent content-eater. That rule is now scoped to the document
              scroller, so a container that wants no scrollbar has to say so.
              This one does: the row scrolls sideways inside a 36px pill, where
              a horizontal scrollbar would be a bar under the dots rather than
              a hint.

              Hiding the scrollbar is only defensible while the row does not
              actually need one, which is true from 402px of viewport up (see
              the label-gate note on the spans below). Below that the eight
              36px dot targets plus the Portfolio pill still exceed the 95vw
              cap by ~25px at 375px, and the tail is reached by swipe — the
              only pointer those widths have.

              PlanetProgress is NOT the backstop this comment used to claim:
              it is `hidden lg:flex`, so the rail does not exist across most
              of the range this row has to survive on its own. */}
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 overflow-x-auto overflow-y-hidden -my-2 py-2 scrollbar-none">
          {sectionIds.map((id) => (
            <MagneticButton key={id} strength={0.25} className="shrink-0">
              <button
                onClick={() => scrollTo(id)}
                aria-label={navLabels[id]}
                // `/50`, not `/45`: at 12px this label is normal-size text, so
                // AA wants 4.5:1 and white-on-black at 0.45 alpha is 4.41:1 —
                // a fail by a hair, and one that only bites in the dot-form
                // range where `bg-current` paints the dot from this same
                // colour. 0.50 is 5.28:1.
                className={`relative px-2 py-2 sm:px-3 text-xs font-mono tracking-wider rounded-full transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
                  activeSection === id
                    ? 'text-white'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {activeSection === id && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-full"
                    style={{
                      backgroundColor: hexToRgba(activePlanetColor, 0.2),
                      border: `1px solid ${hexToRgba(activePlanetColor, 0.4)}`,
                      boxShadow: `0 0 12px ${hexToRgba(activePlanetColor, 0.2)}`,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                {/* ── Why the label gate is `lg` and not `md` ──
                    The labels do not fit until ~940px, so `md:` (768px) turned
                    them on ~170px early and the row spent that whole band
                    clipped mid-word.

                    Measured against the vendored DM Mono (unitsPerEm 1000,
                    every advance 600, so 7.2px per glyph at text-xs, plus
                    0.6px of tracking-wider): the eight labels are 499.2px of
                    text. Add 24px of px-3 per button and 6px per gap and the
                    row wants 733.2px; add the pill's own 24px of padding, its
                    two 6px gaps, the 9px separator and the 114.2px Portfolio
                    pill and the bar wants 892.4px against a `max-w-[95vw]`
                    cap — a 940px viewport. At 768px the row was therefore
                    162.8px short: all of "Contact" and 62% of "Off the Clock"
                    sat outside the pill.

                    That tail was scrollable but not by any pointer: this row
                    opts out of scrollbars (above), Lenis runs `smoothWheel`
                    and preventDefaults the wheel, and a mouse cannot drag a
                    scroll container. Only Tab-focus and SystemRecap's jump
                    links reached it.

                    In dot form the row is a flat 316-330px — `min-w-[36px]`
                    beats the 8px dot plus padding at every width — so the bar
                    measures 489.2px at md (labels off, Portfolio's word still
                    on) against 729.6px of cap. Gating on lg trades a 172px
                    band of clipped labels for a band of complete dots, and
                    lands the labels exactly where PlanetProgress arrives, so
                    the wordy bar and its redundant rail appear together.

                    Wrapping to two lines was the alternative and it loses:
                    this bar's identity is a single `borderRadius: 9999` pill
                    at `fixed top-4`, and a second line turns it into a slab
                    over the hero. Shortening the labels at md was the other,
                    and it would mean a second label list keyed by breakpoint —
                    exactly the duplicate that the note at the top of this file
                    exists to prevent. */}
                <span className="relative z-10 hidden lg:inline">{navLabels[id]}</span>
                <span className="relative z-10 lg:hidden w-2 h-2 rounded-full bg-current block" aria-hidden="true" />
              </button>
            </MagneticButton>
          ))}
          </div>

          {/* ── Route escape hatch ──
              Everything above is an in-page anchor. The only other link to
              /portfolio on the site lives in the TabBar, which the homepage
              hides 80px down — i.e. one trackpad flick — so from below the
              fold the case studies were unreachable entirely. This pill sits
              outside sectionIds.map on purpose: it is never an "active
              section", so scroll-spy, the section list, and the `nav-active`
              layoutId accent are all left exactly as they were. */}
          <span
            aria-hidden="true"
            className="mx-0.5 sm:mx-1 h-4 w-px shrink-0 self-center bg-white/15"
          />
          <MagneticButton strength={0.25} className="shrink-0">
            <Link
              href="/portfolio"
              aria-label="Portfolio"
              // `/50` = 5.28:1, up from `/45` = 4.41:1 — see the pill above.
              // currentColor also strokes the 14px icon, so this one value
              // carries both the word and the only glyph shown below md.
              className="relative px-2 py-2 sm:px-3 text-xs font-mono tracking-wider rounded-full transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center gap-1.5 text-white/50 hover:text-white focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2"
            >
              {/* The glyph renders at every width. Below lg the section pills
                  collapse to identical 8px dots, and one more anonymous dot is
                  exactly what the one control that *leaves* the page must not
                  look like — so narrow keeps the icon and md+ adds the word.
                  This label stays on `md:` while the section labels moved to
                  `lg:` on purpose: this pill is not part of the row at all
                  (see the note above), the word is the only thing separating a
                  route change from eight in-page dots, and it costs 76.2px of
                  span + gap against the 240.4px of slack the bar has at md. */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
                aria-hidden="true"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              <span className="relative z-10 hidden md:inline">Portfolio</span>
            </Link>
          </MagneticButton>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
