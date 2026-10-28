import { describe, it, expect } from 'vitest';
import { buildWarp, identityWarp, NOMINAL_ANCHORS } from './progressWarp';

// A plausible non-nominal layout: every section lands a little earlier on the
// live axis than the nominal snapshot says — the shape of the real bug (About
// centred at 0.184 live vs 0.225 nominal).
const SHIFTED_ANCHORS = [
  { live: 0.07, nominal: 0.086 },
  { live: 0.13, nominal: 0.156 },
  { live: 0.184, nominal: 0.225 },
  { live: 0.29, nominal: 0.33 },
  { live: 0.4, nominal: 0.439 },
  { live: 0.5, nominal: 0.53 },
  { live: 0.69, nominal: 0.708 },
  { live: 0.79, nominal: 0.809 },
  { live: 0.9, nominal: 0.912 },
];

describe('buildWarp', () => {
  it('maps the endpoints to themselves exactly', () => {
    const warp = buildWarp(SHIFTED_ANCHORS);
    // Exact equality on purpose: cameraPath's scrollToSplineT treats scroll 0
    // and 1 specially, and the intro flight is built on getCameraState(0).
    expect(warp(0)).toBe(0);
    expect(warp(1)).toBe(1);
  });

  it('clamps inputs outside [0, 1] to the endpoints', () => {
    const warp = buildWarp(SHIFTED_ANCHORS);
    expect(warp(-0.25)).toBe(0);
    expect(warp(1.25)).toBe(1);
  });

  it('hits every accepted anchor exactly', () => {
    const warp = buildWarp(SHIFTED_ANCHORS);
    for (const { live, nominal } of SHIFTED_ANCHORS) {
      expect(warp(live)).toBeCloseTo(nominal, 12);
    }
  });

  it('is strictly monotone across the whole domain', () => {
    const warp = buildWarp(SHIFTED_ANCHORS);
    let prev = warp(0);
    for (let i = 1; i <= 1000; i++) {
      const next = warp(i / 1000);
      expect(next).toBeGreaterThan(prev);
      prev = next;
    }
  });

  it('drops anchors that break monotonicity on the live axis', () => {
    // The middle anchor's live value regresses — a collapsed/displaced section.
    const warp = buildWarp([
      { live: 0.2, nominal: 0.25 },
      { live: 0.15, nominal: 0.4 }, // live goes backwards → dropped
      { live: 0.6, nominal: 0.7 },
    ]);
    expect(warp(0.2)).toBeCloseTo(0.25, 12);
    expect(warp(0.6)).toBeCloseTo(0.7, 12);
    // The dropped anchor must not bend the curve: 0.15 sits on the 0→0.2
    // segment, nowhere near the 0.4 the bad anchor asked for.
    expect(warp(0.15)).toBeCloseTo(0.1875, 12);
  });

  it('drops anchors that break monotonicity on the nominal axis', () => {
    const warp = buildWarp([
      { live: 0.2, nominal: 0.25 },
      { live: 0.3, nominal: 0.25 }, // nominal not strictly ascending → dropped
      { live: 0.6, nominal: 0.7 },
    ]);
    let prev = warp(0);
    for (let i = 1; i <= 200; i++) {
      const next = warp(i / 200);
      expect(next).toBeGreaterThan(prev);
      prev = next;
    }
    expect(warp(0.6)).toBeCloseTo(0.7, 12);
  });

  it('drops anchors at or beyond the fixed 1 endpoint', () => {
    const warp = buildWarp([
      { live: 0.5, nominal: 0.5 },
      { live: 1.0, nominal: 0.9 }, // collides with the fixed [1 → 1] endpoint
      { live: 0.7, nominal: 1.2 }, // nominal out of range
    ]);
    expect(warp(1)).toBe(1);
    expect(warp(0.5)).toBeCloseTo(0.5, 12);
  });

  it('is the identity when no anchors survive', () => {
    expect(buildWarp([])).toBe(identityWarp);
    expect(buildWarp([{ live: 2, nominal: 3 }])).toBe(identityWarp);
    expect(identityWarp(0.375)).toBe(0.375);
  });

  it('is (near) identity when the live layout matches the nominal snapshot', () => {
    // Feeding the nominal values back as the live measurements — i.e. the
    // visitor is on the nominal viewport — must change nothing.
    const warp = buildWarp(
      NOMINAL_ANCHORS.map(({ nominal }) => ({ live: nominal, nominal }))
    );
    for (let i = 0; i <= 100; i++) {
      const p = i / 100;
      expect(warp(p)).toBeCloseTo(p, 12);
    }
  });
});
