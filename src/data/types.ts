/**
 * ── Why this file is organised by DOMAIN, not by TYPE ──────────────────────
 *
 * The old shape was five parallel arrays — skills, work, projects, interests,
 * achievements — each one a *kind* of thing. That told a reader what David
 * has, but never what he does: the Clockwork role sat in `work`, the algo that
 * came out of it sat in `achievements`, the PineScript it was written in sat
 * in `skills`, and any section that wanted to tell the trading story had to
 * reach into three arrays and re-join them by hand.
 *
 * Now there are four PILLARS — builder, finance, creator, offtheclock — and
 * each one owns its roles, the things it shipped, the tools it runs on, and
 * the outside proof that it happened. One pillar in, one section out: a
 * component renders `siteContent.pillars.finance` and never opens another key.
 *
 * The leaf types below deliberately KEPT their old names — WorkEntry,
 * ProjectEntry, AchievementEntry, InterestEntry. Each describes the ITEM (a
 * job, a product, a dated award, a piece of first-person narrative), and the
 * item did not change when the grouping did. The field names on `Pillar`
 * describe the SLOT that item fills inside a domain: `roles`, `shipped`,
 * `proof`, `notes`. Renaming the types on top of that would have churned every
 * import and every mention in the docs for no meaning gained.
 *
 * `SkillCategory` is the one type that actually died. Its entire job was to be
 * a top-level bucket — "Code", "Finance", "Creative", "Design & Product" — and
 * buckets are precisely what the pillars replaced. Its rows live on as
 * `ToolEntry`, which carries the old bucket name forward on `group` so nothing
 * about how the tools were sorted is lost.
 *
 * What is NOT here, on purpose: anything about planets, gradients or section
 * numbers. Those are scene concerns owned by the components and the camera
 * itinerary, and a content file that starts naming Saturn is one edit away
 * from being a layout file.
 */

/**
 * The four domains, and the only valid keys of `SiteContent.pillars`. Written
 * as a union rather than a bare string so that adding a fifth pillar is a
 * compile error at every switch and lookup that has to handle it, instead of a
 * silently missing section.
 */
export type PillarKey = 'builder' | 'finance' | 'creator' | 'offtheclock';

export interface WorkEntry {
  company: string;
  role: string;
  period: string;
  description: string;
  highlight?: string;
  technologies?: string[];
}

export interface ProjectEntry {
  name: string;
  description: string;
  story?: string;
  impact?: string;
  technologies: string[];
  url?: string;
  github?: string;
  image?: string;
  // Slug of a case study in src/data/caseStudies.ts. When present the project
  // card leads with /portfolio/<slug> instead of the product's marketing page:
  // a case study written here is stronger evidence than a landing page we do
  // not control, and it keeps the highest-intent click on this site. Only set
  // it for studies whose status is 'live' — drafts are not routed and 404.
  caseStudySlug?: string;
  // A short lifecycle qualifier ('in progress') rendered as a small mono
  // annotation beside the name. Set only when the honest claim is less than
  // "this works today" — Clearance carries it because its sim is unbuilt and
  // the copy must not imply a playable game. Absent means nothing renders;
  // shipped entries never set it, because shipped already is the status.
  status?: string;
}

export interface InterestEntry {
  name: string;
  description: string;
  headline?: string;
  stat?: string;
}

export interface AchievementEntry {
  title: string;
  year: string;
  description: string;
}

/**
 * One tool, one row. Replaces `SkillCategory`, which grouped tools by kind at
 * the top level; they are now grouped by the domain they are used in, and the
 * old kind survives on `group`.
 */
export interface ToolEntry {
  name: string;
  /**
   * `description` is OPTIONAL, and most entries deliberately omit it.
   *
   * Every skill used to carry one, which pushed the copy into filler. An app
   * does not need a tagline;
   * naming Final Cut Pro tells a reader everything the sentence under it
   * would have. Only the entries that are a *discipline* rather than a tool
   * (the Finance rows) still carry one, and those state scope, not swagger.
   */
  description?: string;
  /**
   * The bucket this tool sat in under the old type-first shape: 'Code',
   * 'Finance', 'Creative', 'Design & Product'. Kept because it still says
   * something the pillar cannot — that Python is a language and Due Diligence
   * is a discipline, or that PineScript is a language even though it earns its
   * place in the finance pillar. A section may cluster on it or ignore it.
   */
  group?: string;
}

/**
 * One domain, everything about it. The five core slots are all required: an
 * empty array is a real, honest answer ("David has not shipped a standalone
 * product under this domain"), not a hole waiting to be filled with invented
 * copy. Several of them are empty today and the comments in content.ts say
 * why. `sideProjects` is the one optional slot — see its comment for why it
 * does not follow that rule.
 *
 * There is deliberately no per-pillar tagline or blurb field. Every line of
 * prose on this site is David's own words; an empty `blurb: string` is an
 * open invitation for the next editor to write marketing copy that isn't his.
 */
export interface Pillar {
  /**
   * Duplicates the key this pillar is filed under in `SiteContent.pillars`.
   * Redundant on purpose: code that iterates `Object.values(pillars)` — nav,
   * anchors, the scroll itinerary — still needs to know which one it is
   * holding without threading the key through separately.
   */
  key: PillarKey;
  /** Display name for the section heading. A label, never a claim. */
  label: string;
  roles: WorkEntry[];
  shipped: ProjectEntry[];
  /**
   * Working software that is neither a company nor a placing — the things
   * built on the side, ranked below `shipped` and rendered as a compact
   * block. Reuses ProjectEntry because the item is the same kind of thing (a
   * name, a description, a tag row); the entries deliberately carry no `url`
   * and no `caseStudySlug`, so they render linkless — there is nothing to
   * visit yet, and a dead link is a worse claim than no link.
   *
   * OPTIONAL, unlike the five slots above, and on purpose: only builder has
   * side projects today. Making this required would force `sideProjects: []`
   * plus a why-it-is-empty comment onto three pillars that never had the
   * concept, and those comments would be manufactured, not load-bearing.
   */
  sideProjects?: ProjectEntry[];
  tooling: ToolEntry[];
  proof: AchievementEntry[];
  notes: InterestEntry[];
}

export interface ContactInfo {
  email?: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  website?: string;
}

export interface SiteContent {
  identity: {
    name: string;
    tagline: string;
    /**
     * The About pull-quote — the one line that says who David is before any
     * detail. Lives here rather than hardcoded in About.tsx so the section's
     * two pieces of prose sit side by side in one file and can be edited
     * together without opening a component.
     */
    statement: string;
    bio: string;
  };
  currently: { label: string; value: string }[];
  /**
   * Keyed, not an array, so a section component can write
   * `siteContent.pillars.creator` and be done. An array would force the
   * `find(p => p.key === '…')` lookup that Skills.tsx was rewritten to get rid
   * of — and a `find` returns undefined for a typo, where a Record makes the
   * typo a compile error and a missing pillar impossible.
   */
  pillars: Record<PillarKey, Pillar>;
  /**
   * Reading order down the page. Object key order happens to be stable for
   * string keys, but leaning on that would make "which section comes second?"
   * a question about JavaScript semantics rather than about this file.
   * Reordering the page is an edit to this one line.
   */
  pillarOrder: PillarKey[];
  contact: ContactInfo;
}
