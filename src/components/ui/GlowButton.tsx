'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

// next/link wrapped once at module scope so internal CTAs keep the identical
// hover/tap animation while still doing a client-side transition. Creating it
// inside the component would hand React a new component type every render and
// remount the button (killing the animation mid-hover).
const MotionLink = motion.create(Link);

interface GlowButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'square';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: React.ReactNode;
  // Escape hatch for the cases the href alone cannot express — e.g. a local
  // /resume.pdf that should open beside the site rather than replace it.
  // Leave it unset and the href decides (see the classification below).
  external?: boolean;
}

const sizeClasses = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-5 py-3 sm:px-7 sm:py-3.5 text-sm',
  lg: 'px-6 py-3.5 sm:px-9 sm:py-4 text-sm sm:text-base',
};

const variantConfig = {
  primary: {
    className: 'bg-gradient-to-r from-[#D0D0D8] to-[#A0A0B0] text-black border-0 font-semibold',
    hoverShadow: '0 0 30px rgba(208,208,216,0.5), 0 4px 20px rgba(208,208,216,0.3)',
    hoverScale: 1.03,
  },
  secondary: {
    className: 'bg-white/[0.07] text-white border border-white/20 hover:border-white/40 hover:bg-white/[0.12]',
    hoverShadow: '0 0 25px rgba(255,255,255,0.1)',
    hoverScale: 1.02,
  },
  ghost: {
    className: 'bg-transparent text-white/80 border border-white/20 hover:bg-white/[0.08]',
    hoverShadow: '0 0 20px rgba(255,255,255,0.08)',
    hoverScale: 1.02,
  },
  square: {
    className: 'bg-white/[0.07] text-white border border-white/20 hover:border-white/40 hover:bg-white/[0.12] !px-10',
    hoverShadow: '0 0 25px rgba(255,255,255,0.1)',
    hoverScale: 1.02,
  },
};

export function GlowButton({
  children,
  href,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  icon,
  external,
}: GlowButtonProps) {
  const v = variantConfig[variant];

  // One source of truth for look + motion, shared by all three renderings so
  // the element the href resolves to can never drift visually from the others.
  const motionProps = {
    onClick,
    className: `
        inline-flex items-center justify-center gap-2.5
        ${variant === 'square' ? 'rounded-lg' : 'rounded-full'} font-mono tracking-wider
        transition-colors duration-200
        cursor-pointer select-none
        ${sizeClasses[size]}
        ${v.className}
        ${className}
      `,
    whileHover: {
      scale: v.hoverScale,
      boxShadow: v.hoverShadow,
    },
    whileTap: { scale: 0.97 },
    transition: { duration: 0.2 },
  };

  const content = (
    <>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </>
  );

  if (!href) {
    return <motion.button {...motionProps}>{content}</motion.button>;
  }

  // ── Destination classification ──────────────────────────────────────
  // This used to force target="_blank" on every href, which had two costs:
  // an internal route could never use this button (a raw <a> to /portfolio
  // is a full document load that tears down and re-initialises the three.js
  // scene), and mailto: handed the OS mail client a tab that then sat there
  // empty. So: routes render as next/link, mailto:/tel: stay in place, and
  // only genuinely off-site http(s) links open a new tab.
  const isRoute = href.startsWith('/') || href.startsWith('#');
  const opensNewTab = external ?? /^(https?:)?\/\//i.test(href);

  if (isRoute && !opensNewTab) {
    return (
      <MotionLink href={href} {...motionProps}>
        {content}
      </MotionLink>
    );
  }

  return (
    <motion.a
      href={href}
      target={opensNewTab ? '_blank' : undefined}
      rel={opensNewTab ? 'noopener noreferrer' : undefined}
      {...motionProps}
    >
      {content}
      {/* The sighted cue for "this leaves the site" is the arrow glyph each
          caller passes as `icon`, which is decoration a screen reader never
          reports — so without this the nine external CTAs on the homepage
          announced as plain links and the new tab arrived unannounced, with
          Back now dead (WCAG 3.2.5, technique G201). Appended to the
          accessible name rather than exposed as a title/aria-label so it is
          read after the label the caller wrote, not instead of it.

          `sr-only` is a Tailwind v4 core utility (already in use at
          sections/Builder.tsx:401 and sections/SystemOverview.tsx:149), so this
          needs nothing added to globals.css. It is also layout-inert here on
          purpose: sr-only is `position: absolute`, and an absolutely positioned
          child of a flex container is not a flex item, so the button's
          `gap-2.5` does not open a gap for it and the pill keeps its size. */}
      {opensNewTab && <span className="sr-only"> (opens in a new tab)</span>}
    </motion.a>
  );
}
