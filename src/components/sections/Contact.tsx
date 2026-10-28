'use client';

import { motion } from 'framer-motion';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { GlowButton } from '@/components/ui/GlowButton';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { TextReveal } from '@/components/ui/TextReveal';
import { easeOutExpo } from '@/lib/easings';
import { siteContent } from '@/data/content';

export function Contact() {
  const { contact } = siteContent;

  return (
    // pointer-events-none, with the content column below opting back in — the
    // same pattern the other seven content sections use. page.tsx used to wrap
    // this section (and everything from Footprints down) in one big
    // pointer-events-auto div; that div was swallowing every click aimed at the
    // 3D scene behind these sections, so it is gone and each section now owns
    // the decision. Without this line the full-bleed <section> would be the
    // hit target across its whole margin and put the bug straight back.
    <section id="contact" className="relative overflow-hidden min-h-screen flex items-center py-16 sm:py-32 pointer-events-none">
      {/* PlanetDecoration (neptune) removed 2026-08-19 — the flat blue CSS glow
          read as a rendering artifact beside the real 3D Neptune (user feedback,
          see Finance). */}
      <div className="max-w-3xl mx-auto px-6 w-full text-center relative z-[1] pointer-events-auto">
        {/* 08 -> 07: nine sections became eight when five type-buckets collapsed
            into four pillars. These ordinals are hardcoded per component and
            derived from nothing, so they renumber by hand. */}
        <SectionHeader label="// Neptune" title="Open Channel" center gradient="neptune" sectionNumber="07" />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.2, ease: easeOutExpo }}
          className="text-white/70 mb-12 max-w-lg mx-auto text-lg"
        >
          Always interested in new ideas, collaborations, and good conversations. Drop a line.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3, ease: easeOutExpo }}
          className="flex flex-wrap justify-center gap-3 sm:gap-4"
        >
          {contact.email && (
            <MagneticButton strength={0.4}>
              <GlowButton
                href={`mailto:${contact.email}`}
                variant="primary"
                size="lg"
                icon={
                  // aria-hidden: the button already says "Get in Touch", so an
                  // unlabelled 18px envelope beside it is pure redundancy in the
                  // a11y tree. Every other icon on the site opts out this way
                  // (SystemOverview's scroll arrow, the Navbar glyphs); this one
                  // was the only <svg> shipping with no aria-hidden, no <title>
                  // and no role.
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                }
              >
                Get in Touch
              </GlowButton>
            </MagneticButton>
          )}
          {contact.github && (
            <MagneticButton>
              <GlowButton href={contact.github} variant="secondary" size="md">
                GitHub
              </GlowButton>
            </MagneticButton>
          )}
          {contact.linkedin && (
            <MagneticButton>
              <GlowButton href={contact.linkedin} variant="secondary" size="md">
                LinkedIn
              </GlowButton>
            </MagneticButton>
          )}
          {contact.twitter && (
            <MagneticButton>
              <GlowButton href={contact.twitter} variant="secondary" size="md">
                Twitter
              </GlowButton>
            </MagneticButton>
          )}
          {contact.instagram && (
            <MagneticButton>
              <GlowButton href={contact.instagram} variant="secondary" size="md">
                Instagram
              </GlowButton>
            </MagneticButton>
          )}
          {contact.website && (
            <MagneticButton>
              <GlowButton href={contact.website} variant="secondary" size="md">
                Ambees
              </GlowButton>
            </MagneticButton>
          )}
        </motion.div>

        {/* Galaxy reveal tagline — word-by-word */}
        <TextReveal
          text="Builder. Trader. Creator."
          as="p"
          className="font-display font-bold text-gradient-neptune"
          style={{ fontSize: 'clamp(2rem, 10vw, 7rem)' }}
          staggerDelay={0.15}
          startDelay={0.4}
        />

        {/* text-white/25 -> /50 (2.02:1 -> 5.28:1). A copyright notice is the
            one line on a page that exists to be read literally, so "quiet" can
            not mean "under half the AA minimum". 10px, so the 3:1 large-text
            floor does not apply. */}
        <div className="mt-16 text-white/50 font-mono text-[10px] tracking-[0.3em] uppercase">
          &copy; {new Date().getFullYear()} David Xie
        </div>
      </div>
    </section>
  );
}
