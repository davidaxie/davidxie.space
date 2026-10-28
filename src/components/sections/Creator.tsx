'use client';

import { motion } from 'framer-motion';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { siteContent } from '@/data/content';

// ── Creator is a split stage: Saturn LEFT, everything readable RIGHT ──
//
// This section used to centre one very large number in the middle of the frame
// with Saturn lit up directly underneath it. Both things lost. The number sat on
// a moving, ringed sphere so it was the hardest text on the page to read, and
// the most arresting body in the whole scene spent its screen time as wallpaper
// behind a slab of type. Two headliners, one spotlight.
//
// So the left half of this section is deliberately EMPTY — a window onto the
// Saturn the canvas is already drawing behind the page, which the camera
// separately displaces into that gap — and every word lives in the right half.
// The pattern is Footprints'; this is Saturn's turn at it. The reward here is
// larger than anywhere else on the page, because this section is one number and
// one paragraph: set them against the rings rather than on top of them and the
// two read as a single composition, a quantity on the right balancing a planet
// on the left, instead of a caption stuck to a backdrop.
//
// ── What this rejects ──
// No panel, no card, no scrim, no blur behind the copy. Any of those would make
// the text readable by covering the planet back up, which is the exact problem
// being solved. Readability comes from the planet no longer being underneath —
// the fix is composition, not paint. And nothing interactive-looking is ever
// placed in the left half: it hovers over clickable scene objects, so the
// section is pointer-events-none and only the text column opts back in.
//
// ── Why this section is mostly empty space ──
// Creator is the thinnest pillar in the data — no roles, no shipped projects,
// five tools and three notes — and every earlier attempt at it tried to hide that
// by borrowing the shapes from the sections around it: a card grid for the five
// creative apps, a proof row for the streams achievement, a second column of
// filler so the section would weigh as much as Finance directly above it. All of
// that was padding around one fact, and padding reads as apology. The empty half
// is now doing that job honestly: it is not filler, it is the planet's.
//
// So the number carries the section. `2,000,000+` is set at display scale with
// almost nothing beside it, because a pillar with one verifiable fact is
// strongest when it states that fact and stops talking. It is sized in vw off
// the HALF-width column now rather than the full frame, so it still dominates
// its own side without running under the rings.
//
// ── The number is printed ONCE ──
// Three places in the data assert the same figure: `notes[].stat`, the headline
// on that same note, and the '2M+ Streams' proof title — and identity.statement
// says it a fourth time one screen up. Rendering more than one of them puts the
// same claim in a reader's viewport twice and turns evidence into a slogan. The
// stat wins because it is the only one that is a bare quantity rather than a
// sentence, so it can be set large. The proof entry's body is deliberately not
// rendered: it re-tells the note below it almost beat for beat (GarageBand,
// Ableton, BeatStars, DX Media), and printing both would be the same paragraph
// twice under different headings. Only its year survives, as a datestamp.
//
// ── What is NOT here ──
// No project card for Eternity X. `shipped` is empty in the data on purpose and
// the comment there is explicit: it is a catalogue, not a product record — no
// URL, no stack, no case study. Inventing one would be the only fabricated entry
// on the site.

export function Creator() {
  const { label, tooling, proof, notes } = siteContent.pillars.creator;

  // Driven by the presence of a `stat` field, not by the note's name — the one
  // note carrying a bare quantity is the one that gets set large, whatever it
  // ends up being called. Everything else falls through to the prose below.
  const headlineNote = notes.find((note) => note.stat);
  const proseNotes = notes.filter((note) => note !== headlineNote);
  const years = proof.map((entry) => entry.year);

  return (
    <section
      id="creator"
      className="relative overflow-hidden min-h-screen flex items-center py-16 sm:py-32 pointer-events-none"
    >
      {/* PlanetDecoration (saturn) removed 2026-08-19 — the flat gold CSS glow
          read as a rendering artifact beside the real 3D Saturn (user feedback). */}

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-6 md:grid-cols-2 md:gap-14 relative z-[1]">
        {/* LEFT — intentionally empty. This is Saturn's half of the frame: no
            background, no card, nothing painted over it. Hidden below md, where
            there is no room to split and the planet reads as a backdrop. */}
        <div aria-hidden className="hidden md:block" />

        {/* RIGHT — the only column that carries anything, and the only thing on
            this screen that takes pointer events. */}
        <div className="pointer-events-auto">
          <SectionHeader label="// Saturn" title={label} gradient="saturn" sectionNumber="05" />

          {headlineNote && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              {/* The quiet label names the discipline; the number states the
                  result. Nothing between them, and nothing beside them — a
                  caption to the right would give the eye somewhere else to go,
                  and the eye's other destination is the planet. */}
              <p
                className="font-mono text-[10px] uppercase tracking-[0.28em]"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                {headlineNote.name}
                {years.length > 0 && <span className="ml-4">{years.join(' · ')}</span>}
              </p>

              {/* Still sized in vw so it stays the largest thing on the screen,
                  but scaled to the half-column it now lives in: big enough to
                  answer Saturn across the gutter, never wide enough to spill
                  into the planet's side. */}
              <p
                className="mt-5 font-display font-light leading-[1.1] tracking-[-0.01em]"
                style={{
                  fontSize: 'clamp(2.75rem, 6vw, 5rem)',
                  color: 'rgba(255,255,255,0.92)',
                }}
              >
                {headlineNote.stat}
              </p>
            </motion.div>
          )}

          {headlineNote && (
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
              className="mt-8 max-w-[48ch] text-[14px] leading-[1.6]"
              style={{ color: 'rgba(255,255,255,0.72)' }}
            >
              {headlineNote.description}
            </motion.p>
          )}

          {/* The remaining notes sit under the same measure rather than in a
              second column: they are the same voice continuing, not a sidebar —
              and the only second column here belongs to the planet. `headline`
              ('One-Man Band') is deliberately dropped for prose notes: only the
              stat-bearing note above earns display treatment. */}
          {proseNotes.map((note) => (
            <motion.div
              key={note.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
              className="mt-10 max-w-[48ch] border-t border-white/10 pt-4"
            >
              <p
                className="font-mono text-[10px] uppercase tracking-[0.28em]"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                {note.name}
              </p>
              <p
                className="mt-3 text-[14px] leading-[1.6]"
                style={{ color: 'rgba(255,255,255,0.72)' }}
              >
                {note.description}
              </p>
            </motion.div>
          ))}

          {/* ── The channel link ──
              Pairs with the 'Channels' note in content.ts. The note above
              names both channels; this row is the click. The URL is
              hardcoded here rather than in the data because InterestEntry
              carries no url field and widening types.ts for one link was out
              of scope for this pass. Same idiom as Builder's ProjectLinks: a
              quiet inline text link at a 44px touch target, never a button or
              a clickable card, because this column floats over the canvas
              where the planets take the clicks. RedNote gets no link on
              purpose — there is no reliable public URL scheme for a RedNote
              profile, and guessing one would invent a fact. */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            className="mt-1 max-w-[48ch]"
          >
            <a
              href="https://www.youtube.com/@itzdavezwrld"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center text-[14px] leading-snug underline underline-offset-4 decoration-white/25 hover:decoration-white/60 focus-visible:outline-2 focus-visible:outline-white/60"
              style={{ color: 'rgba(255,255,255,0.72)' }}
            >
              YouTube · @itzdavezwrld
            </a>
          </motion.div>

          {/* ── Tools, as a footnote ──
              These were a five-card grid once, which gave "CapCut" the same
              visual weight as two million streams. They are the answer to "made
              in what?" and nothing more, so they run as one line of small type
              at the foot of the column. No borders, no icons, no hover states —
              a static list here would also have meant an interactive-looking
              block sitting over the canvas where the planets take clicks. */}
          {tooling.length > 0 && (
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
              className="mt-12 max-w-[48ch] border-t border-white/10 pt-4 font-mono text-[10px] uppercase tracking-[0.28em] sm:mt-14"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              {tooling.map((tool) => tool.name).join(' · ')}
            </motion.p>
          )}
        </div>
      </div>
    </section>
  );
}
