'use client';

import { useEffect, useRef, type ComponentType, type Ref } from 'react';
import { useInView } from 'framer-motion';
import { useTextScramble } from '@/hooks/useTextScramble';

interface TextScrambleProps {
  text: string;
  className?: string;
  triggerOnHover?: boolean;
  triggerOnView?: boolean;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div';
}

export function TextScramble({
  text,
  className = '',
  triggerOnHover = false,
  triggerOnView = false,
  as = 'span',
}: TextScrambleProps) {
  const { displayText, isScrambling, trigger, cleanup } = useTextScramble(text);
  const ref = useRef<HTMLElement>(null);
  const hasTriggeredRef = useRef(false);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  // Trigger on viewport entry (once)
  useEffect(() => {
    if (triggerOnView && isInView && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      trigger();
    }
  }, [triggerOnView, isInView, trigger]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const handleMouseEnter = triggerOnHover ? trigger : undefined;

  // Use font-mono during scramble to prevent layout shift from variable-width glyphs
  const scrambleFont = isScrambling ? ' font-mono' : '';

  // Rendered as JSX rather than createElement: handing the ref object to a
  // createElement props literal is indistinguishable from reading the ref during
  // render, whereas the JSX `ref` attribute is attached by React after commit.
  // The cast is needed because TS resolves a union of intrinsic tag names down to
  // the narrowest ref type ('p' → HTMLParagraphElement), which one shared
  // HTMLElement ref can never satisfy; at runtime `as` is still a plain tag name.
  const Tag = as as unknown as ComponentType<{
    ref?: Ref<HTMLElement>;
    className?: string;
    onMouseEnter?: () => void;
    children?: React.ReactNode;
  }>;

  return (
    <Tag
      ref={ref}
      className={`${className}${scrambleFont}`}
      onMouseEnter={handleMouseEnter}
    >
      {displayText}
    </Tag>
  );
}
