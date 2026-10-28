import type { MetadataRoute } from "next";
import { getAllCaseStudies } from "@/lib/caseStudies";
import { SITE_URL } from "@/lib/site";

// Sitemap is generated at build time from the live case study catalog.
// Priority ladder reflects intent: home (1.0) is the front door, portfolio
// index (0.9) is the primary work surface, individual case studies (0.8)
// are deep links. Drafts are filtered out of getAllCaseStudies so they
// never appear in search.
//
// `lastModified` comes from each study's `updated` field, never `new Date()`.
// A build timestamp is not a content date: it made all four URLs claim the
// same instant, and every no-op redeploy re-announced that all four had
// changed. Google's stated behaviour is to ignore lastmod site-wide once it
// finds the value untrustworthy, so a fabricated date on one URL costs the
// honest dates on the others. The homepage has no such field to draw on, so
// it ships with no lastmod: the element is optional, and absent beats
// invented. (Same reasoning that moved the /portfolio "Last updated" line
// onto `updated` — see the field's docstring in src/data/caseStudies.ts.)
export default function sitemap(): MetadataRoute.Sitemap {
  const liveStudies = getAllCaseStudies();

  // The index is a list of the live studies, so it is exactly as fresh as the
  // newest one. `updated` is ISO YYYY-MM-DD, which sorts chronologically as
  // plain text, so the last element is the most recent.
  const newestStudyUpdate = [...liveStudies]
    .map((study) => study.updated)
    .sort()
    .at(-1);

  return [
    // Bare origin, no trailing slash. This used to be `${SITE_URL}/`, which
    // disagreed with the homepage's own canonical: Next normalises the site
    // root to the bare origin when it emits <link rel="canonical">, and gives
    // you no way to keep the slash. A sitemap <loc> that differs from the
    // canonical it points at is a duplicate-URL signal, so the sitemap is the
    // side that has to move.
    { url: SITE_URL, priority: 1 },
    {
      url: `${SITE_URL}/portfolio`,
      ...(newestStudyUpdate
        ? { lastModified: new Date(newestStudyUpdate) }
        : {}),
      priority: 0.9,
    },
    ...liveStudies.map((study) => ({
      url: `${SITE_URL}/portfolio/${study.slug}`,
      lastModified: new Date(study.updated),
      priority: 0.8,
    })),
  ];
}
