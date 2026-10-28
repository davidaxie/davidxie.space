'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { sectionRanges } from '@/lib/constants';

interface EffectsProps {
  /**
   * WARPED progress — live progress mapped onto the nominal camera axis (see
   * lib/progressWarp.ts). sectionMids below is derived from sectionRanges,
   * which is the NOMINAL snapshot; "near a section's midpoint" is standing in
   * for "camera dwelling at a planet", so the comparison has to happen on the
   * nominal axis or bloom dims mid-transit at non-nominal viewports.
   */
  cameraProgressRef: React.RefObject<number>;
  // Full-screen mipmapBlur bloom is the most expensive effect in the scene, so the
  // low tier drops it. Defaults to 'high' behaviour for un-threaded call sites.
  enableBloom?: boolean;
}

const sectionMids = Object.values(sectionRanges).map(([start, end]) => ({
  mid: (start + end) / 2,
  halfWidth: (end - start) / 2,
}));

export function Effects({ cameraProgressRef, enableBloom = true }: EffectsProps) {
  const [bloomIntensity, setBloomIntensity] = useState(0.55);
  const currentRef = useRef(0.55);

  useFrame((_, delta) => {
    // Nothing consumes the intensity when bloom is off — skip the per-frame
    // setState rather than re-rendering weak devices for an unmounted effect.
    if (!enableBloom) return;

    const progress = cameraProgressRef.current ?? 0;

    // Compute how close we are to any section center (0 = far, 1 = at center)
    let maxProximity = 0;
    for (const { mid, halfWidth } of sectionMids) {
      const dist = Math.abs(progress - mid);
      const proximity = 1 - Math.min(dist / halfWidth, 1);
      maxProximity = Math.max(maxProximity, proximity);
    }

    // Dim bloom when close to a planet, restore when transitioning
    const target = THREE.MathUtils.lerp(0.55, 0.18, maxProximity);
    currentRef.current = THREE.MathUtils.lerp(
      currentRef.current,
      target,
      Math.min(1, delta * 3),
    );

    // Only trigger React re-render when the change is perceptible
    if (Math.abs(currentRef.current - bloomIntensity) > 0.02) {
      setBloomIntensity(currentRef.current);
    }
  });

  return (
    <EffectComposer multisampling={0}>
      {/* Fragment only to satisfy EffectComposer's `JSX.Element | JSX.Element[]` children
          type, which rejects the `false` a bare conditional leaves behind. Fragments add
          no host node, so the composer still sees the effects in order. */}
      <>
        {enableBloom && (
          <Bloom
            intensity={bloomIntensity}
            luminanceThreshold={0.92}
            luminanceSmoothing={0.25}
            mipmapBlur
          />
        )}
        {/* Vignette runs on every tier — nearly free, and the scene reads flat without it. */}
        <Vignette eskil={false} offset={0.1} darkness={0.6} />
      </>
    </EffectComposer>
  );
}
