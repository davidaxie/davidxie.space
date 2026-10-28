import type { SiteContent } from './types';

/**
 * ── Four domains, not five type-buckets ─────────────────────────────────────
 *
 * This file used to be `skills`, `work`, `projects`, `interests`,
 * `achievements` — sorted by what each thing *is*. Everything below is now
 * sorted by what each thing is *for*, under four pillars: builder, finance,
 * creator, offtheclock. See src/data/types.ts for the shape and the reasoning.
 *
 * Where a pillar's slot is an empty array, there is a comment saying why it is
 * empty. Those are load-bearing: the honest answer to "what has the creator
 * pillar shipped?" is "no ProjectEntry ever existed for Eternity X", and the
 * temptation to fix that by writing one is exactly what the comment exists to
 * stop.
 *
 * `identity`, `currently` and `contact` did not move and were not touched.
 * About.tsx and Contact.tsx still read them at the same paths.
 */
export const siteContent: SiteContent = {
  identity: {
    name: 'David Xie',
    tagline: 'Builder, Trader, Creator',
    // Two concrete claims, nothing to take on trust.
    statement: 'Ex-founder, 2M+ streams producer.',
    // St. Mark's is in the Boston blurb in cities.ts, and Clockwork and Ambees
    // are carried elsewhere, so this stays short.
    bio: "Born in Shanghai, based in DC and SF. I'm a rising sophomore at Georgetown taking a gap year in the Bay — at Mercor, and building my own company. I've dabbled in finance along the way, and I make beats: verified on Spotify with 2M+ streams as Eternity X.",
  },

  currently: [
    { label: 'From', value: 'Shanghai, China' },
    // Matches the bio's own phrasing ("based in DC and SF").
    { label: 'Based in', value: 'Washington DC & San Francisco' },
    { label: 'School', value: 'Georgetown University, Finance & CS' },
    // One row: this index is a glance-level answer, and Ambees (the featured
    // project) and Clockwork (the top finance role) are carried elsewhere.
    // 'Currently' states the affiliation without characterising it.
    { label: 'Currently', value: 'Mercor and Ambees' },
  ],

  pillars: {
    // ══ BUILDER ══════════════════════════════════════════════════════════
    // His own company and the things he has actually shipped. Absorbs the
    // whole of the old `projects` array, the 'Code' and 'Design & Product'
    // skill cards, and the two achievements that are evidence a product
    // existed rather than evidence a firm let him in the door.
    builder: {
      key: 'builder',
      label: 'Builder',

      // Empty on purpose, and it should stay empty until there is a real one.
      // The CEO title lives in the Ambees case study in
      // src/data/caseStudies.ts, which is where a role claim belongs when the
      // company is his own. Writing a WorkEntry here to fill the gap would be
      // inventing a period, a description and a highlight.
      roles: [],

      // ── Tag vocabulary for every `technologies` array below ─────────────
      // These badges are read by recruiters and non-engineers, not by another
      // engineer auditing a stack. They had drifted into vendor SDKs — Google
      // Gemini, OpenAI Embeddings, Supabase, WebSockets, pgvector, D3.js —
      // which name a purchase order rather than a skill, and a reader outside
      // the field learns nothing from any of them.
      // Rule: at most 4 tags, each either a language/framework a non-engineer
      // has actually heard of (Swift, Next.js, PostgreSQL) or a capability
      // word that absorbs two or three vendor names — 'AI/ML' absorbs Gemini,
      // OpenAI embeddings and pgvector; 'Real-time' absorbs WebSockets plus
      // Supabase channels. Nothing here is a new claim; every tag is a
      // generalisation of an entry that was already in the array. Re-adding
      // the SDK names turns the card back into a list of things we bought.
      //
      // Order is unchanged from the old `projects` array: Ambees first,
      // because the section that renders this treats shipped[0] as the
      // featured item and Ambees is the one with a company behind it.
      shipped: [
        {
          name: 'Ambees',
          description: "A two-sided recruiting marketplace connecting mid-tier Fortune 500 companies with university student talent — AI matching students to roles they're actually a good fit for, and giving recruiters a faster way to surface qualified candidates.",
          story: "On one side: large, well-known employers that aren't Google or Goldman, and so struggle to compete for student attention on campus. On the other: students applying to dozens of postings with almost no signal about which ones fit. Ambees' core idea is AI cross-matching — instead of treating an application as a yes/no for one job, it reads a candidate's profile and routes them toward better-fit roles across an employer's openings, including ones they wouldn't have thought to apply to. Recruiters get AI-generated candidate summaries instead of stacks of resumes; students get a fast, swipe-style experience with voice-agent onboarding. A Delaware C-corp I founded and lead as CEO, with Yiran Hu as CTO — backed by Georgetown's Summer Launch Incubator and accepted into Microsoft for Startups.",
          // Deliberately comma-free: the featured card splits `impact` on the
          // first comma and renders the tail as a small mono subtitle, so any
          // comma added here silently adds a second line under the headline.
          // Whatever renders builder.shipped[0] still splits.
          impact: 'Georgetown SLI Incubator',
          // 'Voice Agents' is the swipe-flow's voice onboarding — a capability
          // word per the tag rule above, grounded in the story text.
          technologies: ['Next.js', 'PostgreSQL', 'AI/ML', 'Voice Agents'],
          url: 'https://ambees.io',
        },
        {
          name: 'bloop.',
          description: "A privacy-first iOS hearing protection app — built in 72 hours at HoyaHacks 2026.",
          story: "72 hours, no sleep plan, shipped a real product. bloop. treats hearing damage as a privacy problem: your audio never leaves your device. We used Apple's HealthKit and on-device processing instead of streaming mic audio to a server, then Gemini for natural-language weekly hearing insights. Took 3rd place overall and won Best .Tech Domain from MLH.",
          impact: '3rd Overall & Best .Tech Domain — HoyaHacks 2026',
          // 'On-Device Processing' is the product's entire pitch — the audio
          // never leaves the phone — and HealthKit was only the plumbing that
          // made it possible, so the capability earns the badge and the Apple
          // framework name does not. 'AI/ML' stands in for the Gemini-written
          // weekly insights.
          technologies: ['Swift', 'SwiftUI', 'On-Device Processing', 'AI/ML'],
          url: 'https://devpost.com/software/bloop-7i3g8l',
          // A Devpost submission page is someone else's summary of the project;
          // the case study is ours. Slug is 'live' in src/data/caseStudies.ts.
          caseStudySlug: 'bloop',
        },
        {
          name: 'Mapperlap',
          description: 'Find where your world overlaps — a real-time web app for discovering what you and someone else actually have in common.',
          story: "Built because every networking interaction ends with 'let's stay in touch' and nothing else. Mapperlap is a shared canvas: two people place their interests, projects, and goals simultaneously — neither sees the other's full map, only the overlap zone lights up in real time. No accounts, no profiles, no performance. Just a session link and a reveal.",
          impact: 'Live at mapperlap.co',
          // 'PostgreSQL' is not a swap for Supabase, it is what Supabase is —
          // naming the database instead of the company that hosts it, which also
          // keeps this card's vocabulary matched to the Ambees card above.
          // 'Real-time' covers the WebSocket channels the overlap zone rides on.
          technologies: ['Next.js', 'PostgreSQL', 'Real-time', 'AI/ML'],
          url: 'https://mapperlap.co',
          // Slug is 'live' in src/data/caseStudies.ts. Ambees deliberately has no
          // caseStudySlug: its study is still 'draft' (the MDX has an intro and
          // callout since 2026-08-21, but the body sections are still TODO
          // comments), so /portfolio/ambees is not routed and would 404.
          caseStudySlug: 'mapperlap',
        },
      ],

      // ── Side projects ───────────────────────────────────────────────────
      // Working software that is not a company and not a placing; it ranks
      // below the shipped three and renders as a compact linkless block — no
      // url, no case study, nothing to visit yet. Same register as the rest
      // of this file: plain facts, nothing invented, and the tag rule above
      // (max 4, capability words over vendor names) applies here unchanged.
      sideProjects: [
        {
          name: 'Aloud',
          description: "A fully offline text-to-speech reader: drop in a PDF — or any live web page via its Chrome extension — and a local neural voice reads it aloud, highlighting the sentence being spoken, with click-to-jump and auto-scroll. Zero cloud calls; nothing leaves the machine.",
          // 'On-Device AI' is the whole point — the neural voice (Kokoro,
          // ONNX) runs locally — and per the tag rule the capability earns
          // the badge, not the model or runtime name.
          technologies: ['Python', 'React', 'On-Device AI'],
        },
        {
          name: 'Readahead',
          description: "A Chrome extension that makes YouTube buffer far past its ~2-minute limit and hold one quality for the whole video. It patches the player's experiment flags before the player script loads and pins quality through the player's own API, with live buffer stats in the popup. Vanilla JS, zero dependencies.",
          technologies: ['JavaScript', 'Chrome Extension'],
        },
        {
          // IN PROGRESS, and framed that way on purpose: the measurement
          // core (the C# scoring library) is built and tested; the game
          // around it is not started. The copy says "the scoring engine is
          // built" and "in progress" — it must never imply a playable game.
          name: 'Clearance',
          description: "A training sim for the ATSA, the FAA's air-traffic-control entrance exam. The scoring engine is built: a dependency-free C# library that scores gameplay telemetry into the six cognitive dimensions the exam tests — working memory, spatial reasoning, multitasking, decision speed, prioritization, mental math — tracking each against a personal baseline. The sim around it is in progress.",
          technologies: ['C#', 'Simulation'],
          // The only entry in this file with a `status`: it renders as a mono
          // "in progress" tag beside the name so the qualifier is visible
          // before anyone reads the description. Remove it when the sim ships.
          status: 'in progress',
        },
      ],

      // ── Tooling rules ──
      // Two rules govern every `tooling` array in this file. (1) Name the
      // APPS, because the tools someone actually opens every day say more
      // than an abstract competency does. (2) No taglines. So the tool rows
      // are bare names and only the Finance disciplines carry a line, stating
      // scope rather than selling.
      //
      // These six are the old 'Code' card minus PineScript, plus the whole of
      // 'Design & Product'. Design & Product was itself a NEW fourth category
      // split out of Creative on 2026-08-11 — under the old shape that split
      // also fixed a layout bug (three skill cards forced a lopsided 2fr/1fr
      // grid with a void under the tall one; four cards packed evenly into a
      // 2×2). That layout reason is now historical — the categories are no
      // longer top-level cards — but the split itself was a content judgement
      // and stands: Figma and Product Design are how he builds products, not
      // how he makes music. Both former card names survive on `group`.
      //
      // PineScript is the one 'Code' row that is NOT here; it moved to the
      // finance pillar, where the reason it exists is. See the note there.
      tooling: [
        { name: 'Python', group: 'Code' },
        { name: 'TypeScript / React', group: 'Code' },
        { name: 'Swift', group: 'Code' },
        { name: 'Figma', group: 'Design & Product' },
        { name: 'Claude Code', group: 'Design & Product' },
        { name: 'Product Design', group: 'Design & Product' },
      ],

      // Two of the nine old `achievements`, in their original relative order.
      // Both are here rather than in finance because each one is a third party
      // confirming that a *product* was real — an incubator betting on Ambees,
      // a hackathon ranking bloop. — which is the claim this pillar makes.
      proof: [
        {
          title: 'Georgetown Summer Launch Incubator (SLI)',
          year: '2026',
          description: "Admitted to Georgetown's most competitive startup incubator with Ambees — a two-sided recruiting marketplace for early-career hiring. Backed with $5K in funding.",
        },
        {
          title: 'HoyaHacks 2026 — 3rd Overall & Best .Tech Domain',
          year: '2026',
          description: "Built bloop., a privacy-first hearing protection app, in 72 hours at Georgetown's annual hackathon. Took 3rd place overall and won the MLH Best .Tech Domain Name prize.",
        },
      ],

      // None of the six old `interests` entries is about building. The closest
      // is 'Reading' (Y Combinator content), and it went to offtheclock whole
      // rather than being torn in half — see the note on it there.
      notes: [],
    },

    // ══ FINANCE ══════════════════════════════════════════════════════════
    // Every entry in the old `work` array, the whole 'Finance' skill card, and
    // the five achievements that are a firm or a market saying yes. This is
    // the pillar the tagline's "Trader" points at, widened: the label is
    // 'Finance' rather than 'Trader' because two of these five roles are M&A
    // and real estate, and calling the section Trader would quietly demote
    // them.
    finance: {
      key: 'finance',
      label: 'Finance',

      // The old `work` array, in its original order — newest first, which is
      // also most-senior first here.
      roles: [
        {
          company: 'Clockwork Group',
          role: 'Algorithmic Trader & Developer',
          period: 'Jan 2026 – Apr 2026',
          // "metals", not "precious metals": zinc is a base metal, and the
          // sentence names all three anyway.
          description: "I build time-based price movement strategies for metals — gold, platinum, zinc — under a former hedge fund manager. I also helped brand and commercialize the firm's proprietary algorithms, which contributed to a seven-figure outcome.",
          highlight: 'Contributed to seven-figure algo commercialization',
          technologies: ['Python', 'PineScript', 'Quantitative Trading'],
        },
        {
          company: 'Georgetown A&D Investment Fund (GADIF)',
          role: 'Student Analyst',
          period: 'Fall 2025 – Present',
          // The sentence says three tickers, so all three entries are tickers
          // (HON, not Honeywell). DIME is a CRYPTO ETF, not a defense name:
          // BITW and DIME are both digital-assets vehicles; HON is the
          // aerospace name. Three tickers, two theses — the count that has to
          // hold is the tickers, which is what the sentence actually promises.
          // Same wording in the 'georgetown-ad' entry in
          // src/data/caseStudies.ts.
          description: "Georgetown's aerospace and defense student investment fund. I researched three tickers — BITW and DIME (digital-asset adoption) and HON (aerospace recovery) — and defended each thesis in front of twenty members.",
          highlight: 'Equity research across digital assets and aerospace',
          technologies: ['Equity Research', 'DCF Modeling', 'Sector Analysis'],
        },
        {
          company: 'Tungsten Partners',
          role: 'Real Estate Investment Analyst',
          period: 'Sep – Dec 2025',
          description: "I prepared research packets for the CEO, researched a Philadelphia hotel acquisition including its zoning constraints, and stress-tested a Manhattan retail conversion against the firm's feasibility framework.",
          highlight: 'Evaluated multi-million dollar acquisitions',
          technologies: ['Real Estate', 'Due Diligence', 'Zoning Analysis'],
        },
        {
          company: 'Sterling Business Capital',
          role: 'Investment Banking Analyst',
          period: 'Jun – Sep 2025',
          description: "I ran valuation and diligence on a ~$4M sell-side mandate for a consumer fragrance business, and managed the CRM tracking how investors engaged with our materials.",
          highlight: 'Led diligence on $4M M&A mandate',
          technologies: ['M&A', 'Valuation', 'Financial Analysis'],
        },
        {
          company: 'Cedar Oak Capital',
          role: 'Private Equity Analyst',
          period: 'Apr – Jun 2025',
          description: "Deal sourcing on a 10-person consumer retail team. I cold-emailed founders, qualified consulting opportunities, and screened management teams for follow-up conversations.",
          highlight: 'Consumer retail deal sourcing & outreach',
          technologies: ['Private Equity', 'Consumer Retail'],
        },
      ],

      // Empty, and this is the one that will tempt someone. The Clockwork
      // algos ARE a shipped, commercialized product — but no ProjectEntry for
      // them has ever existed, and the fact is already carried twice over: in
      // the Clockwork role above (description + highlight) and in the
      // 'Seven-Figure Algorithm Commercialization' proof below. Minting a card
      // here would mean inventing a product name, a description and a tag
      // list. A draft case study for it does exist at slug 'clockwork' in
      // src/data/caseStudies.ts; when that goes 'live', a shipped entry
      // pointing at it is the right way to fill this in.
      shipped: [],

      // The whole old 'Finance' card. Its descriptions are the only ones anywhere
      // in `tooling`, because these six are disciplines rather than apps, and
      // a discipline needs its scope stated where an app name speaks for
      // itself.
      tooling: [
        { name: 'Bloomberg Terminal', description: 'Market data, screening and live analysis', group: 'Finance' },
        { name: 'Financial Modeling', description: 'DCFs, LBOs and comps', group: 'Finance' },
        { name: 'Equity Research', description: 'Defense, aerospace, digital assets and commodities', group: 'Finance' },
        // Unlike the role description above, this row has no list to carry
        // the exception, so it has to name both classes: gold and platinum are
        // precious, zinc is base.
        { name: 'Quantitative Trading', description: 'Time-based price movement strategies for precious and base metals', group: 'Finance' },
        { name: 'Due Diligence', description: 'M&A diligence and deal sourcing', group: 'Finance' },
        { name: 'Fixed Income', description: 'Risk, allocation and duration', group: 'Finance' },
        // Moved here from the old 'Code' card, and the only tool that changed
        // pillars rather than just changing shape. PineScript is TradingView's
        // strategy language — it exists in David's stack for exactly one
        // reason, the Clockwork metals algos listed three rows up in
        // `roles`, and filing it under builder alongside Swift and React would
        // put it next to work it has nothing to do with. It keeps
        // group: 'Code' so the fact that it is a language, not a discipline,
        // is not lost in the move.
        { name: 'PineScript', group: 'Code' },
      ],

      // Five of the nine old `achievements`, in their original relative order
      // (Goldman, PIMCO, FTI, the algo, Nomura). Four are a firm selecting
      // him; the fifth is the market paying. Ordering was not re-ranked in the
      // move — reordering a CV is an editorial act and this was a refactor.
      proof: [
        {
          title: 'Goldman Sachs Possibilities Summit',
          year: '2026',
          description: "Selected for Goldman Sachs' flagship early-identification program — a multi-day program at 200 West with senior bankers and a cohort of sophomores.",
        },
        {
          title: 'PIMCO Prep 2026',
          year: '2026',
          description: "Selected for PIMCO's Prep program with one of the world's largest fixed income asset managers. The program covers institutional approaches to risk and allocation.",
        },
        {
          title: 'FTI IMPACT Leadership Consulting Program',
          year: '2026',
          description: "Admitted to FTI Consulting's IMPACT program in strategic consulting.",
        },
        {
          title: 'Seven-Figure Algorithm Commercialization',
          year: '2026',
          description: "Clockwork's trading algorithms went from internal tools to a product that sold for seven figures. I handled the branding and pitch work.",
        },
        {
          title: 'Nomura Summit Series',
          year: '2025',
          description: "Selected for Nomura's professional summit series.",
        },
      ],

      // 'Reading' — Money Stuff every day — is the old interests entry that
      // most nearly belongs here. It stayed in offtheclock because it is
      // framed as what he reads for himself, not as a research method; see
      // the note on it there.
      notes: [],
    },

    // ══ CREATOR ══════════════════════════════════════════════════════════
    // Eternity X, the apps the records are made in, and his channels —
    // YouTube and RedNote as itzdavezwrld. Absorbs the whole
    // 'Creative' skill card, the two music entries from `interests`, and the
    // streams achievement.
    creator: {
      key: 'creator',
      label: 'Creator',

      // DX Media — the outfit he started to connect artists with playlist
      // curators — is named inside the 'Music Production' note and the '2M+
      // Streams' proof below, but it was never a WorkEntry and there is no
      // period, title or description for it on record. Left as narrative
      // rather than promoted into a job he did not describe as one.
      roles: [],

      // Eternity X is a catalogue, not a ProjectEntry: no url, no tech stack,
      // no case study, and the old `projects` array never contained it. The
      // 2M+ streams, the Spotify verification and the editorial placement are
      // all carried by `proof` and `notes` below, which is where they have
      // always lived.
      shipped: [],

      // The old 'Creative' card, unchanged and in its original order. Bare app
      // names, per the rule in builder.tooling.
      tooling: [
        { name: 'Ableton Live', group: 'Creative' },
        { name: 'Final Cut Pro', group: 'Creative' },
        { name: 'CapCut', group: 'Creative' },
        { name: 'Photoshop', group: 'Creative' },
        { name: 'Adobe Creative Suite', group: 'Creative' },
      ],

      proof: [
        {
          title: '2M+ Streams as Music Producer',
          year: '2024',
          description: "Two million streams as Eternity X — verified on Spotify, placed on editorial playlists. No label, no manager. Started on GarageBand in seventh grade, switched to Ableton, produced for rappers on BeatStars, started DX Media to connect deserving artists with playlist curators. The distribution game taught me more about marketing than any class.",
        },
      ],

      // Two of the six old `interests`, in their original relative order,
      // then the Channels note — see its own comment.
      //
      // 'Multi-Instrumentalist' is the judgement call in this whole
      // restructure. It reads like a hobby — "hours behind a kit are how I
      // decompress" — which is offtheclock's brief. It is here instead
      // because the two entries are literally the same thread: 'Music
      // Production' says "I always wanted to be a one-man band, able to play
      // every instrument on a record, and I kind of got there", and
      // 'Multi-Instrumentalist' opens by repeating it. Splitting them across
      // two pillars would print that sentence twice on one page, in two
      // sections, as if it were two separate facts.
      //
      // `stat` is carried through untouched even though the old Interests
      // section never rendered it. It is real data; a component that
      // does not use a field is not a reason to drop the field.
      notes: [
        {
          name: 'Music Production',
          headline: '2M+ Streams',
          stat: '2,000,000+',
          description: "It started in seventh grade — I had opinions about every EDM track I heard and eventually decided to fix them myself. I picked up my mom's old MacBook, opened GarageBand, and never stopped. I always wanted to be a one-man band, able to play every instrument on a record, and I kind of got there. I switched to Ableton, started producing for rappers on BeatStars and SoundCloud, then built DX Media to connect artists I believed in with playlist curators who could get them heard. One of my own tracks landed on a Spotify editorial playlist — that was the unlock. Now I'm verified on Spotify with 2M+ streams as Eternity X. No label, no manager, just iteration.",
        },
        {
          name: 'Multi-Instrumentalist',
          headline: 'One-Man Band',
          description: "The original dream was to play every instrument in a band by myself — and I kind of got there. I can play a lot of instruments, but drums is the one I play exceptionally. Hours behind a kit are how I decompress. Rhythm is the foundation of everything: music, trading rhythms, conversation pace. I just think in beats.",
        },
        // The YouTube URL is rendered by Creator.tsx (its channel link
        // row, same idiom as Builder's ProjectLinks) rather than stored here:
        // InterestEntry carries no url field and widening types.ts for one
        // link was out of scope for this pass. RedNote is named but never
        // linked — there is no reliable public URL scheme for a RedNote
        // profile, and guessing one would invent a fact.
        {
          name: 'Channels',
          description: "I vlog and post building-in-public content on YouTube and RedNote as itzdavezwrld.",
        },
      ],
    },

    // ══ OFF THE CLOCK ════════════════════════════════════════════════════
    // Squash, what he reads, basketball and motorbiking.
    //
    // Cities and travel belong to this pillar conceptually, but the data does
    // NOT live here: the globe reads src/data/cities.ts and src/data/
    // memories.ts directly, and those are coordinates plus photo manifests
    // that drive a 3D scene, not copy. Duplicating even the city names into
    // this file would create a second source of truth for a list that already
    // has one, and the first time they disagreed the globe and the section
    // would print different answers. A section rendering this pillar should
    // import cities.ts alongside it.
    offtheclock: {
      key: 'offtheclock',
      label: 'Off the Clock',

      // Nothing off the clock is a job, a product, or an app he opens.
      roles: [],
      shipped: [],
      tooling: [],

      // Empty: the squash titles live in the Club Squash note below, with no
      // year attached, so there is no unverified year to carry.
      proof: [],

      // Club Squash leads because it is the one with a headline and a stat.
      //
      // 'Reading' is here rather than split between finance (Matt Levine) and
      // builder (Y Combinator). Both halves are one sentence about what David
      // reads for himself; cutting it in two would turn a personal habit into
      // two claims of professional method, which is more than the copy says.
      notes: [
        {
          name: 'Club Squash',
          headline: 'Club team at Georgetown · Varsity at St. Mark\'s',
          stat: 'CSA',
          description: "I play on Georgetown's club squash team — a Division 1 club team in CSA. In high school I played varsity at St. Mark's all four years, where we won the Class D nationals championship and the Class C New England championships.",
        },
        {
          name: 'Reading',
          headline: 'Matt Levine & YC',
          description: "Money Stuff by Matt Levine is the best thing written about finance — if you want to understand how markets actually work, read it every day. I also go through a lot of Y Combinator content, founders talking about the worst days of building. Recently I've been very into investing and startup books. Always open to recommendations.",
        },
        // Headlines are set because OffTheClock.tsx prints `headline ?? name` as the label above the
        // name — a note without one prints its name twice.
        {
          name: 'Basketball',
          headline: 'Jayson Tatum Fan',
          description: "I play, and I'm a big Jayson Tatum fan.",
        },
        {
          name: 'Motorbiking',
          headline: 'Kawasaki or Yamaha',
          description: "Recently getting into it — getting a Kawasaki or Yamaha soon.",
        },
      ],
    },
  },

  // Reading order down the page. Builder first because the statement opens on
  // "Ex-founder" and the page should not contradict its own first line;
  // offtheclock last because it is the one that stops selling. Finance before
  // creator follows the tagline's own order — "Builder, Trader, Creator".
  pillarOrder: ['builder', 'finance', 'creator', 'offtheclock'],

  contact: {
    email: 'mrdxdavidxie@gmail.com',
    github: 'https://github.com/davidaxie',
    linkedin: 'https://www.linkedin.com/in/davidctxie/',
    twitter: 'https://twitter.com/David_A_Xie',
    instagram: 'https://instagram.com/_davidaxie_',
    website: 'https://ambees.io',
  },
};
