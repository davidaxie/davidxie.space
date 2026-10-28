'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { CosmicScene } from './CosmicScene';
import { performanceTiers } from '@/lib/constants';

interface CosmicCanvasProps {
  onReady?: () => void;
  // Threaded straight through to CameraController via CosmicScene. This component
  // has no use for it — it is just the only route from page.tsx, which owns the
  // loading state, into the canvas.
  introCueRef?: React.RefObject<boolean>;
}

type PerformanceTier = keyof typeof performanceTiers;

// ── Device Capability Tiering ──
// The canvas used to hardcode dpr={[1, 2]}, which asks a phone to render the full
// star field + bloom at 2x pixel density — the single most expensive knob we own.
// Pick a tier once, cheaply, from signals the browser already has in memory (no
// benchmark frame, no GPU probe) so the very first frame renders at the right dpr.
function detectPerformanceTier(): PerformanceTier {
  // This component is only ever mounted with ssr:false, but guard anyway so the
  // module stays importable from a server context without throwing.
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'high';

  // NOTE: deliberately does NOT branch on prefers-reduced-motion. The tier feeds
  // only `dpr`, so sending those users to 'low' would drop them from dpr 2 to dpr 1
  // — a blurrier scene — while removing exactly zero motion, since none of the 19
  // useFrame loops are gated on the tier. That is strictly worse for the people it
  // claims to help. Honouring the preference properly means gating the animation
  // loops themselves; until that exists, we do not pretend to support it here.

  // hardwareConcurrency is near-universal; deviceMemory is Chromium-only. Both fall
  // back to "capable" values so an unknown-but-fine browser is not punished.
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;

  // Coarse pointer ≈ phone/tablet: thermally throttled and usually on a high-DPI
  // panel, which is exactly the combination that makes dpr 2 hurt. Cap those at medium.
  if (window.matchMedia?.('(pointer: coarse)').matches) {
    return cores <= 4 || memory <= 4 ? 'low' : 'medium';
  }

  if (cores <= 2 || memory <= 2) return 'low';
  if (cores <= 4 || memory <= 4) return 'medium';
  return 'high';
}

function ReadyNotifier({ onReady }: { onReady?: () => void }) {
  const [notified, setNotified] = useState(false);
  useEffect(() => {
    if (!notified && onReady) {
      const t = setTimeout(() => {
        onReady();
        setNotified(true);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [notified, onReady]);
  return null;
}

export function CosmicCanvas({ onReady, introCueRef }: CosmicCanvasProps) {
  // Detect once, in a lazy initializer, so the first mounted frame already uses the
  // right pixel ratio — resolving this in an effect would render one expensive frame
  // at dpr 2 on exactly the devices that cannot afford it.
  const [tier] = useState<PerformanceTier>(detectPerformanceTier);

  // Handle WebGL context loss — listen on the canvas after R3F creates it
  const onCreated = useCallback((state: { gl: { domElement: HTMLCanvasElement } }) => {
    const canvas = state.gl.domElement;

    // preventDefault() is the part that actually matters — it tells the browser we
    // want the context back. three.js re-uploads its own GPU resources on restore,
    // so no handler is needed on that side.
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('WebGL context lost — will attempt restore');
    });
  }, []);

  return (
    <Canvas
      gl={{
        antialias: true,
        // Opaque again. This was briefly transparent so a CSS starfield layered
        // behind it could show through; that layer has since been deleted
        // outright (a DOM plane cannot have depth-dependent parallax, and it
        // could not be depth-tested against the globe), so the scene renders its
        // own stars in world space and nothing needs to show through.
        alpha: false,
        powerPreference: 'high-performance',
      }}
      dpr={performanceTiers[tier].dpr}
      camera={{ fov: 60, near: 0.1, far: 500, position: [0, 0, 30] }}
      // No inline background needed — the scene sets its own clear colour.
      onCreated={onCreated}
    >
      <Suspense fallback={null}>
        {/* The tier is chosen once above; all three of its knobs are applied —
            dpr on the Canvas, and these two down through CosmicScene. Passing
            only dpr left the low tier still running full-screen bloom and the
            full 5,000-star field, i.e. the ladder protected nothing. */}
        <CosmicScene
          enableBloom={performanceTiers[tier].enableBloom}
          particleCount={performanceTiers[tier].particleCount}
          introCueRef={introCueRef}
        />
        <ReadyNotifier onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
