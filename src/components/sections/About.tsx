'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { siteContent } from '@/data/content';

// ── The split stage, borrowed from Footprints ──
//
// This section used to lay a full-width block — portrait, quote, bio, fact
// index — directly over Venus, and the two lost the argument together: the
// copy sat on a lit sphere and the sphere sat behind the copy. Footprints
// solved that first by giving half the frame back to the planet, and this file
// now follows it: everything readable is in the LEFT half, and the RIGHT half
// is deliberately empty — a window onto the Venus the canvas is already
// drawing behind the page. The camera displaces the planet toward that side;
// nothing here moves it.
//
// What it rejects: the obvious alternative was to keep the full-width block and
// buy readability with a scrim, a blur or a card behind the text. That is the
// same mistake in a nicer coat — it hides the planet to protect the words, when
// the whole point is that neither should need protecting from the other. So
// there is NO background, NO panel, NO gradient behind this copy. Readability
// comes from the planet no longer being underneath it.
//
// Consequences worth knowing:
//   • The empty half must stay empty in the DOM sense too. This section spans
//     the full width, so a default-interactive box over Venus would eat clicks
//     aimed at the scene. Hence pointer-events-none on the section, with only
//     the content column opting back in — Footprints' rule, same reason.
//   • Below md there is no room to split. The right half is `hidden md:block`,
//     the content goes single-column, and the globe reads as a backdrop.
//   • The portrait no longer gets a column of the whole frame; it shares the
//     left half with the prose at a smaller size. Half a frame is a column,
//     not a page.
//   • The fact index stays inside the left half rather than running wide as a
//     colophon. A full-bleed rank of hairline rules under a half-width column
//     would draw four horizontal lines straight across Venus and re-anchor the
//     eye to the full frame — undoing the split at the one moment the section
//     ends and the planet is most exposed. Two tracks instead of three; it
//     still reads as a footer rule, just a footer to a column.
//
// ── Why there is no Panel in this file any more ──
//
// This section used to put everything after the pull-quote inside a bordered
// card headed "TRANSMISSION CARD", with a dot pulsing next to it. Three things
// were wrong with that, and they compounded:
//
//   1. One box, two unrelated jobs. A label/value spec table and a first-person
//      bio paragraph are not the same kind of content, and stacking them behind
//      one border asked the reader to treat a fact sheet and a voice as one
//      object.
//   2. The values were right-aligned against left-aligned labels with a dotted
//      rule between, which is the shape of a form — the least human layout
//      available for the one section whose whole job is to read as a person.
//   3. "Transmission Card" is sci-fi set dressing. The 3D scene earns that
//      register; the prose does not, and the portfolio side of this site is
//      already committed to a plain editorial voice.
//
// What replaces it is ordinary editorial furniture: a portrait, the quote, the
// bio set at a real reading size, and the facts as a hairline-ruled index at the
// bottom. No border, no chrome, nothing pulsing.
//
// ── The facts, minus one ──
// `currently` is rendered as-is except that the old `Name: David Xie` row is
// gone. It was injected here rather than living in the data, and it told a
// visitor reading David's own About section, under an h1 carrying his name,
// beside a photograph of him, what his name is.

export function About() {
  const { statement, bio } = siteContent.identity;

  return (
    <section
      id="about"
      className="relative overflow-hidden min-h-screen flex items-center py-16 sm:py-32 pointer-events-none"
    >
      {/* Venus, not Mercury. sectionPlanet has mapped about -> venus since the
          itinerary was re-sequenced; this file kept saying Mercury, so the
          decoration, the header label and the ordinal tint were all drawing the
          wrong planet's accent under a heading that named it. It was one of
          four sections carrying this exact drift, none of which failed anything
          — SectionHeader takes `gradient` as a plain string and an unknown name
          just yields undefined. Mercury now belongs to Builder, one section
          down. */}
      {/* PlanetDecoration (venus) removed 2026-08-19 — the flat CSS glow read as
          a rendering artifact beside the real 3D Venus (user feedback, see Finance). */}

      {/* The stage. Two equal halves at md and up: content left, Venus right.
          Was max-w-5xl centred, which put the copy across the middle of the
          frame — the exact placement the planet occupies. max-w-7xl now,
          matching Footprints, because half of a 5xl measure is too narrow to
          seat a portrait beside prose. */}
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-6 md:grid-cols-2 md:gap-14 relative z-[1]">
        {/* LEFT — the only interactive thing on this screen besides the scene. */}
        <div className="pointer-events-auto">
        <SectionHeader label="// Venus" title="About" gradient="venus" sectionNumber="02" />

        {/* Portrait beside prose, but at a column's scale rather than a page's:
            the split breaks at sm, not md, because by md this whole block is
            already living in half a frame and a stacked portrait there would
            push the bio below the fold. */}
        <div className="grid items-start gap-7 sm:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] sm:gap-9">
          {/* ── Portrait ──
              public/david-linkedin.jpg has been in the repo the whole time and
              was referenced only by a comment in layout.tsx about the OG image —
              the site never actually showed David to anyone. An About section is
              where that belongs.

              Capped narrower on mobile than the column it sits in, because at
              full bleed a 3:4 portrait eats most of a phone screen before the
              first sentence. No `priority`: this is section 02, well below the
              fold, and preloading it would compete with the 3D textures. */}
          <motion.figure
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            className="mt-1 w-full max-w-[10rem] sm:max-w-none"
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <Image
              src="/david-linkedin.jpg"
              alt="David Xie"
              width={1199}
              height={1600}
              sizes="(min-width: 640px) 10rem, 10rem"
              className="w-full h-auto rounded-lg border border-white/10"
            />
          </motion.figure>

          <div>
            {/* ── Pull-quote ──
                Was #8C8C8C at opacity 0.5, which composites over the near-black
                canvas to rgb(70) = 2.23:1. At clamp(1.5rem, 3vw, 2.5rem) this is
                large text by WCAG (>=24px), so it owes 3:1 — the section's thesis
                statement shipped as a measured AA failure. rgba(255,255,255,0.72)
                gives rgb(184) = 10.6:1. Same alpha the bio below uses, so the two
                read as one voice rather than a caption over a body. */}
            <motion.blockquote
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.8 }}
              className="font-display font-light leading-[1.15] tracking-[-0.01em]"
              style={{
                // Stepped down from clamp(1.5rem, 3vw, 2.5rem). At the old top
                // end the quote ran to three lines on a desktop viewport and
                // read as a headline competing with the "About" h1 directly
                // above it, rather than as the section's opening line.
                // Trimmed again with the split: the quote now sets across half
                // a frame, and the old top end broke it to four lines there.
                fontSize: 'clamp(1.15rem, 1.7vw, 1.5rem)',
                color: 'rgba(255,255,255,0.72)',
              }}
            >
              &ldquo;{statement}&rdquo;
            </motion.blockquote>

            {/* ── Bio ──
                Was 15px at white/70 in the bottom third of a card. It is the only
                place on the site David speaks in his own voice about himself, so
                it gets a reading size (17px), real leading, and a measure capped
                in `ch` — the container is wide enough now that an uncapped
                paragraph would run past a comfortable line length. */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-7 max-w-[58ch] text-[14px] leading-[1.6]"
              style={{ color: 'rgba(255,255,255,0.72)' }}
            >
              {bio}
            </motion.p>
          </div>
        </div>

        {/* ── Fact index ──
            Same data the spec table carried, laid out as a colophon instead: a
            hairline over each entry, the label above the value rather than
            opposite it. Nothing is right-aligned, so no column of ragged values
            forms and the eye reads each one as a small block of text.

            Grid, not flex, so the rules line up into a continuous rank across a
            row even when School wraps to two lines and Trading does not.

            It stays INSIDE the left column — see the header comment. Two tracks
            now rather than three, since the third would have set each value to
            a five-word measure at this width. */}
        <motion.dl
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 grid gap-x-8 gap-y-7 sm:mt-16 sm:grid-cols-2"
        >
          {siteContent.currently.map((field) => (
            <div key={field.label} className="border-t border-white/10 pt-4">
              <dt
                className="font-mono text-[10px] uppercase tracking-[0.28em]"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                {field.label}
              </dt>
              <dd
                className="mt-2.5 text-[14px] leading-snug"
                style={{ color: 'rgba(255,255,255,0.92)' }}
              >
                {field.value}
              </dd>
            </div>
          ))}
        </motion.dl>
        </div>

        {/* RIGHT — intentionally empty. This is Venus's half of the frame: no
            panel, no scrim, no card, nothing painted here. Hidden on mobile,
            where there is no room to split. */}
        <div aria-hidden className="hidden md:block" />
      </div>
    </section>
  );
}
