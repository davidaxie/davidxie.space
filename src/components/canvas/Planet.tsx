'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { noiseGLSL } from '@/lib/shaders/noise.glsl';
import type { PlanetConfig } from '@/lib/constants';
import { PlanetAtmosphere } from './PlanetAtmosphere';

// ── Shared lighting functions (GLSL) ──
const lightingGLSL = /* glsl */ `
  vec3 computeLighting(vec3 albedo, vec3 worldNormal, vec3 worldPos, vec3 viewDir, vec3 sunPos) {
    vec3 sunDir = normalize(sunPos - worldPos);
    float NdotL = dot(worldNormal, sunDir);

    // Soft terminator — prevents harsh day/night boundary
    float terminator = smoothstep(-0.08, 0.2, NdotL);

    // Lambert diffuse
    vec3 diffuse = albedo * terminator;

    // Very subtle ambient (scattered light in deep space)
    vec3 ambient = albedo * 0.025;

    // Limb darkening (physical: NdotV combined with lighting)
    float NdotV = max(dot(worldNormal, viewDir), 0.0);
    float limbDark = pow(NdotV, 0.35) * 0.45 + 0.55;

    return (diffuse + ambient) * limbDark;
  }

  float computeSpecular(vec3 worldNormal, vec3 worldPos, vec3 viewDir, vec3 sunPos, float shininess) {
    vec3 sunDir = normalize(sunPos - worldPos);
    vec3 halfVec = normalize(sunDir + viewDir);
    float spec = pow(max(dot(worldNormal, halfVec), 0.0), shininess);
    float NdotL = max(dot(worldNormal, sunDir), 0.0);
    return spec * smoothstep(0.0, 0.1, NdotL);
  }
`;

// ── Shared vertex shader for all planets ──
const planetVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewDir;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ── Rocky planet fragment shader (Mercury, Venus, Earth, Mars) ──
const rockyFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorPrimary;
  uniform vec3 uColorSecondary;
  uniform vec3 uColorTertiary;
  uniform float uNoiseScale;
  uniform int uPlanetType; // 0=mercury, 1=venus, 2=earth, 3=mars
  uniform vec3 uSunPosition;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewDir;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  ${noiseGLSL}
  ${lightingGLSL}

  void main() {
    vec3 p = vPosition * uNoiseScale;
    float lat = vPosition.y / length(vPosition);
    vec3 sunDir = normalize(uSunPosition - vWorldPosition);
    float NdotL = dot(vWorldNormal, sunDir);
    vec3 col;

    if (uPlanetType == 0) {
      // ═══ Mercury — cratered, airless body ═══
      float largeCraters = fbm(p * 1.5, 8) * 0.5 + 0.5;
      float medCraters = fbm(p * 4.0 + 10.0, 7) * 0.5 + 0.5;
      float smallPits = fbm(p * 12.0 + 30.0, 5) * 0.5 + 0.5;
      float microDetail = fbm(p * 20.0 + 60.0, 4) * 0.5 + 0.5;

      // Crater rim highlights
      float craterEdge = abs(fbm(p * 3.0, 6));
      float rimLight = smoothstep(0.1, 0.3, craterEdge) * 0.14;

      // Gray with subtle brown variation
      vec3 highlands = vec3(0.58, 0.56, 0.54);
      vec3 lowlands = vec3(0.32, 0.30, 0.28);
      col = mix(lowlands, highlands, largeCraters);
      col = mix(col, col * 0.7, (1.0 - medCraters) * 0.4);
      col = mix(col, col * 0.85, (1.0 - smallPits) * 0.15);
      col = mix(col, col * 0.92, (1.0 - microDetail) * 0.08);
      col += rimLight;

      // Warm tint in caloris-basin-like regions
      float warmRegion = smoothstep(0.3, 0.7, fbm(p * 0.8, 4) * 0.5 + 0.5);
      col = mix(col, col * vec3(1.06, 1.02, 0.96), warmRegion * 0.25);

      // Bump-mapped normals for surface depth
      vec3 bumpN = bumpNormal(vPosition, vWorldNormal, uNoiseScale * 3.0, 7, 0.6);

      // Crater shadows from sun direction using bump normal
      float craterDepth = (1.0 - medCraters) * 0.5;
      float bumpNdotL = dot(bumpN, sunDir);
      float shadowFactor = smoothstep(0.0, 0.3, max(bumpNdotL, 0.0) + craterDepth * 0.3);
      col *= shadowFactor * 0.3 + 0.7;

    } else if (uPlanetType == 1) {
      // ═══ Venus — thick sulfuric acid clouds, warm golden-yellow ═══
      vec3 slowFlow = vec3(uTime * 0.012, uTime * 0.006, 0.0);
      vec3 fastFlow = vec3(uTime * 0.035, uTime * 0.018, 0.0);

      // Strong latitude-dependent banding (super-rotation wind bands)
      float bandBase = sin(lat * 10.0 * 3.14159) * 0.35 + 0.5;
      float bandFine = sin(lat * 22.0 * 3.14159 + 0.7) * 0.15;
      float bandPattern = bandBase + bandFine;

      // Multi-layer thick sulfuric clouds
      float cloudLayer1 = fbm(p * 1.2 + slowFlow, 8) * 0.5 + 0.5;
      float cloudLayer2 = fbm(p * 2.5 + fastFlow + 20.0, 7) * 0.5 + 0.5;
      float cloudLayer3 = fbm(p * 5.0 + slowFlow * 2.5 + 50.0, 5) * 0.5 + 0.5;
      float fineDetail = fbm(p * 9.0 + fastFlow * 1.5 + 80.0, 4) * 0.5 + 0.5;

      // V-shaped dark streaks (UV imagery feature of Venus)
      float streak = abs(lat) * 1.5;
      float vStreak = smoothstep(0.25, 0.65, cloudLayer1 + streak * 0.25) * 0.6;

      // Warm golden-yellow palette (distinctly NOT gray)
      vec3 brightCloud = vec3(0.96, 0.88, 0.62);  // warm golden white
      vec3 darkStreak  = vec3(0.78, 0.62, 0.32);  // warm ochre
      vec3 midCloud    = vec3(0.90, 0.80, 0.50);  // mid golden
      vec3 deepCloud   = vec3(0.68, 0.55, 0.28);  // deep amber

      // Layered blending for thick cloud appearance
      col = mix(deepCloud, brightCloud, cloudLayer1 * bandPattern);
      col = mix(col, midCloud, cloudLayer2 * 0.35);
      col = mix(col, darkStreak, vStreak * 0.3);
      col += (cloudLayer3 - 0.5) * 0.06;
      col += (fineDetail - 0.5) * 0.03;

      // Polar collar (darker hood around poles, observed by Venus Express)
      float polarHood = smoothstep(0.55, 0.85, abs(lat));
      col = mix(col, deepCloud * 0.85, polarHood * 0.35);

    } else if (uPlanetType == 2) {
      // ═══ Earth — oceans, continents, clouds, city lights ═══

      // Continent generation with strategic thresholds
      float continentBase = fbm(p * 0.8, 6);
      float coastDetail = snoise(vPosition * 5.0) * 0.15;
      float continentMask = smoothstep(-0.02, 0.12, continentBase + coastDetail);

      // Terrain variation on land
      float terrain = fbm(p * 4.0 + 100.0, 4) * 0.5 + 0.5;
      float desert = smoothstep(0.3, 0.6, terrain) * smoothstep(0.4, 0.2, abs(lat));

      // Ocean: deep blue to shallows near coast
      vec3 deepOcean = vec3(0.02, 0.04, 0.16);
      vec3 shallowOcean = vec3(0.05, 0.12, 0.30);
      float coastProx = smoothstep(0.12, -0.02, continentBase + coastDetail);
      vec3 ocean = mix(deepOcean, shallowOcean, coastProx);

      // Land: forest, grassland, desert, mountain
      vec3 forest = vec3(0.06, 0.18, 0.04);
      vec3 grassland = vec3(0.15, 0.26, 0.06);
      vec3 desertCol = vec3(0.58, 0.48, 0.28);
      vec3 mountain = vec3(0.32, 0.28, 0.22);

      vec3 land = mix(forest, grassland, terrain);
      land = mix(land, desertCol, desert * 0.6);
      land = mix(land, mountain, smoothstep(0.7, 0.9, terrain) * 0.4);

      col = mix(ocean, land, continentMask);

      // Polar ice caps
      float polar = abs(lat);
      float iceMask = smoothstep(0.68, 0.80, polar);
      col = mix(col, vec3(0.90, 0.93, 0.97), iceMask);

      // Cloud layer (separate animated noise)
      vec3 cloudFlow = vec3(uTime * 0.02, 0.0, uTime * 0.015);
      float clouds = fbm(p * 2.0 + cloudFlow + 200.0, 4) * 0.5 + 0.5;
      float cloudMask = smoothstep(0.42, 0.62, clouds);
      col = mix(col, vec3(0.94, 0.95, 0.97), cloudMask * 0.55);

      // Apply sun lighting first
      col = computeLighting(col, vWorldNormal, vWorldPosition, vViewDir, uSunPosition);

      // Ocean specular (sun glint) — after lighting
      float spec = computeSpecular(vWorldNormal, vWorldPosition, vViewDir, uSunPosition, 80.0);
      col += vec3(1.0, 0.97, 0.88) * spec * (1.0 - continentMask) * 0.35;

      // City lights on night side
      float nightMask = smoothstep(0.05, -0.12, NdotL);
      float cityNoise = fbm(p * 10.0, 3);
      float cities = smoothstep(0.15, 0.5, cityNoise) * continentMask * nightMask;
      col += vec3(1.0, 0.85, 0.45) * cities * 0.12;

      gl_FragColor = vec4(col, 1.0);
      return; // Earth handles its own lighting above

    } else {
      // ═══ Mars — rust surface, volcanic highlands, dust storms ═══
      float largeTerrain = fbm(p * 0.7, 8) * 0.5 + 0.5;
      float medTerrain = fbm(p * 2.5 + 50.0, 6) * 0.5 + 0.5;
      float fineDust = fbm(p * 8.0 + 100.0, 5) * 0.5 + 0.5;
      float microDust = fbm(p * 16.0 + 200.0, 4) * 0.5 + 0.5;

      // Dark regions vs bright regions
      float darkRegion = smoothstep(0.35, 0.55, largeTerrain);

      vec3 brightRust = vec3(0.72, 0.38, 0.18);
      vec3 darkVolcanic = vec3(0.28, 0.16, 0.08);
      vec3 dusty = vec3(0.80, 0.55, 0.30);
      vec3 deepRed = vec3(0.42, 0.14, 0.06);

      col = mix(darkVolcanic, brightRust, darkRegion);
      col = mix(col, dusty, medTerrain * 0.22);
      col = mix(col, deepRed, (1.0 - fineDust) * 0.12);
      col += (microDust - 0.5) * 0.03;

      // Bump-mapped normals for Mars terrain
      vec3 marsBumpN = bumpNormal(vPosition, vWorldNormal, uNoiseScale * 2.0, 7, 0.5);

      // Olympus Mons region approximation
      float olympus = 1.0 - smoothstep(0.0, 0.15, length(vec2(
        atan(vPosition.x, vPosition.z) / 3.14159 - 0.4,
        lat - 0.15
      )));
      col = mix(col, dusty * 1.1, olympus * 0.3);

      // Asymmetric polar ice caps
      float northCap = smoothstep(0.76, 0.86, lat);
      float southCap = smoothstep(0.80, 0.90, -lat);
      vec3 iceColor = vec3(0.88, 0.90, 0.93);
      col = mix(col, iceColor, northCap * 0.65);
      col = mix(col, iceColor, southCap * 0.45);

      // Dust storm feature
      vec3 dustFlow = vec3(uTime * 0.01, 0.0, uTime * 0.008);
      float storm = fbm(p * 3.0 + dustFlow + 150.0, 3) * 0.5 + 0.5;
      float stormMask = smoothstep(0.55, 0.75, storm) * smoothstep(0.5, 0.0, abs(lat - 0.1));
      col = mix(col, vec3(0.76, 0.54, 0.34), stormMask * 0.2);
    }

    // Compute bump-mapped normal for lighting
    vec3 litNormal = vWorldNormal;
    if (uPlanetType == 0) {
      litNormal = bumpNormal(vPosition, vWorldNormal, uNoiseScale * 3.0, 7, 0.6);
    } else if (uPlanetType == 1) {
      // Venus: subtle cloud-top bump for depth
      litNormal = bumpNormal(vPosition, vWorldNormal, uNoiseScale * 1.5, 5, 0.2);
    } else if (uPlanetType == 3) {
      litNormal = bumpNormal(vPosition, vWorldNormal, uNoiseScale * 2.0, 7, 0.5);
    }

    // Apply sun-direction lighting with bump-mapped normals
    col = computeLighting(col, litNormal, vWorldPosition, vViewDir, uSunPosition);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── Gas giant fragment shader (Jupiter, Saturn) ──
const gasFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorPrimary;
  uniform vec3 uColorSecondary;
  uniform vec3 uColorTertiary;
  uniform float uNoiseScale;
  uniform int uPlanetType; // 0=jupiter, 1=saturn
  uniform vec3 uSunPosition;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewDir;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  ${noiseGLSL}
  ${lightingGLSL}

  void main() {
    vec3 p = vPosition * uNoiseScale;
    float lat = vPosition.y / length(vPosition);
    float NdotL = dot(vWorldNormal, normalize(uSunPosition - vWorldPosition));
    vec3 col;

    if (uPlanetType == 0) {
      // ═══ Jupiter — complex atmospheric bands ═══

      // Multi-frequency banding (zones and belts)
      float band1 = sin(lat * 18.0 * 3.14159) * 0.5 + 0.5;
      float band2 = sin(lat * 12.0 * 3.14159 + 0.5) * 0.5 + 0.5;
      float band3 = sin(lat * 30.0 * 3.14159) * 0.5 + 0.5;
      float bands = band1 * 0.5 + band2 * 0.3 + band3 * 0.2;

      // Turbulent zone/belt boundaries (high-octave detail)
      float turbulence = fbm(vec3(
        vPosition.x * 2.0 + uTime * 0.015,
        lat * 8.0,
        vPosition.z * 2.0
      ), 7) * 0.18;
      bands = clamp(bands + turbulence, 0.0, 1.0);

      // Jet stream distortion along band edges
      float jetStream = snoise(vec3(
        atan(vPosition.x, vPosition.z) * 3.0 + uTime * 0.025,
        lat * 20.0,
        uTime * 0.01
      )) * 0.07;
      bands = clamp(bands + jetStream, 0.0, 1.0);

      // Rich color palette
      vec3 lightZone = vec3(0.92, 0.85, 0.70);
      vec3 darkBelt = vec3(0.52, 0.33, 0.16);
      vec3 redBelt = vec3(0.62, 0.28, 0.13);
      vec3 whiteZone = vec3(0.95, 0.92, 0.85);

      col = mix(darkBelt, lightZone, bands);
      float redMix = smoothstep(0.3, 0.5, band2) * smoothstep(0.7, 0.5, band2);
      col = mix(col, redBelt, redMix * 0.3);
      col = mix(col, whiteZone, smoothstep(0.82, 0.95, bands) * 0.2);

      // Great Red Spot — oval, rotating, internal spiral
      float spotLon = atan(vPosition.x, vPosition.z) / 3.14159;
      float rotatedLon = spotLon - uTime * 0.005;
      rotatedLon = mod(rotatedLon + 1.0, 2.0) - 1.0;

      vec2 spotCenter = vec2(0.3, -0.22);
      vec2 spotDelta = vec2(rotatedLon, lat) - spotCenter;
      spotDelta.x *= 1.5; // oval
      float spotDist = length(spotDelta);
      float spot = 1.0 - smoothstep(0.0, 0.10, spotDist);

      // Internal spiral detail
      float spotAngle = atan(spotDelta.y, spotDelta.x);
      float spiral = sin(spotAngle * 3.0 + spotDist * 30.0 - uTime * 0.08) * 0.5 + 0.5;

      vec3 spotOuter = vec3(0.72, 0.28, 0.12);
      vec3 spotInner = vec3(0.85, 0.40, 0.15);
      vec3 spotColor = mix(spotOuter, spotInner, spiral * 0.5);
      col = mix(col, spotColor, spot * 0.7);

    } else {
      // ═══ Saturn — subtle banding, pale gold ═══

      // Softer, wider bands
      float band1 = sin(lat * 10.0 * 3.14159) * 0.5 + 0.5;
      float band2 = sin(lat * 6.0 * 3.14159 + 0.3) * 0.5 + 0.5;
      float bands = band1 * 0.6 + band2 * 0.4;

      // Very subtle turbulence (calmer atmosphere, high-detail)
      float turb = fbm(vec3(vPosition.x * 1.5, lat * 5.0, vPosition.z * 1.5 + uTime * 0.008), 6) * 0.06;
      bands = clamp(bands + turb, 0.0, 1.0);

      // Pale gold/butter palette
      vec3 lightBand = vec3(0.93, 0.87, 0.65);
      vec3 darkBand = vec3(0.72, 0.62, 0.40);
      vec3 warmBand = vec3(0.86, 0.76, 0.52);

      col = mix(darkBand, lightBand, bands);
      col = mix(col, warmBand, band2 * 0.2);

      // Ring shadow on planet surface (equatorial band on sunlit side)
      float eqDist = abs(lat);
      float ringShadow = smoothstep(0.02, 0.08, eqDist) * smoothstep(0.25, 0.15, eqDist);
      ringShadow *= smoothstep(-0.1, 0.1, NdotL);
      col *= (1.0 - ringShadow * 0.3);
    }

    // Apply sun-direction lighting
    col = computeLighting(col, vWorldNormal, vWorldPosition, vViewDir, uSunPosition);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── Ice giant fragment shader (Uranus, Neptune) ──
const iceFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorPrimary;
  uniform vec3 uColorSecondary;
  uniform vec3 uColorTertiary;
  uniform float uNoiseScale;
  uniform int uPlanetType; // 0=uranus, 1=neptune
  uniform vec3 uSunPosition;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewDir;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  ${noiseGLSL}
  ${lightingGLSL}

  void main() {
    vec3 p = vPosition * uNoiseScale;
    float lat = vPosition.y / length(vPosition);
    vec3 col;

    if (uPlanetType == 0) {
      // ═══ Uranus — featureless cyan-blue, extremely subtle ═══
      float verySubtleBand = sin(lat * 4.0 * 3.14159) * 0.5 + 0.5;
      float haze = fbm(p * 0.8, 6) * 0.5 + 0.5;

      vec3 mainColor = vec3(0.40, 0.78, 0.82);
      vec3 slightlyDarker = vec3(0.35, 0.70, 0.76);

      col = mix(slightlyDarker, mainColor, verySubtleBand * 0.15 + 0.85);
      col = mix(col, col * 1.03, haze * 0.08);

      // Polar brightening (Voyager observation)
      float polarBright = smoothstep(0.6, 0.9, abs(lat));
      col = mix(col, vec3(0.52, 0.84, 0.88), polarBright * 0.12);

    } else {
      // ═══ Neptune — vivid deep blue with storm features ═══
      float bands = sin(lat * 8.0 * 3.14159) * 0.5 + 0.5;
      float cloudNoise = fbm(p + vec3(uTime * 0.02, 0.0, 0.0), 7) * 0.5 + 0.5;

      vec3 deepBlue = vec3(0.08, 0.12, 0.50);
      vec3 brightBlue = vec3(0.18, 0.30, 0.75);
      vec3 methaneBlue = vec3(0.12, 0.22, 0.65);

      col = mix(deepBlue, brightBlue, bands * 0.4);
      col = mix(col, methaneBlue, cloudNoise * 0.2);

      // Great Dark Spot (rotating transient storm)
      float spotLon = atan(vPosition.x, vPosition.z) / 3.14159;
      float rotatedLon = spotLon - uTime * 0.008;
      rotatedLon = mod(rotatedLon + 1.0, 2.0) - 1.0;

      vec2 darkSpotCenter = vec2(-0.2, -0.15);
      vec2 darkSpotDelta = vec2(rotatedLon, lat) - darkSpotCenter;
      darkSpotDelta.x *= 1.3;
      float darkSpotDist = length(darkSpotDelta);
      float darkSpot = 1.0 - smoothstep(0.0, 0.08, darkSpotDist);
      col = mix(col, vec3(0.04, 0.06, 0.30), darkSpot * 0.5);

      // Wispy white methane cloud streaks
      float wispy = fbm(vec3(
        atan(vPosition.x, vPosition.z) * 5.0 + uTime * 0.03,
        lat * 15.0,
        uTime * 0.01
      ), 3) * 0.5 + 0.5;
      float wispMask = smoothstep(0.6, 0.8, wispy) * smoothstep(0.5, 0.0, abs(lat + 0.15));
      col = mix(col, vec3(0.78, 0.82, 0.94), wispMask * 0.22);
    }

    // Apply sun-direction lighting
    col = computeLighting(col, vWorldNormal, vWorldPosition, vViewDir, uSunPosition);

    // Specular highlight for ice giants
    float spec = computeSpecular(vWorldNormal, vWorldPosition, vViewDir, uSunPosition, 40.0);
    col += vec3(0.6, 0.75, 1.0) * spec * 0.12;

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── Ring shaders — with Cassini Division and shadows ──
const ringVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  void main() {
    vUv = uv;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragmentShader = /* glsl */ `
  uniform vec3 uRingColor;
  uniform float uTime;
  uniform vec3 uSunPosition;
  uniform vec3 uPlanetPosition;
  uniform float uPlanetRadius;
  uniform float uIsSaturn; // 1.0 for Saturn, 0.0 for Uranus
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    float r = length(vUv - 0.5) * 2.0;

    // Normalized ring position (0 = inner, 1 = outer)
    float ringPos = r;

    float ringOpacity;
    vec3 col;

    if (uIsSaturn > 0.5) {
      // ═══ Saturn rings: detailed structure ═══

      // Cassini Division (gap at ~60%)
      float cassiniGap = 1.0 - smoothstep(0.0, 0.02, abs(ringPos - 0.58));
      // Encke Gap (narrow, at ~85%)
      float enckeGap = 1.0 - smoothstep(0.0, 0.008, abs(ringPos - 0.83));

      // Ring opacity profile: C (faint inner), B (bright middle), A (moderate outer)
      float cRing = smoothstep(0.0, 0.05, ringPos) * smoothstep(0.28, 0.23, ringPos) * 0.25;
      float bRing = smoothstep(0.23, 0.28, ringPos) * smoothstep(0.56, 0.53, ringPos) * 0.85;
      float aRing = smoothstep(0.60, 0.63, ringPos) * smoothstep(0.95, 0.90, ringPos) * 0.55;
      ringOpacity = cRing + bRing + aRing;

      // Apply gaps
      ringOpacity *= (1.0 - cassiniGap * 0.92);
      ringOpacity *= (1.0 - enckeGap * 0.65);

      // Fine concentric band structure
      float fineBands = sin(ringPos * 200.0) * 0.08 + sin(ringPos * 80.0) * 0.12;
      ringOpacity *= (0.88 + fineBands);

      // Color variation (inner browner, outer cleaner)
      vec3 innerColor = uRingColor * vec3(0.78, 0.72, 0.65);
      vec3 outerColor = uRingColor * vec3(1.0, 0.95, 0.88);
      col = mix(innerColor, outerColor, ringPos);
    } else {
      // ═══ Uranus rings: thin, dark, subtle ═══
      float thinBand = smoothstep(0.0, 0.1, ringPos) * (1.0 - smoothstep(0.9, 1.0, ringPos));
      float bands = sin(ringPos * 60.0) * 0.3 + 0.5;
      ringOpacity = thinBand * bands * 0.2;
      col = uRingColor;
    }

    // Outer edge fade
    float edgeFade = smoothstep(0.0, 0.05, r) * (1.0 - smoothstep(0.95, 1.0, r));
    ringOpacity *= edgeFade;

    // Sun lighting on rings
    vec3 sunDir = normalize(uSunPosition - vWorldPosition);
    float ringLight = abs(sunDir.y) * 0.5 + 0.5;
    col *= ringLight;

    // Planet shadow on rings
    vec3 toPlanet = uPlanetPosition - vWorldPosition;
    float projDist = dot(toPlanet, sunDir);
    if (projDist > 0.0) {
      vec3 closestPoint = vWorldPosition + sunDir * projDist;
      float distToAxis = length(closestPoint - uPlanetPosition);
      float shadow = smoothstep(uPlanetRadius * 0.85, uPlanetRadius * 1.1, distToAxis);
      ringOpacity *= shadow;
    }

    gl_FragColor = vec4(col, ringOpacity * 0.55);
  }
`;

interface PlanetComponentProps {
  config: PlanetConfig;
  // Kept on the props type because SolarSystem passes it to every planet
  // uniformly, but this component animates purely off elapsed time — it never
  // reads scroll progress, so it is deliberately not destructured below.
  progressRef: React.RefObject<number>;
  /** Calm-on-read factor, 1 while scrolling and 0 once still. See CosmicScene. */
  motionRef?: React.RefObject<number>;
}

export function Planet({ config, motionRef }: PlanetComponentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  const planetTypeIndex = useMemo(() => {
    if (config.type === 'rocky') {
      return ['mercury', 'venus', 'earth', 'mars'].indexOf(config.name);
    }
    if (config.type === 'gas') {
      return config.name === 'jupiter' ? 0 : 1;
    }
    // Ice giants: uranus=0, neptune=1
    return config.name === 'uranus' ? 0 : 1;
  }, [config.name, config.type]);

  const fragmentShader = config.type === 'rocky'
    ? rockyFragmentShader
    : config.type === 'gas'
    ? gasFragmentShader
    : iceFragmentShader;

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColorPrimary: { value: new THREE.Color(config.colors.primary) },
    uColorSecondary: { value: new THREE.Color(config.colors.secondary) },
    uColorTertiary: { value: new THREE.Color(config.colors.tertiary || config.colors.primary) },
    uNoiseScale: { value: config.noiseScale },
    uPlanetType: { value: planetTypeIndex },
    uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
  }), [config.colors.primary, config.colors.secondary, config.colors.tertiary, config.noiseScale, planetTypeIndex]);

  const ringUniforms = useMemo(() => {
    if (!config.hasRings) return null;
    return {
      uRingColor: { value: new THREE.Color(config.ringColor || config.colors.primary) },
      uTime: { value: 0 },
      uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
      uPlanetPosition: { value: new THREE.Vector3(...config.position) },
      uPlanetRadius: { value: config.radius },
      uIsSaturn: { value: config.name === 'saturn' ? 1.0 : 0.0 },
    };
  }, [config.hasRings, config.ringColor, config.colors.primary, config.position, config.radius, config.name]);

  const segments = config.radius > 1 ? 96 : 64;
  const yScale = 1.0 - (config.oblateness || 0);
  const innerRing = (config.ringInnerRadius || 1.4) * config.radius;
  const outerRing = (config.ringOuterRadius || 2.2) * config.radius;

  useFrame((_, delta) => {
    // The shader clock is scaled by the same calm factor the rotation below
    // uses. It was the one advance in this file that ran ungated, which meant a
    // "settled" scene still had surface noise crawling across every planet.
    // The practical exposure was small — this component is SolarSystem's
    // Suspense fallback and is replaced by TexturedPlanet/EarthGlobe the moment
    // the maps resolve — but a mixed-gating frame loop is a trap for whoever
    // promotes this file to something longer-lived.
    timeRef.current += delta * (motionRef?.current ?? 1);
    uniforms.uTime.value = timeRef.current;
    if (ringUniforms) ringUniforms.uTime.value = timeRef.current;

    if (meshRef.current) {
      meshRef.current.rotation.y += config.rotationSpeed * delta * 60 * (motionRef?.current ?? 1);
    }
  });

  return (
    <group
      ref={groupRef}
      position={config.position}
      // Same 'YXZ' composition as TexturedPlanet — this is its Suspense
      // fallback, so a mismatch would swing Saturn's rings the moment the
      // textures resolved.
      rotation={[config.tilt || 0, config.tiltAzimuth ?? 0, 0, 'YXZ']}
    >
      {/* Planet surface (with oblateness) */}
      <mesh ref={meshRef} scale={[1, yScale, 1]}>
        <sphereGeometry args={[config.radius, segments, segments]} />
        <shaderMaterial
          vertexShader={planetVertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          toneMapped={false}
        />
      </mesh>

      {/* Fresnel atmosphere glow (all planets) */}
      <PlanetAtmosphere
        planetName={config.name}
        radius={config.radius}
        yScale={yScale}
        motionRef={motionRef}
      />

      {/* Rings (Saturn, Uranus) */}
      {config.hasRings && ringUniforms && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[innerRing, outerRing, 128]} />
          <shaderMaterial
            vertexShader={ringVertexShader}
            fragmentShader={ringFragmentShader}
            uniforms={ringUniforms}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Subtle point light */}
      <pointLight
        intensity={0.3}
        color={config.colors.primary}
        distance={config.radius * 8}
        decay={2}
      />
    </group>
  );
}
