'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { planetConfigs } from '@/lib/constants';

const SEGMENTS = 192;

/**
 * Real 3D orbital tracks — each ring is a circle of radius |planet| centered
 * on the Sun, lying in the planet's actual orbital plane (defined by the
 * planet's position vector and the world-up cross-tangent). Each planet
 * sits exactly on its ring at angle θ = 0 of the orbit's local frame.
 *
 * Anti-aliased via drei's <Line> (Line2 under the hood, configurable px width).
 * Default `<line>` elements use gl.LINES which is jaggy 1px on Retina.
 */
function computeOrbitPoints(planetPos: [number, number, number]): [number, number, number][] {
  const pos = new THREE.Vector3(...planetPos);
  const r = pos.length();
  if (r < 0.001) return [];

  // iHat: radial direction toward planet (planet sits at θ=0 on its orbit)
  // jHat: tangent perpendicular to iHat, lying as horizontal as possible.
  //       The orbit plane = span(iHat, jHat). Planet stays on it by construction.
  const iHat = pos.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const jHat = new THREE.Vector3().crossVectors(up, iHat);
  if (jHat.lengthSq() < 0.001) {
    jHat.set(1, 0, 0); // degenerate: planet at world pole
  } else {
    jHat.normalize();
  }

  const pts: [number, number, number][] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const theta = (i / SEGMENTS) * Math.PI * 2;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    pts.push([
      (iHat.x * c + jHat.x * s) * r,
      (iHat.y * c + jHat.y * s) * r,
      (iHat.z * c + jHat.z * s) * r,
    ]);
  }
  return pts;
}

export function OrbitRings() {
  const orbits = useMemo(() => {
    return planetConfigs.map((config) => ({
      name: config.name,
      points: computeOrbitPoints(config.position),
    }));
  }, []);

  return (
    <group>
      {orbits.map(({ name, points }) => (
        <Line
          key={name}
          points={points}
          color={new THREE.Color(0xb0c4d8)}
          lineWidth={0.6}
          transparent
          opacity={0.09}
          depthWrite={false}
          renderOrder={-1}
        />
      ))}
    </group>
  );
}
