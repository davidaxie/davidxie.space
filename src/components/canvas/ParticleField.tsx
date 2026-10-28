'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { performanceTiers } from '@/lib/constants';

// ── Deterministic Star Field ──
// The field used to be built with Math.random() inside useMemo. useMemo is a caching
// *hint*, not a guarantee — React is free to re-run it (StrictMode double-invoke, a
// future cache eviction), and every re-run would silently deal a completely different
// sky while the scroll-driven camera keeps its keyframes. A fixed-seed PRNG gives the
// identical uniform distribution with none of that: same call sites, same ranges, but
// generation is now pure and reproducible frame to frame and reload to reload.
const STAR_SEED = 0x9e3779b9; // golden-ratio constant — arbitrary, just needs to be fixed

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aBrightness;
  attribute vec3 aColor;
  attribute float aPhase;
  varying float vBrightness;
  varying vec3 vColor;
  varying float vPhase;
  // uProgress is still needed here — it drives the fade-out below. (uTime is
  // not: twinkle is purely a fragment-stage effect, so this stage never reads
  // it. It stays in the shared uniform object for the fragment shader.)
  uniform float uProgress;

  void main() {
    vBrightness = aBrightness;
    vColor = aColor;
    vPhase = aPhase;
    // Stars are FIXED in world space — the raw position attribute goes straight
    // into the model-view matrix, untouched.
    //
    // This used to spin the whole shell by uProgress * 0.3 and lift it by
    // uProgress * 18.0, i.e. it moved the *sky* as a function of scroll. Both
    // were rigid-body motions of the entire field, so every star was displaced
    // by the same amount regardless of how far away it was — and depth-dependent
    // displacement is the one cue that makes a starfield read as a 3D space
    // (near stars sweep past, distant ones barely shift). Worse, it stacked on
    // top of the keyframed camera flight, which was already generating real
    // parallax, so the two fought and the uniform slide won. That is the "stars
    // only scroll downwards" artifact. Nail the sky down and the only thing
    // moving is the observer, which is how it works in reality: the parallax
    // then falls out of the projection for free and is correct by construction.
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = -mvPosition.z;
    gl_PointSize = aSize * (200.0 / dist);
    gl_PointSize = clamp(gl_PointSize, 0.5, 5.0);
    // Fade-OUT only — 0.86 → 0.94, so the recap still ends in clean void.
    //
    // The fade-IN (smoothstep(0.06, 0.12)) is deliberately gone, and the reason
    // matters because an earlier version of this comment had it backwards. The
    // retired 2D starfield did NOT "cover" the overview: it ran the *identical*
    // 0.06/0.12 ramp, so the overview was intentionally starless in both layers
    // — the planets were meant to carry that frame alone.
    //
    // What changed is that the first-load camera intro now starts at ~171 units,
    // i.e. inside this 80–280 shell, and flies through it. Holding the fade-in
    // would play that entire entrance against an empty black sky and throw away
    // most of what makes it read as motion through space. So this is a real
    // reversal of the old intent, made on purpose, not an accident: the deck now
    // opens on stars and still closes on void. If the asymmetry ever looks
    // wrong, the fix is to fade the recap differently — not to blind the intro.
    gl_PointSize *= 1.0 - smoothstep(0.86, 0.94, uProgress);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vBrightness;
  varying vec3 vColor;
  varying float vPhase;
  uniform float uTime;
  uniform float uProgress;

  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float alpha = 1.0 - smoothstep(0.0, 0.25, d);
    float twinkle = sin(uTime * 0.3 + vPhase) * 0.1 + 0.9;
    // Brighter during transit sections, dimmer near planets
    float progressPulse = 0.9 + 0.1 * sin(uProgress * 3.14159 * 4.0);
    float brightness = vBrightness * twinkle * progressPulse;
    vec3 col = vColor * brightness * 1.3;
    gl_FragColor = vec4(col, alpha * brightness);
  }
`;

// ── Sky density ──
// With the 2D CSS starfield retired, this is the only star layer left, so it
// has to carry a sky that two layers used to carry between them. The 2D layer
// contributed ~610–1,400 static plus ~40–90 shimmer stars, all of them on
// screen by construction. This field is a shell, and only a slice of a shell is
// ever in frame: a ~66° vertical fov at 16:9 subtends roughly 1.7 of 4π
// steradians, so about 13% of the stars are visible at any instant. The high
// tier's 5,000 was therefore only ever ~675 stars on screen — less than the 2D
// layer it sat behind. Multiplying here rather than in constants.ts is
// deliberate: the tier ratios stay exactly as tuned (5000/3000/1500 →
// 11000/6600/3300), and "how dense the sky looks" stays owned by the file that
// draws it. The cost is near-free — one gl.POINTS draw call with a sprite
// clamped to 5px, so it is vertex-bound, and 11k vertices is noise next to the
// planet meshes.
const SKY_DENSITY_MULTIPLIER = 2.2;

interface ParticleFieldProps {
  progressRef: React.RefObject<number>;
  /** Calm-on-read factor, 1 while scrolling and 0 once still. See CosmicScene. */
  motionRef?: React.RefObject<number>;
  // Star budget for the device tier, scaled by SKY_DENSITY_MULTIPLIER before it
  // reaches the buffers. Defaults to 'high' so an un-threaded call site still
  // gets the top-tier sky rather than silently falling to a sparse one.
  particleCount?: number;
}

export function ParticleField({
  progressRef,
  motionRef,
  particleCount = performanceTiers.high.particleCount,
}: ParticleFieldProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const timeRef = useRef(0);

  const starCount = Math.round(particleCount * SKY_DENSITY_MULTIPLIER);

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const brightnesses = new Float32Array(starCount);
    const colors = new Float32Array(starCount * 3);
    const phases = new Float32Array(starCount);

    // Seeded per memo run, so a re-run reproduces the exact same sky. A smaller
    // count draws the same prefix of the sequence, so tiers are subsets, not
    // different skies.
    const random = mulberry32(STAR_SEED);

    for (let i = 0; i < starCount; i++) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      // 80–280 shell, unchanged and verified against the camera path: the
      // keyframed flight peaks at 59.2 units from the origin (the last recap
      // keyframe, [-12, 42, 40]; sampling the centripetal Catmull-Rom at 1e5
      // steps shows no overshoot past it), and the first-load intro starts at
      // 3× the overview = 170.9. So the camera lives strictly between the two
      // radii at all times — always inside the shell, never outside it — and no
      // star ever crosses a boundary that could make it pop in or out.
      const radius = 80 + random() * 200;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      const rawSize = random();
      sizes[i] = 0.5 + Math.pow(rawSize, 2.5) * 2.5;
      brightnesses[i] = 0.3 + random() * 0.7;

      // Warm white star colors — slight random variation
      const warmth = 0.9 + random() * 0.1;
      colors[i * 3] = warmth;                        // R
      colors[i * 3 + 1] = warmth * (0.96 + random() * 0.04); // G
      colors[i * 3 + 2] = warmth * (0.90 + random() * 0.10); // B

      phases[i] = random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aBrightness', new THREE.BufferAttribute(brightnesses, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const u = {
      uTime: { value: 0 },
      uProgress: { value: 0 },
    };
    return { geometry: geo, uniforms: u };
  }, [starCount]);

  // Dispose geometry on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame((_, delta) => {
    // Star twinkle is the highest-frequency motion on screen and the most
    // distracting behind text, so it calms with everything else.
    timeRef.current += delta * (motionRef?.current ?? 1);
    uniforms.uTime.value = timeRef.current;
    uniforms.uProgress.value = progressRef.current ?? 0;
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
