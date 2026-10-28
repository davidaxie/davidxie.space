'use client';

import { motion } from 'framer-motion';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { siteContent } from '@/data/content';
import { cities } from '@/data/cities';

// ── The split stage: copy LEFT, Uranus RIGHT ──
//
// This section used to be the worst offender on the page. A max-w-5xl column of
// copy sat dead centre with Uranus directly underneath it, so the planet read as
// wallpaper and the text read as a slab dropped on top — the sphere hidden by
// the paragraph, the paragraph fighting a lit surface for contrast. Footprints
// already solved this: give the planet half the frame and put every readable
// thing in the other half. This file now follows that prototype, mirrored —
// Footprints keeps its copy on the right, this one takes the left, and the
// camera displaces Uranus toward the empty right half on its own (that lives in
// the camera itinerary, not here; nothing in this file moves the planet).
//
// What it rejects, explicitly: any background, blur, scrim or card behind the
// text to buy readability. That is the failure mode this restructure exists to
// undo — a panel would re-occlude the planet and we would be back where we
// started. Readability is bought by the planet no longer being underneath, and
// by nothing else. The right half stays genuinely empty: no box, no border, and
// no pointer target, because it sits over clickable scene objects and an
// interactive div there would swallow clicks aimed at the planets. Hence
// pointer-events-none on the section with only the content column opting back
// in — the same discipline Footprints documents.
//
// Below md there is no room to split, so the empty half is `hidden md:block`
// and the copy runs as one column with the globe reading as a backdrop.
//
// ── Why this section is the one that stops using the achievement grid ──
//
// The three sections above this one are evidence: roles, shipped work, tooling,
// dated proof. They earn their density because a reader is there to check a
// claim. This pillar has no roles, no shipped products and no tooling — those
// arrays are empty in content.ts by design — and the honest reading of that is
// not "a thinner version of the same section", it is a different register. So
// the achievement grid is rejected here: an evenly-weighted card wall of
// squash, Money Stuff, basketball and motorbiking would dress up the things he
// likes as more credentials, which is
// exactly the tone the page is supposed to drop by this point.
//
// What it does instead: one lead note carrying the only thing here with a
// scoreboard, then the remaining notes as a plain ruled list at a reading size.
// The lead is taken off the FRONT of `notes`, not looked up by name — content.ts
// says in so many words that Club Squash is ordered first because it is the one
// with a headline and a stat. Reading the array
// order honours that; a `.find(n => n.name === 'Club Squash')` would hardcode a
// content decision into a component and silently render nothing the day the copy
// is reworded.
//
// ── One thing this file refuses to restate ──
//
// Cities and travel are NOT in this pillar. src/data/cities.ts owns them and the
// Footprints globe reads that file directly; content.ts carries a comment saying
// so precisely to stop a second list of city names growing here. The aside at
// the bottom therefore imports cities.ts and counts it — no city name is ever
// retyped in this component, so the count cannot drift away from the globe.

export function OffTheClock() {
  const { label, notes } = siteContent.pillars.offtheclock;
  const [lead, ...rest] = notes;

  return (
    <section
      id="offtheclock"
      className="relative overflow-hidden min-h-screen flex items-center py-16 sm:py-32 pointer-events-none"
    >
      {/* PlanetDecoration (uranus) removed 2026-08-19 — the flat cyan CSS glow
          read as a rendering artifact beside the real 3D Uranus (user feedback,
          see Finance). */}

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-6 md:grid-cols-2 md:gap-14 relative z-[1]">
        {/* LEFT — the only readable half, and the only thing here that takes a
            pointer. Measures are set by the column now, so the old max-w-[62ch]
            caps are gone: at half width the column IS the measure. */}
        <div className="pointer-events-auto">
          <SectionHeader
            label="// Uranus"
            title={label}
            gradient="uranus"
            sectionNumber="06"
          />

          {/* ── The lead note ──
              Squash is the only thing on this page with results behind it, so it
              gets the display face and the top of the column — but as one
              paragraph in the first person, not as a stat block. The stat and headline sit above
              it as quiet marginalia rather than as a badge row, so the eye lands
              on the sentence first. */}
          {lead && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.28em]"
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  {lead.name}
                </span>
                {lead.stat && (
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.28em]"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    {lead.stat}
                  </span>
                )}
              </div>

              {lead.headline && (
                <p
                  className="mt-4 font-display font-light leading-[1.15] tracking-[-0.01em]"
                  style={{
                    fontSize: 'clamp(1.25rem, 2.1vw, 1.75rem)',
                    color: 'rgba(255,255,255,0.72)',
                  }}
                >
                  {lead.headline}
                </p>
              )}

              <p
                className="mt-6 text-[14px] leading-[1.6]"
                style={{ color: 'rgba(255,255,255,0.72)' }}
              >
                {lead.description}
              </p>
            </motion.div>
          )}

          {/* ── No proof footnote ──
              content.ts carries proof: [] for this pillar, and the
              championship titles are folded into the Club Squash note above.
              If proof grows an entry again, build a footnote here from the
              data it actually carries. */}

          {/* ── Everything else he actually likes ──
              One track, no borders around the items, no icons. It was two columns
              when this section had the full width; at half width a second track
              would leave each note about twenty characters wide, which reads as a
              card wall — the exact thing the note above rejects. Stacked, they
              stay short paragraphs in a row (three notes as of 2026-08-20:
              Reading, Basketball, Motorbiking), and nothing more structural
              implies a ranking that the copy does not make. */}
          {rest.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
              className="mt-16 grid gap-y-10 sm:mt-20"
            >
              {rest.map((note) => (
                <div key={note.name} className="border-t border-white/10 pt-4">
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.28em]"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    {note.headline ?? note.name}
                  </p>
                  <p
                    className="mt-2.5 text-[14px] leading-snug"
                    style={{ color: 'rgba(255,255,255,0.92)' }}
                  >
                    {note.name}
                  </p>
                  <p
                    className="mt-3 text-[14px] leading-[1.6]"
                    style={{ color: 'rgba(255,255,255,0.72)' }}
                  >
                    {note.description}
                  </p>
                </div>
              ))}
            </motion.div>
          )}

          {/* ── The travel aside ──
              Derived, never authored: the number comes from cities.ts, the file
              the globe renders from. If a city is added there this line moves on
              its own, and no name in it can contradict the map. */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            className="mt-14 border-t border-white/10 pt-4 font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            {cities.length} cities on the globe
          </motion.p>
        </div>

        {/* RIGHT — intentionally empty. This is Uranus's half of the frame: no
            panel, no scrim, no pointer target, nothing painted over it. Hidden
            on mobile, where there is no room to split. */}
        <div aria-hidden className="hidden md:block" />
      </div>
    </section>
  );
}
