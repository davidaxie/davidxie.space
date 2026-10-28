'use client';

import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getCameraState } from '@/lib/cameraPath';
import { planetConfigs, type SectionId } from '@/lib/constants';
import { ItineraryGovernor, MAX_STEP as GOVERNOR_MAX_STEP } from '@/lib/itineraryGovernor';
import { prefersReducedMotion } from '@/components/providers/reducedMotion';

interface CameraControllerProps {
  progressRef: React.RefObject<number>;
  /**
   * LIVE progress warped onto the NOMINAL axis cameraKeyframes is timed
   * against (lib/progressWarp.ts) and then GOVERNED by the itinerary playhead
   * (lib/itineraryGovernor.ts) — computed once per frame in CosmicScene.
   * The spline is sampled with THIS; progressRef stays the raw document axis
   * for everything measured from the live DOM (the stage-shift windows below,
   * the scroll-abort check). Optional, falling back to the raw value, so an
   * un-threaded caller gets the old behaviour — correct on the nominal
   * viewport, drifting elsewhere — rather than a crash.
   */
  cameraProgressRef?: React.RefObject<number>;
  /**
   * The governor instance whose output cameraProgressRef carries — the SAME
   * instance, passed whole rather than as unpacked booleans, because the
   * follower needs three of its facets in one frame (engaged, w, and the
   * one-read snap flag) and consuming the flag is a mutation that must have
   * exactly one owner. Optional like cameraProgressRef, and its absence means
   * the pre-governor follower: never engaged, no aim blend, no snap frames.
   */
  governorRef?: React.RefObject<ItineraryGovernor | null>;
  /**
   * Flips true the moment the loading overlay actually starts leaving — see the
   * cue block in app/page.tsx for why that instant and not `onReady`.
   *
   * Optional, and its absence deliberately means "no intro": a caller that does
   * not thread the cue gets a camera parked at the overview from frame one,
   * which is the old behaviour. The failure mode of a missing cue must never be
   * a camera stranded 171 units out with nothing to release it.
   */
  introCueRef?: React.RefObject<boolean>;
}

const _lerpLook = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _clampDir = new THREE.Vector3();
const _clampAxis = new THREE.Vector3();
const _clampQuat = new THREE.Quaternion();

// The Sun. The governor's deep-catch-up blend (w) aims the camera here — see
// the Sun-anchor section of lib/itineraryGovernor.ts for why that is
// compositionally native rather than a trick.
const ORIGIN = new THREE.Vector3(0, 0, 0);

// ── Engaged-follower tuning ── (only read while governorRef.engaged — the
// disengaged path below keeps today's constants verbatim)
// Adaptive factor 1.5 + 0.075·(dist−5), clamped to [1.5, 4.5]: a continuous
// ramp instead of the disengaged branch's 1.0/1.5 step, because during a
// governed catch-up dist can legitimately reach tens of units and a binary
// factor either lags hopelessly or arrives twitchy.
const ENGAGED_ADAPT_SLOPE = 0.075;
const ENGAGED_ADAPT_MIN = 1.5;
const ENGAGED_ADAPT_MAX = 4.5;

// Rendered view-direction hard ceiling, deg/s — roughly 1.3× the natural peak
// the governed pipeline produces. Validation against the shipped code
// (2026-08-21) measured 0 clamp frames in flicks, reversals, dot-clicks, 5s
// jank frames and both slow baselines, and exactly ONE engagement class: a
// sustained fast wheel run (0.25 progress/s held for 2s) grazes it for ~5
// frames near p≈0.69, max excess 1.7°, held cleanly at the cap — the follower
// lagging a deep sun-anchored catch-up whose chord geometry momentarily
// exceeds the playhead-track budgets. That is the clamp doing its job, not a
// bug. Beyond that it exists for the inputs no budget upstream can see —
// chiefly a warp remeasure landing mid-flight and teleporting the target
// under the follower.
const ROT_HARD = 600;

// ══ Split-stage shift — pushing each section's planet out of the middle ══
//
// Footprints was the first section built as a "split stage": the copy lives in a
// right-hand column and the left half of the frame is left empty for the globe.
// Moving the TEXT was only half of it. Earth still sat dead-centre and filled
// the frame, so the copy landed on top of it anyway. With text on the right,
// the planet does not have to be the primary focus: it can sit to the left.
//
// The WHOLE site now uses that pattern — every content section leaves half the
// frame empty for its planet and alternates which half — so the machinery below,
// originally built and tuned for Footprints alone, is generalized: one signed,
// windowed ramp PER SPLIT SECTION, summed into a single net offset each frame.
// The Footprints tuning (fraction, curves, its measured window with the Memories
// runway) is treated as correct and preserved exactly; the other sections reuse
// the same fraction and curves on their own measured windows.
//
// This displaces planets WITHOUT touching cameraKeyframes — that table is marked
// LOCKED and its whole itinerary (one inward run, one outward run, a single
// direction change at Mercury) is a composition in its own right. Retuning the
// planet stations to fake a lateral offset would bake a layout decision into a
// spline that every other section reads. So the keyframes still aim straight at
// each planet and this offsets the AIM POINT afterward, inside each window only.
//
// SIGN CONVENTION — the one thing that must not be guessed at. The offset is
// applied along camera-RIGHT: aim to the RIGHT of a subject and the subject
// slides LEFT in frame. So a section whose planet belongs on the LEFT (content
// right) contributes +1, and a section whose planet belongs on the RIGHT
// (content left) contributes -1. Flip a sign and the planet slides INTO the
// text instead of away from it — the exact bug this feature exists to prevent,
// and it fails silently because the ramp itself still runs smoothly.
//
// The offset is expressed as a fraction of the frustum's width at the subject's
// distance rather than in world units, so it holds its screen position under
// the live fov (which the proximity logic below is actively animating between
// 55 and 62) and at any aspect ratio.
const STAGE_SHIFT_FRACTION = 0.24; // of full frame width; raise to push further

// Max rate of change of the SUMMED shift, in units of netShift (±1) per
// second. Added 2026-08-21 after the governed-follower validation run: the
// governor bounds the itinerary, but the stage shift reads the RAW document
// axis (its windows are live-DOM measurements — correct, and unchanged), so a
// fast flick used to sweep all six ±0.24-frame-width windows at scroll speed
// and became the DOMINANT residual view spin (28°/frame right after a
// dot-click jump; rendered peaks 600–1700°/s in the flick scenarios).
// Slew-limiting the summed VALUE keeps the windows where the DOM says they
// are while capping how fast the aim can be dragged sideways: at 3.0/s the
// full −1→+1 swing takes ~0.7s (~43°/s of aim sweep at fov 60).
// Never engages at reading speed: the narrowest ramp window (~0.046 of
// progress) crossed at a brisk 0.08 progress/s peaks at ~2.2/s of natural
// slew, under the cap. Snap frames (governor snap, intro hold-abort) bypass
// the limiter — after a cut the planet must be in position, not sliding in.
const STAGE_SHIFT_SLEW = 3.0;

// Which half of the frame each section's PLANET belongs on. Content owns the
// other half — the layout pass already built the columns, this table mirrors it.
// Sections absent here get no shift: memories and the overview hero are
// deliberately full-bleed compositions, contact is centred by design, and the
// recap is not a section. Keyed by SectionId so a renamed section fails to
// compile here instead of silently losing its shift.
const STAGE_SIDE: Partial<Record<SectionId, 'left' | 'right'>> = {
  footprints: 'left', // content right — the original, tuning locked
  about: 'right', // content left
  builder: 'left', // content right
  finance: 'right', // content left
  creator: 'left', // content right
  offtheclock: 'right', // content left
};

// See the sign-convention note above: +right aim slides the subject LEFT.
const STAGE_SIGN: Record<'left' | 'right', 1 | -1> = { left: 1, right: -1 };

// Ordered as the sections appear on the page — the composition guard in
// measureStageShiftEntries compares ADJACENT entries, so order is load-bearing.
const STAGE_SECTIONS = Object.keys(STAGE_SIDE) as ReadonlyArray<SectionId>;

// Scroll-progress ramp — FRACTIONS OF TOTAL DOCUMENT HEIGHT, matching what
// progressRef carries.
//
// These used to be hardcoded, measured by hand against a 15,115px document. That
// is a standing trap: the window is a property of where Footprints happens to
// land in the layout, and EVERY section above it moves that. It duly broke — a
// later pass retuned the About and Skills heights, the document became 14,029px,
// and the ramp no longer started until progress 0.105 when the section was
// already centred at 0.098. Earth sat dead-centre under the copy for the whole
// time the copy was legible, which is the exact bug the stage shift exists to
// prevent, and nothing failed loudly enough to notice.
//
// So the windows are now MEASURED from the live sections (see
// useStageShiftEntries) and these are only the fallback for the frames before
// the first measurement lands — and for the pathological case where a section
// id is not in the DOM.
//
// They must be regenerated from measureSectionWindow's CURRENT formulas
// whenever that function's shape changes. A fallback left describing the old
// shape is the quiet version of the same failure: it is only on screen for a
// frame or two, so a wrong one shows up as an unexplained twitch at the top of
// the page and nothing else.
//
// SNAPSHOT they are taken from: a 1670×1306 viewport with the page fully
// settled (15,119px scrollable). Footprints entered at 0.086, was wholly on
// screen at 0.138, centred at 0.155 and left at 0.225; Memories entered at
// 0.000 and centred at 0.086; the other five sections' anchors were read the
// same way on the same page. Deliberately approximate — the document is ~9%
// shorter before the city photos decode, which is exactly the window the
// Footprints pair covers, and no single set of numbers is right for both
// states. They only have to be close enough that the first measured frame is
// not a jump.
// The three tall sections' in-ramps were retightened 2026-08-19 to mirror the
// top/scrollable term added to measureSectionWindow's settled clamp below —
// their in-ramps then ended at that snapshot's "section top reaches viewport
// top" (0.311 / 0.439 / 0.794) instead of at centre.
// RE-ESTIMATED 2026-08-21 (builder/finance/creator/offtheclock rows): the
// 2026-08-20 finance densening and the 08-20/08-21 creator, offtheclock and
// sideProjects passes reshaped the document — nominal-axis heights now
// builder ~2512px, finance ~2874px, creator ~1473px, offtheclock ~1467px,
// scrollable ~14,381px at 1664×1306. These four rows were recomputed
// arithmetically from the section order + those heights with
// measureSectionWindow's formulas, not read off a live page; footprints/about
// keep the 2026-08-19 values, which sit ~0.01 off the shorter document —
// inside the approximate tolerance above.
const STAGE_SHIFT_FALLBACKS: Record<SectionId, StageShiftWindow | null> = {
  memories: null,
  // In-end 0.138→0.150 (2026-08-19): mirrors the runway-case relaxation in
  // measureSectionWindow — see the inEnd note there.
  footprints: { in: [0.043, 0.15], out: [0.179, 0.225] },
  about: { in: [0.138, 0.225], out: [0.253, 0.311] },
  builder: { in: [0.236, 0.327], out: [0.413, 0.502] },
  finance: { in: [0.411, 0.502], out: [0.605, 0.701] },
  creator: { in: [0.611, 0.701], out: [0.739, 0.804] },
  offtheclock: { in: [0.713, 0.804], out: [0.842, 0.906] },
  contact: null,
};

// Below this the layout is one column (every split section hides its empty
// half), so there is no side column to clear and every planet should stay
// centred as a backdrop. Matches Tailwind's `md:` breakpoint, which is what
// actually decides whether the split is on. Gates the whole summed shift, not
// just Footprints'.
const STAGE_SPLIT_MIN_WIDTH = 768;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * smoothstep with its travel pushed LATE — the approach curve for the shift.
 *
 * Plain smoothstep is symmetric: half the displacement is spent in the first
 * half of the window. That is wrong here, because the first half of the window
 * is Memories, whose entire composition is a centred globe with clickable city
 * dots on it. Squaring keeps the curve at 0 for longer (f'(0) = f''(0) = 0, so
 * the onset has no detectable start) and still lands on exactly 1 with zero
 * velocity, but it is only ~19% of the way along at the window's midpoint
 * instead of 50%. Concretely: Earth is nudged ~4.5% of the frame off centre
 * while Memories is centred, and the remaining 95% of the move happens in the
 * dead zone after Memories has been read and before the Footprints copy is
 * wholly on screen.
 *
 * The instinct to reach for smootherstep (the quintic 6t⁵−15t⁴+10t³) is the
 * trap. It is gentler at the ends, but its PEAK slope is 1.875 against
 * smoothstep's 1.5, and peak slope is what "abrupt" actually measures — the
 * globe's screen speed per pixel of scroll. It would make the middle of the
 * move worse in exchange for ends nobody was complaining about.
 */
function easeLate(edge0: number, edge1: number, x: number): number {
  const s = smoothstep(edge0, edge1, x);
  return s * s;
}

interface StageShiftWindow {
  in: readonly [number, number];
  out: readonly [number, number];
}

// One precomputed row per split section: the sign it contributes and the window
// it contributes over. Rebuilt only on layout change; the per-frame loop walks
// this array and allocates nothing.
interface StageShiftEntry {
  id: SectionId;
  sign: 1 | -1;
  window: StageShiftWindow;
}

function buildFallbackEntries(): StageShiftEntry[] {
  const entries: StageShiftEntry[] = [];
  for (const id of STAGE_SECTIONS) {
    const window = STAGE_SHIFT_FALLBACKS[id];
    if (window) entries.push({ id, sign: STAGE_SIGN[STAGE_SIDE[id]!], window });
  }
  return entries;
}

/**
 * 0 outside a section's window, 1 across its middle, eased at both ends.
 * One ramp shape for every split section; the notes below were written against
 * Footprints, whose geometry is the hardest case (a naked entrance out of a
 * centred composition) — the other sections' entrances AND exits both sit under
 * inter-planet pans, so a curve safe for Footprints is safe for all of them.
 *
 * The two ends deliberately use DIFFERENT curves, which is not an oversight.
 *
 * The RETURN is covered. cameraKeyframes pans off Earth and onto Venus across
 * roughly 0.198–0.214 — a two-station swing that throws the globe out of frame
 * on its own — and the out-window sits on top of that. A 0.24-frame-width
 * recentring hidden inside a pan that large is invisible, which is why nobody
 * has ever complained about the second half of this ramp even though it moves
 * exactly as far as the first half, over a comparable stretch of scroll.
 *
 * The APPROACH has no cover at all. Between 0.070 and 0.182 the keyframes hold
 * lookAt fixed on [3, 6, 14] and only creep the position around in a slow
 * orbit, so the stage shift is the ONLY thing moving the globe laterally. That
 * asymmetry — covered exit, naked entrance — is why the entrance gets the wider
 * window and the late-biased curve and the exit keeps plain smoothstep.
 */
function stageShiftRamp(progress: number, w: StageShiftWindow): number {
  return (
    easeLate(w.in[0], w.in[1], progress) *
    (1 - smoothstep(w.out[0], w.out[1], progress))
  );
}

/**
 * Derive one section's shift window from where it actually sits right now.
 *
 * Every split section is measured with the same anchors; the ONLY per-section
 * variation is `runwayAboveId`, which widens the in-ramp back into the section
 * above. Footprints needs it because it shares Earth with Memories — the
 * camera never pans between the two, so the shift is the only lateral motion
 * and it needs the extra runway documented below. Every OTHER split section
 * changes planet at its boundary: the inter-planet pan throws the outgoing
 * planet out of frame and carries the incoming one in, so both the entrance
 * and the exit are covered the same way Footprints' out-ramp is, and the
 * default [enter, min(settled, centre)] in-ramp is already generous.
 *
 * The rest of this comment is the Footprints-era derivation, kept because it
 * is the WHY for every formula below.
 *
 * Anchors, in the same units progressRef reports (scrollY / scrollable):
 *   enter   — the section's top edge reaches the bottom of the viewport
 *   settled — its bottom edge clears the bottom of the viewport, i.e. the whole
 *             section is on screen and the copy can be read end to end
 *   centre  — the section is centred in the viewport
 *   leave   — its bottom edge passes the top of the viewport
 *
 * ── Why the in-window is no longer [enter, (enter + centre) / 2] ──
 *
 * That version was the abrupt one, and the arithmetic says why. Measured live,
 * Footprints entered at 0.086 and centred at 0.155, so the whole 0.24-frame-width
 * displacement — a large move, roughly a quarter of the screen — was crammed
 * into 0.035 of scroll progress: 522px of scrolling on a 15,119px scrollable.
 * With smoothstep's 1.5× peak slope that put the globe's peak screen speed at
 * 1.15px per pixel of scroll — the globe was crossing the screen FASTER than the
 * page was scrolling. It read as a snap because it was one. The window below
 * measures 1,437px and peaks at 0.55px per pixel of scroll: now the globe always
 * moves slower than the page, which is the actual test for "drift, not snap".
 *
 * Worse, the section above Footprints is Memories, which is mapped to the same
 * planet: the keyframes hold Earth dead centre through all of it. So the move
 * started from a composition the visitor had been staring at for a full screen.
 *
 * ── The shape now ──
 *
 * START at the midpoint of Memories' own enter→centre. Memories is `min-h-screen`
 * and contains no copy at all — one 9px stat label pinned bottom-centre — so
 * there is nothing on that screen for a drifting globe to collide with, and this
 * is the moment the camera's inbound dive is still running and can absorb the
 * onset. Note that Memories being exactly one viewport tall makes its CENTRE and
 * Footprints' ENTER the same instant: anchoring the start to "Memories centred"
 * would have bought literally zero extra runway. That is the trap here — it
 * sounds like the conservative choice and is actually a no-op.
 *
 * Starting that early does mean the ramp is technically alive for a few hundred
 * pixels while cameraKeyframes is still aiming at the SUN rather than at Earth
 * (the aim only lands on [3, 6, 14] at 0.070), and the offset is applied to
 * whatever lookAt happens to be. That is safe only because the curve is
 * late-biased: measured, the shift is 0.0002 of frame width when it first clears
 * the >0.001 gate below and 0.009 by the time the aim reaches Earth — sub-pixel,
 * then ~15px, underneath a 15-unit dive. Flatten this curve and that stops being
 * true, and you get a Sun that drifts off its mark on the way in.
 *
 * END at `settled` rather than `centre`. This is stricter than the rule the
 * feature has to hold (Earth aside before the copy is legible) on purpose: the
 * copy is legible from the moment it is wholly on screen, not from the moment
 * the section happens to be centred, and the ~0.019 of progress between the two
 * is exactly the margin that stops a late-biased curve from still creeping while
 * someone is reading.
 *
 * Both ends are Math.min-clamped so measuring can only ever WIDEN the window
 * versus the old behaviour, never narrow it. A layout change that made this
 * ramp faster than it was before would be a silent regression of the same bug.
 */
function measureSectionWindow(
  sectionId: SectionId,
  runwayAboveId?: string
): StageShiftWindow | null {
  const section = document.getElementById(sectionId);
  if (!section) return null;

  const vh = window.innerHeight;
  const scrollable = document.documentElement.scrollHeight - vh;
  // A document shorter than the viewport cannot scroll, so there is no progress
  // axis to place the window on — dividing here would yield Infinity.
  if (scrollable <= 0) return null;

  const rect = section.getBoundingClientRect();
  const top = rect.top + window.scrollY;

  const enter = (top - vh) / scrollable;
  const centre = (top + rect.height / 2 - vh / 2) / scrollable;
  const leave = (top + rect.height) / scrollable;
  // Guards the degenerate ordering a collapsed or displaced section could
  // produce; a non-monotonic window would make the two curves overlap and clamp
  // the ramp to something less than 1 across the whole section.
  if (!(enter < centre && centre < leave)) return null;

  // Clamped to centre because a section TALLER than the viewport is never wholly
  // on screen, and this expression would then land after centre — i.e. past the
  // one deadline the stage shift exists to meet.
  //
  // The top/scrollable term (added 2026-08-19) tightens that deadline for tall
  // sections. Centre was still too late: finance was ~4 viewports tall when
  // this term was added (densened 2026-08-20; still the tallest section), so its
  // copy has been legible for a full screen before the section centres, and at
  // its ACTUAL settled moment the ramp had only reached 0.23 — Jupiter sat over
  // the text with the shift barely started. "Section top reaches the viewport
  // top" is the moment a tall section owns the whole frame and its first
  // screenful is being read, which is exactly when the planet must be aside —
  // and it reproduces the settled anchors documented in constants.ts (0.311 /
  // 0.439 / 0.794). For sections shorter than the viewport the new term is the
  // largest of the three and changes nothing.
  const settled = Math.min(
    (top + rect.height - vh) / scrollable,
    top / scrollable,
    centre
  );

  // Start of the approach. Measured off the runway section when one is named
  // (Memories, for Footprints); if it ever stops being the section above, this
  // silently degrades to the tighter [enter, …] start rather than reading a
  // stale id and producing nonsense.
  let start = enter;
  const above = runwayAboveId ? document.getElementById(runwayAboveId) : null;
  if (above) {
    const aboveRect = above.getBoundingClientRect();
    const aboveTop = aboveRect.top + window.scrollY;
    const aboveEnter = (aboveTop - vh) / scrollable;
    const aboveCentre = (aboveTop + aboveRect.height / 2 - vh / 2) / scrollable;
    start = Math.min((aboveEnter + aboveCentre) / 2, enter);
  }

  // For the runway case (Footprints) the in-ramp end is relaxed 70% of the way
  // from settled toward centre (2026-08-19). Footprints' shift is the one with
  // no covering pan at all, and ending at settled crammed the tail of the move
  // into the reading window's opening frames — measured, 82% of the 0.24-frame
  // displacement landed inside 0.09–0.138. Letting it finish just before
  // centre (93% done at settled, 100% by 0.150 on the snapshot) shaves the
  // peak lateral speed ~11% without the globe still creeping once the section
  // is centred. Non-runway sections keep the strict settled deadline: their
  // entrances are covered by inter-planet pans, so they can afford to hurry.
  const inEnd = runwayAboveId
    ? Math.min(settled + (centre - settled) * 0.7, centre)
    : settled;

  const outStart = centre + (leave - centre) / 3;
  // The in-ramp must finish before the out-ramp begins, or the two multiply into
  // a peak that never reaches 1 and Earth is never fully aside.
  if (!(start < inEnd && inEnd <= outStart)) return null;

  return {
    in: [start, inEnd],
    out: [outStart, leave],
  };
}

/**
 * Measure every split section and compose the results.
 *
 * COMPOSITION. Adjacent split sections deliberately alternate sides (left,
 * right, left, …), and sections taller than a viewport make their windows
 * overlap: N's out-window runs to N's leave, and N+1's in-window starts at
 * N+1's enter, which is one viewport EARLIER than N's leave. That overlap is
 * not a bug for opposite signs — the two ramps cross-fade and the net shift
 * sweeps smoothly through zero, and because the signs alternate the summed
 * magnitude can never exceed the larger ramp, i.e. never exceeds
 * STAGE_SHIFT_FRACTION. The zero-crossing lands inside the inter-planet pan
 * (verified against cameraKeyframes: e.g. Footprints→About crosses at ~0.198,
 * the exact start of the Earth→Venus pan), where a lateral recentring is
 * invisible for the same reason Footprints' covered exit is.
 *
 * SAME-SIGN overlap is the failure mode: two ramps pushing the same way would
 * sum past the fraction and the planet would lurch mid-pan. The current table
 * cannot produce it, but a future section insertion could, so it is guarded:
 * the EARLIER section's out-window is shrunk to end where the later in-window
 * begins. Never the later in-window — the in-deadline (planet aside before the
 * copy is wholly on screen) is the constraint that protects legibility, and
 * an exit can afford to hurry because exits are covered by the pan.
 *
 * Sections that fail to measure fall back to their snapshot row, so one
 * missing id degrades one section instead of the whole system.
 */
function measureStageShiftEntries(): StageShiftEntry[] {
  const entries: StageShiftEntry[] = [];
  for (const id of STAGE_SECTIONS) {
    const window =
      measureSectionWindow(id, id === 'footprints' ? 'memories' : undefined) ??
      STAGE_SHIFT_FALLBACKS[id];
    if (window) entries.push({ id, sign: STAGE_SIGN[STAGE_SIDE[id]!], window });
  }

  for (let i = 0; i < entries.length - 1; i++) {
    const prev = entries[i];
    const next = entries[i + 1];
    if (prev.sign !== next.sign) continue; // opposite signs cross-fade safely
    if (prev.window.out[1] > next.window.in[0]) {
      const end = Math.max(next.window.in[0], prev.window.out[0] + 1e-4);
      entries[i] = {
        ...prev,
        window: {
          in: prev.window.in,
          out: [Math.min(prev.window.out[0], end - 1e-4), end],
        },
      };
    }
  }

  return entries;
}

function useStageShiftEntries(): React.RefObject<StageShiftEntry[]> {
  const entriesRef = useRef<StageShiftEntry[]>(buildFallbackEntries());

  useEffect(() => {
    const remeasure = () => {
      entriesRef.current = measureStageShiftEntries();
    };

    remeasure();

    // The document keeps growing after mount — fonts swap, the city photos
    // decode, MDX hydrates — and every one of those moves every section on the
    // progress axis. Observing the body catches all of it without polling;
    // `resize` covers the viewport-height half of the calculation, which a body
    // observer alone does not see.
    const observer = new ResizeObserver(remeasure);
    observer.observe(document.body);
    window.addEventListener('resize', remeasure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', remeasure);
    };
  }, []);

  return entriesRef;
}

// Precompute planet positions and radii for proximity checks
const planets = planetConfigs.map((p) => ({
  pos: new THREE.Vector3(...p.position),
  radius: p.radius,
}));

// ══ First-load intro flight ══
//
// What was here before: currentPos started at (0, 0, 30) and the exponential lerp
// below dragged it to cameraKeyframes[0] — a ~40 unit move at delta × 6, i.e. a
// ~0.17s time constant, done inside ~0.6s. LoadingScreen covers the screen for
// ~2.9s. So the entry move existed but was spent entirely behind an opaque
// overlay, and the visitor's first frame was a camera already parked. This
// replaces it with a move that starts when there is someone to watch it.

// The resting composition is cameraKeyframes[0]: [6, 38, 42] looking at the Sun,
// ~57 units out. Start on the SAME ray, three times further out, and dolly
// straight in along it. Same 3/4 angle from the first frame, zero lateral drift —
// the only thing that changes is scale, so the system grows out of the dark
// rather than sliding into place.
const OVERVIEW = getCameraState(0);

// Why 3× (171 units) rather than the 4× end of the range — this is framing, not
// a round number:
//   • Fog is ['#000000', 80, 300] (CosmicScene). At 171 the planets sit 40–65%
//     faded toward black: present but hazy, so they resolve OUT of the void as we
//     close. At 4× the outer planets are past fog-far and simply are not there —
//     the shot would open on an empty frame.
//   • The Sun is drawn with ShaderMaterial, which three.js does not fog, so it
//     stays a hard bright point the whole way in. That is the "cluster" the eye
//     locks onto while everything around it is still haze.
//   • ParticleField's stars occupy an 80–280 unit shell, so 171 starts us
//     mid-shell and we fly THROUGH stars. That parallax is most of what sells the
//     motion; from outside the shell there is nothing near enough to move.
//   • At 171 the Sun's 2.2-unit halo subtends ~1.5° — around 20px tall at a 66°
//     fov — and grows 3× over the move. Further out it is a pixel with nowhere to
//     go.
const INTRO_START_POS = OVERVIEW.position.clone().multiplyScalar(3);
const INTRO_START_LOOK = OVERVIEW.lookAt.clone();

// 3.0s. Long enough to read as an authored move with a beginning and an end,
// short enough that someone who came to read is not held hostage by it. The
// scroll abort below is the escape hatch for anyone who disagrees.
export const INTRO_DURATION = 3.0;

// A few degrees wider than the resting fov, landing exactly on whatever the
// proximity logic further down asks for (62 out here, far from every planet — so
// this settles to 62, not to 60; matching the logic is what keeps the hand-off
// continuous). Wide-then-normal makes the approach read as a dolly rather than a
// translate: the system grows faster than distance alone would explain.
const INTRO_START_FOV = 66;

// Smoothed scroll progress above this means the visitor has taken the wheel.
// Tiny on purpose — ~15px of a ~1,180vh document — and read from the SMOOTHED
// progress, which needs a frame or two to cross it: enough to ignore float noise,
// fast enough that the abort feels immediate.
const SCROLL_ABORT_PROGRESS = 0.002;

// Per-frame cap on the intro clock. A backgrounded tab hands r3f one enormous
// delta on return; uncapped, the flight would teleport to its end and the visitor
// would come back to a move that never happened.
const MAX_INTRO_STEP = 0.05;

/**
 * easeOutQuint — the intro's curve.
 *
 * Explicitly NOT the exponential lerp used further down. That lerp
 * (`p += (target - p) × k × dt`) is at maximum speed on its first frame and
 * decays from there, so every move it makes reads as *settling into* a position
 * rather than travelling to one — fine for following a scroll scrub, wrong for a
 * choreographed entrance. It also has no end: it approaches the target
 * asymptotically and never arrives, so there is no defined moment to hand off at.
 * A parametric ease over a fixed duration gives both — a shaped velocity curve,
 * and an exact t=1 where currentPos IS the target.
 */
function easeOutQuint(t: number): number {
  const inv = 1 - t;
  return 1 - inv * inv * inv * inv * inv;
}

/** Returns 0 when far from any planet, 1 when very close.
 *  Single O(n) pass — n=8 planets. Avoid distanceTo (sqrt) by using
 *  squared-distance comparison against squared cutoff radii. */
function getPlanetProximity(camPos: THREE.Vector3): number {
  let maxProx = 0;
  for (const planet of planets) {
    // Cheap squared-distance reject: cutoff is 6 × radius (point at which proximity = 0)
    const cutoff = planet.radius * 6;
    const cutoffSq = cutoff * cutoff;
    const dx = camPos.x - planet.pos.x;
    const dy = camPos.y - planet.pos.y;
    const dz = camPos.z - planet.pos.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq > cutoffSq) continue; // skip sqrt entirely when far

    const dist = Math.sqrt(distSq);
    // Normalise: 0 at 6× radius, 1 at 2× radius
    const t = 1 - THREE.MathUtils.clamp((dist - planet.radius * 2) / (planet.radius * 4), 0, 1);
    if (t > maxProx) maxProx = t;
  }
  return maxProx;
}

export function CameraController({
  progressRef,
  cameraProgressRef,
  introCueRef,
  governorRef,
}: CameraControllerProps) {
  // `size` is the canvas's CSS pixel size — the same number Tailwind's `md:`
  // breakpoint reads, so the stage shift below engages exactly when the
  // sections actually split into two columns.
  const { camera, size } = useThree();

  // Where each split section currently sits on the progress axis. A ref, not
  // state: it is read once per frame inside useFrame and must never trigger a
  // render.
  const stageEntriesRef = useStageShiftEntries();

  // Slew-limited stage shift (see STAGE_SHIFT_SLEW below). A ref because it is
  // follower state carried across frames, like currentPos/currentLook.
  const smoothedShiftRef = useRef(0);

  // Decided exactly once per mount, never re-derived. The intro is a page-load
  // event: a re-render must not re-arm it, and neither must scrolling back to the
  // top — which is why every piece of intro state below is a ref that only ever
  // moves forward.
  //
  // A three-second camera move is precisely what prefers-reduced-motion is
  // about, so those visitors skip the flight entirely and start parked at the
  // overview. The read comes from providers/reducedMotion.ts, which replaced
  // the private copy this file used to carry. That copy's comment claimed
  // SmoothScroll and TiltCard shared its pattern; SmoothScroll does, TiltCard
  // never has — TiltCard queries `(pointer: coarse)` and nothing else, and
  // consults this preference nowhere.
  const [introEnabled] = useState(() => !!introCueRef && !prefersReducedMotion());

  // 'hold'   — parked at the wide start; the overlay still covers the screen.
  // 'flying' — the cue landed, the eased approach is running.
  // 'done'   — the scroll-driven lerp owns the camera. One-way, permanently.
  const introPhase = useRef<'hold' | 'flying' | 'done'>(introEnabled ? 'hold' : 'done');
  const introElapsed = useRef(0);

  // Without the intro these start AT the overview rather than the old (0, 0, 30),
  // so reduced-motion visitors get no entry move at all — not even the 0.6s settle
  // the lerp used to perform behind the overlay.
  const currentPos = useRef((introEnabled ? INTRO_START_POS : OVERVIEW.position).clone());
  const currentLook = useRef((introEnabled ? INTRO_START_LOOK : OVERVIEW.lookAt).clone());
  const currentFov = useRef(introEnabled ? INTRO_START_FOV : 60);

  // Previous frame's rendered view direction — the rotation clamp's memory.
  // Follower state like currentPos/currentLook, seeded from the same start.
  const prevLookDir = useRef(
    (introEnabled ? INTRO_START_LOOK : OVERVIEW.lookAt)
      .clone()
      .sub(introEnabled ? INTRO_START_POS : OVERVIEW.position)
      .normalize()
  );

  useFrame((_, delta) => {
    // RAW live progress — the document axis. The stage-shift windows are
    // measured from the live DOM (useStageShiftEntries above), so they MUST
    // read this one: feeding them the warped value would apply the live→nominal
    // correction twice. The scroll-abort check reads it too — "has the visitor
    // scrolled" is a fact about the document, not about the itinerary.
    const progress = progressRef.current ?? 0;
    // WARPED, GOVERNED progress — the nominal axis cameraKeyframes was timed
    // against (2026-08-19, see lib/progressWarp.ts: at non-nominal viewports
    // the sections drift 0.03–0.05 against the itinerary and the camera parked
    // between planets while a section sat centred), rate-limited through the
    // itinerary governor's playhead (2026-08-20, see lib/itineraryGovernor.ts).
    // Only the spline is sampled with it. The intro flight is unaffected: it is
    // built on getCameraState(0), warp(0) === 0 by construction, and the
    // governor passes an untouched target through bit-for-bit.
    const cameraProgress = cameraProgressRef?.current ?? progress;
    const { position, lookAt } = getCameraState(cameraProgress);

    // The governor's frame facets. The snap flag is read-and-clear and this is
    // its one read per frame: true when CosmicScene parked the playhead this
    // frame (first-frame seeding, a reduced-motion cut), and the follower must
    // cut with it — the hold-abort below re-reads after its own snap() call so
    // its flag cannot leak into the NEXT frame as a phantom snap.
    const gov = governorRef?.current ?? null;
    let govSnapped = gov?.consumeSnapped() ?? false;

    // ── Intro flight ──
    // >= 0 means the intro owns the camera this frame. The fov block below reads
    // it so the lens and the move stay on one clock instead of two.
    let introEase = -1;
    // Set only on the frame an abort snaps, so the fov snaps with it (below).
    let introSnapped = false;

    if (introPhase.current !== 'done') {
      if (progress > SCROLL_ABORT_PROGRESS) {
        // The visitor scrolled. That is an instruction about where they want to
        // be, and a camera that keeps flying its own path over it is a bug. We
        // ABORT rather than blend: the scroll-driven follower below picks up
        // from wherever we are and closes the gap — in ~0.5s when small, or as
        // a governed catch-up when the scroll was a flick — which is already a
        // smooth decelerating move in the same direction; a blend would just be
        // a slower way to arrive at the same place.
        //
        // Aborting from 'hold' additionally SNAPS, because nothing has been shown
        // yet — either the overlay is still opaque, or this is frame one of a
        // browser-restored scroll position. Lerping in from 171 units out there
        // would be an entrance nobody asked for. Aborting from 'flying' must NOT
        // snap; that would be exactly the pop this hand-off exists to avoid.
        if (introPhase.current === 'hold') {
          currentPos.current.copy(position);
          currentLook.current.copy(lookAt);
          introSnapped = true;
          // Park the governor playhead on the same instant so play and
          // currentPos agree — the camera just cut to getCameraState(play),
          // and a playhead left mid-catch-up would immediately fly it
          // somewhere else. snap() sets the one-read flag, which described
          // THIS frame's snap; consume it here so it cannot arrive next frame.
          if (gov) {
            gov.snap(cameraProgress);
            gov.consumeSnapped();
            govSnapped = true;
          }
        }
        introPhase.current = 'done';
      } else if (introPhase.current === 'hold' && introCueRef?.current) {
        introPhase.current = 'flying';
      }
    }

    if (introPhase.current === 'done') {
      // ── Sun-anchor look blend ── (before the lerp, so the lerp chases the
      // blended target). w > 0 only during a governed deep catch-up; at
      // reading speeds it is exactly 0 and `lookAt` is untouched — part of the
      // bit-identical pass-through contract. `lookAt` is this frame's clone
      // from getCameraState, so mutating it feeds nothing downstream.
      if (gov && gov.w > 0) lookAt.lerp(ORIGIN, gov.w);

      // Distance from current position to target — used for adaptive lerp
      const distToTarget = currentPos.current.distanceTo(position);

      if (govSnapped) {
        // The playhead was parked this frame (reduced-motion cut, first-frame
        // seed, hold-abort). A cut that leaves the follower easing in behind
        // it is not a cut — position and look go with it, and the fov snap
        // below completes it.
        currentPos.current.copy(position);
        currentLook.current.copy(lookAt);
      } else if (gov?.engaged) {
        // ENGAGED: the playhead is rate-limited behind the target, so the
        // spline sample itself is already a smooth, budgeted move — the lerp's
        // job shrinks to tracking it tightly. Continuous adaptive factor (see
        // the constant block above) and the governor's dt clamp, so a jank
        // frame cannot convert into a giant lerp step.
        const dtc = Math.min(delta, GOVERNOR_MAX_STEP);
        const factor = THREE.MathUtils.clamp(
          ENGAGED_ADAPT_MIN + ENGAGED_ADAPT_SLOPE * (distToTarget - 5),
          ENGAGED_ADAPT_MIN,
          ENGAGED_ADAPT_MAX
        );
        const speed = Math.min(1, dtc * 4 * factor);
        currentPos.current.lerp(position, speed);
        currentLook.current.lerp(lookAt, speed);
      } else {
        // DISENGAGED — every frame of reading-speed scrolling lands here, and
        // this is today's formula VERBATIM (baseLerp 4, the 1.0/1.5
        // adaptiveFactor step, raw delta): bit-identical output is the
        // contract, so not a constant of it may drift. Faster when far from
        // target (transit), gentler when close (planet orbit).
        const baseLerp = 4;
        const adaptiveFactor = distToTarget > 5 ? 1.5 : 1.0;
        const speed = Math.min(1, delta * baseLerp * adaptiveFactor);
        currentPos.current.lerp(position, speed);
        currentLook.current.lerp(lookAt, speed);
      }
    } else {
      // 'hold' simply holds the clock at 0, so the same two lines park the camera
      // at the wide start and then fly it — no separate parking branch that could
      // drift out of agreement with the flight.
      if (introPhase.current === 'flying') {
        introElapsed.current += Math.min(delta, MAX_INTRO_STEP);
      }
      const t = Math.min(1, introElapsed.current / INTRO_DURATION);
      introEase = easeOutQuint(t);

      // Interpolate from the fixed start toward the LIVE scroll target, so at t=1
      // currentPos and currentLook are precisely the values the lerp above would
      // have been chasing. That is the whole hand-off: nothing to reconcile,
      // nothing to pop, the next frame just continues.
      currentPos.current.copy(INTRO_START_POS).lerp(position, introEase);
      currentLook.current.copy(INTRO_START_LOOK).lerp(lookAt, introEase);

      if (t >= 1) introPhase.current = 'done';
    }

    // ── Rotation safety clamp ── ROT_HARD deg/s ceiling on the RENDERED view
    // direction, after the lerp. This is a safety net, not a participant: the
    // governor's budgets already shape all nominal motion (the validation
    // prototype measured 0 engagements of this clamp in every nominal
    // scenario), and it exists for target teleports no upstream budget can
    // see — a progressWarp remeasure landing mid-flight is the concrete case.
    //
    // Skipped (and reseeded) during intro frames and on snap frames: the intro
    // is a choreographed move with its own curve, and a snap is a deliberate
    // cut — clamping either would turn an authored discontinuity into a slow
    // pan nobody asked for.
    if (introEase >= 0 || introSnapped || govSnapped) {
      _clampDir.subVectors(currentLook.current, currentPos.current);
      const len = _clampDir.length();
      if (len > 1e-9) prevLookDir.current.copy(_clampDir.multiplyScalar(1 / len));
    } else {
      const dtc = Math.min(delta, GOVERNOR_MAX_STEP);
      _clampDir.subVectors(currentLook.current, currentPos.current);
      const lookDist = _clampDir.length();
      if (lookDist > 1e-9) {
        _clampDir.multiplyScalar(1 / lookDist);
        const maxAng = ROT_HARD * dtc * (Math.PI / 180);
        _clampAxis.crossVectors(prevLookDir.current, _clampDir);
        const ang = Math.atan2(_clampAxis.length(), prevLookDir.current.dot(_clampDir));
        if (ang > maxAng) {
          // Antiparallel directions leave no usable rotation axis; any
          // perpendicular is equally valid, and camera.up is the one that
          // keeps the recovery upright.
          if (_clampAxis.lengthSq() < 1e-12) _clampAxis.copy(camera.up);
          _clampAxis.normalize();
          _clampQuat.setFromAxisAngle(_clampAxis, maxAng);
          _clampDir.copy(prevLookDir.current).applyQuaternion(_clampQuat);
          // WRITE BACK into currentLook, preserving the look distance. Unlike
          // the stage-shift offset below — which must stay off the follower
          // state or it compounds every frame — this write-back is CORRECT:
          // the clamp is part of the follower itself, and the held-back
          // direction must be where next frame's lerp continues from, or the
          // clamp would fight the same oversized rotation frame after frame.
          currentLook.current
            .copy(currentPos.current)
            .addScaledVector(_clampDir, lookDist);
        }
        prevLookDir.current.copy(_clampDir);
      }
    }

    camera.position.copy(currentPos.current);

    // Planet proximity (0 = far, 1 = very close)
    const proximity = getPlanetProximity(currentPos.current);

    // Subtle breathing — reduced when close to a planet to avoid jitter
    const breathScale = 1 - proximity * 0.8; // at max proximity, breathing is 20% of normal
    const time = performance.now() * 0.001;
    camera.position.x += Math.sin(time * 0.3) * 0.05 * breathScale;
    camera.position.y += Math.cos(time * 0.2) * 0.03 * breathScale;

    // FOV zoom effect: telephoto compression near planets, wide during transit
    // Near planet: FOV narrows to 55 (telephoto feel)
    // In transit (far from all planets): FOV widens to 62 (sense of vastness)
    const targetFov = proximity > 0.1
      ? THREE.MathUtils.lerp(60, 55, proximity)   // close to planet: narrow
      : THREE.MathUtils.lerp(62, 60, proximity * 10); // in transit: slightly wide
    if (introEase >= 0) {
      // Same eased clock as the move, landing on the very value this frame's
      // proximity logic asked for. So the intro never fights that logic and never
      // hands it a discontinuity: at t=1 currentFov already equals targetFov, and
      // the exponential lerp below simply resumes from there.
      currentFov.current = THREE.MathUtils.lerp(INTRO_START_FOV, targetFov, introEase);
    } else if (introSnapped || govSnapped) {
      // The position snapped this frame — hold-abort or a governor snap
      // (reduced-motion cut, first-frame seed) — so the lens has to go with
      // it. Left to the lerp below it would ease toward targetFov over ~1.5s,
      // i.e. an unrequested zoom sitting on top of a cut the visitor (or
      // their motion preference) asked for.
      currentFov.current = targetFov;
    } else {
      // delta*2 fov ease — deliberately unchanged by the governor work: the
      // proximity fov is a function of the (already governed) camera position,
      // so it inherits the playhead's rate limits for free.
      currentFov.current = THREE.MathUtils.lerp(currentFov.current, targetFov, Math.min(1, delta * 2));
    }

    // Apply FOV if camera is a PerspectiveCamera
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const perspCam = camera as THREE.PerspectiveCamera;
      perspCam.fov = currentFov.current;
      perspCam.updateProjectionMatrix();
    }

    _lerpLook.copy(currentLook.current);

    // ── Displace each section's planet for its split stage (see the block
    // above) ──
    // Applied to the COPY, never to currentLook.current: writing it back would
    // feed the offset into next frame's lerp target and compound it every frame
    // until the planet left the frame entirely.
    //
    // The net shift is the SUM of every section's signed, windowed ramp. Inside
    // one section that is just that section's ramp; where two windows overlap
    // (adjacent sections taller than a viewport) the opposite signs cross-fade
    // through zero during the inter-planet pan — see measureStageShiftEntries.
    // At most six entries, no allocation: this runs every frame.
    //
    // Sized off the LIVE fov and aspect rather than a fixed world distance, so
    // the planet holds the same screen position while the proximity logic above
    // is still easing the lens between 62 and 55.
    let netShift = 0;
    if (size.width >= STAGE_SPLIT_MIN_WIDTH) {
      const entries = stageEntriesRef.current;
      for (let i = 0; i < entries.length; i++) {
        // `progress`, not `cameraProgress`: these windows are live-DOM
        // measurements on the raw axis — see the note at the top of useFrame.
        netShift += entries[i].sign * stageShiftRamp(progress, entries[i].window);
      }
    }
    // Slew limit (STAGE_SHIFT_SLEW above). Snap frames adopt the target
    // outright — after a cut the shift belongs at its destination value.
    if (introSnapped || govSnapped) {
      smoothedShiftRef.current = netShift;
    } else {
      const maxStep = STAGE_SHIFT_SLEW * Math.min(delta, GOVERNOR_MAX_STEP);
      smoothedShiftRef.current += THREE.MathUtils.clamp(
        netShift - smoothedShiftRef.current,
        -maxStep,
        maxStep
      );
    }
    // Faded by (1 − w): the split-stage offset is a READING composition — it
    // moves a planet out of a text column — and w > 0 means we are mid
    // sun-anchored flyby where no section is composed and nothing is being
    // read. It also closes a measured failure (2026-08-21 validation,
    // sustained-wheel run): with the aim passing nearly straight down at the
    // Sun (fwd·up ≈ −0.995) the offset basis `right = fwd × up` is
    // near-degenerate, and a slew-held ~0.4 offset whipped the rendered view
    // 19°/frame. Vertical aims only occur inside deep catch-up arcs, so
    // gating on w removes the whole class. Exactly zero-change when w = 0,
    // i.e. all nominal scrolling and both validated slow baselines.
    netShift = smoothedShiftRef.current * (1 - (gov?.w ?? 0));
    if (Math.abs(netShift) > 0.001 && (camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const perspCam = camera as THREE.PerspectiveCamera;
      const dist = camera.position.distanceTo(_lerpLook);
      const frameWidth =
        2 * dist * Math.tan(THREE.MathUtils.degToRad(perspCam.fov) / 2) * perspCam.aspect;
      // right = forward × up. Aiming along +right slides the subject to -x on
      // screen, i.e. a POSITIVE net shift moves the planet left (content
      // right), a negative one moves it right (content left).
      _fwd.subVectors(_lerpLook, camera.position).normalize();
      _right.crossVectors(_fwd, camera.up).normalize();
      _lerpLook.addScaledVector(_right, frameWidth * STAGE_SHIFT_FRACTION * netShift);
    }

    camera.lookAt(_lerpLook);
  });

  return null;
}
