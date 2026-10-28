'use client';

import { useEffect, useRef } from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { CityPanel } from '@/components/ui/CityPanel';
import { cities } from '@/data/cities';
import { useFootprintsStore } from '@/stores/footprintsStore';

/**
 * Footprints — the first "split stage" on the site.
 *
 * ── The idea ──
 * Every other section on this page sets its copy directly on top of whatever
 * planet the camera is parked at, which means the two best things here fight
 * each other: the text is unreadable over a bright globe, and the globe is
 * hidden behind the text. The fix: the planet on the left, the text always on
 * the right.
 *
 * So the left half of this section is deliberately EMPTY — it is a window onto
 * the Earth the canvas is already drawing behind the page — and everything
 * readable lives in the right half. This is the prototype for that pattern;
 * the hero and the Earth fly-in keep their full-bleed treatment because those
 * are the moments the scene is supposed to own outright.
 *
 * ── The one hard constraint ──
 * The camera itinerary (cameraKeyframes in lib/constants.ts, marked LOCKED) is
 * keyed to hardcoded FRACTIONS of total document height — Earth is framed over
 * [0.07, 0.19]. So this section's height is not a free variable: growing it
 * pushes every later section down and re-times every planet visit after Earth.
 * If you change the height here, re-check the keyframes.
 *
 * That constraint used to be enforced by geometry: the right column had a
 * definite height and the open city panel scrolled INSIDE it. It is now
 * enforced by something much harder to break — the panel is a `fixed` overlay
 * portalled to <body> (see CityPanel.tsx), so it contributes nothing to layout
 * at all. What this section renders is the SAME TREE whether a city is open or
 * closed: the index below is unconditional, there is no swap, and the section's
 * height therefore cannot depend on the panel.
 *
 * The definite height on the right column is GONE (see the note on that div).
 * It outlived the docked panel by one refactor and spent that time silently
 * clipping the city chips out of the section. It is a min-height now: the
 * section still cannot be shorter than the camera expects, but it is allowed
 * to be taller, and progressWarp.ts re-measures the live DOM so the itinerary
 * tracks whatever height it settles at.
 *
 * The old header warned against wrapping the swap in
 * <AnimatePresence mode="wait"> — `wait` serialised the transition, so every
 * city click spent 250ms showing an empty column, and in a throttled tab the
 * exiting index stuck at opacity:0 and the panel never mounted at all. That
 * warning is now moot rather than wrong: there is no swap left to serialise.
 * Do not reintroduce one. If the panel ever needs an exit animation, it belongs
 * inside CityPanel's own overlay, where nothing in the document flow is waiting
 * on it.
 */
export function Footprints() {
  const activeCity = useFootprintsStore((s) => s.activeCity);
  const setActiveCity = useFootprintsStore((s) => s.setActiveCity);

  // ── Focus restoration ──
  // The panel is a modal now, so closing it has to hand focus back to the chip
  // that opened it rather than dumping the visitor on <body> at the top of the
  // tab order. This lives here, not in CityPanel, because the trigger outlives
  // the dialog and because it then covers EVERY way of closing — the X, Escape,
  // a click on the empty half — without each of them having to remember.
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastOpenedRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeCity) {
      lastOpenedRef.current = activeCity;
      return;
    }
    const justClosed = lastOpenedRef.current;
    lastOpenedRef.current = null;
    if (!justClosed) return; // first render, nothing was ever open

    // Only reclaim focus if the dialog still had it. If the visitor closed by
    // clicking somewhere else entirely, the browser has already put focus where
    // they asked for it and stealing it back would be rude.
    if (document.activeElement && document.activeElement !== document.body) return;
    // preventScroll: the page is a camera track — yanking it back to this
    // section is precisely the jump this whole change exists to avoid.
    chipRefs.current.get(justClosed)?.focus({ preventScroll: true });
  }, [activeCity]);

  return (
    // pointer-events-none, with only the right column opting back in. This
    // section spans the full width, so a default-interactive box here would sit
    // on top of the Earth's city dots and eat every click aimed at them — the
    // exact bug page.tsx's wrapper comment describes.
    <section
      id="footprints"
      className="min-h-[60vh] flex items-center pt-8 sm:pt-12 pb-16 sm:pb-24 pointer-events-none"
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-6 md:grid-cols-2 md:gap-14">
        {/* LEFT — intentionally empty. This is the Earth's half of the frame.
            Hidden on mobile, where there is no room to split and the globe
            reads as a backdrop instead. */}
        <div aria-hidden className="hidden md:block" />

        {/* RIGHT — the only interactive thing on this screen besides the globe.
            MINIMUM height, not a definite one. It used to be
            `h-[calc(60vh-9rem)] min-h-[300px]` wrapping an `overflow-y-auto`
            column — a leftover from when the city panel docked inside here and
            needed a box to scroll in. That box is 300px tall and its content is
            454px, so all five chips sat 56px below the fold, and because
            globals.css hides the scrollbar on every element there was nothing
            on screen to say so: the section read "5 places … open one" with
            literally nothing to open.

            The calc stays as a FLOOR (60vh minus this section's own 9rem of
            padding) so short content still fills the frame the camera is
            parked on. Growing past it is now allowed — an oversized section is
            recoverable, an invisible control is not — and progressWarp.ts
            re-measures the live DOM every layout change, so the camera
            itinerary follows the new anchor instead of drifting against it. */}
        <div className="pointer-events-auto min-h-[calc(60vh-9rem)]">
          <div className="flex flex-col text-left">
            <SectionHeader
              label="// Earth"
              title="Footprints"
              gradient="earth"
              sectionNumber="01"
            />

            <p
              className="mb-7 max-w-sm font-mono text-[13px] leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              {/* Counted from the data, never typed out: the number has to
                  stay true the day another city is added. */}
              {cities.length} places that shaped me. Open one for the story
              and the photos.
            </p>

            {/* The reliable way to pick a city — the globe dots cluster into
                each other at some camera angles, so these are the primary
                control and the dots are the flourish. Rendered straight from
                cities.ts: no id is named here, so a new place shows up on
                its own. */}
            <div className="flex flex-wrap gap-2.5">
              {cities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  ref={(node) => {
                    if (node) chipRefs.current.set(city.id, node);
                    else chipRefs.current.delete(city.id);
                  }}
                  onClick={() => setActiveCity(city.id)}
                  aria-haspopup="dialog"
                  aria-expanded={activeCity === city.id}
                  aria-label={city.tie ? `${city.name} — ${city.tie}` : city.name}
                  className="flex min-h-[44px] cursor-pointer items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-white/55 transition-all duration-300 hover:border-white/25 hover:text-white/85 focus-visible:outline-2 focus-visible:outline-white/60 sm:py-2"
                >
                  {city.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* The open city. Rendered from inside this section because this is where
          it belongs conceptually and where its trigger lives — but it portals
          itself to <body> and positions `fixed`, so it occupies no space here
          and the section measures identically open or closed. */}
      {activeCity && <CityPanel key={activeCity} cityId={activeCity} />}
    </section>
  );
}
