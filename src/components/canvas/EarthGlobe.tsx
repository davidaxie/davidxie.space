'use client';

import { useRef, useMemo } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { CityLabel } from './CityLabel';
import { cities } from '@/data/cities';
import { useFootprintsStore } from '@/stores/footprintsStore';
import { latLngToVector3 } from '@/lib/geoUtils';
import { cameraKeyframes, sectionRanges, type PlanetConfig } from '@/lib/constants';
import { useLenis } from '@/components/providers/SmoothScroll';
import { jumpScrollBehavior } from '@/components/providers/reducedMotion';

// Cloud layer vertex shader
const cloudVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vUv = uv;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Cloud layer fragment shader — real NASA cloud data.
//
// This previously generated clouds from 5-octave hash fbm. Procedural noise is
// isotropic: it has no ITCZ band, no cyclonic spirals, no trade-wind streets,
// no clear subtropical highs — the structures that make a photo of Earth read
// as Earth. Sampling MODIS cloud fraction instead (cloud_combined, NASA Visible
// Earth) puts the real weather back, so the drift below is the ONLY synthetic
// part left, and it is a slow uv scroll rather than invented cloud shapes.
const cloudFragmentShader = /* glsl */ `
  uniform sampler2D uCloudMap;
  uniform float uTime;
  uniform vec3 uSunPosition;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    // Slow eastward drift. The map wraps in x, so fract() keeps the sample in
    // range without a visible seam.
    vec2 uv = vec2(fract(vUv.x + uTime * 0.0016), vUv.y);

    // The asset is a greyscale cloud-fraction map: luminance IS the density,
    // so it is read as data, not colour (see NoColorSpace on the loader).
    float density = texture2D(uCloudMap, uv).r;

    // Gentle floor/ceiling. NASA's composite is a monthly mean, so faint haze
    // covers most of the globe; lifting the floor stops that reading as a
    // uniform grey veil while keeping real thin cirrus visible.
    float cover = smoothstep(0.12, 0.78, density);

    vec3 sunDir = normalize(uSunPosition - vWorldPosition);
    float NdotL = dot(vWorldNormal, sunDir);

    // Clouds sit ~12km up, so they catch light slightly before the ground does
    // and hold it slightly after — the terminator is offset a touch sunward of
    // the surface one below, which is why dawn cloud tops glow over dark ground.
    float dayMask = smoothstep(-0.14, 0.22, NdotL);

    // Forward scattering: thin cloud edges facing the sun go bright and warm.
    float towardSun = pow(clamp(NdotL, 0.0, 1.0), 0.6);
    vec3 lit  = mix(vec3(0.82, 0.85, 0.90), vec3(1.0, 0.99, 0.96), towardSun);

    // Sunrise/sunset reddening right at the terminator.
    float grazing = 1.0 - smoothstep(0.0, 0.35, abs(NdotL));
    lit = mix(lit, vec3(1.0, 0.80, 0.62), grazing * 0.45);

    vec3 cloudColor = lit * dayMask;
    float alpha = cover * 0.90 * dayMask;

    gl_FragColor = vec4(cloudColor, alpha);
  }
`;

// Earth surface shader — day/night blending with sun direction
const earthVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const earthFragmentShader = /* glsl */ `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform sampler2D uCloudMap;
  uniform float uTime;
  uniform vec3 uSunPosition;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;

  void main() {
    vec3 sunDir = normalize(uSunPosition - vWorldPosition);
    float NdotL = dot(vWorldNormal, sunDir);

    // Both maps are sRGB-encoded photographs and are tagged SRGBColorSpace on
    // the loader, so three.js decodes them to linear before we get here. That
    // matters: sampling them as raw linear data (the old default) crushes the
    // midtones and is why the render needed a saturation boost to look right.
    vec3 dayColor   = texture2D(uDayMap, vUv).rgb;
    vec3 nightColor = texture2D(uNightMap, vUv).rgb;

    // NO COLOUR GRADING. Blue Marble Next Generation is a calibrated true-colour
    // product — it already is what Earth looks like. The previous 1.18x
    // saturation and 1.08x contrast push made the oceans tropical-postcard cyan
    // and the vegetation electric, which is precisely the inaccuracy this
    // shader exists to avoid. Earth is more muted than people expect.

    // ── Cloud shadows ──
    // Sample the same cloud map the layer above uses, offset along the sun
    // direction in uv space so shadows fall away from the sun rather than
    // sitting directly under the cloud. Without this the cloud layer floats
    // and the globe reads as two unrelated spheres.
    vec2 shadowUv = vec2(fract(vUv.x + uTime * 0.0016 - 0.004), vUv.y - 0.002);
    float shadow = smoothstep(0.12, 0.78, texture2D(uCloudMap, shadowUv).r);
    dayColor *= 1.0 - shadow * 0.35;

    // Soft terminator
    float terminator = smoothstep(-0.08, 0.2, NdotL);

    // City lights read through gaps in the cloud deck, not through the deck.
    float nightVis = 1.0 - shadow * 0.75;
    vec3 col = mix(nightColor * 0.35 * nightVis, dayColor * terminator, terminator);

    // ── Atmospheric in-scattering ──
    // Calibrated against a DSCOVR/EPIC full-disk photograph. Earth does NOT
    // limb-darken the way an airless body does: in a real photo the disk gets
    // *brighter* and hazier toward the edge, because near the limb you are
    // looking through a far longer column of atmosphere and Rayleigh
    // in-scattering adds light rather than removing it. The previous
    // pow(NdotV, 0.35) darkening was a rocky-planet model applied to a planet
    // with air, which is why the render read as a dim marble.
    float NdotV = max(dot(vWorldNormal, vViewDir), 0.0);

    // Airmass: ~1 at the sub-observer point, rising steeply at the limb.
    float airmass = 1.0 / max(NdotV, 0.08);

    // Rayleigh is ~1/lambda^4, so blue scatters ~5.5x more than red. These
    // weights are that ratio normalised, and they are the whole reason the
    // haze is blue and the thin limb ring is blue-white rather than grey.
    vec3 rayleigh = vec3(0.27, 0.51, 1.00);

    // Veil across the whole lit disk, strengthening toward the limb.
    float dayLit = smoothstep(-0.05, 0.35, NdotL);
    float haze = clamp((airmass - 1.0) * 0.16, 0.0, 0.55) * dayLit;
    col = mix(col, rayleigh * 1.05, haze * 0.55);

    // Tiny residual darkening so the centre of the disk still reads as a
    // sphere rather than a flat cutout — much gentler than before.
    col *= pow(NdotV, 0.10) * 0.12 + 0.88;

    // Bright scattering ring hugging the very edge, visible in the photo as a
    // pale blue-white rim that survives slightly past the terminator.
    float rim = pow(1.0 - NdotV, 4.0) * smoothstep(-0.25, 0.25, NdotL);
    col += rayleigh * rim * 0.55;

    // ── Ocean specular glint ──
    // The old mask was step(b, g+0.05) * step(r, 0.3): it keyed on "not very
    // red", so it also caught dark forest, shadowed terrain and open ice, and
    // it missed sun-glinted water entirely because glint is bright in red too.
    // Water is the only surface here where blue clearly dominates BOTH other
    // channels, so key on that margin instead and let it ramp rather than snap.
    float blueDominance = dayColor.b - max(dayColor.r, dayColor.g);
    float oceanMask = smoothstep(0.02, 0.10, blueDominance);
    float spec = pow(max(dot(reflect(-sunDir, vWorldNormal), vViewDir), 0.0), 90.0);
    // Clouds occlude the glint too.
    col += vec3(1.0, 0.97, 0.88) * spec * oceanMask * 0.32 * terminator * (1.0 - shadow);

    gl_FragColor = vec4(col, 1.0);
  }
`;

interface EarthGlobeProps {
  config: PlanetConfig;
  /**
   * WARPED progress — live progress mapped onto the nominal camera axis (see
   * lib/progressWarp.ts). The city-label window below is timed against the
   * camera ITINERARY (arrival keyframe 0.060, last Earth-aimed row 0.190, then
   * the Venus pan at 0.2035), not against the document, so it must ride the
   * same axis the camera does — on the raw axis a non-nominal viewport lit the
   * labels while the camera was still mid-dive, or cut them while Earth was
   * still framed.
   */
  cameraProgressRef: React.RefObject<number>;
  /** Calm-on-read factor, 1 while scrolling and 0 once still. See CosmicScene. */
  motionRef: React.RefObject<number>;
}

export function EarthGlobe({ config, cameraProgressRef, motionRef }: EarthGlobeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const labelsRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const showLabelsRef = useRef(false);
  const activeCity = useFootprintsStore((s) => s.activeCity);
  const lenis = useLenis();

  // Earth represents the "memories" section. Clicking the planet jumps there
  // (city dots have their own click handlers and stop propagation).
  const targetSection = 'memories';

  const handlePlanetClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (lenis) {
      lenis.scrollTo(`#${targetSection}`, { offset: 0 });
    } else {
      // Not a fallback branch for reduced-motion visitors — it is their ONLY
      // branch. SmoothScroll.tsx refuses to construct Lenis on that preference,
      // so `lenis` is null and every jump lands here. Hardcoding 'smooth' meant
      // a click animated the viewport across up to ~12,000px, and the
      // `scroll-behavior: auto !important` guard in globals.css does not stop
      // it: per CSSOM-View an explicit behavior option outranks the property.
      document
        .getElementById(targetSection)
        ?.scrollIntoView({ behavior: jumpScrollBehavior() });
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'auto';
  };

  // ── NASA source imagery ──
  //   day    Blue Marble Next Generation, July 2004, WITH topography and
  //          bathymetry. The previous file was the plain BMNG surface map, so
  //          the globe had no terrain relief and a flat, featureless seafloor.
  //   night  VIIRS "Black Marble" day/night band. Unchanged — the file already
  //          in the repo is byte-identical to NASA's current release.
  //   cloud  MODIS cloud-fraction composite, replacing 5-octave hash noise.
  // All three are public domain (NASA Visible Earth, eoimages.gsfc.nasa.gov).
  const [dayMap, nightMap, cloudMap] = useTexture([
    '/textures/earth/earth_day_topo_5400.jpg',
    '/textures/earth/earth_night_4k.jpg',
    '/textures/earth/earth_clouds_2048.jpg',
  ]);

  // Colour space is the single most consequential line here. three.js defaults
  // a loaded texture to linear, but these JPEGs are sRGB-encoded photographs.
  // Sampling them as linear darkens and desaturates the midtones — which is
  // what the old shader's saturation boost was silently compensating for.
  // Tagging them correctly means the decode is right and no grading is needed.
  // The cloud map is the exception: it is density data, not colour, so it must
  // NOT be gamma-decoded or the cover values come out wrong.
  useMemo(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    nightMap.colorSpace = THREE.SRGBColorSpace;
    cloudMap.colorSpace = THREE.NoColorSpace;
    // The cloud map scrolls in x, so it must tile horizontally or the drift
    // tears at the seam. y stays clamped — wrapping it would mirror the poles.
    cloudMap.wrapS = THREE.RepeatWrapping;
    cloudMap.wrapT = THREE.ClampToEdgeWrapping;
    for (const t of [dayMap, nightMap, cloudMap]) {
      t.anisotropy = 8; // the globe is viewed at a grazing angle for most of the scroll
      t.needsUpdate = true;
    }
  }, [dayMap, nightMap, cloudMap]);

  // Custom shader for day/night blending with sun direction
  const earthUniforms = useMemo(() => ({
    uDayMap: { value: dayMap },
    uNightMap: { value: nightMap },
    uCloudMap: { value: cloudMap },
    uTime: { value: 0 },
    uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
  }), [dayMap, nightMap, cloudMap]);

  const cloudUniforms = useMemo(() => ({
    uCloudMap: { value: cloudMap },
    uTime: { value: 0 },
    uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
  }), [cloudMap]);

  // ── When the city labels go dark: the last keyframe still AIMED at Earth ──
  // DERIVED FROM cameraKeyframes, NOT COPIED OUT OF IT — that distinction is
  // the whole point. The previous end was the literal 0.181 with a comment
  // citing "back-off 0.174, pan 0.187"; the 2026-08-19 retime (d89b077) moved
  // those two rows to 0.190 and 0.2035 and nothing here changed, so the note
  // described rows that no longer existed. Copying 0.190 in their place would
  // re-arm exactly that trap. This expression evaluated against the PRE-retime
  // table returns 0.174, and against the current one returns 0.190, so it
  // tracks a retime on its own and survives rows being added to or removed
  // from the Earth block.
  //
  // "Still aimed at Earth" is the right test because the aim is what ends the
  // visit: 0.190 is the back-off row (Earth centred, aim offset 0.00°), the
  // very next row at 0.2035 pans onto Venus, and by 0.195 the aim is already
  // 41.8° off Earth. Measured on the sampled spline, at 60° fov: Earth is 31.0%
  // of frame height at footprints' 0.181 edge and still dead centre (offset
  // 1.82°), 24.1% and dead centre at 0.190, then 13.1% and outside the frustum
  // by 0.2035. Ending at 0.181 therefore blanked the marker while the globe was
  // centred and filling nearly a third of the frame — and since activeCity
  // defaults to null, that marker is only ever on screen because the visitor
  // pressed a Footprints chip to ask for it.
  //
  // Fallback is footprints' own end, so a mismatch between Earth's config
  // position and the itinerary degrades to the previous behaviour rather than
  // to a window that never opens.
  const labelWindowEnd = useMemo(() => {
    const [x, y, z] = config.position;
    let end = -Infinity;
    for (const [scroll, , lookAt] of cameraKeyframes) {
      if (
        Math.abs(lookAt[0] - x) < 1e-9 &&
        Math.abs(lookAt[1] - y) < 1e-9 &&
        Math.abs(lookAt[2] - z) < 1e-9
      ) {
        end = scroll;
      }
    }
    return end === -Infinity ? sectionRanges.footprints[1] : end;
  }, [config.position]);

  // Compute city positions on sphere
  const cityPositions = useMemo(() => {
    return cities.map((city) => {
      const pos = latLngToVector3(city.lat, city.lng, config.radius * 1.01);
      return {
        city,
        position: [pos.x, pos.y, pos.z] as [number, number, number],
      };
    });
  }, [config.radius]);

  // Only the selected city is marked on the globe — see the labels group below.
  const activeCityPosition = useMemo(
    () => cityPositions.find(({ city }) => city.id === activeCity) ?? null,
    [cityPositions, activeCity],
  );

  useFrame((_, delta) => {
    // Every ambient advance below is scaled by `calm`, so the globe settles
    // when the visitor stops to read. delta-scaling is a bug fix in its own
    // right: these lines used a raw per-frame increment, so the globe span at
    // DOUBLE speed on a 120Hz display — one full rotation every 65s, right
    // behind the Footprints copy.
    const calm = motionRef.current ?? 1;
    timeRef.current += delta * calm;
    // Both shaders read the same clock. The surface shader samples the cloud
    // map to cast shadows, so if these drifted apart the shadows would slide
    // off the clouds casting them.
    cloudUniforms.uTime.value = timeRef.current;
    earthUniforms.uTime.value = timeRef.current;

    // Pause rotation when a city is selected so user can browse photos
    const speed = (activeCity ? 0 : config.rotationSpeed) * delta * 60 * calm;
    if (meshRef.current) {
      meshRef.current.rotation.y += speed;
    }
    if (cloudRef.current) {
      // Deliberately the SAME rotation as the surface, not the old 1.08x.
      // Differential cloud motion now comes from the uv drift inside the
      // shader, which the surface shader mirrors exactly when it samples for
      // shadows. Spinning this mesh faster as well would double-count that
      // motion and desync every shadow from its cloud.
      cloudRef.current.rotation.y += speed;
    }
    // Rotate city labels with the Earth surface
    if (labelsRef.current) {
      labelsRef.current.rotation.y += speed;
    }

    // Show city labels across the single contiguous Earth visit. BOTH edges are
    // camera events, not document ones — which is why this reads the WARPED
    // cameraProgressRef (2026-08-19): they are NOMINAL-axis values, and the warp
    // is what keeps them aligned with the live DOM. The visit spans two adjacent
    // sections (memories [0.043, 0.130] and footprints [0.130, 0.181]), so it is
    // one window rather than two.
    const progress = cameraProgressRef.current ?? 0;
    // ONE window now, not two. The second one used to exist purely because
    // Projects returned to Earth; sectionPlanet maps Projects to MERCURY now,
    // so that window would have lit all seven Earth city labels while the
    // camera sat ~17 units away at Mercury, annotating a globe nobody can see.
    //
    // START 0.060 — the Earth-arrival keyframe, and a hardcoded one, because
    // unlike the end it has no structural definition to derive from: the three
    // dive rows at 0.046, 0.0525 and 0.0565 already aim at Earth, so "first row
    // aimed at Earth" would give 0.046. It is a composed choice about DISTANCE. At
    // memories' 0.043 edge the camera is still mid-dive 24.7 units out, and the
    // markers are legible pills rather than 9px text, so from out there they
    // read as chips floating in open space, detached from the dot they
    // annotate; by 0.060 the camera is 2.44 units off Earth's centre. (The old
    // window's 0.07 start was both edges at once; the measured re-tile split
    // them, and the camera distance is the reason the window exists, so arrival
    // wins.) If the dive is ever re-split again, re-check this by distance.
    //
    // END labelWindowEnd — DERIVED, currently 0.190. See the note above it for
    // why it is computed rather than written down, and for the framing
    // measurements behind extending it past footprints' 0.181 edge.
    const shouldShow = progress >= 0.06 && progress <= labelWindowEnd;
    if (shouldShow !== showLabelsRef.current) {
      showLabelsRef.current = shouldShow;
      if (labelsRef.current) {
        labelsRef.current.visible = shouldShow;
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={config.position}
      rotation={[config.tilt || 0, 0, 0]}
      onClick={handlePlanetClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Earth surface with NASA textures */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[config.radius, 128, 128]} />
        <shaderMaterial
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
          uniforms={earthUniforms}
          toneMapped={false}
        />
      </mesh>

      {/* ── Why there is no hover ring here any more ──
          A flat ringGeometry at 1.18–1.22× radius used to appear on hover as a
          click affordance. In Earth's equatorial plane with depth testing on,
          its near arc projected across the globe's face and its far arc hid
          behind it — white at 0.35 opacity over black, plus bloom, read as a
          solid grey SATURN RING around Earth, which is how it was reported as a
          bug. Nothing depended on it (no shader read `hovered`, no other
          component imported it), and the cursor change below already signals
          clickability. Do not reintroduce a hover mesh in the equatorial
          plane; anything drawn there will always slice across the globe. */}

      {/* Cloud layer */}
      <mesh ref={cloudRef}>
        <sphereGeometry args={[config.radius * 1.008, 96, 96]} />
        <shaderMaterial
          vertexShader={cloudVertexShader}
          fragmentShader={cloudFragmentShader}
          uniforms={cloudUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* ── One marker, not seven ──
          This used to render every city at once, each collapsed to a 4px dot
          with a hairline leader. Six of the seven sit in the Americas, so
          whenever that hemisphere faced the camera the globe wore a scatter of
          white ticks that read as surface noise rather than annotation — and
          each one carried an invisible 18px hit box that overlapped its
          neighbours.

          Only the selected city is drawn now. The Footprints chips are the
          control (that section says so in as many words: the chips are
          primary, the marker is the flourish), so this is purely the "you are
          here" answer to a chip that has already been pressed — which also
          means no two markers can ever overlap, and there are no invisible
          click targets sitting on an otherwise clean globe. */}
      <group ref={labelsRef} visible={false}>
        {activeCityPosition && (
          <CityLabel
            city={activeCityPosition.city}
            position={activeCityPosition.position}
          />
        )}
      </group>

      {/* Subtle glow */}
      <pointLight
        intensity={0.3}
        color="#4B8BBE"
        distance={config.radius * 8}
        decay={2}
      />
    </group>
  );
}
