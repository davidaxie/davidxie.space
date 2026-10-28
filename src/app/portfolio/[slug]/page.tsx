import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCaseStudySlugs, getCaseStudy } from "@/lib/caseStudies";
import { SITE_NAME } from "@/lib/site";
import { CaseStudyHero } from "@/components/portfolio/CaseStudyHero";
import { Prose } from "@/components/portfolio/Prose";

// ──────────────────────────────────────────────────────────────────────
// Individual case study route.
//
// generateStaticParams pre-renders every `live` case study at build time.
// Drafts are filtered out by getAllCaseStudySlugs (via getAllCaseStudies),
// so flipping `status: "draft" → "live"` in src/data/caseStudies.ts is
// the only step needed to publish a new case study once its MDX file exists.
// ──────────────────────────────────────────────────────────────────────

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getAllCaseStudySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) {
    return { title: "Case study not found" };
  }
  return {
    title: study.title,
    description: study.summary,
    alternates: { canonical: `/portfolio/${slug}` },
    openGraph: {
      title: study.title,
      description: study.summary,
      type: "article",
      // Relative — metadataBase in the root layout resolves it. Without a url
      // the card carries no permalink back to the page it describes.
      url: `/portfolio/${slug}`,
      siteName: SITE_NAME,
      locale: "en_US",
      // Restated for the same reason siteName and locale are, and it is the
      // same wholesale-replace trap this block's own comment describes:
      // src/app/opengraph-image.tsx injects `images` into the ROOT layout's
      // resolved openGraph, and declaring this object drops whatever it does
      // not restate — so every case study was unfurling with no image while
      // the homepage had one. `metadataBase` makes the path absolute.
      images: ["/opengraph-image"],
    },
    // Metadata objects are replaced wholesale, not deep-merged. Defining
    // openGraph and stopping there left `twitter` inherited from the root
    // layout, so every case study's Twitter/X card announced the homepage:
    // "David Xie — Builder, Trader, Creator". Plenty of crawlers prefer the
    // twitter:* tags over og:* when both are present, so this was not
    // cosmetic — it was the wrong title on the shared link.
    twitter: {
      card: "summary_large_image",
      title: study.title,
      description: study.summary,
    },
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) {
    notFound();
  }

  // Dynamic MDX import — compiled at build time by @next/mdx because
  // `pageExtensions` in next.config.ts includes 'mdx'. The template literal
  // is resolvable statically by the bundler because the base path is fixed.
  const Content = (
    await import(`@/content/case-studies/${slug}.mdx`)
  ).default;

  return (
    <main className="pb-32">
      <CaseStudyHero study={study} />

      <div className="px-6">
        <Prose>
          <Content />
        </Prose>
      </div>

      {/* ── Sign-off — closes every case study with the same quiet footer.
          Returns focus to the index without demanding a click. ── */}
      <footer
        className="max-w-3xl mx-auto px-6 mt-20 pt-8 border-t flex items-baseline justify-between gap-6 flex-wrap"
        style={{ borderColor: "var(--portfolio-hairline)" }}
      >
        {/* Tertiary, not quaternary: quaternary is 2.45:1 on --portfolio-bg
            and this is real 12px text. See the token note in portfolio.css. */}
        <span
          className="font-mono text-xs uppercase tracking-[0.25em]"
          style={{ color: "var(--portfolio-text-tertiary)" }}
        >
          Case study · {study.slug}
        </span>
        {/* next/link, not a raw <a> — an internal href on an anchor forces a
            full document reload, dropping client state and re-fetching the
            bundle instead of doing a client-side transition. */}
        <Link
          href="/portfolio"
          className="font-mono text-xs uppercase tracking-[0.25em] transition-colors hover:text-[color:var(--portfolio-accent)]"
          style={{ color: "var(--portfolio-text-tertiary)" }}
        >
          All case studies <span aria-hidden="true">→</span>
        </Link>
      </footer>
    </main>
  );
}
