import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTextScramble } from './useTextScramble';

// Mirrors of the module-private constants in useTextScramble.ts. Kept here as
// literals on purpose: if someone retunes the animation, these tests should fail
// loudly rather than silently re-deriving the new timing from the source.
const STAGGER_MS = 30;
const SCRAMBLE_DURATION_MS = 60;

// 9 characters with a space at index 5, so the space-preservation branch and the
// left-to-right stagger are both observable in a single string.
const TEXT = 'DAVID XIE';
const TOTAL_DURATION_MS = TEXT.length * STAGGER_MS + SCRAMBLE_DURATION_MS; // 330

// Math.random is pinned to 0 in beforeEach → randomGlyph() always returns
// GLYPHS[0], which is '!'. That turns an intentionally random animation into an
// exactly assertable one, so every '!' below is an unresolved character.

/** Advance the faked clock, flushing every rAF frame inside act(). */
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  // Only rAF/performance/Date are faked — setTimeout and MessageChannel stay
  // real so React's scheduler keeps working normally under act().
  vi.useFakeTimers({
    toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'],
  });
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useTextScramble', () => {
  it('starts idle showing the untouched text', () => {
    const { result } = renderHook(() => useTextScramble(TEXT));

    expect(result.current.displayText).toBe(TEXT);
    expect(result.current.isScrambling).toBe(false);
  });

  it('resolves characters left to right and never scrambles spaces', () => {
    const { result } = renderHook(() => useTextScramble(TEXT));

    act(() => result.current.trigger());
    expect(result.current.isScrambling).toBe(true);

    // rAF frames land every 16ms; elapsed === the frame timestamp because
    // trigger() stamps startTime from the same faked clock at t=0.

    // t=16 — before index 0's resolve time (0 * 30 + 60), so nothing is settled.
    advance(16);
    expect(result.current.displayText).toBe('!!!!! !!!');

    // t=64 — past index 0 (60ms) but short of index 1 (90ms).
    advance(48);
    expect(result.current.displayText).toBe('D!!!! !!!');

    // t=160 — indices 0–3 resolved (i * 30 + 60 <= 160 → i <= 3).
    advance(96);
    expect(result.current.displayText).toBe('DAVI! !!!');

    // Length is invariant throughout, and the space never becomes a glyph.
    expect(result.current.displayText).toHaveLength(TEXT.length);
    expect(result.current.displayText[5]).toBe(' ');
  });

  it('settles on the exact source text and clears the flag after the full duration', () => {
    const { result } = renderHook(() => useTextScramble(TEXT));

    act(() => result.current.trigger());

    // Last frame before TOTAL_DURATION_MS (330): every character has already
    // resolved (the last resolves at 300) but the animation is still running.
    advance(320);
    expect(result.current.displayText).toBe(TEXT);
    expect(result.current.isScrambling).toBe(true);

    // First frame at/after 330 ends the run.
    advance(32);
    expect(result.current.displayText).toBe(TEXT);
    expect(result.current.isScrambling).toBe(false);
  });

  it('restarts the stagger from zero when triggered again mid-animation', () => {
    const { result } = renderHook(() => useTextScramble(TEXT));

    act(() => result.current.trigger());
    advance(160);
    expect(result.current.displayText).toBe('DAVI! !!!');

    // Re-triggering re-stamps startTime, so the next frame is 16ms into a fresh
    // run — everything is scrambled again rather than continuing from 'DAVI'.
    act(() => result.current.trigger());
    advance(16);
    expect(result.current.displayText).toBe('!!!!! !!!');
    expect(result.current.isScrambling).toBe(true);
  });

  it('reset() restores the text immediately and cancels the pending frame', () => {
    const { result } = renderHook(() => useTextScramble(TEXT));

    act(() => result.current.trigger());
    advance(64);
    expect(result.current.displayText).toBe('D!!!! !!!');

    act(() => result.current.reset());
    expect(result.current.displayText).toBe(TEXT);
    expect(result.current.isScrambling).toBe(false);

    // Had the loop survived, t=128 would render 'DAV!! !!!'.
    advance(64);
    expect(result.current.displayText).toBe(TEXT);
    expect(result.current.isScrambling).toBe(false);
  });

  it('cleanup() freezes the animation without restoring text or flag', () => {
    const { result } = renderHook(() => useTextScramble(TEXT));

    act(() => result.current.trigger());
    advance(64);
    const frozen = result.current.displayText;
    expect(frozen).toBe('D!!!! !!!');

    // cleanup() is the raw cancel used by unmount/effect teardown: it stops the
    // rAF chain but deliberately leaves the visible state where it stopped.
    // reset() is the one that also restores. Guarding that distinction here.
    act(() => result.current.cleanup());
    advance(TOTAL_DURATION_MS * 2);

    expect(result.current.displayText).toBe(frozen);
    expect(result.current.isScrambling).toBe(true);
  });
});
