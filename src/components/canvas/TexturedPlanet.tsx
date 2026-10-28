'use client';

import { useRef, useMemo, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { sectionIds, sectionPlanet, type PlanetConfig } from '@/lib/constants';
import { useLenis } from '@/components/providers/SmoothScroll';
import { jumpScrollBehavior } from '@/components/providers/reducedMotion';

// ── Texture paths for each planet ──
// Every entry here is a photographic/derived RGB map and is tagged
// THREE.SRGBColorSpace on load (see the useMemo below). Uranus deliberately has
// no entry: its disc carries no longitudinal information at all, so it is
// generated in-shader (COLOR.uranusLatitude) and the loader falls back to an
// already-cached map purely to keep the useTexture hook call unconditional.
const planetTextures: Record<string, { map: string }> = {
  mercury: { map: '/textures/mercury/mercury_2k.jpg' },
  // Venus used to draw venus_surface_2k.jpg (a colourised Magellan RADAR map)
  // on the base sphere with the cloud deck as a 45%-opacity veil on top. That
  // is physically impossible: the deck's visible optical depth is 20-40, so
  // transmission to the surface is of order e^-30. No photon at any visible
  // wavelength has ever reached a camera from Venus's surface. The cloud map is
  // now the ONLY thing rendered, at full opacity, and venus_surface_2k.jpg is
  // no longer loaded by anything.
  venus: { map: '/textures/venus/venus_atmosphere_2k.jpg' },
  mars: { map: '/textures/mars/mars_2k.jpg' },
  jupiter: { map: '/textures/jupiter/jupiter_2k.jpg' },
  saturn: { map: '/textures/saturn/saturn_2k.jpg' },
  neptune: { map: '/textures/neptune/neptune_2k.jpg' },
};

// ── Scattering laws ──
// Which photometric model a body obeys is not a style knob — it is the single
// biggest determinant of whether a disc reads as a sphere. The old shader used
// one hand-tuned pow(NdotV, 0.35) falloff for everything, which is an
// atmosphere model applied to airless rock and a rock model applied to gas.
const SCATTER = {
  // I ~ mu0 / (mu0 + mu). Porous regolith with no atmosphere. Produces the flat,
  // hard-edged, coin-like disc a full Moon photographs as — NOT a shaded ball.
  lommelSeeliger: 0,
  // I/F = (I/F)0 * mu0^k * mu^(k-1). The measured law for every atmosphere in
  // this scene. k > 1 darkens toward the limb harder than Lambert (Venus),
  // k = 1 is Lambert (Jupiter), k < 1 brightens mildly toward the limb
  // (Saturn/Uranus/Neptune).
  minnaert: 1,
} as const;

// ── Colour treatment applied to the sampled map ──
// NONE of these are grading. Every one either corrects a documented defect in
// the source asset or supplies a measured spectral quantity the asset lacks.
// The blanket saturation/contrast push that used to live here is gone, for the
// same reason EarthGlobe.tsx deleted its own: a calibrated source must be left
// alone, and grading was only ever masking the missing sRGB decode.
const COLOR = {
  none: 0,
  tint: 1,              // luminance-preserving spectral slope (Mercury)
  chromaGain: 2,        // per-channel rebalance; hue moves most, luminance some (Mars)
  jupiterRecurve: 3,    // per-channel white balance + polar gate (Jupiter)
  albedoFromLuma: 4,    // discard the map's chroma, keep a little of its structure (Venus, Neptune)
  uranusLatitude: 5,    // fully procedural latitude profile, no texture fetch (Uranus)
} as const;

interface PlanetVisuals {
  scatter: number;          // SCATTER.*
  minnaertK: number;        // ignored when scatter === lommelSeeliger
  terminator: [number, number]; // smoothstep edges on NdotL; narrow = airless
  nightAmbient: number;     // fraction of surface colour visible on the night side
  haze: number;             // aerosol limb veil strength (Mars only; 0 elsewhere)
  colorMode: number;        // COLOR.*
  tint: [number, number, number];      // COLOR.tint / COLOR.chromaGain payload
  albedo: [number, number, number];    // COLOR.albedoFromLuma / uranusLatitude, LINEAR
  albedoAlt: [number, number, number]; // mode-dependent: limb chromaticity (4) or polar hood (5)
  structure: number;        // COLOR.albedoFromLuma: fraction of the map's luminance contrast kept
  lumaMean: number;         // COLOR.albedoFromLuma: measured mean linear luminance of that map
}

const NEUTRAL: [number, number, number] = [1, 1, 1];

const planetVisuals: Record<string, PlanetVisuals> = {
  // ── MERCURY ──────────────────────────────────────────────────────────────
  // Airless. Surface pressure < ~5e-15 bar (NASA fact sheet), so nothing
  // scatters light past the geometric terminator and there is no haze to fill
  // in the limb. Lommel-Seeliger plus a steep opposition surge is the regolith
  // law, and Mercury's phase integral q = 0.478 +/- 0.005 (Mallama, Wang &
  // Howard 2002 — far below a Lambert sphere's 1.5) is direct evidence of it.
  //
  // The tint is the important line. mercury_2k.jpg is achromatic: I measured it
  // at linear mean R 0.2324 / G 0.2294 / B 0.2304, i.e. R/B = 1.009. Mercury's
  // real reflectance rises almost linearly from 0.044 at 433 nm to 0.100 at
  // 996 nm (Ngoc, Bott & Diep 2019 from MESSENGER MDIS), R(630)/R(480) ~ 1.31.
  // So the old `saturation: 1.05` was provably useless — 1.05x of ~zero chroma
  // is still ~zero chroma. Saturation multiplies existing chroma; it cannot
  // create a spectral slope. This vector is the true-colour linear primaries
  // (0.137, 0.1175, 0.095) divided by their own Rec.709 luminance 0.120, so it
  // changes hue by exactly the measured MDIS slope and brightness by zero.
  // Verified on the real pixels: post-tint linear mean R 0.2653 / B 0.1824,
  // R/B = 1.455 against the target 1.442.
  mercury: {
    scatter: SCATTER.lommelSeeliger, minnaertK: 1.0,
    terminator: [-0.015, 0.045], nightAmbient: 0.008, haze: 0.0,
    colorMode: COLOR.tint, tint: [1.1417, 0.9792, 0.7917],
    albedo: NEUTRAL, albedoAlt: NEUTRAL, structure: 0, lumaMean: 1,
  },

  // ── VENUS ────────────────────────────────────────────────────────────────
  // Minnaert k = 1.38 from Perez-Hoyos et al. 2018 (JGR Planets 123, 145),
  // fitting MESSENGER/MASCS: "above 0.5 um limb-darkening ranges k = 1.35-1.40".
  // Venus limb-DARKENS, harder than a Lambert sphere — the opposite of Earth.
  // Earth limb-brightens because a thin Rayleigh shell in-scatters against a
  // dark ocean; on Venus the cloud deck IS the visible surface at albedo ~0.7,
  // so there is no darker substrate to brighten against.
  //
  // albedo is the sub-solar cloud-top colour #F9F6EE in linear light. Its
  // R:G:B of 1.027:1.000:0.927 is the Mallama, Krobusek & Pavlov 2017 albedo
  // spectrum (V 0.689, B 0.658, R 0.708) integrated against the CIE 1931 CMFs.
  // Blue is only ~7% below green: Venus is a pale warm WHITE, not gold.
  // albedoAlt is the same luminance at the measured limb chromaticity
  // (1.010:1.000:0.962) — the 70-90 km submicron haze scatters blue
  // preferentially, so Venus's limb NEUTRALISES rather than yellowing.
  //
  // structure 0.15 crushes the map 85% toward its own mean. venus_atmosphere_2k
  // carries 365 nm UV morphology (30-50% contrast); a visible-light camera
  // records only ~4.5% (1 sigma) residual cloud structure. At 0.15 the map
  // contributes shape, not colour. lumaMean 0.557 measured in-repo.
  venus: {
    scatter: SCATTER.minnaert, minnaertK: 1.38,
    terminator: [-0.04, 0.06], nightAmbient: 0.02, haze: 0.0,
    colorMode: COLOR.albedoFromLuma, tint: NEUTRAL,
    albedo: [0.947, 0.922, 0.855], albedoAlt: [0.932, 0.923, 0.888],
    structure: 0.15, lumaMean: 0.557,
  },

  // ── MARS ─────────────────────────────────────────────────────────────────
  // JUDGEMENT CALL, flagged: the research spec asked for "intermediate" limb
  // behaviour (a regolith that limb-darkens, partly filled in by a dust column
  // of visible optical depth tau ~ 0.3-0.5) but gave no Minnaert coefficient.
  // k = 0.80 is chosen as the midpoint between the Lommel-Seeliger regolith
  // limit (k ~ 0.55, Mercury) and Lambert (k = 1.0). Replace with a measured
  // value if one turns up.
  //
  // chromaGain is the real fix. mars_2k.jpg is Solar System Scope's asset,
  // whose own description admits "colours slightly more saturated and gaps
  // filled with similar fictional terrain" — and the old code then applied
  // saturation 1.18 / contrast 1.12 ON TOP of that, clipping the red channel
  // over Tharsis and Hellas and blowing the north cap to pure white (which
  // tripped the 0.92 bloom threshold in Effects.tsx). This vector rebalances
  // CHROMA ONLY, leaving luminance and neutrals untouched, so the polar cap
  // stays neutral instead of turning cyan. Target is Maki et al. 1999 (JGR
  // 104 E4), the direct spectrophotometric measurement of Martian soil at the
  // Pathfinder site: CIE x = 0.44, y = 0.40 -> linear RGB 1.000 : 0.4522 :
  // 0.1532. The vector was picked to move the disc's mean R:G toward that
  // ratio and keep overall brightness near the fact-sheet geometric albedo —
  // a deliberate nudge in the measured direction, not a calibrated match.
  mars: {
    scatter: SCATTER.minnaert, minnaertK: 0.80,
    terminator: [-0.03, 0.09], nightAmbient: 0.02, haze: 1.0,
    colorMode: COLOR.chromaGain, tint: [0.50, 0.41, 0.96],
    albedo: NEUTRAL, albedoAlt: NEUTRAL, structure: 0, lumaMean: 1,
  },

  // ── JUPITER ──────────────────────────────────────────────────────────────
  // Minnaert k = 1.0 across the whole disc from 0.6-2.0 um (Soviet Astronomy
  // 19, 373), i.e. exactly Lambertian: I/F ~ mu0 with NO emission-angle term.
  // DSCOVR/EPIC sees clear limb DARKENING at every wavelength, which is why the
  // old +10% gas-giant limb GLOW had the sign backwards. Jupiter is a
  // semi-infinite bright scattering medium with no dark floor beneath it, so
  // there is nothing for a halo to brighten against.
  jupiter: {
    scatter: SCATTER.minnaert, minnaertK: 1.00,
    terminator: [-0.03, 0.06], nightAmbient: 0.03, haze: 0.0,
    colorMode: COLOR.jupiterRecurve, tint: NEUTRAL,
    albedo: NEUTRAL, albedoAlt: NEUTRAL, structure: 0, lumaMean: 1,
  },

  // ── SATURN ───────────────────────────────────────────────────────────────
  // Minnaert k = 0.80, inside the measured 0.75-0.90 range (Ortiz et al. 1995,
  // Icarus 117, 328). k < 1 means a mild limb BRIGHTENING once the illumination
  // cosine is handled separately — so the old rocky-body darkening had the sign
  // wrong here too. No colour treatment: I measured saturn_2k.jpg at linear
  // mean R 0.754 / G 0.609 / B 0.395, and its disc luminance of 0.624 lands
  // close to the correct disc-centre nadir value p_V * (2k+1)/2 = 0.651. The
  // asset is honest; only the pipeline around it was wrong.
  saturn: {
    scatter: SCATTER.minnaert, minnaertK: 0.80,
    terminator: [-0.03, 0.06], nightAmbient: 0.03, haze: 0.0,
    colorMode: COLOR.none, tint: NEUTRAL,
    albedo: NEUTRAL, albedoAlt: NEUTRAL, structure: 0, lumaMean: 1,
  },

  // ── URANUS ───────────────────────────────────────────────────────────────
  // Minnaert k = 0.75 (Irwin et al. 2022/2024, HST/STIS + VLT/MUSE fits).
  // Uranus limb-darkens: near the limb you see higher, colder, more absorbing
  // layers of the same semi-infinite medium. It limb-BRIGHTENS only inside the
  // 0.73/0.79/0.89 um methane bands, all outside human vision — hence no glow
  // term and no Fresnel shell.
  //
  // Procedural, with no texture fetch, because uranus_2k.jpg is a synthetic
  // vertical gradient in which every pixel of a row is byte-identical: it
  // carries zero information a shader cannot generate, and its chroma is ~2.4x
  // too high. albedo is the disc-centre nadir colour #C1CFD8 in linear light
  // (Rec.709 luminance 0.609, matching (I/F)0 = p_V (2k+1)/2 = 0.610 for
  // p_V = 0.488). albedoAlt is the north polar hood #D6DFE8: ~15% brighter and
  // less blue, because polar methane is depleted to 2-3% against 4-5% at the
  // equator (Irwin et al. 2024), which lifts the red channel.
  uranus: {
    scatter: SCATTER.minnaert, minnaertK: 0.75,
    terminator: [-0.02, 0.06], nightAmbient: 0.02, haze: 0.0,
    colorMode: COLOR.uranusLatitude, tint: NEUTRAL,
    albedo: [0.533, 0.624, 0.687], albedoAlt: [0.673, 0.738, 0.807],
    structure: 0, lumaMean: 1,
  },

  // ── NEPTUNE ──────────────────────────────────────────────────────────────
  // Minnaert k = 0.65 (Irwin et al. 2023, VLT/MUSE; k > 0.5 is limb-darkened).
  //
  // The map's chroma is unrecoverable and is discarded. neptune_2k.jpg descends
  // from the contrast-stretched Voyager 2 composite: I measured its linear mean
  // at R 0.0416 / G 0.1143 / B 0.4800, luminance 0.125, against a true nadir
  // reflectance of ~0.49. Matching true colour by gain would need per-channel
  // multipliers of ~6.6x, 6.8x and 1.7x, amplifying JPEG noise in R and G by
  // nearly seven. So only ~6% of its luminance contrast is kept as
  // high-frequency structure over the measured albedo — which turns the map's
  // 0.44x-2.2x luminance swing into roughly -3%/+7%, the "just visible" level
  // the MUSE naked-eye reconstruction actually shows.
  neptune: {
    scatter: SCATTER.minnaert, minnaertK: 0.65,
    terminator: [-0.03, 0.08], nightAmbient: 0.025, haze: 0.0,
    colorMode: COLOR.albedoFromLuma, tint: NEUTRAL,
    albedo: [0.245, 0.538, 0.673], albedoAlt: [0.245, 0.538, 0.673],
    structure: 0.06, lumaMean: 0.125,
  },
};

const defaultVisuals: PlanetVisuals = {
  scatter: SCATTER.minnaert, minnaertK: 1.0,
  terminator: [-0.03, 0.06], nightAmbient: 0.03, haze: 0.0,
  colorMode: COLOR.none, tint: NEUTRAL,
  albedo: NEUTRAL, albedoAlt: NEUTRAL, structure: 0, lumaMean: 1,
};

// ── Shared vertex shader ──
const texturedVertexShader = /* glsl */ `
  uniform float uYScale;   // 1 - oblateness; the mesh is drawn at scale [1, uYScale, 1]
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;

    // Non-uniform scale needs the INVERSE TRANSPOSE, not the model matrix.
    // modelMatrix multiplies y by uYScale, so pre-dividing by uYScale^2 leaves
    // a net division — which is the correct transform. Without this the y
    // component came out ~14% short on Jupiter and ~21% short on Saturn,
    // tipping every normal toward the equator and shifting the terminator.
    vec3 n = normal / vec3(1.0, uYScale * uYScale, 1.0);
    vWorldNormal = normalize((modelMatrix * vec4(n, 0.0)).xyz);

    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ── Saturn ring optical depth + tint ──
// Shared verbatim between the ring shader and the surface shader, because the
// darkness of the ring's shadow on the globe IS the ring's transmission along
// the slant path — the same tau, evaluated at a different point. Keeping one
// definition is what makes the Cassini Division show up as a bright stripe
// inside the shadow band for free.
//
// Radii are in Saturn equatorial radii (R = 60,268 km); optical depths are the
// published Cassini-era normal values.
const saturnRingGLSL = /* glsl */ `
  float saturnRingTau(float r) {
    if (r < 1.239 || r > 2.270) return 0.0;   // inside C ring inner / outside A ring outer
    float tau;
    if (r < 1.526) {
      tau = 0.08;                             // C ring, tau 0.05-0.12
    } else if (r < 1.951) {
      // B ring: the densest parts block >99% of the light. Ramp 0.8 -> 2.2 -> 1.2.
      float t = (r - 1.526) / 0.425;
      tau = t < 0.5 ? mix(0.8, 2.2, t * 2.0) : mix(2.2, 1.2, (t - 0.5) * 2.0);
    } else if (r < 2.027) {
      tau = 0.10;                             // Cassini Division, 4,700 km wide
    } else {
      tau = mix(0.65, 0.40, (r - 2.027) / 0.243);  // A ring
    }
    // Maxwell gap (1.4517 R, 270 km) and Encke gap (2.2166 R, 325 km).
    // The Keeler gap is 35 km = 0.0006 R and is deliberately omitted — sub-pixel.
    tau *= 1.0 - 0.90 * (1.0 - smoothstep(0.0, 0.0023, abs(r - 1.4517)));
    tau *= 1.0 - 0.90 * (1.0 - smoothstep(0.0, 0.0027, abs(r - 2.2166)));
    return tau;
  }

  // Per-ring particle colour, LINEAR. Warm sand for A and B (albedo ~0.55),
  // near-neutral dark grey for C and the Cassini Division (C falls from 0.4 to
  // 0.1 inward). The sandy cast is the measured drop in ring reflectivity
  // shortward of 0.6 um, not a stylistic choice.
  vec3 saturnRingTint(float r) {
    vec3 c = vec3(0.300, 0.291, 0.258);                                    // C ring
    c = mix(c, vec3(0.783, 0.665, 0.428), smoothstep(1.516, 1.536, r));    // B ring
    c = mix(c, vec3(0.238, 0.232, 0.213), smoothstep(1.946, 1.956, r));    // Cassini Division
    c = mix(c, vec3(0.658, 0.584, 0.417), smoothstep(2.022, 2.032, r));    // A ring
    return c;
  }
`;

// ── Fragment shader for textured planets ──
const texturedFragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3  uSunPosition;

  // Colour treatment (see COLOR / planetVisuals above)
  uniform float uColorMode;
  uniform vec3  uTint;
  uniform vec3  uAlbedo;
  uniform vec3  uAlbedoAlt;
  uniform float uStructure;
  uniform float uLumaMean;

  // Photometry (see SCATTER / planetVisuals above)
  uniform float uScatterModel;
  uniform float uMinnaertK;
  uniform vec2  uTerminator;
  uniform float uNightAmbient;
  uniform float uHaze;

  // Ring shadow (Saturn only)
  uniform float uRingShadow;
  uniform vec3  uRingNormal;
  uniform vec3  uPlanetCenter;
  uniform float uPlanetRadius;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;

  ${saturnRingGLSL}

  vec3 surfaceColor(float NdotV) {
    // URANUS: no texture fetch at all. Everything real about the disc is a
    // function of latitude — a near-uniform pale body, one bright polar hood,
    // and a faint circumpolar collar. Peak-to-peak brightness stays around 20%;
    // deliberately NO sinusoidal banding, because Uranus's zonal contrast in
    // the visible needed roughly a 10x stretch to show up in Voyager 2 data.
    if (uColorMode > 4.5) {
      float lat    = (vUv.y - 0.5) * 2.0;   // +1 = north pole on three.js SphereGeometry
      float collar = 1.0 - 0.03 * (smoothstep(0.60, 0.70, lat) * smoothstep(0.82, 0.72, lat));
      float hood   = smoothstep(0.62, 0.98, lat);   // poleward of ~+50 deg
      float south  = smoothstep(-0.45, -1.0, lat);  // decayed winter hemisphere
      return mix(uAlbedo, uAlbedoAlt, hood) * collar * (1.0 - 0.07 * south);
    }

    // The map is tagged SRGBColorSpace on the loader, so three.js has already
    // decoded it: everything below is LINEAR light.
    vec3 c = texture2D(uMap, vUv).rgb;

    if (uColorMode < 0.5) return c;                    // COLOR.none

    if (uColorMode < 1.5) return c * uTint;            // COLOR.tint — luminance-preserving

    if (uColorMode < 2.5) {                            // COLOR.chromaGain
      // Operate on chroma only. A flat per-channel gain would tint the neutral
      // polar cap (tested: it came out cyan); pivoting about luminance leaves
      // every near-neutral pixel exactly where it was.
      float Y = dot(c, vec3(0.2126, 0.7152, 0.0722));
      return max(vec3(Y) + (c - vec3(Y)) * uTint, 0.0);
    }

    if (uColorMode < 3.5) {                            // COLOR.jupiterRecurve
      // jupiter_2k.jpg is the Cassini cylindrical map: 36 images from 11-12 Dec
      // 2000 in only TWO filters (750 nm and 451 nm) with the green channel
      // SYNTHESISED. It is a filter composite, not a calibrated true-colour
      // product, which is why its zones measure B/R 0.985-1.12 — bluer than the
      // illuminant, physically impossible for Jupiter, whose least
      // blue-absorbing region (the Equatorial Zone) sits at B/R 0.792.
      //
      // This curve was fitted to land the EZ exactly on the DSCOVR/EPIC
      // full-disk albedos (0.861 @680nm, 0.779 @551nm, 0.682 @443nm). Verified
      // on the real pixels: the recurved map's cos-latitude-weighted
      // disc-integrated luminance is 0.534 against NASA's published geometric
      // albedo of 0.52-0.538 — a match that was not fitted for.
      c.g = 0.817 * pow(c.g, 0.775);
      c.b = 0.706 * pow(c.b, 0.720);
      c *= 1.35;

      // Cassini flew by near the equatorial plane, so polar coverage is poor and
      // cylindrically smeared, leaving the poles measurably GREEN (G/R 1.06-1.09)
      // where Juno shows a dusky bluish-grey. No per-channel curve can reach
      // that, so gate it on latitude instead. vUv.y maps linearly to polar angle
      // and the map uses equal increments of planetocentric latitude, so this
      // is exact degrees.
      float lat   = abs(vUv.y - 0.5) * 180.0;
      float polar = smoothstep(45.0, 68.0, lat);
      c.g = mix(c.g, (c.r + c.b) * 0.5, polar);
      c *= 1.0 - 0.15 * polar;
      return c;
    }

    // COLOR.albedoFromLuma — the map's chroma is discarded entirely and only a
    // fraction of its luminance contrast survives as high-frequency structure.
    float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float structure = 1.0 + (L / uLumaMean - 1.0) * uStructure;
    // Venus neutralises toward the limb (submicron upper haze scatters blue
    // preferentially); for bodies with no measured limb shift uAlbedoAlt is set
    // equal to uAlbedo and this mix is a no-op.
    vec3 alb = mix(uAlbedo, uAlbedoAlt, 1.0 - clamp(NdotV, 0.0, 1.0));
    return alb * structure;
  }

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(vViewDir);
    vec3 sunDir = normalize(uSunPosition - vWorldPosition);
    float NdotL = dot(N, sunDir);
    float NdotV = max(dot(N, V), 0.0);

    vec3 texColor = surfaceColor(NdotV);

    float mu0 = max(NdotL, 0.0);
    // Both laws are empirical fits that break down at grazing emission, so mu is
    // floored at 0.10 (84 deg) rather than allowed to reach zero.
    float mu  = max(NdotV, 0.10);

    float photom;
    if (uScatterModel < 0.5) {
      // Lommel-Seeliger. The 2.0 renormalises so the sub-solar/sub-observer
      // point still sits at 1.0. At zero phase mu == mu0 everywhere and this
      // collapses to a perfectly flat disc — which is exactly how an airless
      // body photographs.
      photom = 2.0 * mu0 / max(mu0 + mu, 1e-3);
      // Opposition surge. Only bites within a few degrees of zero phase, which
      // this scene's camera keyframes never reach, but it is the physics behind
      // the low phase integral and it replaces the fake specular lobe that used
      // to fake "brightens when facing you".
      float phase = acos(clamp(dot(sunDir, V), -1.0, 1.0));
      photom *= 1.0 + 0.6 * exp(-phase / 0.1);
    } else {
      photom = pow(mu0, uMinnaertK) * pow(mu, uMinnaertK - 1.0);
    }
    // Guard rail: k < 1 makes mu^(k-1) diverge at the limb. Capping at 2.0
    // keeps the extreme silhouette out of the 0.92 bloom threshold.
    photom = min(photom, 2.0);

    // Narrow mask so the night side goes to ambient without a hard edge. The
    // illumination falloff itself now lives in mu0^k / Lommel-Seeliger — the
    // old smoothstep(-0.08, 0.2) saturated at 1.0 for every NdotL > 0.2, which
    // meant ~96% of the lit hemisphere was drawn at uniform full brightness and
    // every planet read as a flat sticker rather than a sphere.
    float termMask = smoothstep(uTerminator.x, uTerminator.y, NdotL);

    vec3 dayCol = texColor * photom * termMask;

    // ── Ring shadow on the globe (Saturn) ──
    // March from this surface point toward the Sun and see whether the path
    // crosses the ring plane; if it does, attenuate by the ring's transmission
    // along the true slant path. This is what welds the rings to the planet.
    if (uRingShadow > 0.5) {
      vec3 rel = vWorldPosition - uPlanetCenter;
      float denom = dot(sunDir, uRingNormal);
      if (abs(denom) > 1e-4) {
        float t = -dot(rel, uRingNormal) / denom;
        if (t > 0.0) {
          float rq = length(rel + sunDir * t) / uPlanetRadius;   // radius in planet radii
          float slant = saturnRingTau(rq) / max(abs(denom), 0.05);
          dayCol *= exp(-slant);
        }
      }
    }

    vec3 col = dayCol + texColor * uNightAmbient * (1.0 - termMask);

    // ── Aerosol limb veil (Mars) ──
    // Deliberately NOT Earth's Rayleigh weighting. Mars's Rayleigh optical depth
    // is ~0.01 at 440 nm and <0.001 at 880 nm (MSL solar-imaging record), i.e.
    // 1-3% of the dust optical depth of tau ~ 0.3-0.5. The limb reads bluish in
    // NASA's true-colour HST image only because a near-NEUTRAL dust-and-ice veil
    // sits over a red disc — a relative effect, not blue scattering.
    //
    // The veil radiance below was re-derived for linear light: the source spec
    // quoted vec3(0.62, 0.63, 0.68), but that was authored against a texture
    // that was never sRGB-decoded, and carried into correct linear light it
    // would have been a ~3.5x lift over Mars's disc luminance of 0.176. This is
    // ~1.5x the disc, faintly blue-leaning, which is what the photo shows.
    if (uHaze > 0.0) {
      float airmass = 1.0 / max(NdotV, 0.10);
      float dayLit  = smoothstep(-0.05, 0.35, NdotL);
      float haze    = clamp((airmass - 1.0) * 0.055, 0.0, 0.20) * dayLit * uHaze;
      col = mix(col, vec3(0.26, 0.27, 0.30), haze);
    }

    // NOTE: there is no specular lobe anywhere in here any more. The old
    // Blinn-Phong term put a gloss highlight on porous space-weathered regolith
    // (Mercury, Mars — backscatter-dominated, the exact opposite of a forward
    // specular peak) and on multiple-scattering cloud decks and gas giants,
    // which have no surface and no specular interface at all. Earth keeps its
    // glint because Earth has liquid water; nothing else here does.

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── Saturn ring shaders ──
const saturnRingVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vRingNormal;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    // RingGeometry lies in its local XY plane, so +Z is the ring normal.
    vRingNormal = normalize((modelMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const saturnRingFragmentShader = /* glsl */ `
  uniform vec3  uSunPosition;
  uniform vec3  uPlanetPosition;
  uniform float uPlanetRadius;
  uniform float uRingOuterR;    // outer radius in PLANET radii
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vRingNormal;
  varying vec3 vViewDir;

  ${saturnRingGLSL}

  void main() {
    // THREE.RingGeometry normalises its uv by the OUTER radius
    // (uv = (vertex.xy / outerRadius + 1) / 2), NOT between inner and outer.
    // The old shader treated length(vUv - 0.5) * 2.0 as running 0 -> 1, so it
    // actually only ever spanned 0.609 -> 1.0: the C ring and the ENTIRE B RING
    // were identically zero, and the Cassini Division notch at 0.58 never fired.
    // What rendered was one featureless donut. Multiplying by uRingOuterR turns
    // it into a real radius in planet radii, which is what saturnRingTau wants.
    float rp = length(vUv - 0.5) * 2.0 * uRingOuterR;

    float tau = saturnRingTau(rp);
    if (tau <= 0.0) discard;

    vec3 N = normalize(vRingNormal);
    vec3 V = normalize(vViewDir);
    vec3 sunDir = normalize(uSunPosition - vWorldPosition);

    // Beer-Lambert along the true slant paths. Opacity comes from the VIEW
    // path, brightness from the SUN path — which is why the rings correctly
    // thicken up as the camera drops toward the ring plane (keyframes 0.57 and
    // 0.61 both do exactly that).
    float muV  = max(abs(dot(V, N)), 0.03);
    float mu0  = max(abs(dot(sunDir, N)), 0.03);
    float alpha = 1.0 - exp(-tau / muV);

    vec3 tint = saturnRingTint(rp);

    // The unlit face INVERTS: the optically thick B ring goes dark because it
    // blocks light, while the C ring and Cassini Division stay relatively bright
    // because they transmit it. The camera crosses the ring plane in this scene,
    // so this is actually visible.
    bool sameSide = dot(V, N) * dot(sunDir, N) > 0.0;
    vec3 col = sameSide
      ? tint * (1.0 - exp(-tau / mu0))
      : tint * exp(-tau / mu0) * 0.6;

    // Planet shadow on the rings. Darkens the ring rather than making it
    // transparent — a shadowed ring still occludes whatever is behind it.
    vec3 toPlanet = uPlanetPosition - vWorldPosition;
    float projDist = dot(toPlanet, sunDir);
    if (projDist > 0.0) {
      vec3 closestPoint = vWorldPosition + sunDir * projDist;
      float distToAxis = length(closestPoint - uPlanetPosition);
      col *= smoothstep(uPlanetRadius * 0.85, uPlanetRadius * 1.1, distToAxis);
    }

    gl_FragColor = vec4(col, alpha);
  }
`;

// ── Uranus ring shader ──
// Uranus's main system is radially NARROW: roughly 60 km of actual ring
// material spread over a 9,300 km span, so a filled annulus is the wrong
// primitive. Ten discrete rings is the wrong primitive too, at the size this
// planet is actually drawn (see uranusRing below). What this draws is the two
// groups the raster can hold: a barely-there inner cluster and one brighter
// epsilon-dominated outer band carrying ~83% of the integrated signal — never
// the evenly-spaced comb the old sin(ringPos * 60.0) produced.
const uranusRingFragmentShader = /* glsl */ `
  uniform vec3  uRingColor;
  uniform vec3  uSunPosition;
  uniform vec3  uPlanetPosition;
  uniform float uPlanetRadius;
  uniform float uRingOuterR;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vRingNormal;
  varying vec3 vViewDir;

  // Real widths run 1.6-96 km against R_eq 25,559 km, i.e. 6e-5 to 3.8e-3 R.
  // Uranus is only ever seen from the overview hub, where this ellipse spans
  // ~33 px = ~8 px per planet radius, so even a "broadened" w = 0.010 R is
  // 1/12 of a pixel: ten such rings bead and crawl, they do not resolve. Hence
  // two groups instead, each about a pixel or more across, each carrying its
  // members' INTEGRATED optical depth so the rendered brightness is unchanged.
  // wOut is tighter than wIn because the mesh stops at 2.05 R and nothing
  // orbits past epsilon — a wide outer flank would be clipped by the rim.
  float uranusRing(float r, float c, float wIn, float wOut, float tau) {
    float d = (r - c) / (r < c ? wIn : wOut);
    return tau * exp(-d * d);
  }

  void main() {
    float rp = length(vUv - 0.5) * 2.0 * uRingOuterR;

    // zeta sheet, 37,850-41,350 km = 1.481-1.618 R, tau ~0.0045
    float tau = 0.0045 * smoothstep(1.481, 1.500, rp) * (1.0 - smoothstep(1.600, 1.618, rp));
    // Inner cluster: 6/5/4/alpha/beta/eta/gamma/delta, 1.637-1.890 R. Centre is
    // their tau-weighted mean, amplitude their summed tau*w spread over the new w.
    tau += uranusRing(rp, 1.790, 0.130, 0.130, 0.22);
    // lambda + epsilon, 1.957-2.001 R. epsilon (tau 0.5-2.5) dominates, so the
    // group keeps its radius and just ramps in over ~1 px.
    tau += uranusRing(rp, 2.001, 0.105, 0.030, 0.37);
    if (tau <= 0.001) discard;

    vec3 N = normalize(vRingNormal);
    vec3 V = normalize(vViewDir);
    vec3 sunDir = normalize(uSunPosition - vWorldPosition);

    float muV = max(abs(dot(V, N)), 0.03);
    float mu0 = max(abs(dot(sunDir, N)), 0.03);
    float alpha = 1.0 - exp(-tau / muV);

    // STATED EXAGGERATION, opacity and radius stay honest. Uranus's rings have
    // a Bond albedo <= 2% and a geometric albedo <= 5-6% — among the darkest
    // surfaces in the solar system — so at true brightness they are effectively
    // invisible against this scene's black sky. The 2.5x lifts luminance only;
    // the hue is the measured slightly-red-in-the-visible grey, NOT the old
    // '#3A4A50' blue-grey.
    vec3 col = uRingColor * 2.5 * (1.0 - exp(-tau / mu0));

    vec3 toPlanet = uPlanetPosition - vWorldPosition;
    float projDist = dot(toPlanet, sunDir);
    if (projDist > 0.0) {
      vec3 closestPoint = vWorldPosition + sunDir * projDist;
      float distToAxis = length(closestPoint - uPlanetPosition);
      col *= smoothstep(uPlanetRadius * 0.85, uPlanetRadius * 1.1, distToAxis);
    }

    gl_FragColor = vec4(col, alpha);
  }
`;

// ── Component Props ──
interface TexturedPlanetProps {
  config: PlanetConfig;
  // Kept on the props type because SolarSystem passes it to every planet
  // uniformly, but this component animates purely off elapsed time — it never
  // reads scroll progress, so it is deliberately not destructured below.
  progressRef: React.RefObject<number>;
  /** Calm-on-read factor, 1 while scrolling and 0 once still. See CosmicScene. */
  motionRef?: React.RefObject<number>;
}

// ── Main TexturedPlanet Component ──
export function TexturedPlanet({ config, motionRef }: TexturedPlanetProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const lenis = useLenis();

  // Find the first section that this planet represents (e.g., earth → memories,
  // mars → skills). Clicking the planet jumps the page there via Lenis.
  const targetSection = useMemo(
    () => sectionIds.find((id) => sectionPlanet[id] === config.name) ?? null,
    [config.name],
  );

  const handlePlanetClick = (e: ThreeEvent<MouseEvent>) => {
    if (!targetSection) return;
    e.stopPropagation();
    if (lenis) {
      lenis.scrollTo(`#${targetSection}`, { offset: 0 });
    } else {
      // See the note on the identical branch in EarthGlobe: reduced-motion
      // visitors have no Lenis, so this is the path they always take, and a
      // hardcoded 'smooth' overrides the CSS guard rather than obeying it.
      document
        .getElementById(targetSection)
        ?.scrollIntoView({ behavior: jumpScrollBehavior() });
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (!targetSection) return;
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  const texturePaths = planetTextures[config.name];

  // Load the main surface texture. Uranus has no entry (it is generated
  // in-shader) and lands on the fallback, which is already in cache from
  // Mercury, so it costs no extra network.
  const surfaceMap = useTexture(texturePaths?.map ?? '/textures/mercury/mercury_2k.jpg');

  // Colour space is the single most consequential line in this file, and it is
  // the exact bug EarthGlobe.tsx already fixed. Neither three.js's TextureLoader
  // nor drei's useTexture assigns a colorSpace, so it stays NoColorSpace and an
  // sRGB-encoded JPEG gets sampled as if its bytes were linear reflectance. The
  // scene renders through @react-three/postprocessing's EffectComposer, so the
  // working space really is linear and the missing tag really did double-encode:
  // Mercury's map came out at linear albedo 0.517 where Mercury's normal
  // reflectance is ~0.12, and its true 3.45:1 albedo contrast was halved to
  // 1.77:1. That crushed contrast is what every planet's saturation/contrast
  // grading was silently compensating for — which is why all of it could be
  // deleted in the same commit as this line.
  useMemo(() => {
    surfaceMap.colorSpace = THREE.SRGBColorSpace;
    // Planets are viewed at grazing angles for most of the scroll, and band
    // structure (Jupiter, Saturn) aliases badly without this.
    surfaceMap.anisotropy = 8;
    surfaceMap.needsUpdate = true;
  }, [surfaceMap]);

  const visuals = planetVisuals[config.name] ?? defaultVisuals;

  const yScale = 1.0 - (config.oblateness ?? 0);
  // Saturn gets the full optical-depth ring model + a ring shadow on the globe;
  // every other ringed body in this scene (Uranus) takes the narrow-ring path.
  const hasSaturnRings = config.name === 'saturn' && !!config.hasRings;

  // World-space ring-plane normal. The ring mesh is rotated PI/2 about X inside
  // a group already rotated by the axial tilt, so the plane normal is
  // RotX(tilt + PI/2) applied to +Z, then swung by the tilt azimuth. Only
  // Saturn's rings are optically thick enough to cast a shadow worth drawing.
  //
  // This has to stay the exact composition the group below applies, in the same
  // order. It is what the SURFACE shader uses to cast the rings' shadow onto the
  // globe, while the RING shader derives its own normal from the model matrix —
  // two paths to one plane, and if they disagree the shadow slides off the rings
  // casting it.
  const ringNormal = useMemo(() => {
    const a = (config.tilt ?? 0) + Math.PI / 2;
    return new THREE.Vector3(0, -Math.sin(a), Math.cos(a))
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), config.tiltAzimuth ?? 0)
      .normalize();
  }, [config.tilt, config.tiltAzimuth]);

  const uniforms = useMemo(() => ({
    uMap: { value: surfaceMap },
    uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
    uYScale: { value: yScale },
    uColorMode: { value: visuals.colorMode },
    uTint: { value: new THREE.Vector3(...visuals.tint) },
    uAlbedo: { value: new THREE.Vector3(...visuals.albedo) },
    uAlbedoAlt: { value: new THREE.Vector3(...visuals.albedoAlt) },
    uStructure: { value: visuals.structure },
    uLumaMean: { value: visuals.lumaMean },
    uScatterModel: { value: visuals.scatter },
    uMinnaertK: { value: visuals.minnaertK },
    uTerminator: { value: new THREE.Vector2(...visuals.terminator) },
    uNightAmbient: { value: visuals.nightAmbient },
    uHaze: { value: visuals.haze },
    uRingShadow: { value: hasSaturnRings ? 1.0 : 0.0 },
    uRingNormal: { value: ringNormal },
    uPlanetCenter: { value: new THREE.Vector3(...config.position) },
    uPlanetRadius: { value: config.radius },
  }), [surfaceMap, yScale, visuals, hasSaturnRings, ringNormal, config.position, config.radius]);

  const segments = config.radius > 1 ? 96 : 64;

  const ringInnerR = config.ringInnerRadius ?? 1.4;
  const ringOuterR = config.ringOuterRadius ?? 2.3;

  const ringUniforms = useMemo(() => {
    if (!config.hasRings) return null;
    return {
      uRingColor: { value: new THREE.Color(config.ringColor ?? config.colors.primary) },
      uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
      uPlanetPosition: { value: new THREE.Vector3(...config.position) },
      uPlanetRadius: { value: config.radius },
      uRingOuterR: { value: ringOuterR },
    };
  }, [config.hasRings, config.ringColor, config.colors.primary, config.position, config.radius, ringOuterR]);

  // No clock uniform any more: the only thing that ever consumed elapsed time
  // here was Venus's in-shader cloud uv scroll, which was double-counting
  // super-rotation against the mesh spin. The deck now rotates once, with the mesh.
  useFrame((_, delta) => {
    if (meshRef.current) {
      // delta-scaled so the spin rate stops being frame-rate dependent (it used
      // to run twice as fast on a 120Hz display). The * 60 preserves the
      // established radians-per-frame-at-60fps meaning of config.rotationSpeed.
      meshRef.current.rotation.y += config.rotationSpeed * delta * 60 * (motionRef?.current ?? 1);
    }
  });

  return (
    <group
      ref={groupRef}
      position={config.position}
      // 'YXZ' so the matrix is RotY(azimuth) · RotX(tilt): the azimuth swings
      // the already-tilted axis around world +Y, rather than being consumed as
      // a spin about the planet's own axis (which is what the default 'XYZ'
      // order would do, and which would be a visual no-op on a body that spins
      // anyway). With tiltAzimuth omitted this is exactly RotX(tilt) — bit for
      // bit the old behaviour for every planet but Saturn.
      rotation={[config.tilt ?? 0, config.tiltAzimuth ?? 0, 0, 'YXZ']}
      onClick={handlePlanetClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Planet surface */}
      <mesh ref={meshRef} scale={[1, yScale, 1]}>
        <sphereGeometry args={[config.radius, segments, segments]} />
        <shaderMaterial
          vertexShader={texturedVertexShader}
          fragmentShader={texturedFragmentShader}
          uniforms={uniforms}
          toneMapped={false}
        />
      </mesh>

      {/* Hover highlight ring — gentle indication that this planet is clickable */}
      {hovered && targetSection && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[config.radius * 1.18, config.radius * 1.22, 48]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      {/* Rings. 256 theta segments rather than 128 — at the scroll-0.61 close
          approach a 128-gon showed visible faceting on the outer edge. */}
      {config.hasRings && ringUniforms && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ringInnerR * config.radius, ringOuterR * config.radius, 256]} />
          <shaderMaterial
            vertexShader={saturnRingVertexShader}
            fragmentShader={hasSaturnRings ? saturnRingFragmentShader : uranusRingFragmentShader}
            uniforms={ringUniforms}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* NOTE: no <pointLight> here any more. Planets do not emit, every sibling
          mesh in this scene is a raw ShaderMaterial that ignores scene lights,
          and it silently coupled a config hex to a lighting decision. Removing
          it is a strict no-op visually and one less light per planet per frame. */}
    </group>
  );
}
