'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import Lenis from 'lenis';

const LenisContext = createContext<Lenis | null>(null);

export function useLenis(): Lenis | null {
  return useContext(LenisContext);
}

// ── Lenis instance store ──
// Lenis is an external object with its own lifecycle, not React state: it can
// only be constructed in an effect (it grabs window/document listeners) and then
// has to be published to the tree. Calling setState straight from the effect
// body cascades a render, so the instance lives in a tiny subscribable store
// that the provider reads with useSyncExternalStore — the sanctioned "subscribe
// to an external system" path. The context itself is unchanged, so consumers
// (including the ones inside the r3f canvas) see exactly what they saw before.
// Exactly one provider is mounted, at the root of app/page.tsx, so a module-level
// store is safe here.
let lenisInstance: Lenis | null = null;
const lenisListeners = new Set<() => void>();

function publishLenis(instance: Lenis | null) {
  lenisInstance = instance;
  lenisListeners.forEach((notify) => notify());
}

function subscribeLenis(onStoreChange: () => void) {
  lenisListeners.add(onStoreChange);
  return () => {
    lenisListeners.delete(onStoreChange);
  };
}

const getLenisSnapshot = () => lenisInstance;
// No instance exists during SSR or the hydration pass — same as the pre-effect
// state on the client, so hydration output stays identical.
const getLenisServerSnapshot = () => null;

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenis = useSyncExternalStore(
    subscribeLenis,
    getLenisSnapshot,
    getLenisServerSnapshot,
  );
  const rafIdRef = useRef<number>(0);

  useEffect(() => {
    // Touch devices already have hardware-optimised inertial scroll —
    // running Lenis on top burns CPU + battery and adds input latency.
    // Also respect prefers-reduced-motion (accessibility + low-power mode).
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || reducedMotion) {
      return;
    }

    const instance = new Lenis({
      lerp: 0.07,
      duration: 1.2,
      smoothWheel: true,
      wheelMultiplier: 0.8,
    });

    publishLenis(instance);

    function raf(time: number) {
      instance.raf(time);
      rafIdRef.current = requestAnimationFrame(raf);
    }

    rafIdRef.current = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafIdRef.current);
      instance.destroy();
      publishLenis(null);
    };
  }, []);

  return (
    <LenisContext.Provider value={lenis}>
      {children}
    </LenisContext.Provider>
  );
}
