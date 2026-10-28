// ──────────────────────────────────────────────────────────────────────
// Single source of truth for the site's public identity.
//
// The origin used to be written out twice (robots.ts + sitemap.ts), so a
// domain change could silently half-apply and leave search engines pointed
// at a dead sitemap. Everything that needs an absolute URL — metadataBase,
// og:url, sitemap entries, the robots sitemap pointer — derives from here.
//
// SITE_URL carries no trailing slash: callers append their own path
// (`${SITE_URL}/portfolio`), so a trailing slash here would double up.
// ──────────────────────────────────────────────────────────────────────

export const SITE_URL = "https://davidxie.space";

// Display name for og:site_name — the "from" label social platforms show
// above the card. Distinct from the page title, which is the headline.
export const SITE_NAME = "David Xie";

// Homepage title/description live here rather than inline in layout.tsx
// because the same two strings feed <title>, og:title/og:description and
// twitter:title/twitter:description. One copy, four consumers.
export const SITE_TITLE = "David Xie — Builder, Trader, Creator";
export const SITE_DESCRIPTION =
  "Georgetown undergrad building algorithmic trading systems, leading a startup, and producing music.";
