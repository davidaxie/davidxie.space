'use client';

import { useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFootprintsStore } from '@/stores/footprintsStore';
import type { CityMarker } from '@/data/cities';

interface CityLabelProps {
  city: CityMarker;
  position: [number, number, number];
}

/**
 * Shared body-level overlay that city markers portal into.
 *
 * page.tsx pins the r3f canvas at `fixed inset-0 z-0` and the scrolling content
 * at `z-10`. A positioned element with a z-index opens a stacking context, so
 * ANY z-index drei's <Html> sets inside the canvas container is still resolved
 * beneath that z-10 sibling — the markers were rendering under the Footprints
 * chips and every click hit a chip instead. Measured: the Shanghai marker had a
 * correct 124x64 hit box, but elementFromPoint at its centre returned the
 * section's own button.
 *
 * Portalling to <body> takes the markers out of the canvas's stacking context
 * so they can legitimately sit above the content layer. The container is
 * pointer-events:none so it never steals clicks from the page; only the marker
 * buttons themselves opt back in.
 */
let overlayRef: React.RefObject<HTMLElement> | null = null;
function getOverlay(): React.RefObject<HTMLElement> | null {
  // SSR: no document. Html falls back to its default in-canvas container,
  // and the ref is resolved for real on the client's first render.
  if (typeof document === 'undefined') return null;
  if (!overlayRef) {
    const el = document.createElement('div');
    el.dataset.cityMarkerOverlay = '';
    el.style.cssText = 'position:fixed;inset:0;z-index:30;pointer-events:none;';
    document.body.appendChild(el);
    // `current` is non-null from here on, which is the shape Html's
    // RefObject<HTMLElement> prop requires.
    overlayRef = { current: el };
  }
  return overlayRef;
}

/**
 * The marker for the currently selected city.
 *
 * Two earlier versions are worth not repeating. The first drew a small
 * emissive sphere plus an additively-blended sprite glow, which read as a
 * light source sitting *on* the planet rather than an annotation *about* it.
 * The second replaced that with a cartographic annotation — the right call —
 * but rendered one for every city at once, collapsed to a 4px dot at rest, so
 * the Americas-facing hemisphere carried a scatter of white ticks that looked
 * like surface noise.
 *
 * EarthGlobe now mounts exactly one of these, for the active city only, so
 * there is no resting state left to design: the marker is always lit. That
 * deletes the dot, the two-state box, the hover tracking, and the zIndex
 * tie-break that existed only to arbitrate between overlapping neighbours —
 * with one marker on the globe, nothing can overlap.
 *
 * What remains is the annotation itself: a hairline leader dropping to the
 * exact coordinate, and a glass pill carrying the name in the same mono label
 * token the rest of the site uses. No emissive geometry at all.
 */
export function CityLabel({ city, position }: CityLabelProps) {
  const setActiveCity = useFootprintsStore((s) => s.setActiveCity);

  // This only mounts for the active city, so the marker's own click is
  // unambiguously a dismissal — the same thing pressing the lit chip does.
  const dismiss = () => setActiveCity(null);

  // Resolved once per marker; null during SSR, which Html tolerates by
  // falling back to its default in-canvas container.
  const portalRef = useRef(getOverlay());

  // Earth-accent blue, matching --color-planet-earth / planetColors.earth so
  // the marker keys to the same section colour as everything else Earth-tagged.
  const accent = '#5A8FB5';

  return (
    <group position={position}>
      <Html
        center
        occlude
        // Escapes the canvas's z-0 stacking context — see getOverlay above.
        portal={portalRef.current ?? undefined}
        // Stay under the city photo panel, which opens on top of everything.
        zIndexRange={[20, 0]}
        style={{ pointerEvents: 'auto', userSelect: 'none' }}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-pressed={true}
          aria-label={`${city.name} — close memories`}
          className="group relative flex cursor-pointer flex-col items-center border-0 bg-transparent p-0"
          // A modest halo to soften the edge of the hit target. It can stay
          // small: the pill itself is already 34px tall, and with only the
          // active city on the globe there is no neighbour for a larger box to
          // steal clicks from.
          style={{ padding: '5px 6px', margin: '-5px -6px' }}
        >
          {/* The pill. One state now — it exists only while its city is
              selected, so there is nothing to animate between. */}
          <span
            className="relative flex items-center justify-center whitespace-nowrap rounded-full font-mono uppercase"
            style={{
              // Same label token as SECONDARY_LINK_CLASS and the section
              // eyebrows — 10px DM Mono, 0.3em tracking. That is the
              // unification: one label voice everywhere in the product.
              fontSize: '10px',
              letterSpacing: '0.3em',
              // 34px is the accessible pill height. Tracking adds a trailing
              // gap on the last glyph, so the right pad is smaller to keep the
              // text optically centred.
              height: '34px',
              padding: '0 9px 0 12px',
              color: '#FFFFFF',
              background: 'rgba(90,143,181,0.22)',
              border: `1px solid ${accent}`,
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              // Legibility over both bright cloud and black ocean without a
              // glow: a tight dark contact shadow, not a bloom.
              textShadow: '0 1px 3px rgba(0,0,0,0.95)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.6), 0 0 0 3px rgba(90,143,181,0.14)',
              transform: 'translateY(-1px)',
            }}
          >
            {city.name}
          </span>

          {/* Hairline leader to the true coordinate. It points precisely
              without emitting light, the way a map annotation tags a place
              rather than lighting it. */}
          <span
            aria-hidden="true"
            style={{
              width: '1px',
              height: '10px',
              marginTop: '2px',
              background: `linear-gradient(to bottom, ${accent}, transparent)`,
            }}
          />
        </button>
      </Html>
    </group>
  );
}
