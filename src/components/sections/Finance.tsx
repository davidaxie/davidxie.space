'use client';

import { motion } from 'framer-motion';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { siteContent } from '@/data/content';

// ── Half the frame is Jupiter's, and it is empty on purpose ──
//
// This section used to set a full-width column of copy directly on top of the
// planet, which is the worst of both: the text is harder to read over a lit,
// banded sphere, and the sphere is hidden behind the text. Footprints.tsx is the
// prototype for the fix and this follows it — content is penned into ONE half of
// the frame at md and up, and the other half is left genuinely empty so the
// canvas's Jupiter reads through it. Here the copy takes the LEFT and Jupiter
// gets the RIGHT; the camera displaces the planet toward that side on its own
// (cameraKeyframes, LOCKED), so nothing in this file moves it.
//
// What this rejects: a card, a panel, a blur, a scrim, a gradient — anything
// painted behind the text to win back contrast. That is the old problem wearing
// a nicer coat, because every one of those things covers the planet again.
// Readability comes from the planet no longer being underneath, full stop. The
// empty half also carries no interactive box: the section is pointer-events-none
// and only the content column opts back in, because a full-width interactive
// element here would sit over the clickable scene objects and eat clicks aimed
// at the planets.
//
// The spine below is the reason this pillar suits a half-frame better than the
// others: a vertical timeline is narrow by nature, so it loses nothing at half
// width. The disciplines and the proof index ran single-track for a while for
// fear of starved measures, but that stacked this section to about four
// viewports of scroll, so both are two-up again inside the content half (same
// copy, denser organization),
// on the same breakpoint logic Builder uses for its supporting pair (split at
// sm, collapse in the narrow md band, split again from lg). The scope lines
// and proof blurbs are short enough to survive a half-of-half measure; only
// the roles keep the full column, because they are the narrative.
//
// ── Why this section is a spine and not a grid of cards ──
//
// Finance is the densest pillar on the site: five roles, and unlike every other
// pillar's list they are not five interchangeable things — they are one line of
// travel. Cedar Oak to Sterling to Tungsten to GADIF to Clockwork is sourcing,
// then M&A, then real assets, then research, then running capital in code, and
// the dates say it happened inside about a year. A card grid throws all of that
// away: cards read as peers, in whatever order the eye lands, and the reader has
// to reconstruct the chronology from five separate date strings. So the roles
// get a literal vertical spine — one rule, five nodes, newest at the top — and
// the progression is legible before a single description is read.
//
// "Current" is read off the data (`period` ending in Present), not off the array
// index. Two roles are live at once — Clockwork and the Georgetown fund — and a
// layout that decorates only `roles[0]` would quietly demote one of them and
// then lie the day the array is reordered.
//
// ── Why the tooling here is prose and everywhere else is badges ──
// These six rows are the only entries in `tooling` anywhere in the content file
// that carry a `description`, and the data file says why: they are disciplines,
// not apps. "Due Diligence" compressed into a pill next to "Figma" is a claim
// with no scope on it. So the described ones get a stated scope on their own
// line at reading size, and any undescribed row (PineScript, which moved into
// this pillar because the Clockwork algos are written in it) falls out into a
// quiet trailing rank instead of sitting in a two-line block with a blank
// second line. Both groups are derived by filtering on `description` — nothing
// is matched by name.
//
// ── The seven-figure duplication ──
// The commercialization exists twice in the source data on purpose: as the
// Clockwork role's `highlight`, and again as its own proof entry. Both are
// true and neither should be deleted from a component. The fix is distance and
// register, not suppression — the highlight is a five-word callout pinned to
// the role that produced it, the proof entry is the fuller account, and the six
// tooling blocks sit between them so the two never share a viewport. Proof is
// also set last and small: firms selecting him is corroboration of the roles
// above, not a headline of its own, and rendering it as a wall of award cards
// would outweigh the work it is supposed to support.
//
// `shipped` and `notes` are empty by design (see content.ts) and are therefore
// not rendered at all — no "coming soon" slot, no empty-state furniture.

export function Finance() {
  const { label, roles, tooling, proof } = siteContent.pillars.finance;

  const disciplines = tooling.filter((tool) => tool.description);
  const bareTools = tooling.filter((tool) => !tool.description);

  return (
    <section
      id="finance"
      className="relative overflow-hidden min-h-screen flex items-center py-16 sm:py-32 pointer-events-none"
    >
      {/* PlanetDecoration (jupiter) removed 2026-08-19 — user feedback: the flat
          amber CSS glow at frame right read as a rendering artifact beside the
          real 3D Jupiter. Every section's glow went with it; PlanetDecoration.tsx
          is now unreferenced and left on disk, same as ChapterCard. */}

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-6 relative z-[1] md:grid-cols-2 md:gap-14">
        {/* LEFT — every readable thing on this screen, and the only thing that
            opts back into pointer events. min-w-0 so the long prose lines
            cannot push the column past its half and start creeping over
            Jupiter. */}
        <div className="pointer-events-auto min-w-0">
        <SectionHeader label="// Jupiter" title={label} gradient="jupiter" sectionNumber="04" />

        {/* ── The spine ──
            One hairline down the left, one node per role. The rule lives on the
            list rather than on each item so it runs unbroken between entries;
            the nodes are drawn over it and pulled back onto it with a negative
            offset. Counted off the array, never written out.

            Inter-role spacing came down a step in the 2026-08-20 densening
            (mt-12/14 → mt-9/10, and the mt-4s inside each entry → mt-3): the
            node + hairline already separate entries, so the extra air was
            doing the same job twice across five roles. */}
        <motion.ol
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative ml-1 border-l border-white/10 pl-7 sm:pl-9"
        >
          {roles.map((role, index) => {
            const isCurrent = /present\s*$/i.test(role.period);

            return (
              <li
                key={`${role.company}-${role.period}`}
                className={index === 0 ? 'relative' : 'relative mt-9 sm:mt-10'}
              >
                {/* Node. Current roles get a filled dot with a ring around it;
                    past roles get a hollow one, so seniority reads as brightness
                    down the column without a colour legend to learn. */}
                <span
                  aria-hidden
                  className={[
                    'absolute -left-7 top-[0.45rem] h-2 w-2 rounded-full sm:-left-9',
                    isCurrent
                      ? 'bg-white/80 ring-4 ring-white/10'
                      : 'border border-white/25 bg-black',
                  ].join(' ')}
                  style={{ marginLeft: '-0.25rem' }}
                />

                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.28em]"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    {role.period}
                  </span>
                  {isCurrent && (
                    <span
                      className="font-mono text-[10px] uppercase tracking-[0.28em]"
                      style={{ color: 'rgba(255,255,255,0.92)' }}
                    >
                      Current
                    </span>
                  )}
                </div>

                <h3
                  className="mt-2 font-display font-light leading-[1.15] tracking-[-0.01em]"
                  style={{ fontSize: 'clamp(1.05rem, 1.6vw, 1.35rem)', color: 'rgba(255,255,255,0.92)' }}
                >
                  {role.company}
                </h3>

                <p
                  className="mt-1 text-[14px] leading-snug"
                  style={{ color: 'rgba(255,255,255,0.72)' }}
                >
                  {role.role}
                </p>

                <p
                  className="mt-3 max-w-[62ch] text-[14px] leading-[1.6]"
                  style={{ color: 'rgba(255,255,255,0.72)' }}
                >
                  {role.description}
                </p>

                {/* `highlight` is a separate field from `description` and is
                    written as a callout, not as a closing sentence — appending
                    it to the paragraph above would produce a fragment with no
                    verb hanging off the end of the prose. It gets its own
                    indented rule instead. */}
                {role.highlight && (
                  <p
                    className="mt-3 border-l border-white/20 pl-4 text-[14px] leading-snug"
                    style={{ color: 'rgba(255,255,255,0.92)' }}
                  >
                    {role.highlight}
                  </p>
                )}

                {role.technologies && role.technologies.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                    {role.technologies.map((tech) => (
                      <li
                        key={tech}
                        className="font-mono text-[10px] uppercase tracking-[0.28em]"
                        style={{ color: 'rgba(255,255,255,0.55)' }}
                      >
                        {tech}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </motion.ol>

        {/* ── Disciplines ──
            Two-up (same copy, denser organization). Single-track gave every
            5-word scope line a
            full row of the column and stretched six short entries across six
            hairlines; two columns halve that to three rows, and the scope
            lines — none longer than a clause — still read whole in a
            half-of-half measure. Breakpoints mirror Builder's supporting pair:
            two columns from sm (full-width single column below md, so there is
            room), back to one in the narrow md band where the content half
            first appears, two again from lg. The dd measure cap is gone — the
            grid cell is the measure now. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
          className="mt-12 sm:mt-16"
        >
          <h3
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            What the work runs on
          </h3>

          <dl className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            {disciplines.map((tool) => (
              <div key={tool.name} className="border-t border-white/10 pt-4">
                <dt className="text-[14px] leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  {tool.name}
                </dt>
                <dd
                  className="mt-1.5 text-[14px] leading-[1.6]"
                  style={{ color: 'rgba(255,255,255,0.72)' }}
                >
                  {tool.description}
                </dd>
              </div>
            ))}
          </dl>

          {bareTools.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-4">
              {bareTools.map((tool) => (
                <li
                  key={tool.name}
                  className="font-mono text-[10px] uppercase tracking-[0.28em]"
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  {tool.name}
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* ── Proof, deliberately last and deliberately quiet ──
            A ruled index rather than five award cards, and a two-column one
            (same copy, denser organization): five entries as three rows
            instead of five full-width
            slabs. The year lost its private eyebrow row and sits inline after
            the title as a small mono suffix — Builder's proof list already
            sets year exactly this way, so the two indexes now match — which
            takes ~25px of label + margin out of every entry on top of the
            halved row count. Same Builder breakpoints as the disciplines
            above (2-up from sm, 1 in the md band, 2 from lg). The account of
            the seven-figure outcome still lands here, a full block of
            disciplines away from the five-word callout on the Clockwork node,
            and proof still reads as corroboration, not headline: same quiet
            type, just less scroll to get past it. */}
        <motion.ol
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          className="mt-12 grid gap-x-10 gap-y-6 sm:mt-16 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2"
        >
          {proof.map((entry) => (
            <li key={`${entry.title}-${entry.year}`} className="border-t border-white/10 pt-4">
              <h3
                className="text-[14px] leading-snug"
                style={{ color: 'rgba(255,255,255,0.92)' }}
              >
                {entry.title}
                <span
                  className="ml-2 font-mono text-[10px] uppercase tracking-[0.28em]"
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  {entry.year}
                </span>
              </h3>
              <p
                className="mt-2 text-[14px] leading-[1.6]"
                style={{ color: 'rgba(255,255,255,0.72)' }}
              >
                {entry.description}
              </p>
            </li>
          ))}
        </motion.ol>
        </div>

        {/* RIGHT — intentionally empty. This is Jupiter's half of the frame: no
            panel, no scrim, no box of any kind, so the canvas reads straight
            through it and nothing here can intercept a click meant for the
            planet. Hidden below md, where there is no room to split and the
            planet falls back to being a backdrop under a single column. */}
        <div aria-hidden className="hidden md:block" />
      </div>
    </section>
  );
}
