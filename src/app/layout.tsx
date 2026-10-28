import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { TabBar } from "@/components/layout/TabBar";
import { MotionPreferences } from "@/components/providers/MotionPreferences";
import { SkipLink } from "@/components/providers/SkipLink";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";
import { siteContent } from "@/data/content";

// Fonts are self-hosted from ./fonts rather than pulled via next/font/google.
// next/font/google downloads over the network at build time, which fails on any
// machine behind a proxy — Node's fetch ignores HTTP(S)_PROXY, so the build
// silently falls back to system fonts and the type renders wrong. Vendoring the
// woff2 files makes the build hermetic: no network, no fallback, no drift.
// All three are the latin subset; Jakarta and Nunito are variable fonts, so a
// single file spans every weight the design uses.

// Plus Jakarta Sans — geometric sans with rounded terminals, softer and
// more elegant than DM Sans. Serves both display and body via the
// --font-display alias in globals.css. Loads once, used everywhere.
const plusJakarta = localFont({
  src: "./fonts/PlusJakartaSans-Variable.woff2",
  variable: "--font-sans",
  weight: "200 800",
  display: "swap",
});

// DM Mono — softer terminals than JetBrains Mono, pairs well with Jakarta.
// Not a variable font upstream; 400 is the only weight the design uses.
const dmMono = localFont({
  src: "./fonts/DMMono-Regular.woff2",
  variable: "--font-mono",
  weight: "400",
  display: "swap",
});

// Nunito — highly geometric round sans with perfectly circular letterforms.
// Engineered around round terminals at every weight; the go-to choice when
// the design calls for a "soft" or "round" display font.
const nunito = localFont({
  src: [
    {
      path: "./fonts/Nunito-Variable.woff2",
      weight: "200 1000",
      style: "normal",
    },
    {
      path: "./fonts/Nunito-Italic-Variable.woff2",
      weight: "200 1000",
      style: "italic",
    },
  ],
  variable: "--font-serif",
  display: "swap",
});

// ── Root metadata ──
// metadataBase is what lets Next resolve every relative metadata URL
// (og:url, canonicals, per-route og images) into an absolute one. Without
// it those tags are emitted relative — or dropped — and the homepage, the
// page people actually paste into Slack/iMessage/LinkedIn, unfurls as a
// bare link. Child routes inherit this block and override what they need
// (see portfolio/layout.tsx for the title template).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // Self-canonical. /portfolio and every case study already declared one; the
  // homepage — the most-linked URL on the site — was the only page leaving the
  // choice to the crawler. That matters here because this exact HTML also
  // answers on every *.vercel.app preview deploy, which is a duplicate of the
  // real domain with nothing to point home. Relative "/" resolves through
  // metadataBase, so it stays absolute and survives a domain change.
  //
  // Child routes all set their own `alternates`, so nothing inherits this —
  // verified by curl on /portfolio and both case studies. The built-in 404 does
  // inherit it, but Next marks that page `noindex`, so it is never indexed.
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    // No trailing slash, and it is not a style choice: Next normalises the site
    // root to the bare origin on the way out, so both this and the canonical
    // above emit `https://davidxie.space` even when handed a trailing slash.
    // Writing one here would just be a lie about the served tag. sitemap.ts
    // matches this form deliberately — see the note there.
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  // No `images` key here on purpose — and it no longer means "no share
  // image". src/app/opengraph-image.tsx draws the card in code, and because
  // that is an App Router file convention Next wires og:image (plus width,
  // height and alt) up on its own and resolves it through the metadataBase
  // above; twitter:image then falls back to og:image. Declaring `images` here
  // would override the generated card with a second, worse source.
  // The route file exists because public/ has no 1.91:1 graphic and the only
  // portrait on hand (david-linkedin.jpg, 1199×1600) center-crops to a band
  // across the chest — the face falls outside the card.
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

// The page is #000 edge to edge. Without theme-color, mobile Chrome and iOS
// Safari paint their own chrome — light grey — hard against that black, so the
// top of every phone screen has a seam the desktop never shows. One token fixes
// it. Only themeColor is set: width and initial-scale keep Next's defaults
// (`width=device-width, initial-scale=1`), which are already correct.
export const viewport: Viewport = {
  themeColor: "#000000",
};

// ── Person structured data ──
// The site had zero application/ld+json, so nothing told a crawler that the
// six profiles scattered across the page and this domain are one person.
// A Person node with `sameAs` is what consolidates them into a single entity
// — the input Google's knowledge panel is built from.
//
// Every value below is a fact the site already states in prose or renders on
// screen; nothing here is asserted only to fill a schema slot. Fields that
// would have required a guess (birthDate, address, email, award) are omitted
// rather than invented.
//
// `affiliation`, not `alumniOf`: David is a current Georgetown undergraduate,
// and alumniOf would claim a degree he has not finished.
const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  // The same portrait About.tsx renders, absolute because consumers of this
  // block do not resolve relative URLs the way metadataBase does.
  image: `${SITE_URL}/david-linkedin.jpg`,
  jobTitle: "Founder & CEO",
  worksFor: {
    "@type": "Organization",
    name: "Ambees",
    url: siteContent.contact.website,
  },
  affiliation: {
    "@type": "CollegeOrUniversity",
    name: "Georgetown University",
  },
  sameAs: [
    siteContent.contact.github,
    siteContent.contact.linkedin,
    siteContent.contact.twitter,
    // The one profile siteContent.contact cannot supply: ContactInfo has no
    // `youtube` field, so the URL lives in Creator.tsx's channel-link row (and
    // in the note beside the Creator "Channels" entry in content.ts). If
    // ContactInfo ever grows the field, delete this literal and read it from
    // there — do not let the two copies drift.
    "https://www.youtube.com/@itzdavezwrld",
    siteContent.contact.instagram,
    siteContent.contact.website,
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakarta.variable} ${dmMono.variable} ${nunito.variable} antialiased`}
      >
        {/* First focusable element in the document, and it has to stay first:
            a bypass that comes after the thing it bypasses is not a bypass.
            Off-screen until focused (see .skip-link in globals.css) — hidden
            with a transform rather than `display:none`, which would take it
            out of the tab order and defeat the whole point. */}
        <SkipLink />
        {/* Wraps TabBar as well as the route, because TabBar is itself a
            motion element (AnimatePresence + motion.nav) and lives here rather
            than in any page. Everything Framer animates on this site is inside
            this boundary. */}
        <MotionPreferences>
          <TabBar />
          {children}
        </MotionPreferences>
        {/* Last element in the body, after every visible node: this is data for
            crawlers, not content, and it renders nothing. The `<` escape is
            belt-and-braces — every value is a build-time constant today, but a
            literal "</script>" reaching this string would otherwise close the
            tag early. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(personSchema).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
