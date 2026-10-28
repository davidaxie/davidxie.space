'use client';

import { useRef, useCallback, useState, useEffect, useSyncExternalStore } from 'react';
import { useMotionValue } from 'framer-motion';

// ── The tilt is gone on purpose. Do not put it back. ──
// This used to rotate the card up to ±tiltStrength degrees on both axes as the
// cursor moved across it. The card swinging left and right under the pointer
// read as jitter, not polish —
// every hover over a Projects/Achievements card set the whole panel (and the
// text inside it) sliding, which is exactly the kind of movement that makes a
// page feel unsettled. Restoring rotateX/rotateY here is a regression, not a
// fix, no matter how subtle the angle. The name TiltCard survives only because
// Projects.tsx and Achievements.tsx import it; renaming is a separate change.
//
// What stays is the non-geometric part: a soft radial sheen that
// tracks the cursor. It repaints a background gradient and never moves layout,
// so it costs nothing in perceived stability.

// ── Coarse-pointer (touch) detection ──
// The media query is an external store, so it is read with useSyncExternalStore
// rather than an effect that setStates on mount — the latter cascades an extra
// render for every card. The server snapshot stays `false` so SSR and the
// hydration pass produce exactly the same tree the effect-based version did,
// and the query then corrects itself immediately after hydration.
//
// `(pointer: coarse)` is the ONLY query this file has ever read. Comments in
// CameraController.tsx and CosmicScene.tsx cite TiltCard as a prior user of the
// prefers-reduced-motion matchMedia pattern; that has never been true here, and
// the citation is what let the claim spread. Leaving it ungated is deliberate,
// not an oversight: what survives is a cursor-tracked radial sheen — it repaints
// a background gradient, moves no layout, and stops the instant the pointer
// leaves, so there is no vestibular surface for the preference to protect. (The
// tilt that WOULD have needed the gate is gone; see the note at the top.) If a
// transform, a travelling highlight, or any self-running animation is ever added
// below, gate it on prefersReducedMotion() from providers/reducedMotion.ts —
// which is now the single place that query lives.
const COARSE_POINTER_QUERY = '(pointer: coarse)';

// Lazily created and shared by every TiltCard — matchMedia is only available in
// the browser, and getSnapshot runs on every render.
let coarsePointerMql: MediaQueryList | null = null;
function coarsePointerMedia(): MediaQueryList {
  if (!coarsePointerMql) coarsePointerMql = window.matchMedia(COARSE_POINTER_QUERY);
  return coarsePointerMql;
}

function subscribeCoarsePointer(onStoreChange: () => void) {
  const mq = coarsePointerMedia();
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function getCoarsePointerSnapshot() {
  return coarsePointerMedia().matches;
}

function getCoarsePointerServerSnapshot() {
  return false;
}

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Inert since the tilt was removed (see the note at the top of this file).
   * Still accepted — and deliberately not destructured below, so lint does not
   * flag an unused binding — because Achievements.tsx passes `tiltStrength={10}`
   * and dropping it from the type would break that call site's build for no
   * user-visible gain. Setting it has no effect.
   */
  tiltStrength?: number;
  /** Sheen highlight opacity (default 0.04 — whisper-soft) */
  sheenOpacity?: number;
}

export function TiltCard({
  children,
  className = '',
  sheenOpacity = 0.04,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  // Touch devices skip the sheen entirely (see the early return below). Without
  // a real cursor the gradient has nothing to follow, and on hybrid machines a
  // tap would latch `isHovering` and leave the card lit until the next tap.
  const isMobile = useSyncExternalStore(
    subscribeCoarsePointer,
    getCoarsePointerSnapshot,
    getCoarsePointerServerSnapshot,
  );
  const [isHovering, setIsHovering] = useState(false);

  // Sheen position only. The rotation motion values and the springs that
  // smoothed them died with the tilt; nothing here drives a transform anymore,
  // which is why this file no longer renders a motion element at all.
  const sheenX = useMotionValue(50);
  const sheenY = useMotionValue(50);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isMobile || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      // Cursor position as a percentage of card dimensions, which is the unit
      // the radial-gradient in SheenOverlay wants.
      sheenX.set(((e.clientX - rect.left) / rect.width) * 100);
      sheenY.set(((e.clientY - rect.top) / rect.height) * 100);
    },
    [isMobile, sheenX, sheenY],
  );

  const handleMouseEnter = useCallback(() => {
    if (!isMobile) setIsHovering(true);
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  if (isMobile) {
    // On mobile, render children with no hover wrapper at all
    return <div className={className}>{children}</div>;
  }

  return (
    // Two nested divs, not one, even though the outer no longer carries the 3D
    // `perspective` that used to justify it: `className` from the call sites is
    // usually a layout class (`h-full`, `mb-8`) that the grid resolves against
    // the outer box, while the Panel inside sizes off the inner one. Collapsing
    // these would silently change card heights in the Projects grid.
    <div className={className}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        // `isolate` replaces the stacking context that `perspective: 800` used
        // to create here. Without it the sheen's z-20 escapes the card and
        // competes with the rest of the page's layering.
        className="relative isolate"
      >
        {/* Card content */}
        {children}

        {/* Sheen overlay — follows cursor, updates via motion value subscriptions */}
        {isHovering && (
          <SheenOverlay sheenX={sheenX} sheenY={sheenY} opacity={sheenOpacity} />
        )}
      </div>
    </div>
  );
}

/** Separate component so the sheen gradient updates on every frame via useMotionValueEvent */
function SheenOverlay({
  sheenX,
  sheenY,
  opacity,
}: {
  sheenX: ReturnType<typeof useMotionValue<number>>;
  sheenY: ReturnType<typeof useMotionValue<number>>;
  opacity: number;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;

    const unsubX = sheenX.on('change', () => {
      el.style.background = `radial-gradient(circle at ${sheenX.get()}% ${sheenY.get()}%, rgba(255,255,255,${opacity}) 0%, transparent 60%)`;
    });
    const unsubY = sheenY.on('change', () => {
      el.style.background = `radial-gradient(circle at ${sheenX.get()}% ${sheenY.get()}%, rgba(255,255,255,${opacity}) 0%, transparent 60%)`;
    });

    // Set initial value
    el.style.background = `radial-gradient(circle at ${sheenX.get()}% ${sheenY.get()}%, rgba(255,255,255,${opacity}) 0%, transparent 60%)`;

    return () => {
      unsubX();
      unsubY();
    };
  }, [sheenX, sheenY, opacity]);

  return (
    <div
      ref={overlayRef}
      className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
    />
  );
}
