'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { siteContent } from '@/data/content';

// ── Why the left half of this section is empty ──
//
// This used to lay a full-width block of copy directly over Mercury, and the
// two best things on screen fought each other: prose is hard to read across a
// lit sphere, and the sphere was hidden behind the prose. Footprints.tsx solved
// that first — half the frame is a window onto the planet the canvas is already
// drawing behind the page, and everything readable lives in the other half.
// This section follows it, mirrored: content sits RIGHT, and the LEFT half is
// deliberately, genuinely empty. The camera displaces Mercury into it; that
// displacement is not built here and nothing in this file moves the planet.
//
// What that rejects, explicitly: no card, no scrim, no blur, no tinted panel
// behind the text. Readability here is won by moving the copy off the planet,
// not by painting over it — a background would put us straight back where we
// started, with a slab on top of a sphere. The empty half also carries no
// interactive box, because it sits over clickable scene objects and would eat
// clicks aimed at the planets: the section is pointer-events-none and only the
// content column opts back in.
//
// Below md there is no room to split. The empty half is `hidden md:block`, the
// copy runs as a single column, and the globe reads as a backdrop instead.
//
// ── Why this section is not a 3-up card grid any more ──
//
// The shape being replaced laid the three shipped products out as three equal
// tiles in one row. That was wrong in a way the data itself says out loud:
// content.ts notes that `shipped` is ordered Ambees-first "because the section
// that renders this treats shipped[0] as the featured item", and Ambees is the
// only entry with a company, an incubator and a four-sentence `story` behind
// it. A uniform grid throws all of that away — it gives a funded product the
// same 320px box as a 72-hour hackathon build, and then has to truncate the
// one paragraph on the page that actually explains what David built and why.
//
// So: Ambees gets the top of the section at display size, with its story set
// as real prose at a reading measure. bloop. and Mapperlap follow as a
// supporting pair — name, impact and description at half the weight, with
// `story` deliberately dropped (see the note on the supporting map below) —
// which is an honest ranking rather than a flattening one. Side projects come
// next, one step down
// again: compact hairline entries under a quiet label, description and tags
// only, no impact line and no links — the data carries no urls, and rendering
// none is the honest treatment of software with nothing to visit yet. Tooling
// and proof sit below that as subordinate evidence; they are what backs the
// products up, not peers of them.
//
// ── What is deliberately absent ──
// `roles` and `notes` are empty arrays for this pillar and nothing here fills
// them. content.ts spells out why (there was never an Ambees WorkEntry, and no
// interest entry is about building), and both comments exist specifically to
// stop a component from inventing copy to close the gap. Every array below is
// mapped; nothing is looked up by name and no count is hardcoded.

export function Builder() {
  const { label, shipped, sideProjects, tooling, proof } = siteContent.pillars.builder;

  // shipped[0] is the featured product by data order, not by name — see the
  // ordering note in content.ts. The rest read as the supporting pair.
  const [featured, ...supporting] = shipped;

  // ── The first-comma split ──
  // `impact` is one string that CAN carry two registers: a headline and a
  // qualifier. Splitting on the FIRST comma gives the head to the display line
  // and the tail to a small mono subtitle. As of 2026-08-21 no current impact
  // carries a comma — the split exists to guard the Ambees slot: content.ts
  // warns that adding a comma there silently resurrects a second line under
  // the headline, the slot where the old "$10K funding" used to sit.
  // Comma-free in, no subtitle out: keep it.
  const splitImpact = (impact?: string) => {
    if (!impact) return { head: undefined, tail: undefined };
    const comma = impact.indexOf(',');
    if (comma === -1) return { head: impact, tail: undefined };
    return {
      head: impact.slice(0, comma),
      tail: impact.slice(comma + 1).trim(),
    };
  };

  const featuredImpact = splitImpact(featured?.impact);

  return (
    <section
      id="builder"
      className="relative overflow-hidden min-h-screen flex items-center py-16 sm:py-32 pointer-events-none"
    >
      {/* PlanetDecoration (mercury) removed 2026-08-19 — even the neutral gray
          glow went, for consistency with the other sections (user feedback, see
          Finance): the real 3D planets are the graphics here. */}

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-6 relative z-[1] md:grid-cols-2 md:gap-14">
        {/* LEFT — intentionally empty. This is Mercury's half of the frame: no
            panel, no scrim, no box of any kind, so the planet reads through it
            and nothing here intercepts a click meant for the scene. Hidden on
            mobile, where there is no room to split. */}
        <div aria-hidden className="hidden md:block" />

        {/* RIGHT — every readable thing in this section, and the only part that
            opts back into pointer events. Mercury is small and grey, so it can
            sit close to this edge without the copy having to fight it. */}
        <div className="pointer-events-auto">
          <SectionHeader label="// Mercury" title={label} gradient="mercury" sectionNumber="03" />

          {/* ── Featured product ──
              The old shape put the name/impact rail beside the story in two
              columns. At half the frame that would leave two starved measures, so
              it is recomposed as one stack: name at display size, impact under it,
              then the story running the full width of this column while the pair
              below is split in two. Featured-ness now comes from type size and
              from being the only thing here that gets the whole measure — not from
              a border, a background, or a bigger tile. */}
          {featured && (
            <motion.article
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="max-w-[54ch]"
            >
              <div>
                <h3
                  className="font-display font-light leading-[1.15] tracking-[-0.01em]"
                  style={{ fontSize: 'clamp(1.75rem, 2.4vw, 2.25rem)', color: 'rgba(255,255,255,0.92)' }}
                >
                  {featured.name}
                </h3>

                {featuredImpact.head && (
                  <p
                    className="mt-4 text-[14px] leading-snug"
                    style={{ color: 'rgba(255,255,255,0.92)' }}
                  >
                    {featuredImpact.head}
                  </p>
                )}
                {/* Renders only when the impact string actually had a comma.
                    Ambees has none, so this stays off — as intended. */}
                {featuredImpact.tail && (
                  <p
                    className="mt-2 font-mono text-[10px] uppercase tracking-[0.28em]"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    {featuredImpact.tail}
                  </p>
                )}
              </div>

              {/* Stacked under the name now rather than set beside it, so the
                  prose keeps a real reading measure inside the half-frame. */}
              <div className="mt-6">
                <p
                  className="text-[14px] leading-[1.6]"
                  style={{ color: 'rgba(255,255,255,0.92)' }}
                >
                  {featured.description}
                </p>
                {/* The story is the reason this item is featured at all; it gets
                    a full paragraph rather than a clamped card excerpt. */}
                {featured.story && (
                  <p
                    className="mt-5 text-[14px] leading-[1.6]"
                    style={{ color: 'rgba(255,255,255,0.72)' }}
                  >
                    {featured.story}
                  </p>
                )}
                <TechList technologies={featured.technologies} />
                <ProjectLinks
                  url={featured.url}
                  caseStudySlug={featured.caseStudySlug}
                  name={featured.name}
                />
              </div>
            </motion.article>
          )}

          {/* ── Supporting pair ──
              Whatever is left in `shipped` after the featured item, at one step
              down: hairline-ruled columns, name at body-emphasis size instead of
              display. Renders name, impact and description; `story` is
              deliberately not rendered here — the full paragraph is the
              featured item's privilege. Two-up from sm (the section is still one
              full-width column there), collapsing to one in the narrow md band
              where the half-frame split first appears, two-up again from lg —
              so the featured item stays the only full-measure block. If a fourth
              product is added to the data it simply flows on; nothing counts to
              two. */}
          {supporting.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
              className="mt-14 grid gap-x-10 gap-y-10 sm:mt-16 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2"
            >
              {supporting.map((project) => {
                const { head, tail } = splitImpact(project.impact);
                return (
                  <article key={project.name} className="border-t border-white/10 pt-4">
                    <h3 className="text-[14px] leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>
                      {project.name}
                    </h3>
                    {head && (
                      <p
                        className="mt-2 font-display font-light leading-[1.15] tracking-[-0.01em] text-[1.125rem]"
                        style={{ color: 'rgba(255,255,255,0.92)' }}
                      >
                        {head}
                      </p>
                    )}
                    {tail && (
                      <p
                        className="mt-2 font-mono text-[10px] uppercase tracking-[0.28em]"
                        style={{ color: 'rgba(255,255,255,0.55)' }}
                      >
                        {tail}
                      </p>
                    )}
                    <p
                      className="mt-4 max-w-[46ch] text-[14px] leading-[1.6]"
                      style={{ color: 'rgba(255,255,255,0.72)' }}
                    >
                      {project.description}
                    </p>
                    <TechList technologies={project.technologies} />
                    <ProjectLinks
                      url={project.url}
                      caseStudySlug={project.caseStudySlug}
                      name={project.name}
                    />
                  </article>
                );
              })}
            </motion.div>
          )}

          {/* ── Side projects ──
              One rank below the supporting pair: same hairline entries and the
              same split logic (two-up where the column is wide enough, stacked
              between md and lg), but under a mono eyebrow and without the
              impact line — a side project has no placing to headline. No
              ProjectLinks call either: these entries carry no url and no case
              study by design, and rendering nothing is the point, not an
              omission. The one adornment is `status`: when an entry carries it
              (Clearance's 'in progress'), it renders as a small mono tag
              beside the name — same treatment as the year beside a proof
              title — so the qualifier lands before the description does.
              `sideProjects` is optional on Pillar, so absent and empty both
              render nothing; the array is mapped, no count is hardcoded. */}
          {sideProjects && sideProjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
              className="mt-14 sm:mt-16"
            >
              <h3
                className="font-mono text-[10px] uppercase tracking-[0.28em]"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                Side Projects
              </h3>
              <div className="mt-4 grid gap-x-10 gap-y-8 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                {sideProjects.map((project) => (
                  <article key={project.name} className="border-t border-white/10 pt-4">
                    <h4 className="text-[14px] leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>
                      {project.name}
                      {project.status && (
                        <span
                          className="ml-2 font-mono text-[10px] uppercase tracking-[0.28em]"
                          style={{ color: 'rgba(255,255,255,0.55)' }}
                        >
                          {project.status}
                        </span>
                      )}
                    </h4>
                    <p
                      className="mt-3 max-w-[46ch] text-[14px] leading-[1.6]"
                      style={{ color: 'rgba(255,255,255,0.72)' }}
                    >
                      {project.description}
                    </p>
                    <TechList technologies={project.technologies} />
                  </article>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Subordinate evidence ──
              Tooling and proof share one rank below the products: quiet labels,
              no cards, no icons. They answer "with what" and "who said so", and
              neither question outranks "what did he ship". */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            className="mt-14 grid gap-x-12 gap-y-10 sm:mt-16 md:grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"
          >
            {tooling.length > 0 && (
              <div className="border-t border-white/10 pt-4">
                <h3
                  className="font-mono text-[10px] uppercase tracking-[0.28em]"
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  Tooling
                </h3>
                <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
                  {tooling.map((tool) => (
                    <li
                      key={tool.name}
                      className="text-[14px] leading-snug"
                      style={{ color: 'rgba(255,255,255,0.92)' }}
                    >
                      {tool.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {proof.length > 0 && (
              <div className="border-t border-white/10 pt-4">
                <h3
                  className="font-mono text-[10px] uppercase tracking-[0.28em]"
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  Proof
                </h3>
                <dl className="mt-3 space-y-5">
                  {proof.map((entry) => (
                    <div key={entry.title}>
                      <dt className="text-[14px] leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>
                        {entry.title}
                        <span
                          className="ml-2 font-mono text-[10px] uppercase tracking-[0.28em]"
                          style={{ color: 'rgba(255,255,255,0.55)' }}
                        >
                          {entry.year}
                        </span>
                      </dt>
                      <dd
                        className="mt-2 max-w-[52ch] text-[14px] leading-[1.6]"
                        style={{ color: 'rgba(255,255,255,0.72)' }}
                      >
                        {entry.description}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/**
 * Links for one project. Inline text links sized to a 44px touch target rather
 * than a full-width button or a clickable card wrapper: this section sits over
 * the 3D canvas, and a big interactive rectangle here swallows the drags and
 * clicks aimed at the planets behind it.
 *
 * The case study link is emitted ONLY when `caseStudySlug` is present. Ambees
 * has none — its study is still a draft, so /portfolio/ambees is not routed and
 * would 404 — and the correct behaviour is to render no link at all, not to
 * guess the slug from the name.
 */
function ProjectLinks({
  url,
  caseStudySlug,
  name,
}: {
  url?: string;
  caseStudySlug?: string;
  name: string;
}) {
  if (!url && !caseStudySlug) return null;

  const linkClass =
    'inline-flex items-center min-h-[44px] text-[14px] leading-snug underline underline-offset-4 decoration-white/25 hover:decoration-white/60 focus-visible:outline-2 focus-visible:outline-white/60';

  return (
    <div className="mt-4 flex flex-wrap gap-x-6">
      {caseStudySlug && (
        <Link
          href={`/portfolio/${caseStudySlug}`}
          className={linkClass}
          style={{ color: 'rgba(255,255,255,0.92)' }}
        >
          Case study
          <span className="sr-only"> for {name}</span>
        </Link>
      )}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          style={{ color: 'rgba(255,255,255,0.72)' }}
        >
          Visit
          <span className="sr-only"> {name}</span>
        </a>
      )}
    </div>
  );
}

/**
 * The `technologies` tags, set as a quiet mono row rather than pills. The tag
 * vocabulary is capped at four capability words by the rule in content.ts, so
 * they read as a single line of provenance and do not need chrome to separate
 * them from the prose above.
 */
function TechList({ technologies }: { technologies: string[] }) {
  if (technologies.length === 0) return null;

  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
      {technologies.map((tech) => (
        <li
          key={tech}
          className="font-mono text-[10px] uppercase tracking-[0.28em]"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          {tech}
        </li>
      ))}
    </ul>
  );
}
