// ── Live → nominal progress warp — 2026-08-19 ──
//
// ROOT CAUSE. cameraKeyframes' scroll column (constants.ts) is hand-timed
// against ONE viewport: the 2026-08-14 nominal-desktop snapshot documented in
// the sectionRanges comment block (1664×1306, scrollable 15,119px). Scroll
// progress, though, is scrollTop / scrollable of the LIVE document — and at
// other viewports the DOM sections land 0.03–0.05 of progress earlier or later
// than the snapshot says, because section heights are not proportional to
// viewport height. Measured at 1040×979: the About section centres at 0.184
// while the camera itinerary is still departing Earth (the Venus dwell only
// starts at 0.213) — the visitor reads "02 // VENUS" beside a distant Saturn,
// with Venus nowhere in frame.
//
// THE FIX. The stage-shift system in CameraController already solved this exact
// problem for its own windows by measuring the live DOM (measureSectionWindow +
// a ResizeObserver on document.body). This module gives the camera — and every
// other consumer whose thresholds are timed against the camera itinerary — the
// same treatment, WITHOUT touching the locked cameraKeyframes table: we warp
// the live scroll progress onto the NOMINAL progress axis before sampling the
// spline. Each section's measured live anchor (where it actually centres/
// settles right now) is mapped to the nominal progress the keyframes were timed
// against; between anchors the warp interpolates linearly. On the nominal
// viewport the warp measures out as the identity, so nothing moves there.
//
// Consumers: CosmicScene evaluates the warp once per frame into a
// cameraProgressRef; CameraController samples the spline with it, and
// EarthGlobe / Sun / Effects — whose windows and breakpoints quote nominal
// sectionRanges values — read the same ref. DOM-anchored consumers (the
// PlanetProgress rail, useSectionInView, the stage-shift windows themselves)
// keep RAW live progress: they describe the document, not the camera, and the
// stage-shift windows are ALREADY live-measured — warping their input would
// apply the correction twice.

import { useEffect, useRef } from 'react';
import type { SectionId } from './constants';

/** One measured correspondence: this LIVE progress should sample the camera
 *  spline at this NOMINAL progress. */
export interface WarpAnchor {
  live: number;
  nominal: number;
}

interface NominalAnchorSpec {
  id: SectionId;
  /** Which live moment of the section anchors it — see measureLiveAnchors. */
  measure: 'centred' | 'settled';
  nominal: number;
}

// The nominal column quotes the sectionRanges comment block in constants.ts —
// the 2026-08-14 snapshot's "centred moments": memories .086, footprints .156,
// about .225, builder .332, finance .530 (settled .439), creator .708,
// offtheclock .809, contact .912. Those are the moments the camera dwells were
// timed to bracket (each dwell covers its section's settled-to-centred
// stretch — see the RETIME note above cameraKeyframes), which is exactly what
// makes them the right correspondence points: "section X centred on screen"
// must land on the progress where the itinerary parks at X's planet.
//
// Finance gets TWO anchors, settled 0.439 then centred 0.530. It was the ~4-
// viewport split-stage giant (27% of the page) when this pair was added
// (densened 2026-08-20; still the tallest section): its dwell ARRIVES at 0.436,
// just before the nominal settled moment, and holds past centre — anchoring
// only the centre would let the arrival drift by most of a viewport at other
// aspect ratios. Its settled anchor uses the same three-way clamp as
// measureSectionWindow's 2026-08-19 settled formula so both systems agree on
// what "settled" means for a tall section.
//
// The endpoints [0→0] and [1→1] are fixed inside buildWarp (the overview hub
// and the recap pin the axis at both ends); the recap needs no anchor of its
// own — the contact→1 tail segment carries it.
export const NOMINAL_ANCHORS: readonly NominalAnchorSpec[] = [
  { id: 'memories', measure: 'centred', nominal: 0.086 },
  { id: 'footprints', measure: 'centred', nominal: 0.156 },
  { id: 'about', measure: 'centred', nominal: 0.225 },
  // .332, not the .330 that stood here until 2026-08-27: the snapshot's own
  // formula gives (4702 + 1932/2 − 653)/15119 = 0.33170. Every other number in
  // this column is its derived moment rounded to three decimals (max error
  // 5e-4); this one was out by 1.7e-3, and it was the single largest deviation
  // from identity when the nominal snapshot is fed back in as the live layout.
  { id: 'builder', measure: 'centred', nominal: 0.332 },
  { id: 'finance', measure: 'settled', nominal: 0.439 },
  { id: 'finance', measure: 'centred', nominal: 0.53 },
  { id: 'creator', measure: 'centred', nominal: 0.708 },
  { id: 'offtheclock', measure: 'centred', nominal: 0.809 },
  { id: 'contact', measure: 'centred', nominal: 0.912 },
];

/** The no-op warp — the fallback whenever there is nothing to measure, and the
 *  exact behaviour of buildWarp([]). Exported so consumers can seed refs with
 *  it before the first measurement lands. */
export const identityWarp = (p: number): number => p;

/**
 * Build a piecewise-linear, monotone warp from measured {live, nominal} pairs.
 *
 * Guarantees, in order of importance:
 *   • warp(0) === 0 and warp(1) === 1 exactly — the fixed endpoints are
 *     prepended/appended here, never supplied by the caller, so a bad
 *     measurement cannot move them. Inputs outside [0, 1] clamp.
 *   • Strictly monotone. Any anchor that fails strict ascent against the last
 *     ACCEPTED point in EITHER axis is dropped (as is anything at or past 1 in
 *     either axis, which would collide with the fixed end). A degenerate layout
 *     — a collapsed section, two sections measuring to the same progress —
 *     therefore degrades toward identity segment by segment instead of folding
 *     the axis back on itself and running the camera backwards mid-scroll.
 *   • buildWarp([]) is the identity, so "nothing measured" is indistinguishable
 *     from "nominal viewport", which is the correct meaning of both.
 */
export function buildWarp(anchors: ReadonlyArray<WarpAnchor>): (p: number) => number {
  const lives: number[] = [0];
  const nominals: number[] = [0];
  for (const a of anchors) {
    if (
      !Number.isFinite(a.live) ||
      !Number.isFinite(a.nominal) ||
      a.live <= lives[lives.length - 1] ||
      a.nominal <= nominals[nominals.length - 1] ||
      a.live >= 1 ||
      a.nominal >= 1
    ) {
      continue;
    }
    lives.push(a.live);
    nominals.push(a.nominal);
  }
  if (lives.length === 1) return identityWarp; // endpoints only — no warp to do
  lives.push(1);
  nominals.push(1);

  return (p: number): number => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    // Walk to the containing segment. At most ~11 knots — a linear scan is
    // faster than it looks and allocation-free, and this runs once per frame.
    let i = 1;
    while (i < lives.length - 1 && p > lives[i]) i++;
    const t = (p - lives[i - 1]) / (lives[i] - lives[i - 1]);
    return nominals[i - 1] + t * (nominals[i] - nominals[i - 1]);
  };
}

/**
 * Read every anchor section's LIVE progress off the current DOM.
 *
 * The formulas are deliberately identical to CameraController's
 * measureSectionWindow (including the 2026-08-19 three-way settled clamp), and
 * to the axis progressRef itself is measured on — top is absolute
 * (getBoundingClientRect().top + scrollY), so this is scroll-position-
 * independent and can run from a ResizeObserver at any scroll offset.
 *
 * Returns null when the document cannot scroll (no progress axis exists to
 * warp). A missing section element skips that anchor rather than failing the
 * whole measurement — buildWarp treats absent anchors as identity segments.
 */
export function measureLiveAnchors(): WarpAnchor[] | null {
  const vh = window.innerHeight;
  const scrollable = document.documentElement.scrollHeight - vh;
  if (scrollable <= 0) return null;

  const anchors: WarpAnchor[] = [];
  for (const spec of NOMINAL_ANCHORS) {
    const el = document.getElementById(spec.id);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const centre = (top + rect.height / 2 - vh / 2) / scrollable;
    const live =
      spec.measure === 'centred'
        ? centre
        : // Settled: bottom edge on screen, clamped by "top reaches viewport
          // top" for sections taller than the viewport, clamped by centre for
          // degenerate ones — measureSectionWindow's formula, verbatim.
          Math.min((top + rect.height - vh) / scrollable, top / scrollable, centre);
    anchors.push({ live, nominal: spec.nominal });
  }
  return anchors;
}

/**
 * The live warp as a ref, re-measured whenever the layout can have moved.
 *
 * Same remeasure pattern as useStageShiftEntries in CameraController — the
 * document keeps growing after mount (fonts swap, city photos decode, MDX
 * hydrates) and every one of those moves every section on the progress axis;
 * observing the body catches all of it, and `resize` covers the viewport-height
 * half of the calculation. It is a SECOND identical observer rather than a
 * shared one on purpose: the stage-shift observer is private to
 * CameraController and this hook is consumed by CosmicScene — threading one
 * observer between them would couple the two components for the price of one
 * ResizeObserver, which is cheaper than the coupling.
 *
 * A ref, not state: it is read once per frame inside useFrame and must never
 * trigger a render. Before the first measurement (and whenever the document is
 * unscrollable) it is the identity, so the camera simply behaves as it did
 * before this module existed.
 */
export function useProgressWarp(): React.RefObject<(p: number) => number> {
  const warpRef = useRef<(p: number) => number>(identityWarp);

  useEffect(() => {
    const remeasure = () => {
      const anchors = measureLiveAnchors();
      warpRef.current = anchors ? buildWarp(anchors) : identityWarp;
    };

    remeasure();

    const observer = new ResizeObserver(remeasure);
    observer.observe(document.body);
    window.addEventListener('resize', remeasure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', remeasure);
    };
  }, []);

  return warpRef;
}
