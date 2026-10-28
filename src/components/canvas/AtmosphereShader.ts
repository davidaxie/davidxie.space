/**
 * Fresnel atmosphere glow shaders for planet meshes.
 *
 * Renders on a slightly-oversized BackSide sphere so the glow appears
 * only at the silhouette edges — the classic "backlit atmosphere" look.
 *
 * Uniforms:
 *   uAtmosphereColor  – vec3  – per-planet glow tint
 *   uFresnelPower     – float – exponent (higher = thinner ring)
 *   uIntensity        – float – overall brightness multiplier
 *   uPulse            – float – driven by JS (0-1 oscillation for subtle scale throb)
 *   uSunPosition      – vec3  – enables day-side brightening
 */

// ── Vertex shader ──
export const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ── Fragment shader ──
export const atmosphereFragmentShader = /* glsl */ `
  uniform vec3  uAtmosphereColor;
  uniform float uFresnelPower;
  uniform float uIntensity;
  uniform float uPulse;       // 0-1 oscillation fed from JS
  uniform vec3  uSunPosition;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;

  void main() {
    // ── Core Fresnel ──
    float fresnel = 1.0 - dot(vViewDir, vNormal);
    fresnel = pow(clamp(fresnel, 0.0, 1.0), uFresnelPower);

    // ── Sun-aware brightness ──
    vec3 sunDir = normalize(uSunPosition - vWorldPosition);
    float NdotL = dot(vNormal, sunDir);
    // Brighter on sunlit limb, dimmer (but not zero) on night side
    float dayMask = smoothstep(-0.4, 0.3, NdotL);

    // Rayleigh-like colour shift near the terminator
    vec3 terminatorTint = mix(uAtmosphereColor, vec3(0.75, 0.40, 0.20), 0.20);
    float sunAngle = max(NdotL, 0.0);
    vec3 atmColor = mix(terminatorTint, uAtmosphereColor, sunAngle);

    // ── Combine ──
    float pulse = 1.0 + uPulse * 0.12; // subtle brightness pulse ±12 %
    float alpha = fresnel * uIntensity * dayMask * pulse;

    gl_FragColor = vec4(atmColor, alpha);
  }
`;

// ── Per-planet atmosphere presets ──
export interface AtmospherePreset {
  color: string;
  fresnelPower: number;
  intensity: number;
}

export const atmospherePresets: Record<string, AtmospherePreset> = {
  // Intensity was 0.30 under a comment reading "very faint exosphere" — the
  // right fact drawing the wrong conclusion. At < ~5e-15 bar there is no
  // in-scattering to see at all, so this must be exactly zero. (Only visible
  // during texture load: Planet.tsx mounts PlanetAtmosphere unconditionally
  // rather than reading config.hasAtmosphere, which is correctly false here.)
  mercury:  { color: '#B0B0B0', fresnelPower: 4.0,  intensity: 0.0 },   // airless — no shell
  // Was '#F0B040' at intensity 0.90 — linear B/G of 0.118, i.e. it removed 88%
  // of the blue where reality removes 7%, about 13x too much. A fat additive
  // golden halo is doubly wrong on a body whose limb is measurably darker AND
  // more neutral than its centre (the 70-90 km submicron haze scatters blue
  // preferentially, so B/G RISES from 0.921 at disc centre to 0.965 at the limb).
  venus:    { color: '#F0EFEB', fresnelPower: 5.0,  intensity: 0.20 },  // pale, near-neutral haze
  earth:    { color: '#5BAFFF', fresnelPower: 2.6,  intensity: 0.85 },  // Rayleigh blue
  // Was '#E06030' at intensity 0.55 — chromaticity x = 0.541, a saturated
  // orange glow Mars does not have. Mars's visible limb aerosol is pale and
  // near-neutral; it looks faintly bluish in NASA's true-colour HST image only
  // because a NEUTRAL dust-and-ice veil sits over a red disc. The shell in
  // PlanetAtmosphere is radius * 1.15 = ~500 km at Mars scale against a scale
  // height of 11.1 km, i.e. ~45 scale heights, so it must be nearly invisible.
  mars:     { color: '#C9C2BE', fresnelPower: 4.5,  intensity: 0.18 },  // thin, near-neutral dust veil
  // Was '#E09030' at intensity 0.70 — the same saturated orange as the 2D
  // chrome token, on a planet whose true disc colour is a pale cream and whose
  // measured behaviour is limb DARKENING, not a glow. Jupiter is a
  // semi-infinite bright scattering medium with no dark floor beneath it, so
  // there is nothing for a halo to brighten against. Pulled down to a faint
  // pale tan; ideally the shell would not be drawn on gas giants at all, but
  // Planet.tsx mounts it unconditionally.
  jupiter:  { color: '#D8C6AE', fresnelPower: 4.5,  intensity: 0.18 },  // faint; Jupiter limb-darkens
  // Was '#F0C060' at intensity 0.60 — an orange far more saturated than
  // Saturn's limb, which goes marginally COOLER and greyer than the disc, not
  // more golden. Saturn's cloud deck is itself bright (p_V ~0.50), so unlike
  // Earth there is no dark substrate for a scattering shell to brighten against.
  saturn:   { color: '#E8DCC0', fresnelPower: 5.0,  intensity: 0.25 },  // pale cream, barely there
  // Was '#9FF0FF' at intensity 0.62 under the comment "bright methane cyan" —
  // an electric-cyan Fresnel halo with no physical counterpart. Uranus's
  // atmosphere IS its visible surface: semi-infinite, nothing bright behind it,
  // nothing to look through edge-on. It purely limb-darkens in the visible
  // continuum. Reduced to a near-neutral trace so the loading fallback does not
  // contradict the corrected disc.
  uranus:   { color: '#C6D2DA', fresnelPower: 5.0,  intensity: 0.10 },  // no halo exists; trace only
  // Was '#1F58F8' at intensity 0.78 under the comment "rich cobalt methane" —
  // the myth written down explicitly. Neptune's true disc colour is a pale
  // cyan-blue at HSL saturation ~0.49, and its limb is faint haze rather than a
  // cobalt corona. This preset drives the Suspense fallback, so leaving it
  // would have made the planet visibly change hue when the texture resolved.
  neptune:  { color: '#A8CFDE', fresnelPower: 3.5,  intensity: 0.35 },  // pale haze, not cobalt
};
