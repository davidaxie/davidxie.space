'use client';

import { useEffect, useState } from 'react';
import type { SectionId } from '@/lib/constants';
import { sectionIds } from '@/lib/constants';

export function useSectionInView(): SectionId | null {
  const [active, setActive] = useState<SectionId | null>(null);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        // ── Gate on the ratio, never on `isIntersecting` ──
        // An observer fires on *both* crossings of a threshold, and
        // `isIntersecting` is true for any non-zero overlap. So the outgoing
        // section — sliding from 0.35 down through 0.30 to 0.25 — delivers an
        // entry that is still "intersecting" and, under a bare isIntersecting
        // check, re-claims the highlight from the section now filling the
        // screen. With 100vh sections the incoming one crosses 0.3 after
        // 0.3vh of scroll while the outgoing one falls back through 0.3 only
        // at 0.7vh, so the nav pointed at the section the user had just left
        // for that whole stretch. Comparing the ratio makes the direction of
        // the crossing irrelevant: only an entry actually covering >= 30% of
        // the viewport can take over. Same guard CursorGlow.tsx already uses.
        ([entry]) => {
          if (entry.intersectionRatio >= 0.3) {
            setActive(id);
          }
        },
        // Both edges are listed so the observer also reports the sliver-entry
        // crossing at 0 — the ratio gate above rejects it, which keeps the
        // gate the single source of truth instead of the threshold list.
        { threshold: [0, 0.3] }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return active;
}
