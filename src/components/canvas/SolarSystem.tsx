'use client';

import { Suspense } from 'react';
import { Sun } from './Sun';
import { Planet } from './Planet';
import { EarthGlobe } from './EarthGlobe';
import { TexturedPlanet } from './TexturedPlanet';
import { OrbitRings } from './OrbitRings';
import { planetConfigs } from '@/lib/constants';

interface SolarSystemProps {
  progressRef: React.RefObject<number>;
  /**
   * Live progress warped onto the nominal camera axis — see lib/progressWarp.ts
   * and the two-axes note in CosmicScene. Sun and EarthGlobe take this one:
   * their windows and breakpoints quote nominal sectionRanges/keyframe values,
   * i.e. they are timed against the camera itinerary, not against the document.
   */
  cameraProgressRef: React.RefObject<number>;
  /** Calm-on-read factor, 1 while scrolling and 0 once still. See CosmicScene. */
  motionRef: React.RefObject<number>;
}

export function SolarSystem({ progressRef, cameraProgressRef, motionRef }: SolarSystemProps) {
  return (
    <group>
      <Sun cameraProgressRef={cameraProgressRef} motionRef={motionRef} />
      {/* Orbital track lines — drawn before planets so they sit behind */}
      <OrbitRings />
      {planetConfigs.map((config) =>
        config.name === 'earth' ? (
          <Suspense key={config.name} fallback={
            <Planet config={config} progressRef={progressRef} motionRef={motionRef} />
          }>
            <EarthGlobe config={config} cameraProgressRef={cameraProgressRef} motionRef={motionRef} />
          </Suspense>
        ) : (
          <Suspense key={config.name} fallback={
            <Planet config={config} progressRef={progressRef} motionRef={motionRef} />
          }>
            <TexturedPlanet config={config} progressRef={progressRef} motionRef={motionRef} />
          </Suspense>
        )
      )}
    </group>
  );
}
