import type { MDXComponents } from "mdx/types";
import Image, { type ImageProps } from "next/image";

// ──────────────────────────────────────────────────────────────────────
// MDX component map for case studies.
//
// Every primitive here exists because the 8-move PM case study spine needs
// it: Callout for the Insight section, Metric for Outcome, Figure for
// Execution, PullQuote for user verbatims, OptionTable for the Decision
// section's tradeoff matrix. Anything beyond this list should be a one-off
// in a specific case study, not added here.
// ──────────────────────────────────────────────────────────────────────

type CalloutIntent = "note" | "insight" | "warning";

const CALLOUT_STYLES: Record<
  CalloutIntent,
  { label: string; accent: string }
> = {
  note: { label: "Note", accent: "var(--portfolio-text-secondary)" },
  insight: { label: "Insight", accent: "var(--portfolio-accent)" },
  warning: { label: "Caveat", accent: "#E07B5C" },
};

function Callout({
  intent = "note",
  label,
  children,
}: {
  intent?: CalloutIntent;
  label?: string;
  children: React.ReactNode;
}) {
  const style = CALLOUT_STYLES[intent];
  return (
    <aside
      className="my-10 p-6 rounded"
      style={{
        background: "var(--portfolio-surface)",
        border: "1px solid var(--portfolio-hairline)",
        borderLeftWidth: "2px",
        borderLeftColor: style.accent,
      }}
    >
      <div
        className="font-mono text-xs uppercase tracking-[0.22em] mb-3"
        style={{ color: style.accent }}
      >
        {label ?? style.label}
      </div>
      <div style={{ color: "var(--portfolio-text-primary)" }}>{children}</div>
    </aside>
  );
}

// Metric tile — single KPI with optional before/after change. Stack two
// or three in a row for an Outcome section. Uses the display serif to
// make the number itself the focal point, not the chrome.

function Metric({
  value,
  label,
  change,
}: {
  value: string;
  label: string;
  change?: string;
}) {
  return (
    <div className="my-6 py-4">
      <div
        className="font-serif"
        style={{
          color: "var(--portfolio-text-primary)",
          fontSize: "clamp(2.5rem, 6vw, 3.5rem)",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div
        className="font-mono text-xs uppercase tracking-[0.2em] mt-2"
        style={{ color: "var(--portfolio-text-tertiary)" }}
      >
        {label}
      </div>
      {change && (
        <div
          className="font-mono text-xs mt-1"
          style={{ color: "var(--portfolio-accent)" }}
        >
          {change}
        </div>
      )}
    </div>
  );
}

function Figure({
  src,
  alt,
  caption,
  width = 1600,
  height = 1000,
  breakOut = true,
}: {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  breakOut?: boolean;
}) {
  return (
    <figure
      className="my-12"
      style={{
        maxWidth: breakOut ? "840px" : "680px",
        marginInline: "auto",
      }}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="w-full h-auto rounded"
        style={{ border: "1px solid var(--portfolio-hairline)" }}
      />
      {caption && (
        <figcaption
          className="font-mono text-xs italic mt-3"
          style={{
            color: "var(--portfolio-text-tertiary)",
            letterSpacing: "0.02em",
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// PullQuote — breaks out of reading column, hairline rules above/below,
// optional attribution. No left border, no decorative quotation marks —
// the serif italic + rules carry it.

function PullQuote({
  children,
  attribution,
}: {
  children: React.ReactNode;
  attribution?: string;
}) {
  return (
    <blockquote
      className="text-center"
      style={{
        maxWidth: "800px",
        margin: "4.5rem auto",
        padding: "2.25rem 0",
        borderTop: "1px solid var(--portfolio-hairline)",
        borderBottom: "1px solid var(--portfolio-hairline)",
      }}
    >
      {/* A <div>, not a <p>. In MDX the quote body is written as a blank-line-
          separated block, so remark has ALREADY wrapped `children` in its own
          <p> before it reaches here — this element wrapping it in a second one
          produced `<p><p>…</p></p>`, which is invalid HTML. The browser's parser
          silently closes the outer <p> at the inner one, so the server markup
          and the client tree disagree and React logs a hydration failure and
          regenerates the subtree. That was visible, not just a console warning:
          the styled paragraph came out EMPTY and the quote landed in an
          unstyled sibling, so the pull quote painted at body size in the body
          font before snapping to 28px serif italic.
          A <div> nests legally and the type is unaffected — every property set
          here inherits, and the only `.prose-editorial p` rule is a
          margin-bottom, zeroed below so the inner <p> does not push the
          bottom hairline down by 1.25rem. */}
      <div
        className="pull-quote-body font-serif italic"
        style={{
          color: "var(--portfolio-text-primary)",
          fontSize: "1.75rem",
          lineHeight: 1.3,
          letterSpacing: "-0.005em",
        }}
      >
        {children}
      </div>
      {attribution && (
        <footer
          className="font-mono text-xs mt-4"
          style={{
            color: "var(--portfolio-text-tertiary)",
            letterSpacing: "0.05em",
          }}
        >
          — {attribution}
        </footer>
      )}
    </blockquote>
  );
}

// OptionTable — the decision-section tradeoff matrix. Pass an array of
// {name, summary, verdict} rows. Verdict = "picked" | "considered" |
// "dropped" renders with different accents so the chosen row is obvious.

type OptionRow = {
  name: string;
  summary: string;
  verdict?: "picked" | "considered" | "dropped";
};

function OptionTable({ rows }: { rows: OptionRow[] }) {
  return (
    <div
      // ── Why this scrolls rather than clipping ──
      // The table is `w-full`, but no table lays out narrower than its
      // min-content width. Measured against the vendored fonts that floor is
      // 371px (mapperlap) / 365px (bloop): "collaborative" and
      // "personalization," in the two body columns, plus "CONSIDERED" at
      // text-xs mono tracking-[0.15em] (90px) in the Verdict column, each with
      // px-4 either side. The reading column is `.prose-editorial` inside the
      // route's `px-6` wrapper — 327px at a 375px viewport — so the table
      // overhangs by ~40px, and keeps overhanging until roughly 415px of
      // viewport.
      //
      // This used to be `overflow-hidden`, which discarded that overhang
      // outright; `body { overflow-x: hidden }` in globals.css meant the page
      // could not be panned to recover it either. What got discarded was the
      // right edge of the Verdict column — the picked/considered/dropped cell
      // that is the entire point of a tradeoff matrix.
      //
      // `overflow-x-auto` clips to the border-radius exactly as
      // `overflow-hidden` did (any non-`visible` overflow value does), so the
      // rounded corners survive; the overhang becomes scrollable instead of
      // gone, and since globals.css no longer strips scrollbars from inner
      // scrollers, the scrollbar itself is the "there is more to the right"
      // affordance. No `min-w-` on the table: at 375px the overhang is only
      // ~40px, so most of the Verdict column is on screen already, and forcing
      // the table wider would push that column fully out of view — the exact
      // failure being fixed.
      //
      // role/aria-label/tabIndex because no cell holds focusable content: an
      // un-focusable scroll container is mouse- and touch-only, which fails
      // WCAG 2.1.1. The ring comes free from `[tabindex]:focus-visible` in
      // globals.css.
      role="region"
      aria-label="Options considered"
      tabIndex={0}
      className="my-10 rounded overflow-x-auto"
      style={{ border: "1px solid var(--portfolio-hairline)" }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr
            style={{
              background: "var(--portfolio-surface)",
              borderBottom: "1px solid var(--portfolio-hairline)",
            }}
          >
            <th
              className="text-left py-3 px-4 font-mono text-xs uppercase tracking-[0.18em]"
              style={{ color: "var(--portfolio-text-tertiary)" }}
            >
              Option
            </th>
            <th
              className="text-left py-3 px-4 font-mono text-xs uppercase tracking-[0.18em]"
              style={{ color: "var(--portfolio-text-tertiary)" }}
            >
              What it was
            </th>
            <th
              className="text-left py-3 px-4 font-mono text-xs uppercase tracking-[0.18em]"
              style={{ color: "var(--portfolio-text-tertiary)" }}
            >
              Verdict
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const picked = row.verdict === "picked";
            return (
              <tr
                key={row.name + i}
                style={{
                  borderBottom:
                    i < rows.length - 1
                      ? "1px solid var(--portfolio-hairline)"
                      : undefined,
                  background: picked ? "rgba(200, 169, 126, 0.05)" : undefined,
                }}
              >
                <td
                  className="py-3 px-4 font-medium"
                  style={{ color: "var(--portfolio-text-primary)" }}
                >
                  {row.name}
                </td>
                <td
                  className="py-3 px-4"
                  style={{ color: "var(--portfolio-text-secondary)" }}
                >
                  {row.summary}
                </td>
                <td
                  className="py-3 px-4 font-mono text-xs uppercase tracking-[0.15em]"
                  style={{
                    color: picked
                      ? "var(--portfolio-accent)"
                      : "var(--portfolio-text-tertiary)",
                  }}
                >
                  {row.verdict ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// next/image wrapper that satisfies MDX's loose `<img>` signature. Without
// this, bare `<img src=".." />` in MDX skips next/image optimization.

function MDXImage(
  props: Partial<ImageProps> & { src: string; alt?: string },
) {
  return (
    <Image
      {...props}
      src={props.src}
      alt={props.alt ?? ""}
      width={props.width ? Number(props.width) : 1600}
      height={props.height ? Number(props.height) : 1000}
      className="w-full h-auto rounded my-8"
      style={{ border: "1px solid var(--portfolio-hairline)" }}
    />
  );
}

export const mdxComponents: MDXComponents = {
  Callout,
  Metric,
  Figure,
  PullQuote,
  OptionTable,
  img: MDXImage as MDXComponents["img"],
};
