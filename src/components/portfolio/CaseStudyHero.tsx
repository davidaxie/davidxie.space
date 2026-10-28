import Link from "next/link";
import type { CaseStudy } from "@/data/caseStudies";

// Editorial case study header — an un-bordered mono eyebrow row (context on
// the left, period on the right), a serif display H1, a one-line dek, then a
// hairline-bordered <dl> carrying Role and, when the study declares
// readMinutes, Read time. Period is NOT in the <dl>; it rides in the eyebrow
// row above, which is why that row exists at all.
//
// The <dl> used to carry a Context row as well, which put study.context on the
// page twice — once as the accent eyebrow, once as a labelled <dd> — so
// sighted and screen-reader readers both got it doubled. The eyebrow won the
// tie-break: context is an organisation name ("HoyaHacks 2026", "Clockwork
// Group"), which reads as a kicker rather than as a definition; the
// eyebrow+period pairing mirrors the metadata row CaseStudyCard shows on the
// index, so a reader arriving from there finds the same two facts in the same
// place; and it is the hero's only accent-coloured element. Role keeps its
// label because "Product & Engineering" standing alone is ambiguous in a way
// that a company name is not.
//
// No cover image by default — the hook paragraph in the MDX is the visual
// anchor. If a case study needs a hero image, drop a <Figure /> right after
// the hook text inside the MDX.

export function CaseStudyHero({ study }: { study: CaseStudy }) {
  return (
    <header className="max-w-3xl mx-auto px-6 pt-28 pb-12">
      <Link
        href="/portfolio"
        className="font-mono text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2 mb-10 transition-colors hover:text-[color:var(--portfolio-accent)] focus-visible:outline-2 focus-visible:outline-[color:var(--portfolio-accent)] focus-visible:outline-offset-2"
        style={{ color: "var(--portfolio-text-tertiary)" }}
      >
        <span aria-hidden="true">←</span> All case studies
      </Link>

      <div className="flex items-baseline justify-between gap-6 mb-6">
        <span
          className="font-mono text-xs uppercase tracking-[0.22em]"
          style={{ color: "var(--portfolio-accent)" }}
        >
          {study.context}
        </span>
        <span
          className="font-mono text-xs"
          style={{ color: "var(--portfolio-text-tertiary)" }}
        >
          {study.period}
        </span>
      </div>

      <h1
        className="font-serif font-normal mb-6"
        style={{
          color: "var(--portfolio-text-primary)",
          fontSize: "clamp(2.25rem, 6vw, 4rem)",
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
        }}
      >
        {study.title}
      </h1>

      <p
        className="text-lg md:text-xl mb-10"
        style={{
          color: "var(--portfolio-text-secondary)",
          lineHeight: 1.6,
          maxWidth: "42rem",
        }}
      >
        {study.tagline}
      </p>

      <dl
        className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5 py-6 border-y"
        style={{ borderColor: "var(--portfolio-hairline)" }}
      >
        <div>
          <dt
            className="font-mono text-[11px] uppercase tracking-[0.22em] mb-1"
            style={{ color: "var(--portfolio-text-tertiary)" }}
          >
            Role
          </dt>
          <dd style={{ color: "var(--portfolio-text-primary)" }}>{study.role}</dd>
        </div>
        {study.readMinutes && (
          <div>
            <dt
              className="font-mono text-[11px] uppercase tracking-[0.22em] mb-1"
              style={{ color: "var(--portfolio-text-tertiary)" }}
            >
              Read
            </dt>
            <dd style={{ color: "var(--portfolio-text-primary)" }}>
              {study.readMinutes} min
            </dd>
          </div>
        )}
      </dl>
    </header>
  );
}
