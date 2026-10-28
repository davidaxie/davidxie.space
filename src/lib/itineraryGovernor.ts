// ── Itinerary governor — a governed playhead over the camera itinerary ──
// The problem: the camera motion was too abrupt under fast scrolling.
//
// THE MEASUREMENT that explains it. cameraKeyframes is 416 units of
// camera travel, and — the number that matters — 1,955 DEGREES of cumulative
// view-direction rotation (dir = normalize(lookAt − position), summed over the
// whole itinerary; always aiming at the Sun instead would cost only 897°). The
// itinerary spends that rotation in dwells and pans that were hand-timed
// against reading-speed scrolling. A full-page flick hands the follower most
// of those 1,955° in about a second, and the exponential lerp — whose only
// notion of "far" is positional distance — dutifully spins the view at up to
// ~2,370°/s (measured in scratch prototypes). No lerp constant fixes that: any
// gain low enough to calm the spin makes the camera feel detached at reading
// speed.
//
// THE FIX. Put a governed PLAYHEAD between the smoothed scroll target and the
// follower. Each frame the playhead advances toward the target by the largest
// progress step whose cost fits two per-frame budgets:
//
//   • an ARC budget (units of travel along the position spline), V_BASE=70 u/s
//     scaled up to V_HARD=320 u/s as the backlog grows — deep gaps close fast,
//     they just cannot teleport;
//   • an AIM budget (degrees of view rotation), W_MOD=450°/s easing to
//     W_DEEP=300°/s during deep catch-up.
//
// WHY arc+aim budgets rather than a raw progress-rate cap: progress is not
// uniform. One unit of progress near the Mercury turn costs ~40× the rotation
// of one unit on the outbound Neptune leg (the cumA table's local slope peaks
// at ~17,600°/unit of arc). A progress cap slow enough to tame the turn would
// crawl through the straights; one fast enough for the straights still whips
// the turn. Budgeting what the viewer actually experiences — units moved,
// degrees rotated — makes every leg cost what it looks like it costs. The
// costs come from three cumulative tables (position arc length, keyframed aim
// rotation, Sun-anchor aim rotation) sampled once from the real spline at
// 4,097 points (~98 KB, ~4 ms, built lazily once per module).
//
// THE SUN-ANCHOR BLEND (w). During a deep catch-up the exact keyframed aim
// track is itself the problem: it noses planet-to-planet, so even a
// rate-limited replay of it reads as a frantic tour. w ∈ [0,1] rises with the
// backlog (BLEND_LO→BLEND_HI units of arc) and blends BOTH the aim-cost metric
// here AND the actual look target in CameraController toward the origin — the
// Sun. This is compositionally native, not a trick: the whole itinerary is one
// inward run and one outward run around the Sun, and both the overview hub and
// the closing recap frame the Sun dead centre. A catch-up that levels the gaze
// at the Sun while flying the route reads as the camera stepping back to the
// site's own establishing shot, then re-engaging — not as an invented move.
// w's rates are asymmetric (fast in at 2.5/s, slow out at 1.2/s) so engaging
// is decisive and release never pops.
//
// THE PASS-THROUGH IDENTITY CONTRACT — the load-bearing property. When the
// whole remaining gap fits this frame's budgets, `play` is ASSIGNED the target
// (not accumulated toward it) and `engaged` stays false. At reading speeds the
// gap always fits, so the governor emits the target bit-for-bit and the
// downstream follower maths is byte-identical to the pre-governor site
// (measured in the validation prototype: zero engaged frames and exactly 0.0
// deviation at ≤0.02 progress/s; the Lenis config and CosmicScene's delta*4
// smoothing upstream of this module are deliberately untouched for the same
// reason — they are part of that identity). The governor only exists in the
// frames where the old behaviour was the bug.

import { getCameraState } from './cameraPath';

// ── Tunables ── (validated in the 2026-08-20 prototype against the real
// keyframes; the deviation/flick scenarios quoted above are re-runnable there)
export const V_BASE = 70; // u/s along the spline — never-engages reading pace
export const V_HARD = 320; // u/s absolute ceiling at full catch-up gain
export const CATCH_GAIN = 4.0; // arc-budget gain: ×(1+4)=×5 at saturation
export const GAP_SAT = 40; // u of backlog where the catch-up gain saturates
export const W_MOD = 450; // deg/s aim ceiling at w=0 (moderate gaps)
export const W_DEEP = 300; // deg/s aim ceiling at w=1 (anchor-track playback)
export const BLEND_LO = 14; // u backlog where the Sun-anchor blend starts
export const BLEND_HI = 45; // u backlog where it reaches 1
export const BLEND_RATE_IN = 2.5; // /s — engage decisively
export const BLEND_RATE_OUT = 1.2; // /s — release without a pop
export const MAX_STEP = 0.05; // s dt clamp (jank, backgrounded tab) — matches the intro's MAX_INTRO_STEP
export const RM_SNAP_GAP = 0.04; // progress: reduced-motion users cut, never fly, past this

// Table resolution. 4096 segments ≈ 0.1 u of arc per sample on the fastest
// stretch — comfortably below every budget granularity that reads it.
const N = 4096;

// The three cumulative tables. Module-level and lazy: they are a property of
// the (locked) cameraKeyframes spline, not of any governor instance, so every
// instance — and the test suite — shares one build.
let cumS: Float64Array | null = null; // position arc length, units
let cumA: Float64Array | null = null; // keyframed view-direction rotation, deg
let cumAo: Float64Array | null = null; // Sun-anchor (origin-aim) rotation, deg

function ensureTables(): void {
  if (cumS) return;
  const s = new Float64Array(N + 1);
  const a = new Float64Array(N + 1);
  const ao = new Float64Array(N + 1);

  // Previous sample's position and the two previous unit aim directions —
  // plain scalars; getCameraState allocates two clones per call but this runs
  // once per module, not per frame.
  let px = 0, py = 0, pz = 0;
  let dax = 0, day = 0, daz = 0; // keyframed aim
  let oax = 0, oay = 0, oaz = 0; // origin aim
  for (let i = 0; i <= N; i++) {
    const { position, lookAt } = getCameraState(i / N);
    // Keyframed aim direction: normalize(lookAt − position).
    let dx = lookAt.x - position.x, dy = lookAt.y - position.y, dz = lookAt.z - position.z;
    let inv = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);
    dx *= inv; dy *= inv; dz *= inv;
    // Origin-anchor aim direction: normalize(origin − position) = −position̂.
    let ox = -position.x, oy = -position.y, oz = -position.z;
    inv = 1 / Math.sqrt(ox * ox + oy * oy + oz * oz);
    ox *= inv; oy *= inv; oz *= inv;

    if (i > 0) {
      const mx = position.x - px, my = position.y - py, mz = position.z - pz;
      s[i] = s[i - 1] + Math.sqrt(mx * mx + my * my + mz * mz);
      // Angle between successive unit vectors via atan2(|a×b|, a·b) — stable
      // near 0° and 180° where acos(dot) loses precision.
      let cx = day * dz - daz * dy, cy = daz * dx - dax * dz, cz = dax * dy - day * dx;
      a[i] = a[i - 1] +
        Math.atan2(Math.sqrt(cx * cx + cy * cy + cz * cz), dax * dx + day * dy + daz * dz) *
          (180 / Math.PI);
      cx = oay * oz - oaz * oy; cy = oaz * ox - oax * oz; cz = oax * oy - oay * ox;
      ao[i] = ao[i - 1] +
        Math.atan2(Math.sqrt(cx * cx + cy * cy + cz * cz), oax * ox + oay * oy + oaz * oz) *
          (180 / Math.PI);
    }
    px = position.x; py = position.y; pz = position.z;
    dax = dx; day = dy; daz = dz;
    oax = ox; oay = oy; oaz = oz;
  }
  cumS = s;
  cumA = a;
  cumAo = ao;
}

/** Linear interpolation into a cumulative table at progress p (clamped). */
function cumAt(t: Float64Array, p: number): number {
  const x = Math.max(0, Math.min(1, p)) * N;
  const i = Math.min(N - 1, Math.floor(x));
  return t[i] + (t[i + 1] - t[i]) * (x - i);
}

// Test-visible table reads — the budget assertions in itineraryGovernor.test.ts
// recompute per-frame costs with these against the same tables update() uses.
export function cumArcAt(p: number): number {
  ensureTables();
  return cumAt(cumS!, p);
}
export function cumAimAt(p: number): number {
  ensureTables();
  return cumAt(cumA!, p);
}
export function cumAnchorAimAt(p: number): number {
  ensureTables();
  return cumAt(cumAo!, p);
}

function smoothstepf(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export class ItineraryGovernor {
  /** The governed progress — what the camera actually plays. */
  play = 0;
  /** True only while the playhead is rate-limited behind the target. The
   *  follower reads this to switch lerp regimes; false is the verbatim
   *  pre-governor path. */
  engaged = false;
  /** Sun-anchor blend weight, 0..1 — see the module header. */
  w = 0;

  private snappedThisFrame = false;

  constructor() {
    ensureTables();
  }

  /** Park the playhead instantly: reduced-motion cuts, first-frame seeding,
   *  and the intro hold-abort all land here. Sets a one-read flag so the
   *  follower can snap its own state (position/look/fov, rotation-clamp seed)
   *  in the same frame. */
  snap(t: number): void {
    this.play = t;
    this.engaged = false;
    this.w = 0;
    this.snappedThisFrame = true;
  }

  /** Read-and-clear the snap flag. Readable once by design: exactly one
   *  consumer (CameraController's frame) may treat a frame as a snap frame. */
  consumeSnapped(): boolean {
    const s = this.snappedThisFrame;
    this.snappedThisFrame = false;
    return s;
  }

  /**
   * Advance the playhead toward `target` and return it. Allocation-free —
   * this runs inside useFrame.
   */
  update(target: number, delta: number): number {
    const dtc = Math.min(delta, MAX_STEP);
    const gap = target - this.play;
    if (gap === 0) {
      // Disengaged and idle: only the blend decays, so a release never pops.
      this.engaged = false;
      this.w = Math.max(0, this.w - BLEND_RATE_OUT * dtc);
      return this.play;
    }

    const dir = Math.sign(gap);
    const sHere = cumAt(cumS!, this.play);
    const gapArc = Math.abs(cumAt(cumS!, target) - sHere);

    // Chase the blend target at asymmetric rates (in fast, out slow).
    const wT = smoothstepf(BLEND_LO, BLEND_HI, gapArc);
    const dw = wT - this.w;
    const dwMax = (dw > 0 ? BLEND_RATE_IN : BLEND_RATE_OUT) * dtc;
    this.w += Math.max(-dwMax, Math.min(dwMax, dw));

    // This frame's budgets: arc (with backlog-saturated catch-up gain) and
    // blended aim.
    const k = 1 + CATCH_GAIN * Math.min(1, gapArc / GAP_SAT);
    const sBudget = Math.min(V_HARD, V_BASE * k) * dtc;
    const aBudget = (W_MOD + (W_DEEP - W_MOD) * this.w) * dtc;
    const aHereE = cumAt(cumA!, this.play);
    const aHereA = cumAt(cumAo!, this.play);

    const gapAbs = Math.abs(gap);
    let allowed: number;
    if (this.fits(gapAbs, dir, sHere, aHereE, aHereA, sBudget, aBudget)) {
      // PASS-THROUGH — the slow-scroll identity contract. The whole gap fits,
      // so the target is ASSIGNED (bit-identical, no drift) and the follower
      // sees the exact pre-governor pipeline.
      allowed = gapAbs;
    } else {
      // Largest allowed step by bisection. 24 iterations resolves progress to
      // ~6e-8 — far below a pixel of anything.
      let lo = 0;
      let hi = gapAbs;
      for (let it = 0; it < 24; it++) {
        const mid = (lo + hi) / 2;
        if (this.fits(mid, dir, sHere, aHereE, aHereA, sBudget, aBudget)) lo = mid;
        else hi = mid;
      }
      allowed = lo;
    }

    if (gapAbs <= allowed) {
      this.play = target;
      this.engaged = false;
    } else {
      this.play += dir * allowed;
      this.engaged = true;
    }
    return this.play;
  }

  /** Does a step of this size fit both budgets? A method rather than a
   *  closure so update() allocates nothing. */
  private fits(
    step: number,
    dir: number,
    sHere: number,
    aHereE: number,
    aHereA: number,
    sBudget: number,
    aBudget: number
  ): boolean {
    const p2 = this.play + dir * step;
    if (Math.abs(cumAt(cumS!, p2) - sHere) > sBudget) return false;
    const aCost =
      (1 - this.w) * Math.abs(cumAt(cumA!, p2) - aHereE) +
      this.w * Math.abs(cumAt(cumAo!, p2) - aHereA);
    return aCost <= aBudget;
  }
}
