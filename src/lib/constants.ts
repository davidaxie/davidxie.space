// ── Design System Colors ──
export const colors = {
  void: '#000000',
  voidElevated: '#080808',
  voidSurface: '#111111',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.70)',
  // The ramp deliberately STOPS at secondary, mirroring the --color-text-*
  // tokens in globals.css. `textTertiary` (white at 0.45) and `textMuted`
  // (white at 0.25) used to sit here; against this site's #000000 they measure
  // 4.41:1 and 2.02:1, both under the 4.5:1 WCAG AA floor for body text, and
  // neither was referenced by a single component. Their CSS counterparts were
  // deleted for exactly that reason — this object was the surviving half of the
  // same trap, one autocomplete away from putting a contrast failure on screen.
  // Removed rather than nudged up to a passing alpha, because raising them
  // would invent a ramp the design does not actually use. If a third rung is
  // ever genuinely needed: white at 0.456 alpha is the exact AA boundary on
  // #000000, so 0.50 is the first round number with headroom.
  cardBg: 'rgba(255,255,255,0.04)',
  cardBorder: 'rgba(255,255,255,0.10)',
} as const;

// ── Planet Colors ──
// SOURCE OF TRUTH for UI chrome accents. These MUST stay in sync with the
// --color-planet-* tokens in src/app/globals.css — the same palette exists
// twice because TSX reads this object (Navbar, PlanetProgress) while Tailwind
// utilities read the CSS tokens. Changing one without the other makes a
// section's accent shift depending on which file the component happened to
// read. (`pluto` is intentionally TS-only; globals.css defines no token for it.)
// NOTE: this is the flat 2D chrome palette, NOT the 3D scene's colors — those
// live in planetConfigs below and are deliberately darker/more naturalistic.
export const planetColors = {
  sun: '#D0D0D8',
  mercury: '#8C8C8C',
  venus: '#F0D080',
  // Desaturated to match --color-planet-earth, .text-gradient-earth, and the
  // BUILDER ChapterCard accent in src/app/page.tsx. Was '#3B9FE0', which had
  // drifted out of sync and left Navbar/PlanetProgress candy-bright while every
  // other Earth-accented surface rendered editorial blue.
  earth: '#5A8FB5',
  mars: '#E04A10',
  jupiter: '#E09030',
  saturn: '#F0B820',
  uranus: '#60E8F8',
  neptune: '#3060F0',
  pluto: '#D4B896',
} as const;

// ── Section IDs for navigation ──
// SOURCE OF TRUTH for the section set, and deliberately hoisted ABOVE the two
// tables that are keyed by it (sectionPlanet, sectionRanges) — both are now
// annotated Record<SectionId, …>, so this array is the single place a section
// is added, renamed or dropped, and the compiler walks you through every table
// that has to follow. Before those annotations sectionPlanet was
// Record<string, …>: a stale key was not an error, it was `undefined` at
// runtime, and PlanetProgress's `sectionPlanet[id] ?? 'sun'` quietly rendered
// the missing section with the Sun's accent. Silent wrong colour beats no
// colour, which is exactly why nobody would have found it.
export const sectionIds = [
  'memories',
  'footprints',
  'about',
  'builder',
  'finance',
  'creator',
  'offtheclock',
  'contact',
] as const;

export type SectionId = (typeof sectionIds)[number];

// ── Display labels ──
// The human-readable name for each section, in one place.
//
// This exists because the ids stopped being single words. Both the navbar and
// the progress rail used to derive their label by capitalising the id, which
// worked for as long as every section was called something like 'contact' —
// and silently produced "Offtheclock" the moment one was not. The navbar had
// already grown its own hardcoded label map to work around that, which made it
// a second list of every section that nothing checked against this one.
//
// Keyed by SectionId, so adding a section without naming it is a compile error
// rather than a rail dot reading like a database column.
export const sectionLabels: Record<SectionId, string> = {
  memories: 'Memories',
  footprints: 'Footprints',
  about: 'About',
  builder: 'Builder',
  finance: 'Finance',
  creator: 'Creator',
  offtheclock: 'Off the Clock',
  contact: 'Contact',
};

// ── Planet-to-Section Mapping ──
// ORDERED BY ORBITAL RADIUS, NOT BY THEME. The section order is fixed by
// page.tsx and sectionRanges; the only free variable is which planet each
// section lands on, and that choice IS the camera's itinerary — cameraKeyframes
// below is downstream of this object, not independent of it.
//
// The mapping walks the radii once. Inward: 15.5, 15.5, 10.3, 6.8. Then a
// single outward run: 28.7, 32.2, 42.6, 53.2. ONE direction change, and it
// happens at Mercury — the only place a reversal reads as intentional rather
// than arbitrary, because you cannot pass the Sun, you turn around at it.
//   memories + footprints → earth   LOCKED, and locked ADJACENT: the city dots
//                                   and their labels live on this globe, so the
//                                   two sections have to be one contiguous
//                                   visit (see the label window in EarthGlobe).
//   about                 → venus   Earth's twin, one step inward.
//   builder               → mercury innermost; the turn-around. It inherits the
//                                   two stations the old Projects section used,
//                                   unchanged in position (scroll since retimed
//                                   to the measured DOM ranges).
//   finance → contact               outward, in order, to the edge of the system.
//
// MARS IS ORPHANED. There are eight sections and eight planets, but memories
// and footprints share Earth, so exactly one body ends up with no section — and
// Mars is the one that can afford it. Uranus is the tempting alternative: it is
// the newest stop and nothing thematic leans on it. But Uranus sits IMMEDIATELY
// AFTER Saturn, and removing its rows would move the four points that bracket
// Saturn's departure, which retimes the Saturn dwell. Saturn's ringTiltAzimuth
// (-1.03 rad, see planetConfigs) was SOLVED against those exact keyframes, and
// the ring shader's `sameSide` test flips when they move: the B ring, the
// brightest band in the solar system, renders black — silently, because it is a
// shader branch and not an error. Mars sits between Mercury and Jupiter with no
// solved constant anywhere near it, so cutting it confined the whole edit to
// the Mercury→Jupiter run and left jupiter → saturn → uranus → neptune
// untouched in space. (The scroll column has since been retimed wholesale to
// the measured sectionRanges — that is safe precisely because it moves no
// control point; see the RETIME note above cameraKeyframes.)
// Mars still exists in planetConfigs and still renders — the itinerary passes it
// at 13.4 units on the way out — it simply has no station and no section, so
// TexturedPlanet gives it no click target (`sectionIds.find(…) ?? null`) and no
// dot appears for it on the rail.
export const sectionPlanet: Record<SectionId, keyof typeof planetColors> = {
  memories: 'earth',
  footprints: 'earth',
  about: 'venus',
  builder: 'mercury',
  finance: 'jupiter',
  creator: 'saturn',
  offtheclock: 'uranus',
  contact: 'neptune',
};

// ── Planet Config for 3D Scene ──
export interface PlanetConfig {
  name: string;
  position: [number, number, number];
  radius: number;
  colors: { primary: string; secondary: string; tertiary?: string };
  rotationSpeed: number;
  noiseScale: number;
  // NOTHING IN src/ READS THESE TWO. Atmospheres are driven entirely by
  // atmospherePresets in components/canvas/AtmosphereShader.ts, and Planet.tsx
  // mounts the shell unconditionally. Tuning them here has no visual effect.
  hasAtmosphere: boolean;
  atmosphereColor?: string;
  hasRings?: boolean;
  ringInnerRadius?: number;
  ringOuterRadius?: number;
  ringColor?: string;
  tilt?: number; // axial tilt in radians
  /**
   * Compass bearing of the axial tilt, in radians about world +Y, applied
   * OUTSIDE the tilt (world = RotY(tiltAzimuth) · RotX(tilt)).
   *
   * `tilt` alone only says how far the axis leans, not which way it leans —
   * it pinned every axis to lean along world X. Obliquity is a magnitude and
   * the bearing is genuinely free, so leaving it at 0 was not "unset", it was
   * an arbitrary choice being made silently. It matters for exactly one thing
   * in this scene, and it matters a lot: whether a ringed planet shows the
   * camera its sunlit face or its unlit one.
   *
   * Defaults to 0, which is the old behaviour for every planet that omits it.
   */
  tiltAzimuth?: number;
  oblateness?: number; // 0 = perfect sphere, 0.098 = Saturn
  type: 'rocky' | 'gas' | 'ice';
}

// Planets scattered across 3D space (not in a line)
export const planetConfigs: PlanetConfig[] = [
  {
    name: 'mercury',
    position: [5.5, 2.0, -3.5],
    radius: 0.3,
    // TRUE COLOUR, derived rather than eyeballed. Mercury's reflectance is
    // featureless and rises almost linearly across 0.33-1.06 um with no mineral
    // absorption bands; that ramp was anchored on MESSENGER MDIS reflectances
    // (0.044 @433nm rising to 0.100 @996nm, Ngoc/Bott/Diep 2019), convolved
    // with the CIE 1931 CMFs under a 5772 K solar illuminant and scaled to
    // Mercury's NORMAL REFLECTANCE at V, ~0.12 — which is what primary below
    // actually encodes (#686057 is Rec.709 linear luminance 0.122). NOT the
    // geometric albedo p_V = 0.142 (Mallama, Wang & Howard 2002): that is the
    // whole disc at zero phase and includes the opposition surge, so anchoring
    // on it would render the surface ~16% too bright.
    //   primary   was '#8C8C8C' — linear luminance 0.262, i.e. 2.19x Mercury's
    //             normal reflectance, and perfectly neutral where Mercury is
    //             warm. Now the global average of intercrater plains + heavily
    //             cratered terrain.
    //   secondary was '#555555' — right darkness, wrong reason: the real dark
    //             unit (low-reflectance material) is ~28% darker AND flatter-
    //             sloped, not neutral grey.
    //   tertiary  was '#A8A0A0' — 3.0x too bright and leaning MAGENTA (R=B>G).
    //             Mercury has no magenta anywhere; every real unit is R>G>B.
    //             Now fresh crater rays / bright ejecta: brighter and flatter-
    //             sloped because it is unweathered.
    // The famous tan/blue/orange Mercury globe is a FALSE-colour composite of
    // the 1000/750/430 nm bands — NASA says so in its own caption. Mercury is a
    // dark, slightly brown-olive grey, darker and redder than the Moon.
    colors: { primary: '#686057', secondary: '#57534E', tertiary: '#817C76' },
    // Was 0.002 — which made Mercury the 4th-FASTEST planet in this config when
    // it is the slowest of all but Venus. Sidereal period is 1407.6 h against
    // Earth's 23.934 h, and it is locked in a 3:2 spin-orbit resonance. Holding
    // Earth's configured 0.0008 as the anchor, the consistent value is
    // 0.0008 * 23.934 / 1407.6 = 0.0000136 — 147x slower than it was.
    rotationSpeed: 0.0000136,
    noiseScale: 4.0,
    // Correct: a surface-bounded exosphere at < ~5e-15 bar is optically
    // undetectable in reflected light. The sodium tail is a 589 nm resonance
    // emission feature, not a visible limb glow.
    hasAtmosphere: false,
    // Both of these are deliberately, explicitly zero so a later pass does not
    // "fix" them. tilt: obliquity is 2.04 +/- 0.08 ARCMINUTES = 0.034 deg
    // (Margot et al. 2012) — the smallest in the solar system, and the reason
    // Mercury has permanently shadowed polar craters and no seasons. WARNING:
    // NASA's own science.nasa.gov/mercury/facts page says "tilted just 2
    // degrees", which is a unit slip for 2 arcminutes and is 60x too large.
    // oblateness: flattening is 0.0009 (fact sheet); the polar radius is 1.65 km
    // below mean equatorial (Perry et al. 2015) — sub-pixel at any size here.
    // Also: no rings, no atmosphere, and NO POLAR ICE CAPS. Artists habitually
    // add bright caps; Mercury's polar water ice sits in permanently shadowed
    // craters under a ~10 cm organic-rich lag deposit and reads DARK at 1064 nm.
    tilt: 0,
    oblateness: 0,
    type: 'rocky',
  },
  {
    name: 'venus',
    position: [-8.0, -2.5, 6.0],
    // Was 0.55 (0.917x Earth). The disc a camera actually sees is the CLOUD TOP
    // at ~6120 km, not the 6051.8 km solid body — 0.961x Earth's 6371 km.
    radius: 0.575,
    // TRUE COLOUR, derived two independent ways that agree. (1) Mallama,
    // Krobusek & Pavlov 2017 geometric albedos (U 0.348, B 0.658, V 0.689,
    // R 0.708, I 0.584) integrated against the CIE 1931 CMFs under D65 give a
    // linear R:G:B of 1.040 : 1.000 : 0.941. (2) Measuring 179k disc pixels of
    // the MESSENGER/MDIS natural-colour composite of the 5 June 2007 flyby
    // gives 1.012 : 1.000 : 0.917. Adopted consensus 1.025 : 1.000 : 0.933 —
    // blue is only ~7% below green. Venus is a pale warm WHITE.
    //   primary   was '#E8CDA0' (linear B/G 0.576 — discards 42% of the blue
    //             where reality discards 6.7%). Now sub-solar cloud tops, I/F ~0.92.
    //   secondary was '#D4B978' (B/G 0.387). Now the disc mean, I/F ~0.70.
    //   tertiary  was '#C4A862' (B/G 0.312, i.e. ~3x too little blue). Now the
    //             terminator/limb tone, I/F ~0.30, where the measured ratio
    //             also NEUTRALISES to 1.010 : 1.000 : 0.962.
    // These three are the same chromaticity at three illumination levels, not
    // three materials. Every swirl in a Mariner 10 / Akatsuki / Pioneer Venus
    // image is UV or a UV-in-the-blue-channel composite: cloud contrast peaks
    // at 365 nm and vanishes across 200-600 nm, and NASA's own Mariner 10
    // caption says that in natural colour Venus is as featureless as a cue ball.
    colors: { primary: '#F9F6EE', secondary: '#DCDAD3', tertiary: '#969592' },
    // Was 0.001 prograde — 1.25x Earth's configured rate on a body that turns
    // at 1/244th of Earth's, in the wrong direction. This is now the CLOUD-TOP
    // rate, because the cloud deck is the visible surface: the solid body's
    // consistent value is 0.0008 * 23.934 / 5832.5 = 0.0000033, and the tops
    // super-rotate ~55x faster (4.45 d equatorial period vs 243.02 d).
    // The old code drove super-rotation twice — a 1.5x mesh spin AND an
    // independent in-shader uv scroll — which is 37x short of 55x and desynced
    // the layer from itself. There is now one deck and one rate.
    rotationSpeed: 0.00018,
    noiseScale: 2.0,
    hasAtmosphere: true,
    // Was '#E8C878' (linear B/G 0.325 — removes ~68% of the blue). Venus's limb
    // is measurably DARKER and MORE NEUTRAL than its centre, so a saturated
    // golden halo is doubly wrong. Near-white.
    atmosphereColor: '#F0EFEB',
    // Obliquity to orbit is 177.36 deg = 3.0955 rad. Setting it fixes two
    // errors with one value: it records the real obliquity AND, because the
    // group rotation is about X, it makes the positive rotationSpeed above
    // render as RETROGRADE without a sign flip. The N-S texture flip is
    // irrelevant on a body this symmetric.
    tilt: 3.0955,
    // Explicitly zero, and right for a reason rather than by omission: the
    // equatorial and polar radii are both 6051.8 +/- 1.0 km, so flattening is
    // below measurement precision (f < 2e-4). Venus is the roundest planet,
    // because it rotates far too slowly for any centrifugal bulge.
    oblateness: 0,
    type: 'rocky',
  },
  {
    name: 'earth',
    position: [3.0, 6.0, 14.0],
    radius: 0.6,
    colors: { primary: '#1A3A6A', secondary: '#2A6B3A', tertiary: '#6B8F50' },
    rotationSpeed: 0.0008,
    noiseScale: 2.5,
    hasAtmosphere: true,
    atmosphereColor: '#6BAFE8',
    type: 'rocky',
  },
  {
    name: 'mars',
    // ORPHANED, and kept on purpose. No section maps here (see sectionPlanet),
    // so no camera keyframe stations on it and TexturedPlanet's
    // `sectionIds.find(…) ?? null` gives it no click target and no hover
    // cursor — it is scenery, not a destination. Everything below still has to
    // be right: it is on screen for the whole overview hub and the recap, and
    // the itinerary passes it at 13.4 units on the Mercury → Jupiter run. What
    // it does mean is that Mars is now only ever seen SMALL, which makes the
    // tilt note further down load-bearing rather than a nicety.
    position: [14.0, -6.0, -10.0],
    // NOT CHANGED, deliberately: 0.4 against Earth's 0.6 is 0.667 where the
    // true ratio is 3389.5/6371 = 0.532. But this scene is openly not to scale
    // (Jupiter is 1.4 vs Earth 0.6 where the true ratio is 10.97), and Mercury
    // is inflated the same way. Shrinking Mars alone would break the
    // composition without making the scene any more honest.
    radius: 0.4,
    // TRUE COLOUR from Maki et al. 1999 (JGR 104 E4), the spectrophotometric
    // measurement made at the Pathfinder site specifically to answer this
    // question: Martian soil chromaticity CIE x = 0.43-0.46, y = 0.39-0.40,
    // most common (0.44, 0.40) — "the red planet is not red but indeed
    // yellowish brown". Converted to sRGB under D65 that is a linear RGB ratio
    // of 1.000 : 0.4522 : 0.1532. Sanity check: (0.44, 0.40) sits essentially
    // on the Planckian locus at ~3000 K, so Mars is the colour of tungsten
    // light — which is exactly the "butterscotch" of every Viking/Pathfinder
    // description.
    //   primary   was '#C1440E' — literally the pop-culture "Mars red" swatch,
    //             at chromaticity x = 0.578, over 0.14 in x away from the
    //             measured value, with a linear R/G of 9.2 against a true 2.21.
    //             Now bright dust-mantled terrain (Arabia, Tharsis, Hellas fill).
    //   secondary was '#6B2A0A' — implied albedo 0.048, less than half the real
    //             dark-region value. Now dark basaltic albedo features (Syrtis
    //             Major, Acidalia), greyer rather than deeper red: McCord &
    //             Westphal 1971 find bright Arabia is REDDER than dark Syrtis.
    //   tertiary  was '#D4724A' (x = 0.487, pink-red). Now the residual polar
    //             cap — NASA's official true-colour Hubble release calls the
    //             north cap "yellowish-pink" from iron-bearing dust on and above
    //             the ice, NOT white. The old near-white cap in the texture was
    //             also crossing the 0.92 bloom threshold and glowing.
    colors: { primary: '#BA824E', secondary: '#79593E', tertiary: '#E0BCB1' },
    // Was 0.0028 = 3.5x Earth's configured 0.0008, standing next to Earth in
    // the same frame. Mars's sidereal day is 24.6229 h against Earth's 23.9345,
    // so the two are within 3% of each other: 0.0008 * 23.934 / 24.623.
    rotationSpeed: 0.00078,
    noiseScale: 3.0,
    // Was false, which is simply untrue: mean surface pressure 0.636 kPa
    // (0.63% of Earth's), 95.97% CO2, scale height 11.1 km. Typical visible
    // dust optical depth is tau ~ 0.3-0.5 in the clear season — thin, but the
    // reason Mars has a visible limb haze at all.
    hasAtmosphere: true,
    // Obliquity to orbit 25.19 deg. Was ABSENT, so Mars rendered bolt upright
    // and its north polar cap sat exactly on the silhouette edge, reading as a
    // bright rim artefact rather than a cap. This is the single most legible
    // Mars cue at small render size and it survives even at 20 px.
    tilt: 0.4396,
    // Flattening 0.00589 (equatorial 3396.2 km, polar 3376.2 km). Honest note:
    // at radius 0.4 this is a 0.0024-unit squash, sub-pixel everywhere in the
    // scroll. Recorded for correctness, not for looks.
    oblateness: 0.00589,
    type: 'rocky',
  },
  {
    name: 'jupiter',
    position: [-18.0, 4.0, -22.0],
    radius: 1.4,
    // TRUE COLOUR, calibrated against DSCOVR/EPIC full-disk spectrophotometry,
    // which reports Jupiter's maximum disk albedo per channel as 0.861 @680nm,
    // 0.779 @551nm, 0.682 @443nm — with the maximum occurring at the equator,
    // so those three reflectances ARE the Equatorial Zone's colour. Independent
    // cross-check: Jupiter B-V = +0.83 against the Sun's +0.65 implies only
    // ~15% blue suppression relative to the illuminant, i.e. a pale warm cream.
    //   primary   was '#C88B3A' — linear B/R of 0.073 where a real belt needs
    //             0.45-0.62, roughly 7x too little blue. The "Jupiter is amber"
    //             cliche. Now the area-weighted NEB+SEB belt mean.
    //   secondary was '#7A4E1A' — B/R 0.053 and far too dark (linear R 0.195
    //             against ~0.45 for a real dark belt core). Now the darkest 15%
    //             of belt-core pixels.
    //   tertiary  was '#E8D0A0' — B/R 0.436 against the required 0.792, about
    //             twice as orange as reality. Now the Equatorial Zone.
    // Jupiter is NOT orange, NOT amber, NOT caramel — it is a muted cream/tan
    // body with soft milky brown belts. The JunoCam images circulated as
    // "Jupiter's true colors" are, in NASA's own wording, digitally processed to
    // increase colour saturation and contrast. In true colour the Great Red
    // Spot is a pale salmon, never fire-engine red.
    colors: { primary: '#CCB59B', secondary: '#B49776', tertiary: '#EFE4D7' },
    // Was 0.006 = 7.5x Earth's configured 0.0008. System III sidereal period is
    // 9h 55m 29.711s = 9.92492 h against Earth's 23.9345 h, a ratio of 2.412,
    // so the consistent value is 0.0008 * 23.934 / 9.925. Note this puts
    // Jupiter and Saturn within 7% of each other, as reality requires.
    rotationSpeed: 0.00193,
    noiseScale: 1.5,
    // Left false deliberately. Jupiter is nothing but atmosphere, but this flag
    // only gates the Fresnel shell in PlanetAtmosphere, and that shell adds a
    // limb BRIGHTENING which contradicts the limb darkening DSCOVR/EPIC
    // measures at every wavelength.
    hasAtmosphere: false,
    // Obliquity to orbit 3.13 deg. Was absent, so it fell back to 0.
    tilt: 0.055,
    // CORRECT — do not "fix". Flattening is 0.06487 from equatorial 71,492 km
    // and polar 66,854 km (both at the 1-bar level), so 0.065 is right to 0.2%.
    oblateness: 0.065,
    // NO RINGS, and that is a deliberate physical judgement rather than an
    // oversight. Jupiter genuinely has a ring system, but its normal optical
    // depth is ~1e-6 for the main ring and halo and 1e-8 to 1e-7 for the
    // gossamer rings — a million times fainter than Saturn's B ring, and
    // detectable essentially only in high-phase forward-scattered light, which
    // these camera keyframes never show. Drawing them at any visible opacity
    // would be a far larger error than omitting them.
    type: 'gas',
  },
  {
    name: 'saturn',
    position: [25.0, -3.0, 20.0],
    radius: 1.2,
    // TRUE COLOUR, derived photometrically rather than eyedropped from an
    // enhanced image. Chromaticity comes from two peer-reviewed numbers:
    // Karkoschka 1994 full-disk geometric albedo p_V = 0.501 peaking at
    // p_R = 0.567, and Mallama et al. 2017 Saturn B-V = 1.09 against the Sun's
    // 0.653. Working those through gives linear reflectance ratios
    // R:G:B = 1.000 : 0.883 : 0.590. Cross-check: the repo's own saturn_2k.jpg,
    // decoded correctly, measures a linear mean of R 0.754 / G 0.609 / B 0.395
    // — within ~10% of the photometric chromaticity, so the asset is honest and
    // it was the render that was wrong.
    //   primary   was '#DAA520' — this is literally CSS "goldenrod", with a
    //             linear B/R of 0.022 against Saturn's real 0.590: the blue
    //             channel was 27x too dark. Now the cos-lat-weighted disc mean.
    //   secondary was '#B8882A'. Now the mid-latitude belt — the most golden
    //             part of the disc, where chromophore haze sits.
    //   tertiary  was '#E8D48C' (closest of the three, still B/R 0.330). Now
    //             the equatorial zone: brightest AND least saturated, because
    //             it is thick bright ammonia cloud.
    // Keep the contrast between these three LOW. Saturn's zone/belt brightness
    // swing measured off the map is only about +/-10% peak to peak inside
    // |lat| < 60 deg, against Jupiter's ~40%. Low contrast is the correct look.
    // SEASONAL CAVEAT: the famous azure-blue northern hemisphere (Cassini
    // 2004-2008) was real but epoch-specific — ring shadowing suppressed haze
    // through northern winter and let Rayleigh scattering show. It faded by
    // 2009 and the north is ochre now.
    colors: { primary: '#E0D4B1', secondary: '#CEBF96', tertiary: '#F3E8CB' },
    // Was 0.005. System III radio period is 10h 39m 22.4s = 10.6562 h, so the
    // Earth-anchored value is 0.0008 * 23.934 / 10.656. Note the old pairing
    // (0.005 vs Jupiter's 0.006) implied a 1.20 ratio where the true angular
    // ratio is 10.656/9.925 = 1.074.
    rotationSpeed: 0.0018,
    noiseScale: 1.5,
    // Was false on a body that is 96.3% H2 / 3.25% He and has nothing BUT
    // atmosphere. No effect on the textured path (which never mounts
    // PlanetAtmosphere), but it was wrong in the data model.
    hasAtmosphere: true,
    hasRings: true,
    // Was 1.4 / 2.3, which started the rings almost touching the cloud tops and
    // stopped them before the real system ends. In equatorial radii
    // (R = 60,268 km) the C ring's inner edge is 74,658 km = 1.2388 R and the
    // A ring's outer edge is 136,775 km = 2.2695 R. The old inner edge was 13%
    // too far out, visibly widening the gap between planet and rings.
    ringInnerRadius: 1.239,
    ringOuterRadius: 2.270,
    // Was '#C8B070'. This is now only an aggregate for the record and for the
    // Planet.tsx fallback: the textured ring shader carries per-ring LINEAR
    // tints internally (C ring near-neutral dark grey, B and A warm sand,
    // Cassini Division dark), because ring albedo genuinely varies from ~0.1
    // to ~0.55 across the system and one hex cannot express that.
    ringColor: '#DCCCA6',
    // Obliquity to orbit is 26.73 deg = 0.46653 rad; was 0.47 = 26.93 deg.
    // Tightened for the record — the 0.2 deg error was invisible.
    tilt: 0.4665,
    // ── Why Saturn's rings looked wrong, and the one number that fixes it ──
    //
    // The azimuth used to be unset, which meant 0: the axis leaned along world
    // X because that is what rotation=[tilt, 0, 0] does, not because anything
    // chose it. With Saturn at (25, -3, 20) and the Sun at the origin, that put
    // the ring-plane normal at (0, -0.893, -0.450), and the Sun 11.3 deg on ONE
    // side of the plane while every camera keyframe of the visit sat 47-61 deg
    // on the OTHER side. Checked at all four visit keyframes (scroll 0.696,
    // 0.706, 0.749, 0.7545 after the 2026-08-19 dwell-coverage retime; they
    // read 0.634/0.660/0.712/0.728 before it, which is what stood here until
    // 2026-08-27 — a retime moves only WHEN those vectors are reached, not the
    // vectors themselves, so the solve survived the drift but the receipt for
    // it pointed at rows that no longer existed).
    //
    // So the ring shader's `sameSide` test was false for the entire dwell and it
    // correctly drew the UNLIT face — where transmission inverts the system.
    // Through 11.3 deg the B ring's tau of 2.2 becomes 11 optical depths, so the
    // brightest, widest, most recognisable band in the solar system rendered
    // essentially black, while the C ring and the Cassini Division — the two
    // features that are supposed to read as gaps — transmitted ~66% and came out
    // the brightest thing on screen. Every photograph of Saturn anyone has ever
    // seen is the lit face. The physics was right; the staging was backwards.
    //
    // -1.03 rad (-59 deg) swings the plane so the Sun and the camera share a
    // side. It was solved for, not eyeballed, against two constraints:
    //   lit face      dot(sunDir, N) must match sign with dot(V, N) at all four
    //                 keyframes. Satisfied across azimuth 131-332 deg.
    //   choreography  the dwell has to keep opening wide on approach and closing
    //                 as it settles, which the camera path was built around.
    //                 That needs 301-332 deg, and the Sun sits highest above the
    //                 lit face at the 301 deg end of it.
    // Result: rings 68 deg open on approach, 36 deg on arrival, 21 deg at the
    // close station — and 21-36 deg is squarely the range Saturn actually shows
    // from Earth (max ~27 deg), which the old 61 deg never was. The Sun ends up
    // 13.8 deg above the lit face, so the B and A rings saturate bright, the C
    // ring sits at ~29%, and the Cassini Division reads as the dark gap it is.
    //
    // Camera keyframes are untouched, so every measured clearance in the table
    // below still holds — and in fact improves: closest approach to the ring
    // annulus goes from 1.14 units to 1.48. (Re-measured 2026-08-27; it read
    // 2.28 here. The same sampler reproduces the 1.14 baseline exactly at
    // azimuth 0, so 2.28 was a bad number rather than a different table. The
    // conclusion is unchanged — the swing still passes outside the annulus,
    // 1.48 units above a zero-thickness sheet whose outer edge is 2.72 out.)
    tiltAzimuth: -1.03,
    // CORRECT — do not "fix". Equatorial 60,268 km, polar 54,364 km, so
    // f = 0.09796. Saturn is the most oblate planet in the solar system and
    // this reads clearly even at small size.
    oblateness: 0.098,
    type: 'gas',
  },
  {
    name: 'uranus',
    position: [-12.0, 15.0, -38.0],
    radius: 0.8,
    // TRUE COLOUR, computed rather than taken from any published image: the
    // published band geometric albedos (Mallama, Krobusek & Pavlov 2017 —
    // U 0.502, B 0.561, V 0.488, Rc 0.264, Ic 0.089) integrated against the
    // CIE 1931 CMFs under a 5772 K solar illuminant and white-balanced to that
    // illuminant, which is correct because this scene's sun is white. Running
    // the same pipeline on Neptune's albedos returns a nearly identical hue,
    // reproducing the Irwin et al. 2024 (MNRAS 527, 11521) result that the two
    // ice giants are both a pale greenish-blue and far more similar than
    // popular imagery suggests.
    //   primary   was '#73D8E8' — HSV saturation 0.50 against a true ~0.11.
    //             Now the disc-centre nadir colour at mid-latitudes, whose
    //             Rec.709 luminance 0.609 matches (I/F)0 = p_V (2k+1)/2 = 0.610.
    //   secondary was '#5BC0C8'. Now the LIMB tone (the same colour at
    //             mu ~ 0.30), not a separate material.
    //   tertiary  was '#A0E8F0'. Now the north polar hood: ~15% brighter and
    //             LESS blue, because polar methane is depleted to 2-3% against
    //             4-5% at the equator, which lifts the red channel.
    // Uranus's real chroma is tiny — max-minus-min channel is 21/255 at true
    // colour. The "electric cyan Uranus" of stock art does not exist.
    colors: { primary: '#C1CFD8', secondary: '#939EA5', tertiary: '#D6DFE8' },
    // Was 0.004 against Neptune's 0.003 — backwards. Uranus's sidereal period
    // is 17h 14m 52.31s = 17.2478 h, SLOWER than Neptune's 16.11 h.
    // Earth-anchored: 0.0008 * 23.934 / 17.248. Deliberately NOT negated to
    // express retrograde rotation — the >90 deg tilt below already produces it
    // (the spin axis ends up 97.77 deg from the orbital normal), so a sign flip
    // would double-count and make it prograde again.
    rotationSpeed: 0.00111,
    noiseScale: 1.0,
    // Was true with atmosphereColor '#73D8E8'. Uranus has an enormous
    // atmosphere, but it IS the visible surface: optically semi-infinite, with
    // no bright ground beneath it and no thin shell to look through edge-on. So
    // unlike Earth there is no Rayleigh in-scattering halo and no bright rim.
    // Uranus limb-BRIGHTENS only inside the 0.73/0.79/0.89 um methane bands,
    // all outside human vision.
    hasAtmosphere: false,
    // Was 1.15 / 1.5 — nothing at all orbits at 1.15 R_eq, so the annulus
    // started almost touching the cloud tops and stopped before the real rings
    // begin. The main system runs from the zeta sheet's inner edge at
    // 37,850 km = 1.481 R_eq out to the epsilon ring at 51,149 km = 2.001 R_eq.
    // This matters more than it sounds, and it matters for a different reason
    // than it used to. The claim that stood here — "Uranus has no camera
    // keyframe of its own, so it is only ever seen from the overview hub" — was
    // written when nothing visited it and is now false twice over: the
    // offtheclock section maps here, and the camera holds a four-keyframe dwell
    // at 0.782-0.822 (approach, close, ring-plane crossing). So the annulus is
    // read at 3.2 units from the surface, not from 85 out at the hub, so the
    // annulus spans ~45 deg of frame rather than the ~2 deg it does there. The
    // geometry that made it worth widening still holds either way: the 97.8 deg
    // tilt puts the ring plane 63 deg open from the hub and ~50 deg open on
    // arrival, so the ring ellipse is the largest thing about this planet on
    // screen from anywhere in the journey.
    ringInnerRadius: 1.48,
    ringOuterRadius: 2.05,
    // Was '#3A4A50', a blue-grey. The Uranian rings are among the darkest
    // surfaces in the solar system — Bond albedo <= 2%, geometric albedo
    // <= 5-6% — and they are SLIGHTLY RED in the visible and neutral grey in
    // the near-IR (only the outermost mu ring is blue). This is 5% linear
    // albedo with that slight red tilt.
    ringColor: '#423F3C',
    // Obliquity to orbit 97.77 deg = 1.70622 rad; was 1.71 = 97.98 deg.
    tilt: 1.7062,
    // CORRECT — measured flattening is 0.0229 +/- 0.0008 (equatorial 25,559 km,
    // polar 24,968.5 km). Right, though invisible: ~0.3 px of squash here.
    oblateness: 0.023,
    type: 'ice',
  },
  {
    name: 'neptune',
    position: [8.0, -8.0, -52.0],
    radius: 0.75,
    // TRUE COLOUR, derived: Neptune's Johnson-Cousins geometric albedos
    // (Schmude et al. 2016 — U 0.575, B 0.562, V 0.442, Rc 0.225, Ic 0.072)
    // fitted with a monotone spectrum, integrated against the CIE 1931 CMFs
    // under a 5772 K solar illuminant and white-balanced to it. The
    // disc-integrated result has Rec.709 luminance 0.422, consistent with the
    // V-band geometric albedo of 0.442 — an independent check that the
    // integration is right.
    //   primary   was '#2040B0'. The render was putting roughly #618FE9 on
    //             screen (hue 220 deg, HSL saturation 0.76) where true colour
    //             is hue 195 deg at saturation 0.49: the hue was ~25 deg too
    //             far toward violet and the saturation ~55% too high. This is
    //             the textbook Neptune mistake, and the source of it is that
    //             essentially every Neptune image in circulation descends from
    //             the Voyager 2 composite that was contrast-stretched to reveal
    //             cloud structure. Now the disc-centre nadir colour.
    //   secondary was '#152870', which encoded the assumption that Neptune's
    //             dark features are a DEEPER blue. They are not: Irwin et al.
    //             2023 (VLT/MUSE) show the South Polar Wave and the dark spots
    //             darken only at lambda < 650 nm, so real dark features are
    //             darker AND slightly LESS blue than the disc.
    //   tertiary  was '#5070E0', making Neptune's bright features blue. The
    //             bright discrete methane-ice clouds sit at 0.1-0.6 bar, above
    //             most of the absorbing methane column, so they are near-white.
    colors: { primary: '#88C2D6', secondary: '#7FB0C2', tertiary: '#C9DEE4' },
    // Was 0.003, SLOWER than Uranus's 0.004 — inverted. Neptune's sidereal
    // period is 16.11 h against Uranus's 17.2478 h, so Neptune must be the
    // faster of the two. Earth-anchored: 0.0008 * 23.934 / 16.11.
    rotationSpeed: 0.00119,
    noiseScale: 1.2,
    hasAtmosphere: true,
    // Was '#3454D1'. Neptune's limb halo is faint haze, not a cobalt corona.
    atmosphereColor: '#A8CFDE',
    // Obliquity to orbit 28.32 deg = 0.4943 rad — very close to Earth's 23.44,
    // so the pose should look familiar rather than exotic. Was ABSENT, so
    // Neptune rendered bolt upright while Saturn and Uranus both had theirs.
    // The rotation axis is directly visible during the two Neptune
    // close-approach keyframes (scroll 0.906 and 0.919 since the 2026-08-19
    // coverage retime; they were 0.87 and 0.90 when this was written).
    tilt: 0.4943,
    // CORRECT — flattening 0.0171 +/- 0.0013 from equatorial 24,764 km and
    // polar 24,341 km. The one physical parameter Neptune already had right.
    oblateness: 0.017,
    // NO RINGS, deliberately. Neptune has five (Galle, Le Verrier, Lassell,
    // Arago, Adams), but their normal optical depths are 0.011 for Adams,
    // 0.0062 for Le Verrier and ~1e-4 for Galle and Lassell — two to three
    // orders of magnitude below Saturn's B ring. Rendered honestly they would
    // barely register at this scale, and rendering them dishonestly to match
    // Uranus would be the larger error.
    type: 'ice',
  },
];

// ── Section Scroll Ranges ──
// A HAND-MAINTAINED MIRROR OF REAL DOM SCROLL OFFSETS — measured, not styled.
// THIS TILES [0, 1] WITH NO GAPS AND NO OVERLAP, and it has to: Effects.tsx
// takes Object.values(...) and derives a mid-point per window, so a hole here
// is a stretch of scroll that belongs to no section.
//
// The key type is Record<SectionId | 'overview' | 'recap', …>, so the ten keys
// below cannot drift from sectionIds — a renamed section fails to compile here
// rather than silently leaving a window nothing reads.
//
// MEASURED SNAPSHOT — 2026-08-14, viewport 1664×1306 (nominal desktop, md+),
// document scrollHeight 16,425px, scrollable = 16,425 − 1306 = 15,119px.
// progress = scrollTop / scrollable (see useScrollProgress). Section tops, px:
//   overview 0      memories 1306   footprints 2612  about 3396  builder 4702
//   finance 6634    creator 10706   offtheclock 12012  contact 13766  recap 15120
// Each boundary below is the half-viewport crossing of the DOM seam between
// two adjacent sections — (topOfNext − vh/2) / scrollable — i.e. the scroll at
// which the incoming section owns the majority of the frame. That definition
// tiles [0, 1] by construction and puts every section's centred moment
// ((top + height/2 − vh/2) / scrollable) strictly inside its own window.
// Centred moments at this snapshot: memories .086, footprints .156, about .225,
// builder .332, finance .530 (a 4072px split-stage giant: settled .439, bottom
// .622), creator .708, offtheclock .809, contact .912.
// (builder read .330 until 2026-08-27 — an arithmetic slip in the original
// transcription, not a different measurement: (4702 + 1932/2 − 653)/15119 =
// 0.33170. It was the one number here outside 3-decimal rounding of its own
// stated formula, and progressWarp.ts had hand-copied it, which put a 0.0017
// kink in a warp that is supposed to be the identity on this viewport.)
//
// The numbers are viewport-dependent (taller viewports shrink the early
// windows), so this mirror is a NOMINAL-DESKTOP snapshot, as it always was.
// Since 2026-08-19 the canvas warps LIVE scroll progress onto this nominal
// axis at runtime (src/lib/progressWarp.ts — its anchors quote the centred/
// settled moments above), so the snapshot is the DEFINITION of the nominal
// axis the camera itinerary is timed on, rather than an assumption about the
// visitor's viewport.
// RE-MEASURING with the snippet above (never nudging by eye) is required only
// when INTENTIONALLY REDEFINING the nominal axis itself — scoped 2026-08-21:
// since the warp landed, routine section-height changes are absorbed at
// runtime by progressWarp and do not invalidate this snapshot. The cautionary
// tale stands for the redefinition case: pre-warp, the redesign drifted
// finance by a full 0.06+ of progress and parked the camera between planets
// while sections sat centred on screen. Every window still contains its
// planet's dwell keyframes (see cameraKeyframes), which is the invariant that
// makes the two tables one system rather than two.
export const sectionRanges: Record<
  SectionId | 'overview' | 'recap',
  readonly [number, number]
> = {
  overview:    [0.000, 0.043],
  memories:    [0.043, 0.130],
  footprints:  [0.130, 0.181],
  about:       [0.181, 0.268],
  builder:     [0.268, 0.396],
  finance:     [0.396, 0.665],
  creator:     [0.665, 0.751],
  offtheclock: [0.751, 0.867],
  contact:     [0.867, 0.957],
  recap:       [0.957, 1.000],
} as const;

// ── Camera Keyframes — 3D Solar System Flythrough ──
// [scrollProgress, [camX, camY, camZ], [lookAtX, lookAtY, lookAtZ]]
//
// This table is DOWNSTREAM of sectionPlanet above: it lands the camera at the
// planet each section maps to, inside that section's window in sectionRanges.
// Planet positions are read from planetConfigs and never edited to suit a shot.
//
// HOW IT IS SAMPLED, because it changes what the numbers mean. cameraPath.ts
// feeds both columns to a centripetal Catmull-Rom (lib/cameraPath.ts) and maps
// each scroll interval onto exactly one spline segment, so every keyframe is hit
// precisely at its scroll value — but the CURVE BETWEEN two keyframes bows
// outside the straight chord between them, by more than you would guess where
// the segments on either side differ in length. So every clearance below was
// measured on the sampled curve, not on the chords. An earlier table went 0.21
// units INSIDE Earth at 0.783 and 0.12 inside Saturn at 0.615, i.e. the camera
// flew through two planets — spline overshoot that the chords hid and nobody had
// sampled for. That failure is silent by construction: a camera inside a planet
// renders as a full-screen texture and throws nothing.
//
// CLEARANCES, measured on the sampled curve at 400k samples. The 2026-08-14 DOM
// re-measure retimed ONLY the scroll column (see the RETIME note below), which
// cannot move the curve in space — scrollToSplineT maps scroll interval i onto
// spline segment i and the spline is built from the position points alone.
// The 2026-08-19 DWELL-DISTANCE RETUNE (below) then moved eight dwell
// positions outward, so these were re-measured. Minimum distance from the
// camera to each planet's SURFACE:
//   venus   1.438 @ 0.272      earth   1.671 @ 0.152
//   mercury 1.163 @ 0.343      jupiter 4.100 @ 0.474
//   neptune 2.112 @ 0.905      uranus  3.173 @ 0.854
//   saturn  1.297 @ 0.730      mars   13.447 @ 0.393
// plus 6.63 to the Sun's centre (corona shell 2.2), 1.48 to Saturn's ring
// annulus and 2.57 to Uranus's.
// SCROLL STAMPS RE-READ 2026-08-27. Every DISTANCE above is unchanged to three
// decimals — the path in space is exactly what it was — but the stamps were
// still the ones from before the dwell-COVERAGE retime lower down, which moved
// the whole column by up to 0.055. Re-measuring a clearance means sampling the
// curve, so a stale stamp costs nothing at runtime; it costs the next person
// half an hour looking for a minimum that is no longer where it says. Two
// distances did move and are corrected: Mars 13.389 → 13.447 (it is scenery
// 13 units off the Mercury → Jupiter run, so the change is immaterial) and
// Saturn's ring annulus 2.28 → 1.48 — see the ring note in planetConfigs.
//
// DWELL-DISTANCE RETUNE 2026-08-19 — the "planet under the text" fix. Measured
// with a full frustum model (projection + stage shift + proximity fov) at
// 1280×800 and 970×900: Venus subtended 70% of frame height at about's centred
// moment (clipping off the right edge), Jupiter 85–95% through finance
// (overlapping the text column by 20% of frame width), Neptune 62% behind
// contact's centred copy. Eight dwell POSITIONS moved back along their
// existing bearings — every lookAt, every scroll stamp, and every departure
// direction kept, so pans and the Saturn ring solve (spline deviation over
// 0.634–0.754: zero) are untouched. Discs now hold ~30–52% of frame height at
// each section's settled/centred moments and no disc edge enters a text
// column at either test viewport.
//
// THE GRAMMAR, repeated once per hop. The complaint this rewrite answers was
// disorientation: planets appeared and vanished with no travel in between,
// because a hop was one segment that translated up to 66 units AND swung the aim
// 150° at the same time. Each hop is now five to eight keyframes:
//   dwell    2-3 keyframes 1.4-4.6 units off the planet, look = planet. Distance
//            is scaled to radius, so every planet subtends 20-50°.
//   back off camera retreats along the departure heading while STILL looking at
//            the planet — it shrinks in frame instead of being cut away from.
//   pan      one keyframe whose lookAt is the half-way point of the turn, taken
//            as a slerp between (camera→planet we are leaving) and (camera→planet
//            we are heading for), placed 14-28 units out. This is the pan the
//            rewrite exists for, and splitting the turn over two segments is what
//            halves its rate: 85° per 0.01 of scroll now, against 146° before.
//   transit  1-3 keyframes along an ARC, look = destination, so the destination
//            is centred in frame well before arrival rather than appearing at it.
//            Arc and not chord for a physical reason: Venus→Mercury and
//            Jupiter→Saturn pass 0.4 and 3.3 units from the Sun's CENTRE as
//            straight lines — through the corona and nearly through the star —
//            so both climb over it instead. Closest approach to the Sun is now
//            6.6 units against the old table's 3.0, outside the 2.2-unit corona
//            shell by a factor of three.
// Net effect: 416 units of camera travel over 52 keyframes (417 over 49 before
// the 2026-08-19 dive re-split turned one row into four; 438 over 52 rows that
// still included Mars, 469 before the rewrite that introduced this grammar), so
// peak transit speed stays at ~1184 units per unit of scroll and no hop reads as
// a cut. (Counted 2026-08-27: cumArcAt(1) = 416.3 over 52 rows. The old line
// read "417 over 49" against a table that had had 52 rows since the re-split,
// which made the parenthetical's "52 with Mars" read as the current count.)
//
// RETIMED 2026-08-14 against the measured sectionRanges above — a
// re-parameterization, NOT a re-composition. Every position and lookAt vector
// is byte-identical to the previous table; only the scroll column moved, which
// leaves the spatial path, every clearance, and the Saturn ring solve exactly
// as they were. Each planet's dwell now sits inside its section's MEASURED
// window and covers the section's settled-to-centre stretch, with pans and
// transits in the seams between sections. If sectionRanges is ever re-measured
// again, retime this column the same way: dwell stations bracket the section's
// settled and centred progress, transitions keep their old per-segment speeds.
//
// RETIMED AGAIN 2026-08-19 — the dwell-COVERAGE retime, same rules (scroll
// column only, 41 stamps; positions/lookAts byte-identical, dive group
// 0.040–0.0565 and both recap rows untouched). The goal: while text is on one
// side of the screen, the planet should stay parked beside it longer. Measured
// against the nominal reading windows (settled → next section's enter), the
// mean parked-beside-the-text fraction was 47.5% — the Jupiter→Saturn hop ran
// entirely inside finance's reading window, and two seams (finance→creator,
// offtheclock→contact) held no transit at all while their transits ran over
// legible text. Now every dwell's first station lands ~0.002–0.004 before its
// section settles and its last planet-aimed row sits at the NEXT section's
// enter, with each back-off/pan/transit group scaled into its seam (uniform
// scaling except Jupiter→Saturn and Saturn→Uranus, reshaped ±10% to hold the
// ~2000 u/scroll speed cap at the arc apex). Mean coverage after: 93%, every
// reading window free of pans (aim velocity < 20°/0.01 throughout). Contact
// caps at ~49%: the 88-unit recap pull-out needs more scroll than the recap
// window holds, so the pull-away must begin inside contact's tail — moving it
// later needs a new intermediate recap POSITION, which a retime excludes.
//
// LOCKED, do not retune: keyframe 0 ([6, 38, 42] looking at the Sun) is what
// CameraController's first-load intro is built on — it imports getCameraState(0)
// and starts the flight 3× further out along that same ray, so editing this row
// silently moves a 171-unit intro nobody would think to re-derive — and the
// 0.982/1.000 recap pair mirrors the overview for the farewell.
//
// THE SCROLL COLUMN MUST STAY STRICTLY ASCENDING AND GAPLESS. cameraPath.ts's
// scrollToSplineT walks the rows looking for the interval containing `scroll`
// and ends `return scroll >= 1 ? 1 : 0` — so a scroll value that falls in no
// interval does not clamp or interpolate, it SNAPS THE CAMERA TO THE OVERVIEW
// mid-journey. Equal neighbours divide by zero and produce NaN. The first row
// must be 0.000 and the last 1.000 for the same reason.
//
// SATURN'S DWELL IS LOAD-BEARING, and not for a reason visible in this table.
// Its ringTiltAzimuth was solved against the POSITIONS and lookAts of its four
// visit keyframes (see the long note in planetConfigs), and the ring shader's
// `sameSide` test flips if that geometry moves — the B ring would render
// black. What the solve is indifferent to is the scroll column: retiming WHEN
// a station is reached (as the 2026-08 DOM re-measure did) keeps every vector
// intact, so the lit-face test still passes at all four stations. What is NOT
// safe is editing any position/lookAt in or near the Saturn block, or adding/
// removing rows there — Catmull-Rom is local (a segment reads only its two
// neighbours on each side), so spatial edits must stay well away from the
// Saturn visit or the azimuth must be re-solved.
export const cameraKeyframes: [number, [number, number, number], [number, number, number]][] = [
  // ═══ Overview hub — angled 3/4 view, Sun at frame center ═══
  // LookAt is the Sun (origin) so it anchors the composition. Each orbit is
  // a real 3D circle around the Sun, projected as a slightly-skewed ellipse.
  [0.000, [6.0, 38.0, 42.0], [0.0, 0.0, 0.0]],
  [0.030, [10.0, 36.0, 40.0], [0.0, 0.0, 0.0]],
  // The old table dropped from the hub straight onto Earth in one 38-unit
  // segment still aiming at the Sun. This splits the dive and starts the aim
  // half-way onto Earth, so the globe is already growing in frame on the way in.
  //
  // Re-split 2026-08-19: the single 0.046 row (aim [1.5, 3, 7], i.e. still
  // mid-swing) finished BOTH the aim swing and the deceleration in the last
  // 0.003 of the dive, 2.5 units from Earth — a measured 55°/0.01-scroll whip
  // with Earth lurching 0.15 frame-widths per 0.01 as it snapped to centre;
  // the single most violent event on the whole journey, right at the first
  // thing a visitor scrolls into. These four rows land the aim on Earth by
  // 0.046 while still 26 units out, then bend the approach (quadratic arc)
  // so the final leg arrives ALONG the Earth radial: the perpendicular
  // velocity that whipped the aim is shed at distance 6–10 instead of 2.5.
  // Measured after: 28.5°/0.01 peak, Earth lurch 0.027 frame/0.01. Chord
  // speeds 1166→1383→1571→1279→844 — single-hump, still one dive.
  [0.040, [9.85, 27.2, 32.35], [2.4, 4.8, 11.2]],
  [0.046, [8.5, 21.0, 27.0], [3.0, 6.0, 14.0]],
  [0.0525, [6.5, 13.3, 20.6], [3.0, 6.0, 14.0]],
  [0.0565, [5.25, 9.55, 17.35], [3.0, 6.0, 14.0]],

  // ═══ Earth — memories [0.043, 0.130] + footprints [0.130, 0.181] ═══
  // ONE visit spanning both sections, which is the whole point of the
  // re-sequence: no departure and no re-approach in the middle of it. The city
  // labels in EarthGlobe are gated on exactly this visit (0.060–0.190).
  // Arrival at 0.060 keeps the dive at its composed ~1300 units/scroll and
  // still parks the camera well before memories centres at 0.086.
  [0.060, [4.2, 7.5, 15.5], [3.0, 6.0, 14.0]],
  [0.086, [5.1, 6.6, 15.8], [3.0, 6.0, 14.0]],   // slow orbit — memories centred here
  [0.130, [3.6, 5.1, 16.3], [3.0, 6.0, 14.0]],   // footprints opens — same shot continues
  [0.164, [1.2, 5.6, 15.6], [3.0, 6.0, 14.0]],   // night side — holds through footprints' centred moment (0.156)
  [0.190, [-1.6, 5.0, 13.2], [3.0, 6.0, 14.0]],  // backing off, Earth still framed
  [0.2035, [-4.6, 4.0, 10.2], [5.8, -8.0, 8.8]],  // pan: Earth leaves frame, Venus enters
  [0.212, [-6.0, 1.2, 8.4], [-8.0, -2.5, 6.0]],  // transit

  // ═══ Venus — about [0.181, 0.268], centred at 0.225 ═══
  // Both stations pushed back 2026-08-19 (1.97→2.40, 1.80→2.55 from centre):
  // the close station had Venus at 70% of frame height, clipped off the right
  // edge and grazing the left text column. Now ~47–50% and wholly in its half.
  [0.2205, [-6.54, -1.28, 7.46], [-8.0, -2.5, 6.0]],
  [0.266, [-6.87, -2.22, 8.27], [-8.0, -2.5, 6.0]], // close — disc ~50% of frame
  [0.278, [-6.0, 0.6, 5.0], [-8.0, -2.5, 6.0]],  // backing off
  [0.288, [-3.0, 7.2, 3.6], [-1.1, -8.3, 0.0]],  // pan, climbing above the ecliptic
  // Venus and Mercury sit on opposite sides of the Sun: the straight line
  // between them passes 0.4 units from its centre, i.e. through the star. These
  // two carry the camera over the top instead, 8.6 and 9.3 units out.
  [0.2962, [-1.0, 8.5, 3.4], [5.5, 2.0, -3.5]],   // apex, Sun below frame
  [0.303, [4.4, 6.4, 0.4], [5.5, 2.0, -3.5]],    // descending onto Mercury

  // ═══ Mercury — builder [0.268, 0.396], settles 0.311, centred 0.332 ═══
  // Both stations are held ~75° and ~110° off the Sun line. Directly anti-solar
  // (which is where a naive offset toward the outer system lands) would
  // silhouette Mercury against the corona 7.5 units behind it — a black disc in
  // a bloom flare. These two rows are inherited from the old Projects visit,
  // position unchanged (scroll retimed with the rest of the column); builder
  // simply owns them now. The two stations bracket builder's settled point and
  // the close one holds past its centred moment.
  // Nudged 2026-08-19 with the dwell retune: station one closes slightly
  // (30% of frame height on arrival), the close station backs off 1.46→1.60
  // so the in-window peak drops 45.6%→41.7% and min surface clearance rises
  // to 1.163. Bearings kept — still ~79° and ~113° off the Sun line.
  [0.307, [5.11, 3.46, -2.62], [5.5, 2.0, -3.5]],
  [0.390, [6.38, 3.10, -2.73], [5.5, 2.0, -3.5]], // close, terminator across the disc
  // ── Mercury → Jupiter, the one stretch the Mars cut rewrites ──
  // The three Mars stations are gone; the five departure/transit rows that
  // flanked them are retimed and re-aimed into a single 22.2-unit arc — the
  // longest continuous stretch of the journey with no planet close to frame.
  // Builder's window (0.268–0.396) holds all but the last three of these rows,
  // so the departure reads as part of the section rather than as an
  // interruption of the next one.
  //
  // The departure climbs before it turns. Jupiter lies almost exactly through
  // Mercury from the close station, so heading straight for it would skim the
  // disc; +1.0 in y at the back-off carries the camera over the pole instead
  // and holds 1.07 units of clearance, against 1.13 in the table this replaces.
  // No arc-over-the-Sun is needed here — unlike Venus→Mercury and
  // Jupiter→Saturn, these two are 94° apart as seen from the Sun, and the
  // straight run already clears its centre by 7.4 units.
  //
  // Speed ramps monotonically across the hop — 144, 191, 254, 317, 383, 415
  // units per unit of scroll — and hands off to the 606 of the final Jupiter
  // approach. That acceleration IS the turn-around: the camera stops going in
  // at Mercury and falls outward from there, and this is the one place in the
  // journey where you can feel it happen over a whole section.
  [0.403, [5.0, 4.0, -4.8], [5.5, 2.0, -3.5]],    // back off, over Mercury's pole
  [0.4106, [2.6, 5.0, -7.6], [-6.3, -10.2, -4.1]], // pan: halfway slerp, 18 units out
  [0.4178, [-0.6, 5.2, -11.2], [-18.0, 4.0, -22.0]], // transit
  [0.4242, [-4.2, 5.0, -15.2], [-18.0, 4.0, -22.0]],
  [0.4272, [-6.3, 4.7, -17.4], [-18.0, 4.0, -22.0]],
  [0.4295, [-8.0, 4.4, -19.2], [-18.0, 4.0, -22.0]],

  // ═══ Jupiter — finance [0.396, 0.665], settles 0.439, centred 0.530 ═══
  // Finance is the 4072px split-stage giant — 27% of the whole page — so the
  // dwell is the longest park in the journey: arrival lands just before the
  // section settles and the close station holds until past its centred moment
  // (1.3 units of drift across 0.099 of scroll ≈ 13 units/scroll).
  // Pushed back 2026-08-19 (3.45→5.60, 3.45→5.80 from centre): Jupiter is the
  // r=1.4 giant, and at 3.45 it filled 85–95% of the frame for the whole
  // finance dwell, running 20% of frame width INTO the left text column at the
  // settled moment. At ~5.7 the disc holds ~50% and its edge stays out of the
  // text at both test viewports; min surface clearance rises 1.856→4.100.
  [0.4348, [-15.40, 6.60, -17.78], [-18.0, 4.0, -22.0]],
  [0.535, [-16.99, 8.04, -17.96], [-18.0, 4.0, -22.0]], // close, over the north belt
  [0.6649, [-15.4, 8.0, -16.4], [-18.0, 4.0, -22.0]], // backing off
  [0.6711, [-10.4, 10.4, -10.6], [-3.2, -12.1, -14.6]], // pan onto Saturn
  // 60.5 units, the hop that used to be a single segment at 1210 units/scroll.
  // Jupiter and Saturn are on opposite sides of the Sun too (the chord passes
  // 3.3 units from its centre), so the arc climbs to y≈13 and crosses high above
  // the inner system — which also makes it the one shot that shows the whole
  // system from outside, mid-journey. Segment lengths rise then fall, so the
  // camera accelerates out of Jupiter and decelerates into Saturn.
  [0.6801, [-1.8, 13.0, -1.2], [25.0, -3.0, 20.0]],
  [0.6885, [10.2, 13.0, 9.4], [25.0, -3.0, 20.0]],
  [0.696, [20.0, 8.1, 18.1], [25.0, -3.0, 20.0]],

  // ═══ Saturn — creator [0.665, 0.751], settles = centres at 0.708 ═══
  // DO NOT MOVE ANY POSITION OR LOOKAT IN THIS BLOCK. ringTiltAzimuth was
  // solved against these four camera vectors; move them and the B ring goes
  // black. The scroll column alone is safe to retime (it cannot move the curve
  // in space) and was, when sectionRanges was re-measured — the dwell now
  // brackets creator's settled point at 0.708 instead of ending 0.06 before
  // the section ever centred.
  // Arrival is 62° above the ring plane and the second station 8°, so the rings
  // close from wide open to a near-edge-on line across the dwell. Both stations
  // sit 4.6 units out rather than the old 3.0: the swing between them passes
  // over the pole, and at 3.0 that pass clipped the rings.
  [0.706, [26.8, 0.0, 23.0], [25.0, -3.0, 20.0]],
  [0.749, [24.4, -0.4, 16.2], [25.0, -3.0, 20.0]],
  [0.7545, [20.0, 2.5, 12.0], [25.0, -3.0, 20.0]],   // backing off
  [0.7628, [15.5, 7.0, 6.0], [12.5, -19.3, -3.3]],   // pan onto Uranus
  // 71 units — the longest hop in the journey, and to a planet the old table
  // never visited at all. Three transit keyframes, arcing above every orbit.
  [0.7702, [8.0, 12.5, -2.0], [-12.0, 15.0, -38.0]],
  [0.7789, [0.0, 16.0, -15.0], [-12.0, 15.0, -38.0]],
  [0.7884, [-7.0, 17.0, -30.0], [-12.0, 15.0, -38.0]],

  // ═══ Uranus — offtheclock [0.751, 0.867], settles 0.795, centred 0.809 ═══
  // Its 97.8° tilt puts the pole nearly along +z, so approaching from +z looks
  // straight down the ring plane: rings ~50° open on arrival, 37° on the close.
  [0.7926, [-9.4, 16.4, -34.6], [-12.0, 15.0, -38.0]],
  [0.850, [-8.8, 14.6, -35.6], [-12.0, 15.0, -38.0]],
  // Leaving for Neptune has to cross the ring plane. It crosses at 5 units of
  // in-plane radius, three times the 1.64 outer edge, so it passes outside the
  // annulus rather than through the sheet.
  [0.8673, [-8.0, 12.0, -38.5], [-12.0, 15.0, -38.0]],
  [0.8779, [-6.5, 9.5, -41.5], [-23.4, -4.4, -43.8]], // pan onto Neptune
  [0.8919, [1.0, 3.5, -45.5], [8.0, -8.0, -52.0]],    // transit, out past the last orbit

  // ═══ Neptune — contact [0.867, 0.957], settles 0.911, centred 0.912 ═══
  // Three stations: arrival, close approach, then a slow drift across the
  // terminator before the pull-back.
  [0.906, [9.5, -6.5, -50.0], [8.0, -8.0, -52.0]],
  // Two stations pushed back 2026-08-19 (2.06→3.60, 3.05→3.50 from centre):
  // contact's copy is centred with no stage shift by design, and at 2.06
  // Neptune filled 62% of the frame directly behind it. ~45% reads as a
  // backdrop instead of a collision; min surface clearance 1.162→2.112.
  [0.919, [9.75, -6.25, -49.38], [8.0, -8.0, -52.0]],
  [0.9305, [6.85, -6.17, -49.25], [8.0, -8.0, -52.0]],
  [0.942, [18.0, 5.0, -42.0], [8.0, -8.0, -52.0]],   // pull back into the void

  // ═══ Recap — [0.957, 1.000] — mirror the overview's 3/4 view, Sun centered ═══
  [0.982, [-8.0, 36.0, 36.0], [0.0, 0.0, 0.0]],
  [1.000, [-12.0, 42.0, 40.0], [0.0, 0.0, 0.0]],
];

// ── Performance Tiers ──
export const performanceTiers = {
  high: {
    particleCount: 5000,
    dpr: [1, 2] as [number, number],
    enableBloom: true,
  },
  medium: {
    particleCount: 3000,
    dpr: [1, 1.5] as [number, number],
    enableBloom: true,
  },
  low: {
    particleCount: 1500,
    dpr: [1, 1] as [number, number],
    enableBloom: false,
  },
} as const;
