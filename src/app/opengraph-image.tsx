import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";

// ──────────────────────────────────────────────────────────────────────
// The site's share card, drawn in code.
//
// Every link to this site used to unfurl as a bare text row: there was no
// og:image anywhere, while twitter:card already said `summary_large_image`
// — asking every platform for a big picture and handing it nothing. The
// only photo on hand (public/david-linkedin.jpg) is 1199x1600 portrait and
// centre-crops to a band across the chest, so it was correctly declined.
// Generating the card instead sidesteps the crop problem entirely and keeps
// the graphic in the site's own language rather than a stock rectangle.
//
// This is the App Router file convention, so Next wires it up on its own:
// it emits og:image + og:image:width/height/alt, resolves the URL to an
// absolute one through the metadataBase in layout.tsx, and twitter:image
// falls back to og:image. Nothing in layout.tsx needs to change — which is
// the point, because the `images` block it deliberately omits is exactly
// what this file supplies.
//
// Root-segment file, so /portfolio and every case study inherit it. If the
// editorial portfolio route ever wants its own warm-palette card, it gets a
// src/app/portfolio/opengraph-image.tsx and this one keeps serving the rest.
// ──────────────────────────────────────────────────────────────────────

export const alt = SITE_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ── Copy, derived rather than retyped ──
// src/lib/site.ts is the single source of truth for the site's public
// identity, so the card reads from it instead of carrying a second copy of
// the same three strings that would drift the first time the title changed.
//
// The roles come out of SITE_TITLE ("David Xie — Builder, Trader, Creator")
// by removing the name and the dash that joins them, then splitting the
// remaining comma list. Written this way rather than `split("—")[1]` so a
// change of dash style — em, en, hyphen — still parses.
const ROLES = SITE_TITLE.replace(SITE_NAME, "")
  .replace(/^[\s—–-]+/, "")
  .split(",")
  .map((role) => role.trim())
  .filter(Boolean);

// Host only. Parsing rather than string-slicing means a protocol or domain
// change in site.ts lands here correctly with no edit.
const HOST = new URL(SITE_URL).host;

// ── Starfield ──
// Hand-placed, not random. The positions dodge the type block and the URL,
// which a seeded generator cannot promise, and a literal table renders the
// same bytes on every build so the card stays diffable and cacheable.
// [x, y, diameter, opacity] in the 1200x630 frame.
const STARS: [number, number, number, number][] = [
  // Top band
  [128, 96, 3, 0.45],
  [247, 58, 2, 0.3],
  [352, 142, 3, 0.22],
  [441, 74, 4, 0.55],
  [566, 118, 2, 0.28],
  [684, 52, 3, 0.4],
  [733, 163, 2, 0.2],
  [812, 96, 4, 0.62],
  [905, 141, 2, 0.26],
  [978, 68, 3, 0.38],
  [1071, 124, 2, 0.24],
  [1136, 46, 3, 0.34],
  [60, 168, 2, 0.24],
  [196, 196, 2, 0.18],
  // Right of the type block
  [767, 251, 3, 0.34],
  [858, 322, 2, 0.22],
  [946, 226, 4, 0.48],
  [1024, 300, 2, 0.26],
  [1109, 244, 3, 0.3],
  [890, 402, 2, 0.18],
  [1005, 425, 3, 0.24],
  [1152, 352, 2, 0.2],
  // Lower band, clear of the wordmark and the URL
  [452, 512, 2, 0.22],
  [560, 573, 3, 0.28],
  [651, 486, 2, 0.18],
  [742, 556, 3, 0.24],
  [286, 604, 2, 0.16],
  [176, 528, 3, 0.2],
  [380, 464, 2, 0.15],
];

// ── Sun glow ──
// Satori has no CSS filters and no box-shadow blur, so the glow is built
// from three stacked radial gradients instead: a wide dim wash, a mid
// bloom, and a small hot core, all centred just past the bottom-right
// corner so only one quadrant is in frame and it reads as a light source
// outside the picture — which is what the sun is in the 3D scene.
//
// Each gradient reaches zero alpha well before the element's edge, and the
// final stop repeats the same RGB at alpha 0 rather than using the
// `transparent` keyword, which some renderers interpolate through black and
// would ring the glow with a grey halo.
//
// Hues are the scene's own: #FF9028 is the sun shader's base colour and
// #FFA858 its point light (src/components/canvas/Sun.tsx).
const GLOW_CENTRE = { x: 1140, y: 640 };
const GLOWS: { diameter: number; gradient: string }[] = [
  {
    diameter: 1200,
    gradient:
      "radial-gradient(circle at 50% 50%, rgba(255,144,40,0.10) 0%, rgba(255,144,40,0.04) 28%, rgba(255,144,40,0) 50%)",
  },
  {
    diameter: 640,
    gradient:
      "radial-gradient(circle at 50% 50%, rgba(255,168,88,0.16) 0%, rgba(255,144,40,0.06) 30%, rgba(255,144,40,0) 50%)",
  },
  {
    diameter: 280,
    gradient:
      "radial-gradient(circle at 50% 50%, rgba(255,196,140,0.26) 0%, rgba(255,168,88,0.10) 28%, rgba(255,168,88,0) 50%)",
  },
];

export default async function Image() {
  // Satori cannot read woff2, and all four faces in src/app/fonts are woff2
  // variable fonts. These two are the same families, decompressed to TTF,
  // Jakarta pinned to the 700 instance the wordmark uses, and both subset to
  // Latin — ~21KB for the pair. Subset by unicode range rather than by the
  // exact characters on the card, deliberately: the strings above are
  // derived from site.ts, so an exact subset would render tofu the day
  // someone edited SITE_TITLE.
  const fontDir = join(process.cwd(), "src", "app", "og-fonts");
  const [jakartaBold, dmMono] = await Promise.all([
    readFile(join(fontDir, "PlusJakartaSans-Bold.ttf")),
    readFile(join(fontDir, "DMMono-Regular.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          position: "relative",
          // Pure black, matching html/body in globals.css and the
          // themeColor in layout.tsx. Nothing on this site is off-black.
          backgroundColor: "#000000",
          padding: "0 84px",
        }}
      >
        {GLOWS.map((glow) => (
          <div
            key={glow.diameter}
            style={{
              position: "absolute",
              left: GLOW_CENTRE.x - glow.diameter / 2,
              top: GLOW_CENTRE.y - glow.diameter / 2,
              width: glow.diameter,
              height: glow.diameter,
              display: "flex",
              backgroundImage: glow.gradient,
            }}
          />
        ))}

        {STARS.map(([x, y, d, opacity]) => (
          <div
            key={`${x}-${y}`}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: d,
              height: d,
              display: "flex",
              borderRadius: d / 2,
              backgroundColor: "#FFFFFF",
              opacity,
            }}
          />
        ))}

        {/* Wordmark. Plus Jakarta Sans at 700 with tightened tracking is the
            site's own heading treatment (SectionHeader: font-display,
            font-bold, tracking-tight). Left-aligned rather than centred
            because that is how every section on the site sets its title, and
            because a firm left edge survives the ~500px-wide thumbnail that
            Slack and iMessage actually render. */}
        <div
          style={{
            display: "flex",
            fontFamily: "Plus Jakarta Sans",
            fontWeight: 700,
            fontSize: 132,
            lineHeight: 1,
            letterSpacing: -3,
            color: "#FFFFFF",
          }}
        >
          {SITE_NAME}
        </div>

        {/* Hairline rule. The gradient is lifted verbatim from the loading
            screen's progress fill (grey #D0D0D8 -> white -> #3B9FE0), which
            is the one place the site already draws a 1px line under the
            name. 2px here because the card is a 2x surface. */}
        <div
          style={{
            display: "flex",
            width: 168,
            height: 2,
            borderRadius: 1,
            marginTop: 34,
            marginBottom: 30,
            backgroundImage:
              "linear-gradient(90deg, #D0D0D8 0%, #FFFFFF 45%, #3B9FE0 100%)",
          }}
        />

        {/* Roles, set as the site's mono micro-label: DM Mono, uppercase,
            0.3em tracking. Uppercased in JS rather than via textTransform so
            the glyphs asked for are exactly the glyphs measured.
            The two alphas are the loading screen's, which sets this same
            "Builder · Trader · Creator" line under this same name: words at
            white/60, separators at white/30. Dimming the "·" is the site's
            standing rule for it (PlanetProgress and SystemOverview both do
            it) — it carries no information, so it should not compete with
            the words it separates. */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {ROLES.map((role, i) => (
            <div key={role} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {i > 0 && (
                <div
                  style={{
                    display: "flex",
                    fontFamily: "DM Mono",
                    fontSize: 24,
                    color: "rgba(255,255,255,0.30)",
                  }}
                >
                  ·
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  fontFamily: "DM Mono",
                  fontSize: 24,
                  letterSpacing: 7.2,
                  color: "rgba(255,255,255,0.60)",
                }}
              >
                {role.toUpperCase()}
              </div>
            </div>
          ))}
        </div>

        {/* The address, bottom-left on the same 84px margin as everything
            else. Lowercase — the only lowercase mono on the card — because a
            domain is a literal string a reader is meant to type, and
            uppercasing it would make it read as one more label.
            white/50 is what Contact.tsx gives the footer line that plays this
            exact role on the site; it is also the first round alpha clearing
            4.5:1 on #000, per the note in globals.css. */}
        <div
          style={{
            position: "absolute",
            left: 84,
            bottom: 72,
            display: "flex",
            fontFamily: "DM Mono",
            fontSize: 18,
            letterSpacing: 5,
            color: "rgba(255,255,255,0.50)",
          }}
        >
          {HOST}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Plus Jakarta Sans",
          data: jakartaBold,
          weight: 700,
          style: "normal",
        },
        { name: "DM Mono", data: dmMono, weight: 400, style: "normal" },
      ],
    },
  );
}
