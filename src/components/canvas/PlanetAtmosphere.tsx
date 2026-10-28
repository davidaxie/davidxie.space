'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  atmosphereVertexShader,
  atmosphereFragmentShader,
  atmospherePresets,
  type AtmospherePreset,
} from './AtmosphereShader';

interface PlanetAtmosphereProps {
  /** Planet name key (e.g. "earth", "mars") — selects a preset */
  planetName: string;
  /** Radius of the planet mesh this atmosphere wraps */
  radius: number;
  /** Y-axis squash for oblate gas giants (default 1.0 = sphere) */
  yScale?: number;
  /** Optional override — if omitted the preset for planetName is used */
  preset?: Partial<AtmospherePreset>;
  /** Pulse animation period in seconds (default 3.5) */
  pulsePeriod?: number;
  /**
   * Calm-on-read factor, 1 while scrolling and 0 once still — and pinned at 0
   * for the whole session under prefers-reduced-motion. See CosmicScene.
   *
   * Threaded here for CONSISTENCY, not because this component was leaking
   * motion into a settled scene. It is mounted from exactly one place —
   * Planet.tsx, which is only ever SolarSystem's Suspense fallback — so it is
   * on screen for the texture-load window and then unmounted for good, and
   * neither TexturedPlanet nor EarthGlobe renders an atmosphere at all. The
   * cost of not gating it was therefore bounded by how long the maps take to
   * decode, not unbounded. Gated anyway because every other useFrame in the
   * canvas is, and a loop that quietly opts out is the kind of thing that stops
   * being harmless the first time someone reuses the component.
   */
  motionRef?: React.RefObject<number>;
}

export function PlanetAtmosphere({
  planetName,
  radius,
  yScale = 1.0,
  preset: overrides,
  pulsePeriod = 3.5,
  motionRef,
}: PlanetAtmosphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  // Resolve preset (fall back to earth if unknown planet)
  const resolved: AtmospherePreset = useMemo(() => {
    const base = atmospherePresets[planetName] ?? atmospherePresets.earth;
    return {
      color: overrides?.color ?? base.color,
      fresnelPower: overrides?.fresnelPower ?? base.fresnelPower,
      intensity: overrides?.intensity ?? base.intensity,
    };
  }, [planetName, overrides?.color, overrides?.fresnelPower, overrides?.intensity]);

  const uniforms = useMemo(
    () => ({
      uAtmosphereColor: { value: new THREE.Color(resolved.color) },
      uFresnelPower: { value: resolved.fresnelPower },
      uIntensity: { value: resolved.intensity },
      uPulse: { value: 0.0 },
      uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
    }),
    [resolved.color, resolved.fresnelPower, resolved.intensity],
  );

  // Atmosphere shell is 15 % larger than the planet surface
  const atmosphereRadius = radius * 1.15;

  useFrame((_, delta) => {
    // Scaled, not skipped: at calm 0 the clock stops where it is, so the shell
    // holds its current pulse phase and scale instead of snapping back to 0.
    timeRef.current += delta * (motionRef?.current ?? 1);

    // Smooth sine pulse: oscillates 0 → 1 → 0 over pulsePeriod
    const phase = (timeRef.current % pulsePeriod) / pulsePeriod;
    const pulse = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5; // 0-1
    uniforms.uPulse.value = pulse;

    // Subtle scale oscillation (1.0 – 1.05)
    if (meshRef.current) {
      const s = 1.0 + pulse * 0.05;
      meshRef.current.scale.set(s, s * yScale, s);
    }
  });

  return (
    <mesh ref={meshRef} scale={[1, yScale, 1]}>
      <sphereGeometry args={[atmosphereRadius, 48, 48]} />
      <shaderMaterial
        vertexShader={atmosphereVertexShader}
        fragmentShader={atmosphereFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
