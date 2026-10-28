'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { ScrollProgressProvider, useIsReading } from '@/hooks/useScrollProgress';
import { INTRO_DURATION } from '@/components/canvas/CameraController';
import { Navbar } from '@/components/layout/Navbar';
import { About } from '@/components/sections/About';
import { Builder } from '@/components/sections/Builder';
import { Finance } from '@/components/sections/Finance';
import { Creator } from '@/components/sections/Creator';
import { OffTheClock } from '@/components/sections/OffTheClock';
import { Memories } from '@/components/sections/Memories';
import { Contact } from '@/components/sections/Contact';
import { Footprints } from '@/components/sections/Footprints';
import { SystemOverview } from '@/components/sections/SystemOverview';
import { SystemRecap } from '@/components/sections/SystemRecap';
import { CursorGlow } from '@/components/ui/CursorGlow';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScrollProgress } from '@/components/ui/ScrollProgress';
import { PlanetProgress } from '@/components/ui/PlanetProgress';
import { AsteroidBelt } from '@/components/ui/AsteroidBelt';
import { SmoothScrollProvider } from '@/components/providers/SmoothScroll';

const CosmicCanvas = dynamic(
  () => import('@/components/canvas/CosmicCanvas').then((m) => m.CosmicCanvas),
  { ssr: false }
);

// ── Intro cue timings ──
// The camera's fly-in must not start while the loading overlay is still opaque,
// or it is spent entirely behind it — which is what used to happen, so the
// visitor's first visible frame was a camera already parked at its destination.
//
// LoadingScreen owns its own choreography and is not ours to change, so its
// numbers are MIRRORED here (keep in sync if that file's timings ever move):
//   • it cannot exit before reaching stage 'progress', 2500ms after mount;
//   • it then waits 400ms after canvasReady (isLoading false) before stage 'exit';
//   • 850ms after 'exit' it sets visible=false, and ONLY THEN does AnimatePresence
//     run the 150ms opacity fade that actually uncovers the page.
//
// That last point is the whole trick, and getting it wrong makes this feature do
// nothing. LoadingScreen's outer overlay (LoadingScreen.tsx:98) is
// `fixed inset-0 z-[100] bg-black` with initial={{opacity:1}} and exit={{opacity:0}}
// but NO animate prop — so its opacity sits at 1 for its entire mounted life, and
// `isExiting` only adds pointer-events-none. There IS an inner backdrop that fades
// earlier, but it is a black div fading over an opaque black parent: visually
// inert. Timing the cue to that inner fade fires ~600ms early and buries roughly
// three quarters of the flight behind a solid black screen — measured: the first
// clear frame landed at 76% of the eased curve, turning an intended 3x dolly into
// a 1.47x drift.
//
// So the cue is timed to the REAL reveal: exit + 850ms (visible=false) + most of
// the 150ms fade.
const OVERLAY_PROGRESS_STAGE_MS = 2500;
const OVERLAY_EXIT_DELAY_MS = 400;
const OVERLAY_UNMOUNT_DELAY_MS = 850; // 'exit' stage -> visible=false
const OVERLAY_FADE_MS = 150;          // AnimatePresence opacity 1 -> 0
// Start the flight 100ms before the veil is fully gone, so the curve is barely
// 1% in when the page becomes visible and essentially the whole move is seen.
const OVERLAY_FADE_LEAD_MS = OVERLAY_UNMOUNT_DELAY_MS + OVERLAY_FADE_MS - 100;

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  // A ref, not state: this is consumed inside a useFrame loop, and re-rendering
  // the entire canvas tree at the exact instant the flight starts is the one
  // thing guaranteed to make it stutter. Same reasoning as progressRef/motionRef
  // in CosmicScene. CameraController polls it and starts once — it never resets,
  // so scrolling back to the top cannot replay the intro.
  const introCueRef = useRef(false);
  const mountedAtRef = useRef(0);

  useEffect(() => {
    // Captured in an effect, in the same commit as LoadingScreen's own stage
    // timers, so the two clocks start together.
    mountedAtRef.current = performance.now();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const now = performance.now();
    // The overlay leaves at the LATER of "reached stage progress" and "canvas
    // ready" — isLoading can clear well before 2500ms on a warm load, and the
    // overlay stays put until its own stage timer catches up.
    const overlayExitsAt =
      Math.max(mountedAtRef.current + OVERLAY_PROGRESS_STAGE_MS, now) + OVERLAY_EXIT_DELAY_MS;
    const wait = Math.max(0, overlayExitsAt + OVERLAY_FADE_LEAD_MS - now);
    const t = setTimeout(() => {
      introCueRef.current = true;
    }, wait);
    return () => clearTimeout(t);
  }, [isLoading]);

  // ── Loading-screen failure ceiling ── DO NOT DELETE ──
  // isLoading is otherwise cleared by exactly one thing: CosmicCanvas's onReady,
  // fired from an effect INSIDE <Canvas>. Every way that mount can fail leaves the
  // callback unfired and pins LoadingScreen's `fixed inset-0 z-[100] bg-black`
  // overlay over the page forever — a black screen with no exit. An error boundary
  // does not close this: r3f awaits its configure() step, so a WebGLRenderer
  // constructor throw surfaces as an unhandled rejection, not a React error. This
  // timeout is deliberately the blunt instrument, because it also covers the modes
  // a WebGL probe would miss (chunk-load failure on the ssr:false dynamic import
  // above, a hung effect).
  // 6000ms is measured, not guessed: the overlay's own choreography already burns
  // ~2.9s (stage 'progress' at 2500ms, then 400ms before 'exit') and ReadyNotifier
  // waits another 800ms after the scene resolves, so a shorter ceiling would cut
  // off healthy loads. Lifting the overlay early is safe because the page body is
  // #000000 and every section is real prerendered DOM — the fallback is a black
  // page carrying all the copy, not a white flash. (It used to say the fallback
  // still had a starfield; that was true only while a CSS star layer rendered
  // outside the canvas. That layer is gone — see the note below — so the stars
  // now live solely inside the WebGL scene and go down with it.)
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <SmoothScrollProvider>
    <ScrollProgressProvider>
      <LoadingScreen isLoading={isLoading} />
      <CursorGlow />

      {/* Fixed Three.js canvas — dims while reading, see CanvasStage below */}
      <CanvasStage onReady={() => setIsLoading(false)} introCueRef={introCueRef} />

      {/* The 2D CSS starfield that used to render here is gone.
          It was a flat canvas translated by translate3d(0, -scrollY * 0.05, 0):
          every star displaced by the same amount regardless of depth, which is
          the "stars only scroll downwards" artifact — a plane cannot have
          parallax. It also could not be depth-tested against WebGL geometry, so
          before it was moved behind the canvas it painted stars across Earth's
          night side. ParticleField now carries the whole sky in world space,
          where the moving camera produces real depth-dependent parallax. */}

      {/* The city photo panel used to be mounted here, as a `fixed inset-0`
          modal that could open over any part of the page. It is now docked
          inside the Footprints section itself (components/ui/CityPanel.tsx) —
          it is one column of that section's split stage rather than an overlay,
          so it has no business being a page-level sibling of the canvas. */}

      {/* Scroll progress bar */}
      <ScrollProgress />

      {/* Planet dot sidebar navigation */}
      <PlanetProgress />

      {/* Scrollable HTML content.

          pointer-events-none on this wrapper is load-bearing, not decoration.
          The r3f canvas sits at `fixed inset-0 z-0` beneath this z-10 layer, and
          this div is a block box spanning the entire ~1,180vh document. With
          default pointer-events it absorbs every click across the whole page
          before the raycaster runs — so marking only the child <section>s
          transparent does nothing, because the click still lands on THIS box on
          its way down. That is why planet clicks and Earth's city dots were dead
          while SystemOverview's own copy told visitors to click a planet.

          So the layer is transparent by default and interactive content opts
          back in below. SystemOverview and Memories deliberately do NOT opt in:
          they are the two screens that sit over clickable scene objects. */}
      {/* <main>, not <div>: this is the homepage's only content landmark, and
          without it the page shipped zero landmarks — no <main>, no <footer>,
          no <header> — so assistive tech had nothing to jump to and no way to
          skip the navigation. /portfolio already gets this right. */}
      <main className="relative z-10 pointer-events-none">
        <div className="pointer-events-auto">
          <Navbar />
        </div>

        {/* ── Skip-link landing point ──
            Where the layout's "Skip to main content" link puts focus. It sits
            HERE, after the Navbar, and not on <main> itself: the Navbar renders
            inside this landmark, so focusing <main> would leave its ten
            controls still ahead in the tab order — the exact block being
            skipped. Empty and unstyled on purpose, so it contributes no height
            and no margins: every section below is sized with padding, never
            vertical margins, so this cannot shift the document and cannot move
            any of the height fractions cameraKeyframes is timed against.
            Verified by measuring scrollHeight before and after. */}
        <div id="main-content" tabIndex={-1} />

        {/* Overview hub — wide-angle solar system view, click any planet to jump.
            Stays click-through; its own children opt back in individually. */}
        <SystemOverview />

        {/* Sits over Earth's city dots — must stay click-through. */}
        <Memories />

        {/* ── No blanket pointer-events-auto wrapper here ──
            There used to be one `<div className="pointer-events-auto">` around
            everything from Footprints to SystemRecap, and it reintroduced the
            exact bug the comment above describes, one level up. Every section
            below already sets `pointer-events-none` on its own <section> and
            opts its interactive children back in individually — but that only
            makes the SECTION transparent to hits. A click landing in a
            section's deliberately-empty half then fell through to this
            wrapper, which was a full-width box 12,286px tall, and stopped
            there. Measured: elementFromPoint anywhere on the Earth in
            Footprints' empty left half returned the wrapper, so EarthGlobe's
            click-to-jump and its hover cursor were dead across most of the
            document.
            Sections own this decision now, which is the only level that can
            know which half of its own frame is empty. ── */}
        <Footprints />

        {/* ── Why the three ChapterCards are gone ──
            They grouped the old sections into BUILDER / TRADER / CREATOR
            chapters, each card announcing the two or three type-buckets that
            followed ("About · Projects · Skills"). That grouping was doing the
            job the sections themselves now do: the page is organised by domain,
            so the chapter IS the section. Keeping them would have printed the
            word BUILDER as a full-screen card immediately above a section whose
            own header reads Builder — the card and its contents collapsed into
            the same title. Their subtitles were also hardcoded lists of section
            names, i.e. a twentieth place the section order was written down.

            ChapterCard.tsx is now unreferenced. Left on disk rather than
            deleted: it is a generic component and page.tsx was its only caller,
            so nothing else breaks either way. */}
        <About />
        <Builder />

        {/* Physically where it belongs, and now more so than before. The belt
            lies between Mars and Jupiter, and this is the point where the camera
            turns around at Mercury and runs outward to Jupiter — crossing the
            belt, and passing the orphaned Mars, on the way. Previously this sat
            between the mars-mapped and jupiter-mapped sections; that adjacency
            is gone with Mars, but the crossing it depicts is still real. */}
        <AsteroidBelt />

        <Finance />
        <Creator />
        <OffTheClock />
        <Contact />

        {/* Recap — wide-angle solar system view again, planet jump links */}
        <SystemRecap />
      </main>
    </ScrollProgressProvider>
    </SmoothScrollProvider>
  );
}

/**
 * The canvas layer, dimmed while the visitor is reading.
 *
 * Lives in its own component because useIsReading needs to be INSIDE
 * ScrollProgressProvider, and Home is the thing that renders the provider.
 *
 * Why dim at all: the copy sits directly on top of a live starfield with no
 * separation, so even after the motion settles the scene still competes with
 * the text for contrast. Dropping to 55% while reading and restoring to full
 * during travel keeps the spectacle for the moments it is actually the point.
 *
 * The transition is asymmetric on purpose and mirrors the motion easing in
 * CosmicScene: waking is quick so the scene feels responsive the moment you
 * scroll, settling is slow so it recedes rather than blinking.
 */
function CanvasStage({
  onReady,
  introCueRef,
}: {
  onReady: () => void;
  introCueRef: React.RefObject<boolean>;
}) {
  // Hold the dim until the first-load flight has landed. Without this the
  // entrance plays at 55% opacity, because a visitor who has not scrolled yet
  // reads as "idle" — so the one moment the scene is meant to be at full
  // strength was the one moment it was dimmed. Derived from the real timings
  // rather than a guessed constant: overlay choreography + cue lead + the
  // flight itself (INTRO_DURATION is seconds), plus a small settle margin.
  const introHoldMs =
    OVERLAY_PROGRESS_STAGE_MS +
    OVERLAY_EXIT_DELAY_MS +
    OVERLAY_FADE_LEAD_MS +
    INTRO_DURATION * 1000 +
    400;
  const reading = useIsReading(550, introHoldMs);

  return (
    <div
      className="fixed inset-0 z-[1]"
      style={{
        opacity: reading ? 0.55 : 1,
        transition: reading
          ? 'opacity 900ms cubic-bezier(0.4, 0, 0.2, 1)'
          : 'opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <CosmicCanvas onReady={onReady} introCueRef={introCueRef} />
    </div>
  );
}
