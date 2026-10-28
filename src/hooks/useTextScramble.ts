'use client';

import { useCallback, useRef, useState } from 'react';

const GLYPHS = '!@#$%^&*()_+-=[]{}|;:,.<>?0123456789';
const STAGGER_MS = 30;
const SCRAMBLE_DURATION_MS = 60; // how long each char scrambles before resolving

function randomGlyph(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

export function useTextScramble(text: string) {
  const [displayText, setDisplayText] = useState(text);
  const [isScrambling, setIsScrambling] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const trigger = useCallback(() => {
    cleanup();
    setIsScrambling(true);
    startTimeRef.current = performance.now();

    const chars = text.split('');
    const totalDuration = chars.length * STAGGER_MS + SCRAMBLE_DURATION_MS;

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;

      const result = chars.map((char, i) => {
        // Preserve spaces
        if (char === ' ') return ' ';

        const resolveTime = i * STAGGER_MS + SCRAMBLE_DURATION_MS;

        if (elapsed >= resolveTime) {
          // Character has resolved
          return char;
        }

        const scrambleStart = i * STAGGER_MS;
        if (elapsed >= scrambleStart) {
          // Character is actively scrambling
          return randomGlyph();
        }

        // Character hasn't started scrambling yet — show random glyph
        return randomGlyph();
      });

      setDisplayText(result.join(''));

      if (elapsed < totalDuration) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayText(text);
        setIsScrambling(false);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [text, cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setDisplayText(text);
    setIsScrambling(false);
  }, [text, cleanup]);

  return { displayText, isScrambling, trigger, reset, cleanup };
}
