'use client';

import { motion } from 'framer-motion';
import { TextReveal } from '@/components/ui/TextReveal';
import { TextScramble } from '@/components/ui/TextScramble';
import { easeOutQuart } from '@/lib/easings';

type PlanetGradient = 'sun' | 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';

interface SectionHeaderProps {
  label: string;
  title: string;
  gradient?: string;
  center?: boolean;
  sectionNumber?: string;
}

const gradientClasses: Record<PlanetGradient, string> = {
  sun: 'text-gradient-sun',
  mercury: 'text-white',
  venus: 'text-gradient-venus',
  earth: 'text-gradient-earth',
  mars: 'text-gradient-mars',
  jupiter: 'text-gradient-sun',
  saturn: 'text-gradient-saturn',
  uranus: 'text-gradient-uranus',
  neptune: 'text-gradient-neptune',
};

const sectionNumberColors: Record<PlanetGradient, string> = {
  sun: '#D0D0D8',
  mercury: '#8C8C8C',
  venus: '#F0D080',
  earth: '#5A8FB5',
  mars: '#E04A10',
  jupiter: '#E09030',
  saturn: '#F0B820',
  uranus: '#60E8F8',
  neptune: '#3060F0',
};

export function SectionHeader({ label, title, gradient = 'sun', center = false, sectionNumber }: SectionHeaderProps) {
  const planet = gradient as PlanetGradient;

  return (
    <div className={`mb-10 sm:mb-16 ${center ? 'text-center' : ''}`}>
      {/* Oversized section number — decorative, hidden from assistive tech.
          At opacity 0.2 over black these run 1.15:1 (neptune) to 1.47:1
          (venus/uranus): far under the 3:1 large-text floor, and no opacity a
          designer would accept gets them there (they would have to sit near
          full strength — 4.06:1 for neptune even at opacity 1). Raising them is
          the wrong trade because the ordinal carries no information: the
          numbering is exactly document order, and each section is already named
          by the `label` eyebrow and the <h2> below. Same call, same reasoning,
          as the ordinal in portfolio/CaseStudyCard.tsx:36. Hidden from the
          accessibility tree, it is decoration and 1.4.3 does not apply. If a
          section number ever becomes load-bearing — a reference a reader is
          told to cite, say — drop the aria-hidden and this needs real colour. */}
      {sectionNumber && (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 0.2, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5, ease: easeOutQuart }}
          className="font-display font-bold leading-none"
          style={{
            fontSize: 'clamp(3rem, 6vw, 5rem)',
            color: sectionNumberColors[planet],
          }}
        >
          {sectionNumber}
        </motion.div>
      )}

      {/* Mono label */}
      {/* Animates to opacity 1, not 0.4. The tint belongs to `text-white/40` on
          the child below and to nothing else — this wrapper is a fade-IN, so
          its end state has to be fully faded in. Setting 0.4 here as well
          multiplied the two (0.4 x 0.4 = 0.16 effective alpha), which rendered
          every section's `// Earth` / `// Venus` eyebrow at 1.44:1 against
          black. That is under the 3:1 floor for ANY text and roughly a third
          of the 4.41:1 the author was aiming at; the label was effectively
          invisible on all seven sections.
          With the wrapper at 1.0 the child's own alpha is the whole story, and
          `text-white/40` was still only 3.66:1 — under AA's 4.5:1, which does
          apply here: the eyebrow is 12px regular, so it is not "large text" and
          cannot use the 3:1 floor. It is now `text-white/50` => 5.28:1, the
          smallest step that passes and the one this comment already named.
          Do not walk it back below /50; every tenth below that reopens the
          failure on all seven sections at once. */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5, ease: easeOutQuart }}
        className={`mb-5 ${center ? 'justify-center' : ''}`}
      >
        <TextScramble
          text={label}
          triggerOnView
          className="text-xs font-mono tracking-[0.35em] uppercase text-white/50"
        />
      </motion.div>

      {/* Title heading — simultaneous fade */}
      <TextReveal
        text={title}
        as="h2"
        className={`font-display font-bold ${gradientClasses[planet]} leading-[1.05] tracking-tight`}
        staggerDelay={0}
        startDelay={0.1}
        style={{ fontSize: 'clamp(2.25rem, 8vw, 6rem)' }}
      />
    </div>
  );
}
