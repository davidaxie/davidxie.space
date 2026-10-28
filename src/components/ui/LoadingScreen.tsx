'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  isLoading: boolean;
}

type Stage = 'stars' | 'name' | 'tagline' | 'progress' | 'exit';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  brightness: number;
}

// Seeded PRNG to avoid hydration mismatch (Math.random differs server vs client)
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateStars(count: number): Star[] {
  const rand = seededRandom(42);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      x: rand() * 100,
      y: rand() * 100,
      size: rand() * 1.5 + 0.5,
      delay: rand() * 0.8,
      brightness: rand() * 0.5 + 0.5,
    });
  }
  return stars;
}

// Pre-generate stars at module level with deterministic seed — same on server and client
const STARS = generateStars(25);

const NAME_LETTERS = 'DAVID XIE'.split('');
const TAGLINE_PARTS = ['Builder', '·', 'Trader', '·', 'Creator'];
const STAGES: Stage[] = ['stars', 'name', 'tagline', 'progress', 'exit'];

export function LoadingScreen({ isLoading }: LoadingScreenProps) {
  const [stage, setStage] = useState<Stage>('stars');
  const [visible, setVisible] = useState(true);
  const stars = STARS;

  const stageIndex = STAGES.indexOf(stage);
  const isExiting = stage === 'exit';

  // Canvas readiness is a pure derivation of the prop — the parent only ever
  // flips isLoading true → false (once CosmicCanvas fires onReady), so mirroring
  // it into state via an effect only bought an extra cascading render.
  const canvasReady = !isLoading;

  // Stage progression timers
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage('name'), 1000));
    timers.push(setTimeout(() => setStage('tagline'), 2000));
    timers.push(setTimeout(() => setStage('progress'), 2500));
    return () => timers.forEach(clearTimeout);
  }, []);

  // Trigger exit when progress stage is reached and canvas is ready
  useEffect(() => {
    if (stage === 'progress' && canvasReady) {
      const t = setTimeout(() => setStage('exit'), 400);
      return () => clearTimeout(t);
    }
  }, [stage, canvasReady]);

  // After exit animation plays, unmount
  useEffect(() => {
    if (stage === 'exit') {
      const t = setTimeout(() => setVisible(false), 850);
      return () => clearTimeout(t);
    }
  }, [stage]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="status"
          aria-label="Loading"
          className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black ${
            isExiting ? 'pointer-events-none' : ''
          }`}
        >
          {/* Background fade-out during exit */}
          <motion.div
            className="absolute inset-0 bg-black"
            animate={isExiting ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* ── Stage 1: Stars ── */}
          {stars.map((star) => (
            <motion.div
              key={star.id}
              className="absolute rounded-full bg-white"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: star.size,
                height: star.size,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={
                isExiting
                  ? {
                      opacity: 0,
                      scale: 3,
                      x: (star.x - 50) * 8,
                      y: (star.y - 50) * 8,
                    }
                  : {
                      opacity: star.brightness,
                      scale: 1,
                    }
              }
              transition={
                isExiting
                  ? { duration: 0.6, ease: 'easeIn' }
                  : { delay: star.delay, duration: 0.5, ease: 'easeOut' }
              }
            />
          ))}

          {/* ── Stage 2: Name reveal (letter-by-letter) ── */}
          <div className="relative z-10 flex items-center justify-center gap-[2px]">
            {NAME_LETTERS.map((letter, i) => (
              <motion.span
                key={i}
                className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-[0.25em] text-white"
                style={{
                  display: 'inline-block',
                  minWidth: letter === ' ' ? '0.3em' : undefined,
                  textShadow:
                    stageIndex >= 1
                      ? '0 0 30px rgba(255,255,255,0.3), 0 0 60px rgba(208,208,216,0.15)'
                      : 'none',
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={
                  isExiting
                    ? { opacity: 0, scale: 1.1, y: -10 }
                    : stageIndex >= 1
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: 30 }
                }
                transition={
                  isExiting
                    ? { duration: 0.5, delay: i * 0.02 }
                    : { delay: 1.0 + i * 0.03, duration: 0.5, ease: [0.22, 1, 0.36, 1] }
                }
              >
                {letter}
              </motion.span>
            ))}
          </div>

          {/* ── Stage 3: Tagline (blur-to-sharp) ── */}
          <motion.div
            className="relative z-10 mt-4 flex items-center gap-3"
            initial={{ opacity: 0, filter: 'blur(8px)' }}
            animate={
              isExiting
                ? { opacity: 0, filter: 'blur(4px)' }
                : stageIndex >= 2
                  ? { opacity: 1, filter: 'blur(0px)' }
                  : { opacity: 0, filter: 'blur(8px)' }
            }
            transition={
              isExiting
                ? { duration: 0.4 }
                : { delay: 0.1, duration: 0.6, ease: 'easeOut' }
            }
          >
            {/* Animates to opacity 1, not 0.6/0.3 — the same compounding bug
                SectionHeader.tsx had. The tint lives in `text-white/60`
                (`text-white/30` for the separator) and nowhere else; repeating
                it in `animate` multiplied the two, so the words rendered at
                0.6 x 0.6 = 0.36 alpha => 3.13:1, under AA's 4.5:1 for 14/16px
                regular text, and the dots at 0.3 x 0.3 = 0.09 => 1.17:1, which
                is not a separator so much as a rumour. Fading to 1 lets each
                class mean what it says: 0.60 => 7.37:1 for the words, 0.30 =>
                2.46:1 for the dots. The dots stay faint on purpose — they are
                pure decoration under 1.4.3 (the flex `gap-3` already does the
                separating, and they are aria-hidden so nothing announces
                "middle dot" three times), which is why they are exempt from the
                4.5:1 the words next to them now clear. */}
            {TAGLINE_PARTS.map((part, i) => (
              <motion.span
                key={i}
                aria-hidden={part === '·' ? true : undefined}
                className={`text-sm sm:text-base tracking-[0.2em] uppercase ${
                  part === '·' ? 'text-white/30' : 'text-white/60'
                }`}
                initial={{ opacity: 0 }}
                animate={
                  stageIndex >= 2 && !isExiting ? { opacity: 1 } : { opacity: 0 }
                }
                transition={{ delay: 2.0 + i * 0.1, duration: 0.4 }}
              >
                {part}
              </motion.span>
            ))}
          </motion.div>

          {/* ── Stage 4: Progress indicator ── */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 sm:w-64">
            {/* Track background */}
            <motion.div
              className="h-[1px] w-full rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.08)' }}
              initial={{ opacity: 0 }}
              animate={
                isExiting
                  ? { opacity: 0 }
                  : stageIndex >= 3
                    ? { opacity: 1 }
                    : { opacity: 0 }
              }
              transition={{ duration: 0.3 }}
            >
              {/* Progress fill */}
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(to right, #D0D0D8, #FFFFFF, #3B9FE0)',
                }}
                initial={{ width: '0%' }}
                animate={
                  canvasReady
                    ? { width: '100%' }
                    : stageIndex >= 3
                      ? { width: '70%' }
                      : { width: '0%' }
                }
                transition={
                  canvasReady
                    ? { duration: 0.3, ease: 'easeOut' }
                    : { duration: 4, ease: 'linear' }
                }
              />
            </motion.div>

            {/* Status text — `text-white/50` (5.28:1), not /30 (2.46:1).
                This is the one string on the screen that reports state
                ("INITIALIZING" vs "LAUNCH READY"), so it is informative text,
                not decoration, and AA's 4.5:1 applies with no size relief: at
                10px it is nowhere near the 18.66px/24px large-text thresholds.
                /50 is the smallest step that clears it. */}
            <motion.p
              className="mt-3 text-center text-[10px] tracking-[0.3em] uppercase text-white/50 font-mono"
              initial={{ opacity: 0 }}
              animate={
                isExiting
                  ? { opacity: 0 }
                  : stageIndex >= 3
                    ? { opacity: 1 }
                    : { opacity: 0 }
              }
              transition={{ duration: 0.3 }}
            >
              {canvasReady ? 'LAUNCH READY' : 'INITIALIZING'}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
