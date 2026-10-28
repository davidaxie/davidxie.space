'use client';

import { useRef, useEffect } from 'react';
import { useScrollProgress } from '@/hooks/useScrollProgress';

export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const { subscribe } = useScrollProgress();

  useEffect(() => {
    return subscribe((progress) => {
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress})`;
      }
    });
  }, [subscribe]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[2px] pointer-events-none">
      <div
        ref={barRef}
        className="h-full origin-left bg-gradient-to-r from-[#8C8C8C] via-[#F0D080] via-30% via-[#3B9FE0] via-50% via-[#E09030] via-70% to-[#3060F0]"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
