import type { Metadata } from "next";
import { getAllCaseStudies } from "@/lib/caseStudies";
import { CaseStudyCard } from "@/components/portfolio/CaseStudyCard";
import { SITE_NAME } from "@/lib/site";

// One string, four consumers (<title>, description, og:*, twitter:*) — the
// same discipline lib/site.ts applies to the homepage copy.
const PAGE_TITLE = "Portfolio — David Xie";
const PAGE_DESCRIPTION =
  "Case studies in product thinking: how I frame problems, make decisions under constraint, and measure whether what I shipped was worth shipping.";

export const metadata: Metadata = {
  // Spelled out rather than left as "Portfolio" for the layout's
  // `title.template` to finish. Next applies `title.template` to CHILD route
  // segments only — never to the page.tsx sitting in the same segment as the
  // layout that declares it — so "Portfolio" shipped verbatim while every
  // other page on the site ends in "— David Xie". /portfolio/[slug] IS a child
  // segment, which is why the case studies got the suffix and the index did not.
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/portfolio" },
  // openGraph/twitter are merged whole, not key-by-key: leaving them off did
  // not inherit-and-patch the root block, it shipped the root block intact, so
  // /portfolio unfurled in Slack and iMessage as the homepage — "David Xie —
  // Builder, Trader, Creator" over the homepage's description. siteName and
  // locale are repeated here for that same reason: replacing the object drops
  // whatever it does not restate.
  openGraph: {
    type: "website",
    url: "/portfolio",
    siteName: SITE_NAME,
    locale: "en_US",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    // Restated for the same reason siteName and locale are. `src/app/
    // opengraph-image.tsx` injects `images` into the ROOT layout's resolved
    // openGraph, and declaring this object replaces that block wholesale — so
    // without this line /portfolio was the one route unfurling with no image
    // while the homepage had one. `metadataBase` makes the path absolute.
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export default function PortfolioIndex() {
  const studies = getAllCaseStudies();
  // Newest `updated` across the LIVE studies — the only ones this page lists,
  // so the only ones its date may speak for. This was `new Date()`, which in a
  // statically-prerendered server component is evaluated once at build: the
  // line read "Last updated" but meant "last deployed", and a redeploy that
  // changed nothing still moved it forward. Parsed as UTC (the `T00:00:00Z`)
  // and formatted in UTC so the printed day matches the stored one regardless
  // of where the build machine thinks it is.
  // `""` as the seed rather than `studies[0].updated`: every study being flipped
  // to draft is a supported state (the list below already renders empty), and it
  // must not take the whole route down with a read off undefined.
  const newestUpdated = studies.reduce((newest, c) => (c.updated > newest ? c.updated : newest), "");
  const lastUpdated = newestUpdated
    ? new Date(`${newestUpdated}T00:00:00Z`).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;

  return (
    <main className="px-6 pt-28 pb-24">
      <div className="max-w-3xl mx-auto">
        {/* ── Masthead — product-portfolio mono label, then serif statement
            title, then the "here's what I actually do" paragraph. Tom
            MacWright's "portfolio-as-bookshelf" framing, not a pitch deck. ── */}
        <header className="mb-16">
          <p
            className="font-mono text-xs uppercase tracking-[0.25em] mb-6"
            style={{ color: "var(--portfolio-accent)" }}
          >
            Product Portfolio · David Xie
          </p>

          <h1
            className="font-serif text-4xl md:text-5xl lg:text-6xl font-light mb-6"
            style={{
              color: "var(--portfolio-text-primary)",
              lineHeight: 1.1,
              letterSpacing: "0em",
            }}
          >
            Case studies in product thinking.
          </h1>

          <p
            className="text-lg md:text-xl max-w-2xl"
            style={{
              color: "var(--portfolio-text-secondary)",
              lineHeight: 1.6,
            }}
          >
            A working record of how I frame problems, make decisions under
            constraint, and measure whether the thing I shipped was worth
            shipping. Written first-person, published when I think I have
            something to say.
          </p>
        </header>

        {/* ── "Now" section — Tom MacWright move. Dated snapshot of
            current focus, 3–5 lines, updated when material. Lower commitment
            than a case study, higher signal than nothing. ── */}
        <section
          className="mb-16 py-6 pl-5"
          style={{ borderLeft: "2px solid var(--portfolio-hairline)" }}
        >
          <p
            className="font-mono text-xs uppercase tracking-[0.25em] mb-3"
            style={{ color: "var(--portfolio-accent)" }}
          >
            Now
          </p>
          <p
            className="text-base md:text-lg"
            style={{
              color: "var(--portfolio-text-secondary)",
              lineHeight: 1.65,
            }}
          >
            Writing algos at Clockwork. Building Ambees, a two-sided
            recruiting marketplace matching university students with
            mid-tier Fortune 500 employers. Selected for Goldman Sachs
            Possibilities Summit, PIMCO Prep, and FTI IMPACT this cycle.
            Still making beats as Eternity X.
          </p>
        </section>

        {/* ── Case study list — chronological, latest first. Dividers are
            the top border of the first card plus each card's bottom border,
            so the column reads as a continuous ledger. ── */}
        <div className="border-t" style={{ borderColor: "var(--portfolio-hairline)" }}>
          {studies.map((study, i) => (
            <CaseStudyCard key={study.slug} study={study} index={i} />
          ))}

          {studies.length === 0 && (
            <p
              className="py-24 text-center"
              style={{ color: "var(--portfolio-text-tertiary)" }}
            >
              Case studies forthcoming.
            </p>
          )}
        </div>

        {/* ── Footer — just the ledger. ── */}
        <footer
          className="mt-24 pt-8 border-t flex items-baseline justify-between gap-6 flex-wrap"
          style={{ borderColor: "var(--portfolio-hairline)" }}
        >
          {lastUpdated && (
            /* Tertiary, not quaternary: quaternary is 2.45:1 on
               --portfolio-bg and this is real 12px text. See the token
               note in portfolio.css. */
            <span
              className="font-mono text-xs uppercase tracking-[0.25em]"
              style={{ color: "var(--portfolio-text-tertiary)" }}
            >
              Last updated · {lastUpdated}
            </span>
          )}
          <a
            href="mailto:mrdxdavidxie@gmail.com"
            className="font-mono text-xs uppercase tracking-[0.25em] transition-colors hover:text-[color:var(--portfolio-accent)]"
            style={{ color: "var(--portfolio-text-tertiary)" }}
          >
            mrdxdavidxie@gmail.com
          </a>
        </footer>
      </div>
    </main>
  );
}
