# davidxie.space

My personal site, built as a scroll-driven flight through a 3D solar system. Live at [davidxie.space](https://davidxie.space).

## What it does

- **`/` (the homepage)** is one long page with a WebGL scene fixed behind it. As you scroll, the camera flies from a wide view of the solar system to Earth, then out past each planet, and every planet hosts a section: Memories and Footprints on Earth (click a city on the globe to open its photos), then About, Builder, Finance, Creator, Off the Clock and Contact. Planets are clickable and jump to their section, and a recap at the bottom lets you revisit any of them.
- **`/portfolio`** is the opposite on purpose: a quiet, editorial set of MDX case studies with no canvas. A tab bar switches between the two.

## How it works

**One number drives the scene.** A scroll provider (`src/hooks/useScrollProgress.tsx`) turns the page position into a single progress value from 0 to 1 and keeps it in a ref, never in React state, so scrolling never re-renders the WebGL tree. Everything in the render loop reads that ref.

**The camera follows a spline.** `src/lib/cameraPath.ts` builds two centripetal Catmull-Rom splines (position and look-at) from hand-placed keyframes in `src/lib/constants.ts`. Each section owns a slice of the 0 to 1 range, and the keyframes are timed so that the right planet is on screen when its section is. The camera narrows its field of view near a planet, widens it in transit, and adds a slight breathing motion that damps out up close.

**It stays in sync at any screen size.** The keyframes were timed against one measured desktop viewport. On other viewports, sections land earlier or later in the scroll. `src/lib/progressWarp.ts` measures where each section actually sits in the live DOM (re-measured with a `ResizeObserver`) and warps live progress onto the axis the keyframes expect, so the camera arrives at Venus when the About section does, on any device.

**Fast scrolling cannot whip the camera.** A full-page flick used to spin the view at well over 2,000 degrees per second. `src/lib/itineraryGovernor.ts` puts a governed playhead between the scroll and the camera, with two per-frame budgets: distance traveled along the path and degrees of rotation. Deep catch-ups ease the gaze toward the Sun (the site's establishing shot) rather than replaying every planet-to-planet pan. At reading speed the governor passes the target through unchanged, so normal scrolling feels exactly as designed. Both the warp and the governor have unit tests.

**The planets are shaded like real bodies.** `src/components/canvas/TexturedPlanet.tsx` uses a different photometric law per body (Lommel-Seeliger for airless Mercury, Minnaert for the atmospheres), decodes texture maps as sRGB, and applies only measured color corrections. Earth (`EarthGlobe.tsx`) combines NASA Blue Marble day imagery with topography, Black Marble night lights on the dark side, and a drifting layer of real MODIS cloud data, with clickable city markers for the Footprints section. Uranus is fully procedural. The Sun is layered shaders with corona streamers, and postprocessing adds bloom and a vignette.

**It respects the device.** `CosmicCanvas.tsx` picks a performance tier once (from pointer type, CPU cores and device memory) that sets pixel ratio, star count and whether bloom runs. Lenis smooth scroll is skipped on touch devices and under `prefers-reduced-motion`, the canvas dims while you are reading, the starfield uses a seeded random generator so it never reshuffles, and a lost WebGL context asks to be restored.

**Case studies are typed data plus MDX.** Metadata lives in `src/data/caseStudies.ts`; bodies live in `src/content/case-studies/<slug>.mdx`. Setting `status: "live"` is the only publish step: it adds the route, the index card and the sitemap entry. The share card is generated in code (`src/app/opengraph-image.tsx`).

## Tech stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict)
- three.js with `@react-three/fiber`, `drei` and `postprocessing`, custom GLSL
- Tailwind CSS v4, Framer Motion, Lenis, Zustand
- `@next/mdx` with remark-gfm, rehype-slug and rehype-autolink-headings
- Vitest and Testing Library
- Deployed on Vercel

## Running locally

Requires Node.js 20.9 or later.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve the production build
npm run lint
npm test           # vitest run
npx tsc --noEmit   # typecheck
```

## Project layout

```
src/
  app/                  layout, homepage, /portfolio routes, sitemap, robots, OG image
  components/canvas/    everything inside the WebGL canvas: camera, Sun, planets, Earth, stars, effects
  components/sections/  the scrolling HTML sections of the homepage
  components/portfolio/ case study cards, hero and MDX components
  content/case-studies/ MDX bodies, one per live case study
  data/                 site copy, cities, photo captions, case study catalog
  hooks/                scroll progress, section-in-view, text scramble
  lib/                  camera path, keyframes, progress warp, itinerary governor
  stores/               small Zustand store for the open city panel
```

## Credits

Earth imagery from NASA Visible Earth (public domain). Mars texture map from Solar System Scope (CC BY 4.0).
