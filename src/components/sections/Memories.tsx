'use client';

import { motion } from 'framer-motion';
import { cities } from '@/data/cities';
import { memories } from '@/data/memories';

// City dots live in the 3D canvas (EarthGlobe → CityLabel) and rotate
// with the Earth. This section is intentionally just the Earth + a stat label.

export function Memories() {
  // ── pointer-events-none on the root ──
  // The city dots this section is *about* live in the r3f canvas, which
  // page.tsx pins at `fixed inset-0 z-0` underneath this `relative z-10`
  // content. A full-viewport <section> with default pointer-events therefore
  // absorbed every click and hover before the raycaster ever saw them, so the
  // dots were unclickable on exactly the screen built to show them off. Only
  // child is the stat label, already pointer-events-none, so nothing here
  // needs to opt back in with pointer-events-auto.
  return (
    <section
      id="memories"
      className="relative min-h-screen overflow-hidden flex items-center justify-center pointer-events-none"
    >
      {/* Subtle stat label at bottom */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1.2, ease: 'easeOut' }}
      >
        {/* 0.18 -> 0.60 alpha (1.54:1 -> 7.37:1 on #000).
            This is the ONLY text this section renders, and #memories is both a
            Navbar entry and a rail dot — so a visitor who navigates here lands
            on a screen whose entire DOM contribution was a 9px line at 1.54:1,
            i.e. below even the 3:1 large-text floor and roughly a third of the
            4.5:1 AA minimum. At 9px nothing here can claim the large-text
            exemption (that needs 24px, or 18.66px bold), so the alpha is the
            only lever. 0.60 rather than the bare-minimum 0.50 because this
            copy carries the section on its own; see SystemRecap for the same
            0.60-primary / 0.50-supporting split. */}
        <p
          className="font-mono text-[9px] uppercase tracking-[0.45em]"
          style={{ color: 'rgba(255,255,255,0.60)' }}
        >
          {cities.length} cities &middot; {memories.length} memories
        </p>
      </motion.div>
    </section>
  );
}
