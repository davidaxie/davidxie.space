import { caseStudies, type CaseStudy } from "@/data/caseStudies";

// Pure-function loaders over the typed catalog. Kept separate from the
// data definition so routes/pages import from `lib/` (behavior) while
// the data file stays a boring, typed source of truth.

export function getAllCaseStudies(): CaseStudy[] {
  return [...caseStudies]
    .filter((c) => c.status === "live")
    .sort((a, b) => a.order - b.order);
}

export function getCaseStudy(slug: string): CaseStudy | null {
  return (
    caseStudies.find((c) => c.slug === slug && c.status === "live") ?? null
  );
}

export function getAllCaseStudySlugs(): string[] {
  return getAllCaseStudies().map((c) => c.slug);
}
