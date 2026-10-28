'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { noiseGLSL } from '@/lib/shaders/noise.glsl';

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewDir;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform sampler2D uSunMap;
  uniform float uHasTexture;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewDir;
  varying vec2 vUv;

  ${noiseGLSL}

  void main() {
    vec3 p = vPosition * 1.5;
    vec3 slowFlow = vec3(uTime * 0.08, uTime * 0.05, uTime * 0.06);
    vec3 fastFlow = vec3(uTime * 0.15, uTime * 0.1, uTime * 0.12);

    float n1 = fbm(p + slowFlow, 5) * 0.5 + 0.5;
    float n2 = fbm(p * 2.5 + fastFlow + 50.0, 4) * 0.5 + 0.5;
    float granulation = snoise(vPosition * 14.0 + vec3(uTime * 0.04)) * 0.5 + 0.5;
    float fineGran = snoise(vPosition * 28.0 + vec3(uTime * 0.07)) * 0.5 + 0.5;

    // Sunspot layer — slow drifting low-frequency dark patches
    float sunspotBase = fbm(p * 0.4 + vec3(uTime * 0.008), 4) * 0.5 + 0.5;
    float sunspotMask = smoothstep(0.62, 0.72, sunspotBase);
    float sunspotUmbra = smoothstep(0.70, 0.78, sunspotBase);

    // Hot solar palette — orange/yellow furnace
    vec3 hotCore = vec3(1.0, 0.95, 0.70);  // hottest near-white cores
    vec3 bright  = vec3(1.0, 0.70, 0.22);  // bright yellow-orange
    vec3 mid     = vec3(0.98, 0.40, 0.10); // main orange surface
    vec3 deep    = vec3(0.62, 0.16, 0.03); // cool / penumbra
    vec3 spot    = vec3(0.10, 0.03, 0.01); // sunspot umbra

    vec3 proceduralColor = mix(deep, mid, n1);
    proceduralColor = mix(proceduralColor, bright, pow(n1, 1.5) * 0.7);
    proceduralColor = mix(proceduralColor, hotCore, pow(n1 * n2, 3.0) * 0.4);

    // Sample texture and blend: 85% texture, 15% procedural for animated shimmer
    vec3 texColor = texture2D(uSunMap, vUv).rgb;
    vec3 col = mix(proceduralColor, mix(texColor, proceduralColor, 0.15), uHasTexture);

    // Granulation cells — darker boundaries between convection cells
    col *= 0.82 + granulation * 0.32 + fineGran * 0.08;

    // Sunspots — darken specific regions
    col = mix(col, deep * 0.35, sunspotMask * 0.78);
    col = mix(col, spot, sunspotUmbra * 0.94);

    // Limb darkening — fade toward deep red-orange (real sun behavior)
    float NdotV = max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
    float limbDarkening = pow(NdotV, 0.45);
    vec3 limbColor = mix(deep * 0.6, col, pow(NdotV, 0.55));
    col = mix(limbColor, col, pow(NdotV, 0.35));
    col *= limbDarkening;
    col *= 1.7;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const coronaVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vLocalPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Shared utility: compute camera-aligned polar coordinates so streamers
// always read as radial rays pointing outward from the Sun, regardless of
// where the camera is in the scene.
const coronaUtilsGLSL = /* glsl */ `
  // Returns (angle, radius) in the camera-aligned plane through the Sun center.
  vec2 cameraPolar(vec3 localPos, vec3 worldPos) {
    vec3 viewDir = normalize(cameraPosition - worldPos);
    // Pick a stable world-up that isn't parallel to viewDir
    vec3 worldUp = abs(viewDir.y) > 0.95 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
    vec3 right = normalize(cross(worldUp, viewDir));
    vec3 up = cross(viewDir, right);
    float projR = dot(localPos, right);
    float projU = dot(localPos, up);
    float angle = atan(projU, projR);
    float radius = length(vec2(projR, projU));
    return vec2(angle, radius);
  }
`;

// ── Inner corona — bright photospheric rim with prominent loops ──
// All shells now use exponential decay from the sun's edge (radius 1.0 in
// local coords) so multiple shells blend smoothly without visible discs.
const coronaFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uDecayRate;
  uniform float uTime;
  uniform float uNoiseStrength;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  ${noiseGLSL}
  ${coronaUtilsGLSL}

  void main() {
    vec2 polar = cameraPolar(vLocalPosition, vWorldPosition);
    float angle = polar.x;
    float shellR = length(vLocalPosition);
    float r_norm = clamp(polar.y / max(shellR, 0.001), 0.0, 1.0);

    // Distance beyond sun's edge in local coords (sun has radius 1.0).
    // For any back-side shell, this is in [0, shellR-1].
    float overSun = max(0.0, polar.y - 1.0);
    // Exponential decay from sun's edge — same profile for every shell
    float coronaGlow = exp(-overSun * uDecayRate);
    // Smooth fade at this shell's silhouette so layers stitch together
    float outerFade = 1.0 - smoothstep(0.85, 1.0, r_norm);
    float rim = coronaGlow * outerFade;

    // High-frequency angular variation → narrow radial filaments
    float streak1 = fbm(vec3(angle * 22.0, overSun * 2.0, uTime * 0.04), 5);
    float streak2 = fbm(vec3(angle * 44.0 + 17.0, overSun * 4.0, uTime * 0.07), 4);
    float streak3 = fbm(vec3(angle * 70.0 + 43.0, overSun * 6.0, uTime * 0.10), 3);
    float streakBlend = streak1 * 0.5 + streak2 * 0.32 + streak3 * 0.18;
    float streamers = smoothstep(-0.15, 0.55, streakBlend);

    // Large-scale asymmetry
    float asymmetry = fbm(vec3(angle * 1.8, uTime * 0.015, 0.0), 3) * 0.5 + 0.5;
    asymmetry = mix(0.55, 1.45, asymmetry);

    // Coronal loops/prominences at the rim
    float loop1 = pow(max(0.0, sin(angle * 1.0 + uTime * 0.12)), 28.0) * 1.4;
    float loop2 = pow(max(0.0, sin(angle * 1.7 + uTime * 0.09 + 2.1)), 36.0) * 1.2;
    float loop3 = pow(max(0.0, sin(angle * 2.3 + uTime * 0.07 + 4.5)), 32.0) * 1.0;
    float loop4 = pow(max(0.0, sin(angle * 3.1 + uTime * 0.13 + 1.2)), 40.0) * 0.85;
    float loopPulse1 = 0.6 + 0.4 * sin(uTime * 0.32);
    float loopPulse2 = 0.5 + 0.5 * sin(uTime * 0.27 + 1.7);
    float loopPulse3 = 0.7 + 0.3 * sin(uTime * 0.41 + 3.1);
    float loopPulse4 = 0.6 + 0.4 * sin(uTime * 0.36 + 0.6);
    float loops = loop1 * loopPulse1 + loop2 * loopPulse2 + loop3 * loopPulse3 + loop4 * loopPulse4;
    // Loops sit close to the sun's edge — concentrate in a narrow band
    float loopMask = exp(-overSun * 8.0);
    loops *= loopMask * outerFade;

    // Fine turbulence on streamers
    float turbulence = fbm(vec3(angle * 80.0, overSun * 12.0 + uTime * 0.15, uTime * 0.05), 3);
    streamers *= 0.78 + turbulence * 0.30;

    // Combine
    float intensity = rim * (0.55 + streamers * 0.75 * asymmetry * uNoiseStrength)
                    + loops * 0.55;

    // Color gradient — hot near sun → warm orange outward
    vec3 hotCore = vec3(1.0, 0.95, 0.70);
    vec3 col = mix(uColor, hotCore, coronaGlow * 0.7);
    col += vec3(1.0, 0.55, 0.15) * loops * 0.45;
    col = mix(col, col * vec3(1.05, 0.92, 0.78), streamers * 0.35);

    gl_FragColor = vec4(col * 1.05, intensity * uOpacity);
  }
`;

// ── Outer corona — long wispy streamers, asymmetric extension ──
const extendedCoronaFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uDecayRate;
  uniform float uTime;
  uniform float uNoiseStrength;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  ${noiseGLSL}
  ${coronaUtilsGLSL}

  void main() {
    vec2 polar = cameraPolar(vLocalPosition, vWorldPosition);
    float angle = polar.x;
    float shellR = length(vLocalPosition);
    float r_norm = clamp(polar.y / max(shellR, 0.001), 0.0, 1.0);

    float overSun = max(0.0, polar.y - 1.0);
    float coronaGlow = exp(-overSun * uDecayRate);
    float outerFade = 1.0 - smoothstep(0.82, 1.0, r_norm);
    float rim = coronaGlow * outerFade;

    // Wide, slow streamers — long thin radial rays
    float wide1 = fbm(vec3(angle * 10.0, overSun * 0.8, uTime * 0.02), 5);
    float wide2 = fbm(vec3(angle * 20.0 + 23.0, overSun * 1.8, uTime * 0.035), 4);
    float wideBlend = wide1 * 0.65 + wide2 * 0.35;
    float streamers = smoothstep(-0.1, 0.5, wideBlend);

    // Large-scale density variation
    float bigStruct = fbm(vec3(angle * 1.4, uTime * 0.008, 0.0), 3) * 0.5 + 0.5;
    bigStruct = mix(0.4, 1.6, bigStruct);

    // Slow brightness pulse
    float pulse = 1.0 + 0.18 * sin(uTime * (6.28318 / 6.5));

    float intensity = rim * (0.40 + streamers * 0.70 * bigStruct * uNoiseStrength) * pulse;

    // Color: warm gold close in → deeper red-orange outward
    vec3 hotCore = vec3(1.0, 0.85, 0.50);
    vec3 deepRed = uColor * vec3(0.85, 0.55, 0.30);
    vec3 col = mix(uColor, hotCore, coronaGlow * 0.7);
    col = mix(col, deepRed, (1.0 - coronaGlow) * 0.4);

    gl_FragColor = vec4(col, intensity * uOpacity);
  }
`;

interface SunProps {
  /**
   * WARPED progress — live progress mapped onto the nominal camera axis (see
   * lib/progressWarp.ts). The scale/light curves below are keyed to nominal
   * sectionRanges breakpoints as proxies for where the CAMERA is (hub, Earth
   * dwell, outbound), so they must ride the camera's axis or the Sun dims and
   * shrinks on a different schedule than the camera that is looking at it.
   */
  cameraProgressRef: React.RefObject<number>;
  /** Calm-on-read factor, 1 while scrolling and 0 once still. See CosmicScene. */
  motionRef: React.RefObject<number>;
}

export function Sun({ cameraProgressRef, motionRef }: SunProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const timeRef = useRef(0);
  const [sunTexture, setSunTexture] = useState<THREE.Texture | null>(null);

  // Load texture gracefully — fall back to procedural-only if it fails
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      '/textures/sun/sun_2k.jpg',
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        setSunTexture(texture);
      },
      undefined,
      () => {
        // Texture failed to load — proceed with procedural only
        console.warn('Sun texture not found, using procedural surface');
      },
    );
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uSunMap: { value: new THREE.Texture() },
    uHasTexture: { value: 0.0 },
  }), []);

  // Update texture uniform when loaded
  useEffect(() => {
    if (sunTexture) {
      uniforms.uSunMap.value = sunTexture;
      uniforms.uHasTexture.value = 1.0;
    }
  }, [sunTexture, uniforms]);

  // Inner corona — sharp rim with prominent loops hugging the sun's edge
  const innerCoronaUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color('#FF9028') },
    uOpacity: { value: 0.32 },
    uDecayRate: { value: 7.0 },
    uTime: { value: 0 },
    uNoiseStrength: { value: 0.75 },
  }), []);

  // Middle corona — wispy radial streamers a sun-width or two beyond rim
  const outerCoronaUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color('#FF6820') },
    uOpacity: { value: 0.18 },
    uDecayRate: { value: 2.0 },
    uTime: { value: 0 },
    uNoiseStrength: { value: 1.00 },
  }), []);

  // Extended halo — soft diffuse outer corona
  const extendedCoronaUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color('#FF7028') },
    uOpacity: { value: 0.08 },
    uDecayRate: { value: 0.8 },
    uTime: { value: 0 },
    uNoiseStrength: { value: 0.70 },
  }), []);

  useFrame((_, delta) => {
    // Corona/streamer animation is driven off this clock, so scaling it here
    // calms the Sun's surface churn along with everything else.
    const calm = motionRef.current ?? 1;
    timeRef.current += delta * calm;
    const progress = cameraProgressRef.current ?? 0;

    uniforms.uTime.value = timeRef.current;
    uniforms.uProgress.value = progress;
    innerCoronaUniforms.uTime.value = timeRef.current;
    outerCoronaUniforms.uTime.value = timeRef.current;
    extendedCoronaUniforms.uTime.value = timeRef.current;

    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0005 * delta * 60 * calm;
    }

    // Scale curve — keep the Sun calm during scroll transitions.
    // Three of the four breakpoints mirror the 2026-08 measured sectionRanges
    // (see constants.ts): 0.043 = overview/memories boundary, 0.130 =
    // memories/footprints boundary, 0.957 = contact/recap boundary. Re-measure
    // sectionRanges → move those with it. All of these are NOMINAL-axis values
    // and `progress` above is the WARPED cameraProgressRef, so the comparisons
    // stay valid at every viewport (2026-08-19, progressWarp.ts).
    //   0.000 – 0.043  overview hub    → 1.3 (visible without dominating)
    //   0.043 – 0.130  memories opens  → 1.3 → 1.45 (gentle bump)
    //   0.130 – 0.339  fade to ambient → 1.45 → 0.7
    //   0.339 – 0.957  ambient         → 0.7
    //   0.957 – 1.000  recap           → 0.7 → 1.3
    //
    // 0.339 IS THE ODD ONE OUT and is deliberately not derived from anything.
    // It is neither a section boundary nor a keyframe. It used to be justified
    // as "just past the Mercury close station at 0.334"; that station moved to
    // 0.390 in the 2026-08-19 dwell retime (d89b077) and this file was not
    // touched, so that justification described a row which no longer exists.
    // It is gone rather than repaired, because the anchor it named is not
    // something a visitor can see. MEASURED on the sampled spline (fov from
    // CameraController's proximity logic, 16:9, builder's stage shift applied):
    // the Sun's disc is off screen for the whole of 0.294–0.396 — 55–86° off
    // the view axis against a 45.7° horizontal half-fov, and behind the camera
    // for most of the Mercury dwell — and its 2.2×-radius corona shell does not
    // reach frame either. Any breakpoint inside that span renders identically,
    // and 0.339 sits inside it with 0.045 of margin below and 0.057 above, so a
    // retime has to move Mercury a long way before this needs re-checking.
    //
    // Moving it LATER is not free, which is why it stays. The two windows where
    // the Sun is genuinely on screen between the hero and finance are the
    // Earth→Venus pan (0.1945–0.2075) and the Venus→Mercury arc (0.282–0.2935),
    // the composed pass over the Sun whose apex row is annotated "Sun below
    // frame". Ending the shrink at 0.396 (the builder/finance boundary) instead
    // would still be shrinking through both, leaving the Sun 4–5% and 13–15%
    // bigger there — an unrequested change to a composed shot, in exchange for
    // nothing at the Mercury station where the Sun cannot be seen at all.
    //
    // The 0.209 divisor is 0.339 − 0.130 and MUST move with 0.339 if it ever
    // does move: 0.396 against a stale 0.209 pops the scale 0.495 → 0.700 at
    // the breakpoint, which is a visible jump rather than a fade.
    if (groupRef.current) {
      let scale: number;
      if (progress < 0.043) {
        scale = 1.3;
      } else if (progress < 0.13) {
        const t = (progress - 0.043) / 0.087;
        scale = 1.3 + t * 0.15;
      } else if (progress < 0.339) {
        const t = (progress - 0.13) / 0.209;
        scale = 1.45 - t * 0.75;
      } else if (progress < 0.957) {
        scale = 0.7;
      } else {
        const t = (progress - 0.957) / 0.043;
        scale = 0.7 + t * 0.6;
      }
      groupRef.current.scale.setScalar(scale);
    }

    // Dim point light after hero to reduce glare on text sections. Same
    // breakpoints AND same divisor as the scale curve above, so the two stay
    // one curve — read that note before touching either.
    // Unlike the scale, this IS visible across 0.294–0.396: the light is at the
    // origin and lights every planet, so it does not care that the Sun itself
    // is off screen there. That is the second reason 0.339 stays put — it lands
    // the light on its floor of 2 before Mercury's close station at 0.390, so
    // the whole builder dwell is read under a steady lamp. Ending at 0.396
    // instead would still be ramping 3.00 → 2.07 across that entire read, i.e.
    // a slow brightening of the copy this line exists to keep glare off.
    if (lightRef.current) {
      const lightIntensity = progress < 0.13 ? 5 : progress < 0.339
        ? 5 - ((progress - 0.13) / 0.209) * 3 // 5 → 2
        : 2;
      lightRef.current.intensity = lightIntensity;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <pointLight ref={lightRef} position={[0, 0, 0]} intensity={5} color="#FFA858" distance={120} decay={2} />

      {/* Solar surface */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 96, 96]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          toneMapped={false}
        />
      </mesh>

      {/* Inner corona — sharp rim with prominent loops + fine streamers */}
      <mesh>
        <sphereGeometry args={[1.15, 96, 96]} />
        <shaderMaterial
          vertexShader={coronaVertexShader}
          fragmentShader={coronaFragmentShader}
          uniforms={innerCoronaUniforms}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Middle corona — wispy radial streamers */}
      <mesh>
        <sphereGeometry args={[1.55, 96, 96]} />
        <shaderMaterial
          vertexShader={coronaVertexShader}
          fragmentShader={extendedCoronaFragmentShader}
          uniforms={outerCoronaUniforms}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Extended halo — soft diffuse outer corona */}
      <mesh>
        <sphereGeometry args={[2.2, 64, 64]} />
        <shaderMaterial
          vertexShader={coronaVertexShader}
          fragmentShader={extendedCoronaFragmentShader}
          uniforms={extendedCoronaUniforms}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
