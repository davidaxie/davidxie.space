'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Route-level tab bar: Home vs. Portfolio. Lives at z-[60] above the
// cosmic section-nav (z-50) so route-level controls never get occluded
// by section controls. Rendered inside root layout so it persists across
// every route without remounting.
type Tab = { href: string; label: string };

const TABS: Tab[] = [
  { href: '/', label: 'Home' },
  { href: '/portfolio', label: 'Portfolio' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabBar() {
  const pathname = usePathname();
  const [scrolledPastTop, setScrolledPastTop] = useState(false);

  // ── Route-conditional auto-hide ──
  // The scroll-hide exists for one reason only: on the homepage the section
  // Navbar claims the exact same slot (`fixed top-4 left-1/2 -translate-x-1/2`,
  // z-50 under our z-[60]) as soon as you're ~2% down the page, so without the
  // hide the two bars would sit stacked on top of each other. That collision
  // does not exist anywhere else — Navbar renders only from app/page.tsx.
  // On /portfolio and /portfolio/[slug] the TabBar is the *entire* chrome
  // (portfolio/layout.tsx says so in as many words), so hiding it 80px into a
  // long case study leaves the reader with no navigation at all. Keep the hide
  // scoped to the one route that needs it.
  const autoHides = pathname === '/';

  useEffect(() => {
    if (!autoHides) return;
    const handleScroll = () => {
      setScrolledPastTop(window.scrollY >= 80);
    };
    // Seed from the current offset: a reload part-way down the homepage would
    // otherwise render the bar in and only correct itself on the first event.
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [autoHides]);

  const visible = !autoHides || !scrolledPastTop;

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          aria-label="Primary tabs"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1 px-2 py-1.5 rounded-full"
          style={{
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className="relative px-4 py-1.5 text-xs font-mono tracking-wider uppercase rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2"
                style={{ color: active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)' }}
              >
                {active && (
                  <motion.span
                    layoutId="tabbar-active"
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </Link>
            );
          })}
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
