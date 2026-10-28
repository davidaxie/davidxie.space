'use client';

import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

interface ScrollProgressContextValue {
  /** Ref holding current scroll progress 0–1 (for useFrame / synchronous reads) */
  progressRef: React.RefObject<number>;
  /**
   * performance.now() of the last scroll event.
   *
   * This is the "is the visitor reading?" signal. The canvas runs six
   * independent continuous animations — planet spin, cloud drift, corona,
   * star twinkle, atmosphere shaders, camera — and none of them used to stop,
   * so anyone who paused to actually read the copy was doing it against a
   * moving background. Consumers compare against this to ease their motion
   * down once scrolling stops, and back up when it resumes.
   *
   * A timestamp rather than a boolean: useFrame consumers need to know HOW
   * LONG the page has been still so they can ramp smoothly instead of
   * snapping, and a ref keeps it off the React render path entirely.
   */
  lastScrollAtRef: React.RefObject<number>;
  /** Subscribe to scroll progress changes */
  subscribe: (cb: (progress: number) => void) => () => void;
  /** Get current progress synchronously */
  get: () => number;
}

const ScrollProgressContext = createContext<ScrollProgressContextValue | null>(null);

export function ScrollProgressProvider({ children }: { children: ReactNode }) {
  const progressRef = useRef(0);
  // Starts at 0, not performance.now(): on first paint the visitor has not
  // scrolled yet, and treating load as "just scrolled" would run the scene at
  // full motion for the first second of every visit.
  const lastScrollAtRef = useRef(0);
  const subscribersRef = useRef<Set<(p: number) => void>>(new Set());

  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      const progress = scrollHeight > 0 ? Math.min(1, Math.max(0, scrollTop / scrollHeight)) : 0;
      progressRef.current = progress;
      lastScrollAtRef.current = performance.now();
      subscribersRef.current.forEach((cb) => cb(progress));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial read
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const subscribe = useCallback((cb: (progress: number) => void) => {
    subscribersRef.current.add(cb);
    return () => { subscribersRef.current.delete(cb); };
  }, []);

  const get = useCallback(() => progressRef.current, []);

  return (
    <ScrollProgressContext.Provider value={{ progressRef, lastScrollAtRef, subscribe, get }}>
      {children}
    </ScrollProgressContext.Provider>
  );
}

export function useScrollProgress() {
  const ctx = useContext(ScrollProgressContext);
  if (!ctx) throw new Error('useScrollProgress must be used within ScrollProgressProvider');
  return ctx;
}

/**
 * True once the visitor has stopped scrolling for `idleMs` — i.e. they are
 * almost certainly reading rather than travelling.
 *
 * The canvas layers consume the same signal as a ref inside useFrame, which
 * costs no renders. This hook is the DOM-side counterpart, because CSS cannot
 * read a ref: dimming the canvas needs a real state change to drive a
 * transition. It is deliberately the only part of calm-on-read that re-renders,
 * and it flips at most twice per scroll gesture.
 */
export function useIsReading(idleMs = 550, initialHoldMs = idleMs) {
  const { subscribe } = useScrollProgress();
  // Starts false, not true. A visitor who has just landed is watching the
  // first-load camera flight, not reading — and anything keyed off this (the
  // canvas dim) would otherwise be applied to the entire intro, which is
  // precisely the moment the scene is supposed to be at full strength.
  const [reading, setReading] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let first = true;
    const arm = () => {
      clearTimeout(timer);
      // The first arm waits out the intro; every later one is the normal idle.
      timer = setTimeout(() => setReading(true), first ? initialHoldMs : idleMs);
      first = false;
    };
    const unsubscribe = subscribe(() => {
      setReading((r) => (r ? false : r)); // only re-render on a real transition
      arm();
    });
    arm(); // a visitor who never scrolls is reading from the start
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [subscribe, idleMs, initialHoldMs]);

  return reading;
}
