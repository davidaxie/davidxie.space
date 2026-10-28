import Link from "next/link";
import type { CaseStudy } from "@/data/caseStudies";

// Editorial index card — ordinal anchor + serif title + tagline + inline tags.
// No thumbnail. Hover: ordinal turns champagne, title gains a one-pixel underline.
// Pattern: Tom MacWright ledger meets Craig Mod's essay index.

interface Props {
  study: CaseStudy;
  index: number; // zero-based, rendered as "01", "02"…
}

export function CaseStudyCard({ study, index }: Props) {
  const ordinal = String(index + 1).padStart(2, "0");

  // "Mapperlap — find where your world overlaps" already carries its own
  // context ("Mapperlap"), so appending it would stutter. Only qualify the
  // title when the context adds something the title has not already said.
  const label = study.title.includes(study.context)
    ? study.title
    : `${study.title}, ${study.context}`;

  return (
    // One <a> wraps the whole card, so without an explicit name the accessible
    // name is every descendant string concatenated — "…HoyaHacks 2026" ran
    // straight into "Feb 2026" and read as the number 202672. Name the link by
    // what it goes to (title + context); the tagline, period and tags are still
    // in the DOM for anyone reading the card itself.
    <Link
      href={`/portfolio/${study.slug}`}
      aria-label={label}
      className="group flex items-start gap-6 py-10 border-b transition-colors focus-visible:outline-2 focus-visible:outline-[color:var(--portfolio-accent)] focus-visible:outline-offset-4"
      style={{ borderColor: "var(--portfolio-hairline)" }}
    >
      {/* Ordinal — turns champagne on hover */}
      <span className="card-ordinal mt-[0.35em]" aria-hidden="true">
        {ordinal}
      </span>

      {/* Content column */}
      <div className="flex-1 min-w-0">
        {/* Metadata row — context + period */}
        <div className="flex items-baseline justify-between gap-6 mb-3">
          <span
            className="font-mono text-xs uppercase tracking-[0.2em]"
            style={{ color: "var(--portfolio-text-tertiary)" }}
          >
            {study.context}
          </span>
          <span
            className="font-mono text-xs flex-shrink-0"
            style={{ color: "var(--portfolio-text-tertiary)" }}
          >
            {study.period}
            {study.readMinutes ? ` · ${study.readMinutes} min` : ""}
          </span>
        </div>

        {/* Title */}
        <h2
          className="font-serif text-3xl md:text-4xl font-light mb-3"
          style={{
            color: "var(--portfolio-text-primary)",
            lineHeight: 1.15,
            letterSpacing: "0em",
          }}
        >
          <span className="transition-[text-underline-offset,text-decoration-color] duration-150 [text-decoration-color:transparent] group-hover:underline group-hover:[text-decoration-color:var(--portfolio-accent)] group-hover:[text-underline-offset:6px] group-hover:[text-decoration-thickness:1px]">
            {study.title}
          </span>
        </h2>

        {/* Tagline */}
        <p
          className="text-base md:text-lg mb-5 max-w-2xl"
          style={{
            color: "var(--portfolio-text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {study.tagline}
        </p>

        {/* Tags — inline text with CSS dot separators, no border pills */}
        <div className="flex flex-wrap">
          {study.tags.map((tag) => (
            <span key={tag} className="tag-inline">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
