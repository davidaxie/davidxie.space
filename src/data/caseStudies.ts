// Typed catalog of PM case studies surfaced at /portfolio.
// The MDX content lives in src/content/case-studies/<slug>.mdx.
// Status: 'live' entries are indexed + routed; 'draft' entries are
// hidden from production but kept in source for preview/staging work.

export type CaseStudyStatus = "live" | "draft";

export type CaseStudy = {
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  role: string;
  context: string; // e.g. "Ambees Technologies" or "Clockwork Group"
  period: string; // e.g. "Jan 2026 – Present"
  tags: string[];
  status: CaseStudyStatus;
  order: number; // lower = shown first on the index
  readMinutes?: number;
  /**
   * ISO `YYYY-MM-DD` — when this study's MDX body last actually changed.
   *
   * The index prints "Last updated · …" and used to compute it with
   * `new Date()` inside a statically-prerendered server component, which
   * silently made it the BUILD date: a no-op redeploy moved it, and it had
   * never once described the content. A date claim has to come from the thing
   * it describes, so it lives here, next to the copy it is about, and the
   * index takes the newest one across the live studies.
   *
   * Seeded from `git log -1 --format=%cs` on each `.mdx`. Bump it by hand when
   * you edit a body — same discipline as `readMinutes`, which is likewise a
   * claim about a body that has to stay true.
   */
  updated: string;
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "ambees",
    updated: "2026-08-22",
    title: "Ambees — AI-native early-career hiring for the Fortune 500's middle",
    tagline: "Better matching, not more applications.",
    summary:
      "Founded and lead a two-sided recruiting marketplace connecting mid-tier Fortune 500 employers with university students. AI cross-matching routes candidates to better-fit roles across an employer's openings; recruiters get AI-generated summaries instead of resume stacks.",
    role: "CEO & Founding Product",
    context: "Ambees Technologies",
    period: "2025 – Present",
    tags: ["Marketplace", "Agentic AI", "Founder"],
    // Draft until the MDX body is written: ambees.mdx has a real intro, an
    // At-a-glance callout and a $5K metric, but five of its seven H2 sections
    // still hold only TODO comments
    // — and MDX comments compile to nothing, so shipping it 'live' renders
    // those headings with empty space under them. No readMinutes for the same
    // reason: the claim has to describe a body that actually exists.
    status: "draft",
    order: 3,
  },
  {
    slug: "clockwork",
    updated: "2026-08-22",
    title: "Trading on time — commercializing a metals algo",
    // "metals", not "precious metals": the book is gold, platinum and zinc,
    // and zinc is a base metal. The summary below names all three, so
    // "metals" is the accurate umbrella.
    tagline: "Time-based metals strategies, commercialized for seven figures.",
    summary:
      "Built and backtested time-based price movement strategies for gold, platinum, and zinc in Python and PineScript. Helped brand and commercialize proprietary algorithms into a paid product.",
    role: "Algorithmic Trader & Developer",
    context: "Clockwork Group",
    period: "Jan 2026 – Apr 2026",
    tags: ["Quantitative", "Commodities", "Product"],
    // No src/content/case-studies/clockwork.mdx on disk yet, so there is no
    // body to time — readMinutes stays off until the file lands.
    status: "draft",
    order: 4,
  },
  {
    slug: "bloop",
    updated: "2026-08-28",
    title: "bloop. — privacy-first hearing protection in 72 hours",
    // No "HoyaHacks 2026: " prefix. `context` two rows down is already
    // "HoyaHacks 2026", and both CaseStudyHero and CaseStudyCard print context
    // immediately above the tagline — so a prefix would render the string
    // twice, once as the accent eyebrow and once as the opening words of the
    // dek. The placings are what the dek is for.
    tagline: "3rd overall, Best .Tech Domain.",
    summary:
      "Shipped a Swift + HealthKit + Gemini iOS app at HoyaHacks 2026 that treated hearing protection as a privacy problem first. Won 3rd place overall and Best .Tech Domain.",
    role: "Product & Engineering",
    context: "HoyaHacks 2026",
    period: "72 hours, Feb 2026",
    tags: ["iOS", "Hackathon", "Health"],
    status: "live",
    order: 1,
    readMinutes: 5,
  },
  {
    slug: "mapperlap",
    updated: "2026-08-28",
    title: "Mapperlap — find where your world overlaps",
    tagline: "The fastest way to discover what you and someone else have in common.",
    summary:
      "Built and launched a web app that visualizes overlapping interests, skills, and connections between people. Designed for the discovery moment — not a dating app, not LinkedIn, something in between.",
    role: "Founder & Product Engineer",
    context: "Mapperlap",
    period: "2025",
    tags: ["Web App", "Social", "Founder"],
    status: "live",
    order: 2,
    readMinutes: 6,
  },
  {
    slug: "georgetown-ad",
    updated: "2026-08-22",
    // HON, not Honeywell: the line promises three tickers, so all three are
    // tickers. Same wording in the GADIF role description in
    // src/data/content.ts.
    title: "Three tickers — BITW, DIME, HON",
    // No "defense": DIME is a CRYPTO ETF, not a defense name — BITW and DIME
    // are both digital-assets vehicles and HON is the aerospace one. The fund
    // is still A&D; the three tickers researched in it simply were not
    // one-per-sector.
    tagline: "Equity research across digital assets and aerospace.",
    summary:
      "Three tickers defended in front of the Georgetown Aerospace & Defense Investment Fund: digital-asset adoption (BITW, DIME) and aerospace recovery (HON).",
    role: "Student Analyst",
    context: "Georgetown A&D Investment Fund",
    period: "Fall 2025",
    tags: ["Equity Research", "Sector Analysis"],
    // Same as clockwork: no georgetown-ad.mdx yet, so no read time to quote.
    status: "draft",
    order: 5,
  },
];
