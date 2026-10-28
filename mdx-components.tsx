import type { MDXComponents } from "mdx/types";
import { mdxComponents } from "@/components/portfolio/MDXComponents";

// Next.js App Router convention — a single top-level hook that returns the
// component map used by every MDX file in the project. Spreads user-passed
// components first so per-route overrides win, then folds in our editorial
// primitives (Callout, Metric, Figure, PullQuote, OptionTable, optimized img).
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    ...mdxComponents,
  };
}
