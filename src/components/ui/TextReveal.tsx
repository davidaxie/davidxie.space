'use client';

import { motion } from 'framer-motion';
import { easeOutExpo } from '@/lib/easings';

interface TextRevealProps {
  text: string;
  className?: string;
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'span';
  staggerDelay?: number;
  startDelay?: number;
  once?: boolean;
  style?: React.CSSProperties;
}

// ── One observer for the whole line, not one per word ──
//
// This used to put `whileInView` on every word span, which gave every word its
// own IntersectionObserver and its own independent `once: true` latch. On a
// heading that wraps, that is a correctness bug rather than a nicety: the second
// line sits a full line-height below the first, so it crosses the -60px trigger
// margin later, and any word whose observer never fired stayed at opacity 0 —
// with `once` there is no retry. "Off the Clock" rendered as "Off the", with
// `Clock` in the DOM, correctly laid out on line two, and permanently invisible.
//
// The fix is to observe the block once and drive the words as children through
// variants. Framer propagates the `visible` label from parent to children, so
// the words either all reveal or none do and a wrapped line can no longer be
// orphaned. staggerChildren/delayChildren reproduce the old per-word timing, so
// callers passing a staggerDelay keep their cascade — SectionHeader passes 0 and
// gets the simultaneous fade it always wanted.
//
// The stagger lives in the container variant, not in a bare `transition` prop:
// orchestration options are only read off the variant the parent is animating
// to, so hoisting them here is what actually makes the cascade fire.
//
// Motion components come from a static map rather than `motion[Tag]` because
// building the component inline would mint a new type every render and remount
// the subtree, restarting the animation on each parent update.
const MOTION_TAGS = {
  p: motion.p,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  span: motion.span,
} as const;

const wordVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

export function TextReveal({
  text,
  className = '',
  as: Tag = 'p',
  staggerDelay = 0.03,
  startDelay = 0,
  once = true,
  style,
}: TextRevealProps) {
  const words = text.split(' ');
  const MotionTag = MOTION_TAGS[Tag];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: staggerDelay, delayChildren: startDelay },
    },
  };

  return (
    <MotionTag
      className={className}
      style={style}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-60px' }}
    >
      {words.map((word, i) => (
        // ── The reveal mask, and the 0.2em it owes the descenders ──
        //
        // `overflow-hidden` is the window the word rises through. Its height is
        // the line box, i.e. exactly `line-height` — and every caller of this
        // component sets a TIGHT one on display type: SectionHeader uses
        // leading-[1.05] at up to 6rem. Plus Jakarta Sans has an ascent of
        // 1.038em and a descent of 0.222em (1.26em of content area, measured
        // from the shipped woff2), so a 1.05em line box has NEGATIVE half-
        // leading — the mask's lower edge lands 0.117em below the baseline
        // while the font's glyphs reach 0.24em below it. The tail of every
        // descender was being sliced off: "Footprints" and "Open Channel" both
        // rendered with a flat-bottomed `p`, ~9px of it gone at 96px.
        //
        // padding-bottom re-opens the mask past the deepest glyph in the face
        // (0.117 + 0.2 > 0.24em, and 0.2em still clears it at leading-none);
        // the matching negative margin means the MARGIN box — the box
        // `align-bottom` aligns and the box the parent line box measures — is
        // the size it always was, so nothing moves. That matters here beyond
        // tidiness: section heights feed the camera itinerary, and this must
        // cost zero layout.
        //
        // The mask still does its job. It only ever hid the 14px `y` offset of
        // a word that is also at opacity 0, and even at the smallest heading
        // size (2.25rem) the word's descenders start ~21px below the baseline
        // against a mask edge at ~11px, so the entrance is still clipped.
        <span
          key={i}
          className="inline-block overflow-hidden align-bottom pb-[0.2em] -mb-[0.2em]"
        >
          <motion.span
            className="inline-block"
            variants={wordVariants}
            transition={{ duration: 0.5, ease: easeOutExpo }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && '\u00A0'}
        </span>
      ))}
    </MotionTag>
  );
}
