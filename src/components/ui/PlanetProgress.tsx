'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSectionInView } from '@/hooks/useSectionInView';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { sectionIds, sectionPlanet, sectionLabels, planetColors } from '@/lib/constants';
import type { SectionId } from '@/lib/constants';
import { jumpScrollBehavior } from '@/components/providers/reducedMotion';

interface PlanetDot {
  id: SectionId;
  label: string;
  // Split out for the aria-label: screen readers should hear the destination
  // section first ("Scroll to Memories"), with the planet as trailing colour.
  section: string;
  planet: string;
  color: string;
}

// ── Dot Labels ──
// Label AND colour both derive from sectionPlanet, so the rail can never drift
// out of sync with the scene again. This used to carry a hardcoded labelMap
// that disagreed with sectionPlanet on four of nine dots: Venus/Saturn were
// exactly swapped (the Experience dot rendered Venus gold under a "Saturn"
// tooltip while Experience.tsx heads the section "// Venus" and the camera
// keyframes fly to Venus), and memories/footprints were labelled Pluto/Uranus —
// Pluto has no entry in planetConfigs at all, so that name pointed at nothing
// the visitor could see. (The same note used to claim no keyframe ever visits
// Uranus. That stopped being true when the itinerary was re-sequenced, and
// Uranus now carries a section of its own — Off the Clock.)
//
// Two sections — memories and footprints — legitimately share Earth, so a bare
// planet name would yield two identical tooltips; "{Planet} · {Section}" keeps
// all eight distinct while still naming the body the camera flies to.
//
// Eight, not nine: the five type-bucket sections collapsed into four pillars.
// One planet is therefore unvisited — Mars — because memories and footprints
// are locked to a single Earth stop, so eight sections can only reach seven of
// the eight bodies. Nothing here needs to know that; the rail is derived.
// Planet names are single words and always will be — they are astronomy, not
// content — so capitalising the key is safe here. Section names are not: this
// used to capitalise the id too, and rendered "Offtheclock". Section labels now
// come from sectionLabels, which is the one place they are written down.
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const planetDots: PlanetDot[] = sectionIds.map((id) => {
  const planetKey = sectionPlanet[id] ?? 'sun';
  const color = planetColors[planetKey] ?? '#D0D0D8';
  const planet = capitalize(planetKey);
  const section = sectionLabels[id];

  return { id, label: `${planet} · ${section}`, section, planet, color };
});

// `matches(':focus-visible')` rather than a bare focus flag, so the tooltip
// appears on exactly the interactions that get the global focus ring — a mouse
// click leaves a button focused in Chrome and Firefox, and would otherwise pin
// an open tooltip to the rail long after the page has scrolled away from it.
// jsdom's selector engine throws on pseudo-classes it does not implement, so
// this is guarded; the fallback shows the label rather than hiding it.
function isFocusVisible(el: HTMLElement): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
}

const DOT_ACTIVE = 12;
const DOT_INACTIVE = 6;
const GAP = 20;

export function PlanetProgress() {
  const activeSection = useSectionInView();
  const { subscribe } = useScrollProgress();
  const progressRef = useRef(0);
  const lineRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Tracked separately from hover so a keyboard visitor gets the same
  // destination tooltip a mouse visitor gets — see the note on the dot below.
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);

  // Entrance delay — wait for loading screen
  useEffect(() => {
    const timer = setTimeout(() => setEntered(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  // Subscribe to scroll progress for the colored fill line
  useEffect(() => {
    return subscribe((progress) => {
      progressRef.current = progress;
      if (lineRef.current) {
        lineRef.current.style.height = `${progress * 100}%`;
      }
    });
  }, [subscribe]);

  // ── Reduced motion ──
  // An author-supplied `behavior` beats the `scroll-behavior` CSS property, so
  // a hardcoded 'smooth' slips straight past globals.css's
  // `scroll-behavior: auto !important` and animates the viewport across up to
  // ~12,000px for a visitor who asked for less motion. And this is not an edge
  // case for them: SmoothScroll returns early on the same preference, so lenis
  // is null site-wide and every in-page jump lands here. Read at click time,
  // not mount, so toggling the OS setting takes effect on the next click.
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: jumpScrollBehavior() });
  };

  const totalHeight = (planetDots.length - 1) * GAP;

  // Build gradient stops from planet colors
  const gradientStops = planetDots
    .map((dot, i) => {
      const pct = planetDots.length > 1 ? (i / (planetDots.length - 1)) * 100 : 0;
      return `${dot.color} ${pct}%`;
    })
    .join(', ');

  return (
    <div
      className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center"
      style={{ height: totalHeight }}
    >
      {/* Background connecting line */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-0 w-[1px] rounded-full"
        style={{
          height: totalHeight,
          background: 'rgba(255, 255, 255, 0.08)',
        }}
      />

      {/* Colored progress fill line */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-0 w-[1px] rounded-full origin-top"
        style={{
          height: totalHeight,
          overflow: 'hidden',
        }}
      >
        <div
          ref={lineRef}
          className="w-full"
          style={{
            height: '0%',
            background: `linear-gradient(to bottom, ${gradientStops})`,
            transition: 'height 0.05s linear',
          }}
        />
      </div>

      {/* Dots */}
      {planetDots.map((dot, i) => {
        const isActive = activeSection === dot.id;
        const isHovered = hoveredId === dot.id;
        const isFocused = focusedId === dot.id;
        // Focus is treated exactly like hover — same glow, same tooltip.
        const showLabel = isHovered || isFocused;
        const showGlow = isActive || showLabel;
        const size = isActive ? DOT_ACTIVE : DOT_INACTIVE;

        return (
          <motion.div
            key={dot.id}
            className="absolute left-1/2 flex items-center"
            style={{ top: i * GAP }}
            initial={{ opacity: 0, x: 10 }}
            animate={
              entered
                ? { opacity: 1, x: 0 }
                : { opacity: 0, x: 10 }
            }
            transition={{
              delay: entered ? 0.08 * i : 0,
              type: 'spring',
              stiffness: 300,
              damping: 24,
            }}
          >
            {/* Dot button — aria-label leads with the section (that is what the
                click does); dot.label is not reused verbatim because a screen
                reader would announce the "·" separator as noise.

                ── Do NOT put `focus:outline-none` back on this className ──
                It used to sit here, and the focus ring on the entire rail
                survived only by a cascade-layer accident. Tailwind emits
                `.focus\:outline-none:focus { outline-style: none }` INSIDE
                `@layer utilities`, while globals.css's ring — `a:focus-visible,
                button:focus-visible, [tabindex]:focus-visible` — is UNLAYERED,
                and an unlayered normal declaration outranks every layered one
                no matter its specificity. That is the only reason the ring won:
                by raw specificity the utility (0,2,0) beats
                `button:focus-visible` (0,1,1). So the day anyone tidies that
                globals rule into `@layer base`, keyboard focus indication
                vanishes from all eight dots at once — no error, no visual
                warning, and nothing else on the page changes. The class buys
                nothing here: the global ring is the ONLY focus affordance a
                6px circle has. (Naming the class in this comment keeps
                Tailwind's source scanner emitting the rule into the bundle, so
                finding `.focus\:outline-none:focus` there is NOT evidence that
                anything still uses it — grep the JSX, not the CSS.)

                onFocus/onBlur exist because aria-label alone serves screen
                readers, not sighted keyboard users — without them, Tab lands a
                ring on an anonymous dot with no way to see where it goes. */}
            <motion.button
              onClick={() => scrollTo(dot.id)}
              onMouseEnter={() => setHoveredId(dot.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={(e) => {
                if (isFocusVisible(e.currentTarget)) setFocusedId(dot.id);
              }}
              onBlur={() => setFocusedId(null)}
              className="relative -translate-x-1/2 rounded-full cursor-pointer"
              aria-label={`Scroll to ${dot.section} (${dot.planet})`}
              animate={{
                width: size,
                height: size,
                // The dot IS the control — no label, border, or backing shape
                // carries it — so WCAG 1.4.11 (non-text contrast, 3:1) rests on
                // this value alone. 0.30 white on black is 2.46:1, a fail. 0.35
                // only just clears at 3.01:1; 0.40 = 3.66:1 keeps headroom at
                // the 6px inactive size. The 0.08 backing line above is
                // decorative (1.14:1) and is exempt.
                backgroundColor: showGlow ? dot.color : 'rgba(255, 255, 255, 0.40)',
                boxShadow: showGlow
                  ? `0 0 8px ${dot.color}, 0 0 16px ${dot.color}40`
                  : '0 0 0px transparent',
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }}
              whileHover={{ scale: 1.4 }}
              whileTap={{ scale: 0.9 }}
            />

            {/* Tooltip */}
            <AnimatePresence>
              {showLabel && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: -8 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-full mr-3 whitespace-nowrap pointer-events-none"
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                >
                  <div
                    className="px-2.5 py-1 rounded-md text-[11px] font-mono tracking-wider"
                    style={{
                      background: 'rgba(0, 0, 0, 0.85)',
                      backdropFilter: 'blur(12px)',
                      border: `1px solid ${dot.color}40`,
                      color: dot.color,
                      boxShadow: `0 0 12px ${dot.color}20`,
                    }}
                  >
                    {dot.label}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
