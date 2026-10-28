import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  // `mdx` + `md` join `tsx`/`ts` so MDX files under app/ or content/ compile
  // as first-class Next.js modules.
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  transpilePackages: ["three"],
};

// NOTE: Turbopack (Next.js 16's default bundler) requires MDX plugins to be
// referenced as string tuples, not imported function references. This is
// because Turbopack runs loader options through a serialization boundary and
// functions can't cross it.
//   Docs: https://nextjs.org/docs/app/guides/mdx#configure-mdx-with-turbopack
// Plugins used:
//   - `remark-gfm` — GitHub-flavored markdown (tables, strikethrough, task lists)
//   - `rehype-slug` — auto IDs on every heading
//   - `rehype-autolink-headings` — append a "#" deep link after each heading
//
// That plugin ran with `behavior: "wrap"`, which put the whole heading text
// inside <a href="#its-own-id">. Three problems, none of them cosmetic:
// every H2 announced as a link to a screen reader, each one became a tab stop
// whose only styling portfolio.css could give it was "look exactly like a
// heading" (seven stops per case study with nothing to explain them), and the
// click target covered the entire display heading, so dragging to select the
// text fought a link.
//
// `append` fixes all three at once. The heading text goes back to being text;
// the deep link becomes one small "#" after it, hidden at opacity 0 and
// revealed on hover (see the Heading anchors block in portfolio.css) — the
// GitHub/MDN convention, so it needs no explaining. And the plugin's default
// `properties` for append/prepend is `{ariaHidden: true, tabIndex: -1}`, which
// is why the phantom tab stops disappear rather than merely getting an
// affordance: leave `properties` unset so that default keeps applying.
const withMDX = createMDX({
  options: {
    remarkPlugins: [["remark-gfm", {}]],
    rehypePlugins: [
      ["rehype-slug", {}],
      [
        "rehype-autolink-headings",
        { behavior: "append", content: { type: "text", value: "#" } },
      ],
    ],
  },
});

export default withMDX(nextConfig);
