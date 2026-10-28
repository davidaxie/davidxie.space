import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CityPanel } from './CityPanel';
import { cities } from '@/data/cities';
import { useFootprintsStore } from '@/stores/footprintsStore';

/**
 * The panel calls itself a modal — role="dialog", aria-modal="true", the page
 * frozen underneath — and every one of those promises is only as good as the
 * focus trap that backs them. These tests are about that trap, and about the
 * one thing jsdom is genuinely good at: where focus goes when you press Tab.
 *
 * The bug they were written for: focus opens on the HEADING, which carries
 * tabIndex={-1} and so is deliberately absent from the trap's list of focusable
 * nodes. The old wrap condition asked `active === first`, the heading is not
 * `first`, and the heading sits before every control in the card — so the very
 * first Shift+Tab after opening was handed to the browser, which walked focus
 * backwards out of a subtree portalled to the end of <body> and onto the page
 * the overlay is covering. One keystroke, and the visitor is standing on
 * controls they cannot see and that aria-modal has hidden from their screen
 * reader. It was also one-way: the handler is bound to the dialog, so no later
 * Tab could reach it to pull focus back.
 */

const BOSTON = cities[0];

/** A tabbable node OUTSIDE the dialog. The dialog portals to the end of
 *  <body>, so this stands in for the page underneath — it is exactly what a
 *  backwards escape lands on, and asserting focus never reaches it is the
 *  whole point. */
function PageBehind() {
  return (
    <>
      <button type="button">page control behind the overlay</button>
      <CityPanel cityId={BOSTON.id} />
    </>
  );
}

describe('CityPanel focus trap', () => {
  afterEach(() => {
    useFootprintsStore.setState({ activeCity: null });
    document.documentElement.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('scrollbar-gutter');
  });

  it('opens with focus on the heading, not on a control', async () => {
    render(<PageBehind />);
    const heading = await screen.findByRole('heading', { name: BOSTON.name });
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it('THE REGRESSION: Shift+Tab from the heading stays inside the dialog', async () => {
    const user = userEvent.setup();
    render(<PageBehind />);

    const heading = await screen.findByRole('heading', { name: BOSTON.name });
    await waitFor(() => expect(heading).toHaveFocus());

    const behind = screen.getByRole('button', { name: /page control behind/i });
    const close = screen.getByRole('button', { name: new RegExp(`Close ${BOSTON.name}`) });

    await user.tab({ shift: true });

    expect(behind).not.toHaveFocus();
    expect(close).toHaveFocus();
  });

  it('wraps in both directions once focus is on a control', async () => {
    const user = userEvent.setup();
    render(<PageBehind />);

    const heading = await screen.findByRole('heading', { name: BOSTON.name });
    await waitFor(() => expect(heading).toHaveFocus());

    const behind = screen.getByRole('button', { name: /page control behind/i });
    const close = screen.getByRole('button', { name: new RegExp(`Close ${BOSTON.name}`) });

    close.focus();

    // This dialog's only tabbable node is the close button, so both wraps land
    // back on it. The assertion that matters is the negative one: neither
    // direction leaks onto the page behind.
    await user.tab();
    expect(behind).not.toHaveFocus();
    expect(close).toHaveFocus();

    await user.tab({ shift: true });
    expect(behind).not.toHaveFocus();
    expect(close).toHaveFocus();
  });

  it('freezes the document while open and gives it back untouched on unmount', async () => {
    const before = document.documentElement.style.overflow;
    const { unmount } = render(<PageBehind />);

    await waitFor(() => expect(document.documentElement.style.overflow).toBe('hidden'));

    unmount();
    expect(document.documentElement.style.overflow).toBe(before);
    expect(document.documentElement.style.getPropertyValue('scrollbar-gutter')).toBe('');
  });
});
