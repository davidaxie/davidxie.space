'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CameraController } from './CameraController';
import { ParticleField } from './ParticleField';
import { SolarSystem } from './SolarSystem';
import { Effects } from './Effects';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { performanceTiers } from '@/lib/constants';
import { useProgressWarp } from '@/lib/progressWarp';
import { ItineraryGovernor, RM_SNAP_GAP } from '@/lib/itineraryGovernor';
import { prefersReducedMotion } from '@/components/providers/reducedMotion';

interface CosmicSceneProps {
  // The quality tier is chosen once in CosmicCanvas from device signals. This
  // component is the only path from there to the two consumers that can act on
  // it, so it threads the values through rather than re-detecting them.
  enableBloom?: boolean;
  particleCount?: number;
  // Same reason, different signal: only page.tsx knows when the loading overlay
  // starts leaving, and only CameraController can act on it. A ref rather than a
  // boolean prop so the cue costs zero renders — see progressRef and motionRef
  // below, which are refs for exactly the same reason.
  introCueRef?: React.RefObject<boolean>;
}

export function CosmicScene({
  enableBloom = performanceTiers.high.enableBloom,
  particleCount = performanceTiers.high.particleCount,
  introCueRef,
}: CosmicSceneProps = {}) {
  const { progressRef, lastScrollAtRef } = useScrollProgress();
  const smoothProgress = useRef(0);

  // ── The two progress axes ──
  // smoothProgress is the LIVE document axis: scrollTop / scrollable of the
  // page as it actually is, smoothed. cameraProgress is that same value warped
  // onto the NOMINAL axis cameraKeyframes was hand-timed against (see
  // lib/progressWarp.ts — at non-nominal viewports the DOM sections drift
  // 0.03–0.05 against the itinerary, which is how "02 // VENUS" ended up
  // captioning a distant Saturn) and then GOVERNED (see lib/itineraryGovernor.ts
  // — a rate-limited playhead that keeps a fast flick from spinning the camera,
  // and is a bit-identical pass-through at reading speeds). Evaluated ONCE per
  // frame here, because this component owns the smoothing and every consumer
  // hangs off its ref props: one evaluation, one measurement (inside the hook),
  // one playhead — no consumer can warp twice or read an ungoverned axis by
  // accident. Itinerary-timed consumers (CameraController's spline sampling,
  // Sun, EarthGlobe, Effects) get cameraProgress; DOM-anchored ones (the
  // stage-shift windows inside CameraController, ParticleField's decorative
  // star pulse, the PlanetProgress rail) stay on the raw ref — they describe
  // the document, and the document does not owe the governor anything.
  const warpRef = useProgressWarp();
  const cameraProgress = useRef(0);

  // The governor is per-scene follower state, so it lives in a ref like the
  // rest; constructed on first render only (its cumulative tables are a lazy
  // module-level singleton, so re-mounts don't pay the ~4ms build again).
  const governorRef = useRef<ItineraryGovernor | null>(null);
  if (governorRef.current === null) governorRef.current = new ItineraryGovernor();
  const governorSeeded = useRef(false);
  // Read once, at mount — the same one-shot pattern CameraController uses, and
  // for the same reason: flipping this mid-session would tear a running frame
  // loop. (Both used to keep a private copy of the matchMedia read; they share
  // providers/reducedMotion.ts now.)
  const [reducedMotion] = useState(() => prefersReducedMotion());

  // ── Calm-on-read ──
  // 1 = the visitor is scrolling, run the scene at full life.
  // 0 = the visitor has stopped, almost certainly to read; hold still.
  //
  // Every ambient animation in the canvas multiplies its per-frame advance by
  // this, so the whole scene settles together rather than each layer stopping
  // on its own schedule. Motion becomes something the visitor causes, instead
  // of a constant they have to read against.
  //
  // ── …and PINNED at 0 under reduced motion ──
  // This is the scene's reduced-motion switch, not just its idle damper. The
  // damper alone bought those visitors almost nothing, because the thing that
  // drives it back to 1 is scrolling — and scrolling is the entire interaction
  // model of this page. The instant they touched the wheel, star twinkle, the
  // Sun's corona churn, every planet's rotation and Earth's clouds all ramped
  // back to full speed, i.e. exactly the ambient motion the preference is
  // asking to be spared. Seeded at 0 here and never advanced in the frame loop
  // below, so it stays there for the session.
  // Every consumer (Sun, EarthGlobe, TexturedPlanet, Planet, ParticleField)
  // uses it only as a multiplier on a per-frame advance — checked, no divisor,
  // no zero-guard needed — so 0 freezes the ambient layers while leaving the
  // scroll-driven camera, the section transitions and all geometry intact.
  const motionRef = useRef(reducedMotion ? 0 : 1);

  useFrame((_, delta) => {
    const gov = governorRef.current!;
    const target = progressRef.current ?? 0;

    // First frame: seed the smoothing AND the governor playhead at the raw
    // scroll position. On a fresh load raw is 0, warp(0) === 0, and this is
    // the identity. On a browser-restored scroll position it parks everything
    // instantly — restoring a session must never replay the journey to it
    // (CameraController's hold-abort has always snapped for the same reason,
    // and its rotation clamp reads the snap flag this sets to reseed itself).
    if (!governorSeeded.current) {
      governorSeeded.current = true;
      smoothProgress.current = target;
      gov.snap(warpRef.current(target));
    }

    // The delta*4 smoothing is deliberately UNCHANGED and sits UPSTREAM of the
    // governor: it is part of the reading-speed identity contract (the
    // governor passes its output through bit-for-bit whenever the gap fits the
    // frame budgets), and it is what turns a discrete wheel tick into the
    // continuous target the governor rate-limits.
    smoothProgress.current += (target - smoothProgress.current) * Math.min(1, delta * 4);
    // Warp AFTER smoothing, not before: the warp is piecewise-linear, so
    // smoothing its output would round off every anchor knot differently at
    // different scroll speeds. Smoothing the live axis and warping the result
    // keeps the knots exact.
    const warped = warpRef.current(smoothProgress.current);

    // Reduced motion: when the backlog is more than a nudge, CUT instead of
    // flying. These visitors already get cuts everywhere else — the intro is
    // disabled outright and a restored scroll position parks instantly — and a
    // governed catch-up is a multi-second whole-viewport camera move, i.e.
    // precisely the class of motion the preference asks to avoid. Below the
    // threshold the governor passes through and the follower's gentle settle
    // (unchanged from today) does the work.
    if (reducedMotion && Math.abs(warped - gov.play) > RM_SNAP_GAP) {
      gov.snap(warped);
    }
    cameraProgress.current = gov.update(warped, delta);

    // Reduced motion: motionRef was seeded at 0 and stays there. Returning
    // before the damper runs is the whole fix — the block below is precisely
    // what used to hand these visitors a full-speed scene the moment they
    // scrolled. Everything above this line still runs: the camera playhead is
    // scroll-driven, not ambient, and parking it would strand the itinerary.
    if (reducedMotion) return;

    // Grace period before settling. Long enough that the gaps between wheel
    // ticks or the tail of a Lenis glide do not read as "stopped" and cause
    // the scene to stutter; short enough that pausing to read is answered
    // almost immediately.
    const idleMs = performance.now() - (lastScrollAtRef.current ?? 0);
    const wantsMotion = idleMs < 550 ? 1 : 0;

    // Asymmetric easing, deliberately. Waking up is quick (~0.15s) so the
    // scene feels responsive the instant you touch the wheel; settling is slow
    // (~0.9s) so it drifts to rest like something with inertia rather than
    // hitting a brake. Symmetric easing here felt mechanical in both
    // directions.
    const ease = wantsMotion > motionRef.current ? delta * 6.5 : delta * 1.1;
    motionRef.current += (wantsMotion - motionRef.current) * Math.min(1, ease);
  });

  return (
    <>
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 80, 300]} />
      <ambientLight intensity={0.015} color="#ffffff" />

      <CameraController
        progressRef={smoothProgress}
        cameraProgressRef={cameraProgress}
        introCueRef={introCueRef}
        governorRef={governorRef}
      />
      {/* ParticleField's only progress use is a decorative twinkle pulse —
          sin(uProgress·4π) — with no relationship to the camera itinerary, so
          it deliberately stays on the raw document axis. */}
      <ParticleField progressRef={smoothProgress} particleCount={particleCount} motionRef={motionRef} />
      <SolarSystem progressRef={smoothProgress} cameraProgressRef={cameraProgress} motionRef={motionRef} />
      <Effects cameraProgressRef={cameraProgress} enableBloom={enableBloom} />
    </>
  );
}
