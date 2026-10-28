import { describe, it, expect } from 'vitest';
import {
  ItineraryGovernor,
  V_BASE,
  V_HARD,
  CATCH_GAIN,
  GAP_SAT,
  W_MOD,
  W_DEEP,
  MAX_STEP,
  RM_SNAP_GAP,
  cumArcAt,
  cumAimAt,
  cumAnchorAimAt,
} from './itineraryGovernor';

// All of these run the REAL itinerary — the governor samples getCameraState's
// spline into its tables at module init, so every number below is measured
// against the actual cameraKeyframes, not a fixture.

const DT = 1 / 60;

const smoothstep01 = (x: number): number => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};

/** A fresh governor parked at `seed` with the snap flag already drained, i.e.
 *  the state CosmicScene's first-frame seeding leaves behind. */
function governorAt(seed: number): ItineraryGovernor {
  const gov = new ItineraryGovernor();
  gov.snap(seed);
  gov.consumeSnapped();
  return gov;
}

describe('ItineraryGovernor', () => {
  it('measures the itinerary the module header describes', () => {
    // The header's load-bearing numbers: ~416 u of arc, ~1,955° of keyframed
    // aim rotation, ~897° of Sun-anchor rotation. Loose bounds — a keyframe
    // retune may shift them, but an order-of-magnitude change means the tables
    // are broken.
    expect(cumArcAt(0)).toBe(0);
    expect(cumArcAt(1)).toBeGreaterThan(380);
    expect(cumArcAt(1)).toBeLessThan(460);
    expect(cumAimAt(1)).toBeGreaterThan(1700);
    expect(cumAimAt(1)).toBeLessThan(2200);
    expect(cumAnchorAimAt(1)).toBeGreaterThan(700);
    expect(cumAnchorAimAt(1)).toBeLessThan(1100);
  });

  it('is a bit-identical pass-through at reading speeds', () => {
    // The identity contract: at deliberate scroll rates the governed playhead
    // IS the smoothed target — exact ===, not closeTo — and never engages.
    // 0.02/s is the fastest rate the validation prototype measured at zero
    // engaged frames; 0.005/s is a slow read.
    for (const rate of [0.005, 0.01, 0.02]) {
      const gov = governorAt(0.1);
      let sm = 0.1;
      const frames = Math.round((0.3 / rate) * 60);
      for (let f = 1; f <= frames; f++) {
        const raw = Math.min(0.4, 0.1 + rate * f * DT);
        sm += (raw - sm) * Math.min(1, DT * 4); // CosmicScene's smoothing, verbatim
        const play = gov.update(sm, DT);
        expect(play).toBe(sm);
        expect(gov.engaged).toBe(false);
        expect(gov.w).toBe(0);
      }
    }
  });

  it('approaches a large jump monotonically, without overshoot, and arrives', () => {
    // The dot-click scenario: the target teleports 0.13 → 0.665 and stays.
    const gov = governorAt(0.13);
    const target = 0.665;
    let prev = gov.play;
    let arrived = false;
    let engagedFrames = 0;
    for (let f = 0; f < 60 * 20 && !arrived; f++) {
      const play = gov.update(target, DT);
      expect(play).toBeGreaterThanOrEqual(prev);
      expect(play).toBeLessThanOrEqual(target);
      if (gov.engaged) engagedFrames++;
      arrived = play === target;
      prev = play;
    }
    expect(arrived).toBe(true);
    expect(engagedFrames).toBeGreaterThan(0);
  });

  it('respects both frame budgets across a 1.2s full-page flick', () => {
    // Recompute each frame's costs from the same cumulative tables update()
    // uses and hold them against the budgets its constants define. ε covers
    // float noise only — the bisection itself only ever accepts fitting steps.
    const gov = governorAt(0);
    const EPS = 1e-9;
    let sm = 0;
    for (let f = 1; f <= 12 * 60; f++) {
      const t = f * DT;
      const raw = smoothstep01(t / 1.2);
      sm += (raw - sm) * Math.min(1, DT * 4);
      const p0 = gov.play;
      const play = gov.update(sm, DT);
      if (play === p0) continue; // idle frame — nothing was spent
      const w = gov.w; // update() sets w BEFORE budgeting; this is the w it used
      const dtc = Math.min(DT, MAX_STEP);
      const gapArc = Math.abs(cumArcAt(sm) - cumArcAt(p0));
      const sBudget =
        Math.min(V_HARD, V_BASE * (1 + CATCH_GAIN * Math.min(1, gapArc / GAP_SAT))) * dtc;
      const aBudget = (W_MOD + (W_DEEP - W_MOD) * w) * dtc;
      const sCost = Math.abs(cumArcAt(play) - cumArcAt(p0));
      const aCost =
        (1 - w) * Math.abs(cumAimAt(play) - cumAimAt(p0)) +
        w * Math.abs(cumAnchorAimAt(play) - cumAnchorAimAt(p0));
      expect(sCost).toBeLessThanOrEqual(sBudget + EPS);
      expect(aCost).toBeLessThanOrEqual(aBudget + EPS);
    }
    // And the flick must actually have been a deep catch-up, or the assertions
    // above never exercised the engaged path.
    expect(gov.play).toBeLessThan(1);
  });

  it('raises w during a deep catch-up and decays it after arrival', () => {
    const gov = governorAt(0.13);
    const target = 0.665;
    let peakW = 0;
    let arrived = false;
    for (let f = 0; f < 60 * 20 && !arrived; f++) {
      arrived = gov.update(target, DT) === target;
      peakW = Math.max(peakW, gov.w);
    }
    expect(arrived).toBe(true);
    expect(peakW).toBeGreaterThan(0.5); // the Sun-anchor blend genuinely engaged

    // After arrival the gap is 0 every frame: w must only decay, and reach 0.
    let prevW = gov.w;
    for (let f = 0; f < 120; f++) {
      gov.update(target, DT);
      expect(gov.w).toBeLessThanOrEqual(prevW);
      prevW = gov.w;
    }
    expect(gov.w).toBe(0);
  });

  it('snap parks the playhead and resets all state', () => {
    const gov = new ItineraryGovernor();
    expect(gov.consumeSnapped()).toBe(false); // construction is not a snap

    gov.update(0.9, DT); // huge gap → engages, w starts rising
    expect(gov.engaged).toBe(true);
    expect(gov.w).toBeGreaterThan(0);

    gov.snap(0.42);
    expect(gov.play).toBe(0.42);
    expect(gov.engaged).toBe(false);
    expect(gov.w).toBe(0);
    // The flag is readable exactly once.
    expect(gov.consumeSnapped()).toBe(true);
    expect(gov.consumeSnapped()).toBe(false);
  });

  it('caps a 5-second delta at MAX_STEP', () => {
    // A backgrounded tab hands the frame loop one enormous delta on return;
    // the playhead must advance exactly as far as a MAX_STEP frame, not 5s
    // worth of budget.
    const janked = governorAt(0);
    const capped = governorAt(0);
    expect(janked.update(1, 5)).toBe(capped.update(1, MAX_STEP));
    expect(janked.play).toBeLessThan(0.1);
  });

  it('exports the reduced-motion snap threshold CosmicScene cuts at', () => {
    expect(RM_SNAP_GAP).toBe(0.04);
    expect(MAX_STEP).toBe(0.05);
  });
});
