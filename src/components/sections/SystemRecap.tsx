'use client';

import { motion } from 'framer-motion';
import { sectionIds, sectionPlanet, sectionLabels } from '@/lib/constants';
import { useLenis } from '@/components/providers/SmoothScroll';

// Planet keys are single lowercase words and always will be — they are
// astronomy, not content — so capitalising the key is safe. Section names are
// NOT: they come from sectionLabels. Same split, and same reasoning, as
// PlanetProgress.
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Same guard CosmicScene and CameraController use. Optional-called because
 *  jsdom has no matchMedia, and this runs from a click handler under test. */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Recap section at the very bottom — same wide-angle view as the overview.
 * Lists clickable planet links so the user can revisit any section without
 * scrolling all the way back up.
 */
export function SystemRecap() {
  const lenis = useLenis();

  const scrollToSection = (id: string) => {
    if (lenis) {
      lenis.scrollTo(`#${id}`, { offset: 0 });
    } else {
      // ── This branch IS the reduced-motion path ──
      // SmoothScroll declines to construct Lenis at all when the user prefers
      // reduced motion, so `lenis` is null exactly when the animation is least
      // wanted — and this fallback was hardcoded to 'smooth'. globals.css's
      // `scroll-behavior: auto !important` does not save it: that rule governs
      // the CSS property, and an explicit `behavior` option passed to
      // scrollIntoView overrides the computed value outright. The result was a
      // smooth-animated jump of up to ~12,000px (recap sits at the bottom of an
      // eight-section document) for the one visitor who asked for no motion.
      // WCAG 2.2.2.
      document.getElementById(id)?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
  };

  return (
    // pointer-events-none on the section, auto on the content column — the
    // same pattern SystemOverview uses, and for the same reason: this is the
    // second wide-angle view of the whole solar system, so the empty frame
    // around this copy is the scene, and clicking a planet out there has to
    // reach the raycaster. page.tsx's blanket pointer-events-auto wrapper used
    // to make that impossible; it is gone, and this is what replaces it.
    <section
      id="recap"
      className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center pointer-events-none"
    >
      <motion.div
        className="text-center px-6 max-w-md pointer-events-auto"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-15%' }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        {/* 0.32 -> 0.50 alpha (2.67:1 -> 5.28:1). Supporting tier: a real
            eyebrow, not decoration — it tells the visitor where in the document
            they have arrived — so it needs 4.5:1 like any other 10px copy. */}
        <p
          className="font-mono text-[10px] uppercase tracking-[0.45em] mb-3"
          style={{ color: 'rgba(255,255,255,0.50)' }}
        >
          end of journey
        </p>
        <h2
          className="font-mono text-[14px] uppercase tracking-[0.32em] mb-12"
          style={{ color: 'rgba(255,255,255,0.85)' }}
        >
          revisit any planet
        </h2>

        {/* Planet jump links — uses the existing section-to-planet mapping.
            Was grid-cols-3, which tiled the old nine sections into a clean 3x3.
            Eight sections leave a 3/3/2 with a ragged final row, so this is
            cols-2 on narrow and cols-4 on sm+ — 4x2 with no orphan. Derived
            from sectionIds, so the count is not restated here. */}
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-left">
          {sectionIds.map((id) => {
            const planet = sectionPlanet[id];
            return (
              <li key={id}>
                {/* ── aria-label, because <br/> contributes no text ──
                    Name-from-content concatenates the two spans with nothing
                    between them, so these eight buttons served their accessible
                    names as "earthmemories", "venusabout", "uranusofftheclock"
                    and so on — WCAG 2.4.6. The label is built the way
                    PlanetProgress builds its rail dots: destination section
                    first (that is what the click does), planet trailing as
                    colour, and the section name read out of sectionLabels
                    rather than derived from the id — which is the whole reason
                    that map exists ("Off the Clock", not "Offtheclock").

                    Colours, both raised for AA at 10px:
                      section line 0.40 -> 0.60 (3.66:1 -> 7.37:1). These are
                        the only interactive controls in the section, and the
                        one at 3.66:1 was the *bright* half of the button.
                      planet name 0.22 -> 0.50 (1.79:1 -> 5.28:1). Not
                        decorative — it is how the button ties back to the body
                        the camera flies to, and it is half of what a sighted
                        visitor reads before clicking, so it cannot be hidden
                        and left illegible. Kept the dimmer of the two so the
                        caption/label hierarchy inside the button survives.
                    hover:text-white still only affects the section line (the
                    planet span sets its own colour), unchanged from before. */}
                <button
                  onClick={() => scrollToSection(id)}
                  aria-label={`Scroll to ${sectionLabels[id]} (${capitalize(planet)})`}
                  className="font-mono text-[10px] uppercase tracking-[0.28em] transition-colors duration-300 hover:text-white"
                  style={{ color: 'rgba(255,255,255,0.60)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.50)' }}>{planet}</span>
                  <br />
                  <span>{id}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* 0.16 -> 0.50 alpha (1.44:1 -> 5.28:1). Tempting to call a colophon
            decorative and aria-hidden it, but that is the wrong trade here:
            aria-hidden helps a screen-reader user and does nothing for the
            low-vision sighted reader this 1.44:1 actually excludes — it would
            leave a line that literally nobody can read. It is a sentence with
            meaning, so it gets contrast instead. Supporting tier; 8px, so no
            large-text exemption. */}
        <p
          className="font-mono text-[8px] uppercase tracking-[0.5em] mt-12"
          style={{ color: 'rgba(255,255,255,0.50)' }}
        >
          made with curiosity
        </p>
      </motion.div>
    </section>
  );
}
