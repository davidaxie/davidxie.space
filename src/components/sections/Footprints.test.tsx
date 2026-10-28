import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Footprints } from './Footprints';
import { cities } from '@/data/cities';
import { useFootprintsStore } from '@/stores/footprintsStore';

/**
 * These tests exist to protect one thing above all others.
 *
 * The camera itinerary in lib/constants.ts is keyed to hardcoded FRACTIONS of
 * total document height. If opening a city changes how tall the Footprints
 * section is, every planet visit after Earth is silently re-timed and nothing
 * anywhere measures the drift. The city panel is therefore a `fixed` overlay
 * portalled to <body>, and the assertion below is the mechanical proof of that:
 * the section renders the same tree open or closed.
 *
 * jsdom has no layout engine, so "same height" cannot be measured here — but it
 * does not need to be. Identical markup under an identical stylesheet has
 * identical geometry by definition, which is a stronger statement than any
 * single measured number would be.
 */

/** The section's markup, with the only attribute that legitimately differs
 *  between states normalised away. aria-expanded is state, not layout: it
 *  changes what a screen reader announces about the trigger and nothing about
 *  the box it occupies. */
function layoutSignature(el: Element): string {
  return el.outerHTML.replace(/aria-expanded="(true|false)"/g, 'aria-expanded="_"');
}

function getSection(): HTMLElement {
  const section = document.querySelector('#footprints');
  if (!section) throw new Error('Footprints section did not render');
  return section as HTMLElement;
}

describe('Footprints', () => {
  beforeEach(() => {
    useFootprintsStore.setState({ activeCity: null });
  });

  afterEach(() => {
    useFootprintsStore.setState({ activeCity: null });
    document.documentElement.style.removeProperty('overflow');
  });

  it('renders one chip per city, straight from the data', () => {
    render(<Footprints />);
    const section = getSection();
    for (const city of cities) {
      expect(within(section).getByRole('button', { name: new RegExp(city.name) })).toBeInTheDocument();
    }
  });

  /**
   * Regression, 2026-08-27: every chip was invisible on the live site.
   *
   * The test above passed the whole time — the chips WERE in the document. They
   * were just painted outside their box. The right column was
   * `h-[calc(60vh-9rem)] min-h-[300px]` wrapping an `overflow-y-auto` div (a
   * leftover from when the city panel docked inside it), the content came to
   * 454px, and the box was 300px. All five chips sat 56px past the fold with no
   * scrollbar to admit it, because globals.css hides scrollbars site-wide. The
   * section read "5 places … open one" and offered nothing to open.
   *
   * jsdom cannot measure that — it has no layout engine, which is precisely how
   * the bug survived a suite this thorough. So this asserts the CAUSE instead of
   * the symptom: the chip index must not sit inside a box that both fixes its
   * height and clips the overflow. A minimum height is fine and is what ships;
   * a definite one is what silently ate the content.
   */
  it('never puts the chip index inside a fixed-height clipping box', () => {
    render(<Footprints />);
    const chip = within(getSection()).getByRole('button', {
      name: new RegExp(cities[0].name),
    });

    // Match whole class TOKENS, not substrings: `min-h-[300px]` contains the
    // characters of `h-[` and must not be mistaken for a definite height, which
    // is the entire distinction this test turns on. Variant prefixes (`md:`,
    // `sm:`) are stripped so a breakpoint-scoped clip is caught too.
    const CLIPS = /^overflow(-[xy])?-(auto|scroll|hidden)$/;
    const DEFINITE_H = /^(h-\[.+\]|h-screen|h-full|max-h-\[.+\])$/;

    for (let el = chip.parentElement; el && el !== document.body; el = el.parentElement) {
      const cls = el.className.toString();
      const tokens = cls.split(/\s+/).filter(Boolean).map((t) => t.replace(/^[\w-]+:/, ''));
      expect(
        tokens.some((t) => CLIPS.test(t)) && tokens.some((t) => DEFINITE_H.test(t)),
        `"${cls}" both fixes its height and clips overflow, so the city chips ` +
          `can be scrolled out of sight with no scrollbar to reveal them`,
      ).toBe(false);
    }
  });

  it('THE HARD CONSTRAINT: the section renders identically whether a city is open or closed', async () => {
    const user = userEvent.setup();
    render(<Footprints />);

    const closed = layoutSignature(getSection());

    await user.click(within(getSection()).getByRole('button', { name: new RegExp(cities[0].name) }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const open = layoutSignature(getSection());
    expect(open).toBe(closed);
  });

  it('puts the panel outside the section, in a fixed overlay on <body>', async () => {
    const user = userEvent.setup();
    render(<Footprints />);
    await user.click(within(getSection()).getByRole('button', { name: new RegExp(cities[0].name) }));

    const dialog = screen.getByRole('dialog');
    // Not a descendant of the section: it cannot contribute to its height.
    expect(getSection().contains(dialog)).toBe(false);

    // Out of flow, covering the viewport — the two properties that make the
    // statement above true rather than incidental.
    const overlay = document.body.querySelector('.fixed.inset-0');
    expect(overlay).not.toBeNull();
    expect(overlay!.contains(dialog)).toBe(true);
  });

  it('is a real modal: aria-modal, labelled, and focus moved inside', async () => {
    const user = userEvent.setup();
    render(<Footprints />);
    await user.click(within(getSection()).getByRole('button', { name: new RegExp(cities[0].name) }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName(cities[0].name);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('freezes the page while open and gives the scroll back on close', async () => {
    const user = userEvent.setup();
    render(<Footprints />);

    expect(document.documentElement.style.overflow).toBe('');

    await user.click(within(getSection()).getByRole('button', { name: new RegExp(cities[0].name) }));
    expect(document.documentElement.style.overflow).toBe('hidden');

    await user.click(screen.getByRole('button', { name: `Close ${cities[0].name}` }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('closes on Escape and hands focus back to the chip that opened it', async () => {
    const user = userEvent.setup();
    render(<Footprints />);

    const chip = within(getSection()).getByRole('button', { name: new RegExp(cities[1].name) });
    await user.click(chip);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(chip);
  });
});
