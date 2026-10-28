'use client';

import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Makes every Framer Motion animation on the site honour the OS
 * "reduce motion" setting.
 *
 * ── Why this component has to exist ──
 * Framer's default is `reducedMotion: "never"` — it does not consult the media
 * query unless something tells it to. And it animates by writing inline styles
 * and transforms on each frame, so the blanket
 * `transition-duration: 0.01ms !important` rule in globals.css cannot touch it:
 * that rule governs CSS transitions, and there are none here. The result was a
 * page with 100+ motion elements where the preference reached exactly zero of
 * them.
 *
 * ── Why "user" and not "always" ──
 * `"user"` disables transform, layout and physical animations (x/y, scale,
 * rotate, layout projection) while letting opacity and colour cross-fades run.
 * That is the semantics the spec actually asks for: the objection is to
 * vestibular movement, not to a fade. `"always"` would additionally freeze the
 * fades, which on this site means entrance animations that start at
 * `opacity: 0` would snap in rather than appear — same end state, harsher
 * arrival, and no accessibility gain.
 *
 * ── Why it is a separate file ──
 * MotionConfig is a context provider and therefore a client component;
 * app/layout.tsx is a server component and must stay one (it exports
 * `metadata` and `viewport`, which server components own). Wrapping the
 * children here keeps the boundary to this one small module — the server-
 * rendered tree passes straight through as `children` and is not pulled
 * client-side.
 */
export function MotionPreferences({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
