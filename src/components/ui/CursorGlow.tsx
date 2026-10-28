'use client';

import { useEffect, useRef, useCallback } from 'react';
import { sectionIds, type SectionId } from '@/lib/constants';

// Section-to-color mapping, following the camera's run through the system.
//
// These are mixed ~70% toward white on purpose. The earlier values were the raw
// brand colors (59,159,224 and 48,96,240), which at any visible alpha painted a
// blue puddle that tracked the pointer — you read it as "there is a light here",
// not as the page being lit. Anything more saturated than these announces itself.
// If you retune, move the mix ratio, not the hue.
// Keyed by SectionId rather than string. This file was a SECOND, entirely
// independent copy of the section list — invisible to the guards in
// constants.ts because both literals below were untyped — so a renamed section
// simply stopped glowing. Nothing rendered wrong; a subtle effect just went
// missing, which is the least likely bug in the codebase to ever be reported.
//
// The hues are unchanged and still hand-desaturated per the note above. They
// are deliberately NOT derived from planetColors: those are display accents
// chosen to read against black at full saturation, and mixing them in here at
// this alpha is exactly the "announces itself" failure the note warns about.
const SECTION_COLORS: Record<SectionId, { r: number; g: number; b: number; a: number }> = {
  // The cool run: Earth, Venus and the turn inward to Mercury.
  memories:    { r: 196, g: 226, b: 246, a: 0.025 },
  footprints:  { r: 196, g: 226, b: 246, a: 0.025 },
  about:       { r: 196, g: 226, b: 246, a: 0.025 },
  builder:     { r: 196, g: 226, b: 246, a: 0.025 },
  // Warm, once the camera turns and runs out to Jupiter.
  finance:     { r: 250, g: 234, b: 188, a: 0.025 },
  // Cool again for the outer system: Saturn, Uranus, Neptune.
  creator:     { r: 193, g: 208, b: 250, a: 0.025 },
  offtheclock: { r: 193, g: 208, b: 250, a: 0.025 },
  contact:     { r: 193, g: 208, b: 250, a: 0.025 },
};

const DEFAULT_COLOR = { r: 255, g: 255, b: 255, a: 0.02 };

// Derived, never retyped. The previous hardcoded array is how this file drifted
// out of sync in the first place.
const SECTION_IDS: readonly SectionId[] = sectionIds;

export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -1000, y: -1000 });
  const targetRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef<number>(0);
  const activeSectionRef = useRef<string>('hero');
  const currentColorRef = useRef({ ...DEFAULT_COLOR });
  const targetColorRef = useRef({ ...DEFAULT_COLOR });
  const isTouchRef = useRef(false);
  const visibleRef = useRef(true);

  // Smooth spring-like interpolation constants
  const DAMPING = 25;
  const STIFFNESS = 200;
  const velocityRef = useRef({ x: 0, y: 0 });

  const updateGradient = useCallback(() => {
    const c = currentColorRef.current;
    if (!glowRef.current) return;

    // The 40% stop at 45% alpha is what keeps this from looking like a disc.
    // A straight color -> transparent ramp over a 500px circle leaves a faint
    // but perceptible edge where the browser's linear interpolation lands; the
    // extra stop bends the falloff so the glow has no findable boundary.
    glowRef.current.style.background =
      `radial-gradient(circle, ` +
      `rgba(${c.r},${c.g},${c.b},${c.a}) 0%, ` +
      `rgba(${c.r},${c.g},${c.b},${c.a * 0.45}) 40%, ` +
      `transparent 72%)`;
  }, []);

  useEffect(() => {
    // Detect touch device
    const mql = window.matchMedia('(pointer: coarse)');
    isTouchRef.current = mql.matches;

    const handlePointerChange = (e: MediaQueryListEvent) => {
      isTouchRef.current = e.matches;
      if (glowRef.current) glowRef.current.style.opacity = e.matches ? '0' : '1';
    };
    mql.addEventListener('change', handlePointerChange);

    // Hide on touch devices initially
    if (isTouchRef.current && glowRef.current) {
      glowRef.current.style.opacity = '0';
    }

    // Mouse move handler — only updates target, no DOM writes
    const handleMove = (e: MouseEvent) => {
      targetRef.current.x = e.clientX;
      targetRef.current.y = e.clientY;
    };

    // Hide when mouse leaves the window
    const handleLeave = () => {
      visibleRef.current = false;
      if (glowRef.current) glowRef.current.style.opacity = '0';
    };
    const handleEnter = () => {
      if (isTouchRef.current) return;
      visibleRef.current = true;
      if (glowRef.current) glowRef.current.style.opacity = '1';
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    document.addEventListener('mouseleave', handleLeave);
    document.addEventListener('mouseenter', handleEnter);

    // IntersectionObserver to track which section is in view
    const observers: IntersectionObserver[] = [];
    const setupObservers = () => {
      SECTION_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
                activeSectionRef.current = id;
                const color = SECTION_COLORS[id] || DEFAULT_COLOR;
                targetColorRef.current = { ...color };
              }
            });
          },
          { threshold: [0.3, 0.5] }
        );

        observer.observe(el);
        observers.push(observer);
      });
    };

    // Delay observer setup slightly to let sections render
    const timer = setTimeout(setupObservers, 500);

    // Set initial gradient colors
    updateGradient();

    // The rAF loop lives inside the effect that owns it: as a hoisted function
    // declaration it can queue its own next frame, whereas a useCallback would
    // have to reference its own binding before initialisation.
    function animate() {
      if (isTouchRef.current || !visibleRef.current) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const dt = 1 / 60; // assume ~60fps for spring calc
      const pos = posRef.current;
      const target = targetRef.current;
      const vel = velocityRef.current;

      // Spring physics: F = -stiffness * (pos - target) - damping * velocity
      const forceX = -STIFFNESS * (pos.x - target.x) - DAMPING * vel.x;
      const forceY = -STIFFNESS * (pos.y - target.y) - DAMPING * vel.y;

      vel.x += forceX * dt;
      vel.y += forceY * dt;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;

      // GPU-accelerated positioning
      if (glowRef.current) {
        glowRef.current.style.transform =
          `translate3d(${pos.x - 250}px, ${pos.y - 250}px, 0)`;
      }

      // Smoothly interpolate color toward target
      const tc = targetColorRef.current;
      const cc = currentColorRef.current;
      const colorLerp = 0.05;
      const dr = Math.abs(cc.r - tc.r);
      const dg = Math.abs(cc.g - tc.g);
      const db = Math.abs(cc.b - tc.b);

      if (dr > 0.5 || dg > 0.5 || db > 0.5) {
        cc.r += (tc.r - cc.r) * colorLerp;
        cc.g += (tc.g - cc.g) * colorLerp;
        cc.b += (tc.b - cc.b) * colorLerp;
        cc.a += (tc.a - cc.a) * colorLerp;
        updateGradient();
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    // Start animation loop
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseleave', handleLeave);
      document.removeEventListener('mouseenter', handleEnter);
      mql.removeEventListener('change', handlePointerChange);
      cancelAnimationFrame(rafRef.current);
      observers.forEach((o) => o.disconnect());
    };
  }, [updateGradient]);

  // Deliberately one layer. There used to be a second 80px div rendered at 1.5x
  // this opacity and offset to sit directly under the pointer; at that size the
  // falloff is short enough that it stopped reading as light and became a small
  // blue dot glued to the cursor. Re-adding a "focused core" brings that back —
  // if the center needs more presence, raise the alpha here instead.
  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed top-0 left-0 z-20 hidden md:block"
      style={{
        width: 500,
        height: 500,
        borderRadius: '50%',
        willChange: 'transform',
        transition: 'opacity 0.3s ease',
      }}
    />
  );
}
