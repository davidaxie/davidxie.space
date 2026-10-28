import type { Metadata } from "next";
import "./portfolio.css";

// Portfolio tab is an editorial route — warm near-black, Fraunces display,
// Plus Jakarta body, champagne accent. Deliberately NO cosmic chrome:
// no Three.js canvas, no starfield, no cursor glow. The TabBar in the
// root layout remains the only persistent element.
//
// Design tokens scoped to `.portfolio-root` so they can't leak into the
// cosmic home (which uses its own --color-void / --color-text-* tokens).

export const metadata: Metadata = {
  title: {
    default: "Portfolio — David Xie",
    template: "%s — David Xie",
  },
  // Description names only the case studies that are `status: 'live'` in
  // src/data/caseStudies.ts. Ambees and Clockwork are drafts — promising
  // them here sells a page the visitor can't actually reach. Update this
  // line whenever an entry flips draft → live.
  description:
    "Product management case studies: research, framing, decision, outcome. Work from Mapperlap and bloop. — two shipped personal projects.",
};

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="portfolio-root min-h-screen"
      style={{ background: "#131110", color: "#E8E3DA" }}
    >
      {children}
    </div>
  );
}
