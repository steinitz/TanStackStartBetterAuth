import React, { useState } from 'react';

/**
 * A native <details> whose panel floats over the page instead of pushing it down,
 * and which closes when you click anywhere outside it.
 *
 * Why a backdrop rather than a document-level click listener (HelpTooltip's
 * approach): a listener lets the click through to whatever was underneath, so
 * dismissing the panel also acts on the page. A backdrop absorbs it. That is the
 * old Apple rule — a click that activates should not also do — and it matters most
 * mid-game, where a tap meant for the board should dismiss the panel and nothing
 * else, rather than moving a piece you were not ready to move.
 *
 * The panel is absolutely positioned, so neither its contents nor opening it can
 * move anything else on the page. Where this was written the board sat directly
 * below and must not shift under the player's hands; the property is worth keeping
 * wherever the panel opens above content people are aiming at.
 */

// Inline styles cannot reach a pseudo-element, and older Safari draws the
// disclosure triangle with a proprietary one that ignores `list-style: none`.
// Both current callers draw their own summary — a status light, a user icon — so
// suppression belongs here rather than in each app's CSS override. Keeping the
// rule with the component is the same choice HelpDisclosure makes, and for the
// same reason: every consumer is iPad-safe without knowing to be.
const markerReset = `
.stz-disclosure > summary::-webkit-details-marker {
  display: none;
}

.stz-disclosure > summary::marker {
  content: '';
}
`;

type DisclosureProps = {
  /** The always-visible control. Rendered inside <summary>. */
  summary: React.ReactNode;
  summaryStyle?: React.CSSProperties;
  /** For what inline styles cannot reach, beyond the marker this component
   *  already suppresses for every instance. */
  summaryClassName?: string;
  /** Visual styling for the floating panel. Positioning is owned here. */
  panelStyle?: React.CSSProperties;
  title?: string;
  /**
   * Pass both to hoist open/closed above this component; omit both and it keeps its
   * own state (the usual case). Hoisting is for when something inside the panel makes
   * an ANCESTOR remount — choosing an engine on the play page re-keys the whole game
   * subtree, so state held at or below this component is destroyed by the control that
   * set it. The symptom is a panel that vanishes without ever firing a toggle event.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * A visible Close inside the panel. Worth it after a long game, where people reach
   * for a control rather than a remembered gesture. A short menu does not want one:
   * picking an item or clicking away already dismisses it, and the button would be a
   * fifth thing to read in a list of four.
   */
  showClose?: boolean;
  children: React.ReactNode;
};

export function Disclosure({
  summary,
  summaryStyle,
  summaryClassName,
  panelStyle,
  title,
  open,
  onOpenChange,
  showClose = true,
  children,
}: DisclosureProps) {
  const [ownOpen, setOwnOpen] = useState(false);
  const isOpen = open ?? ownOpen;

  const setOpen = (next: boolean) => {
    if (open === undefined) setOwnOpen(next);
    onOpenChange?.(next);
  };

  const close = () => setOpen(false);

  return (
    <details
      className="stz-disclosure"
      // Driven from state rather than left to the browser, so the backdrop is
      // never rendered while the panel is shut. <details> does make its own
      // children inert when closed, but "probably inert" is a poor property for
      // an element covering the whole viewport.
      open={isOpen}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      // z-index is load-bearing, and the reason is easy to miss: without it the
      // backdrop sits at the same level as any later positioned sibling, and
      // "later in the document" wins. On the play page that sibling is the board,
      // so clicks landed on the board and the panel refused to dismiss — while the
      // panel itself, being one level up, still floated correctly over it.
      //
      // Setting it here also makes this a stacking context, so the backdrop and
      // panel order themselves privately instead of competing with the page. 10
      // clears ordinary content while staying under the play page's own ladder:
      // board overlays at 20, the Maia failure banner at 30. A result banner
      // should cover an open panel, not the other way round.
      //
      // margin: 0 because <details> carries a ~1.3rem vertical margin by default,
      // which silently adds height wherever it is placed.
      style={{ position: 'relative', margin: 0, zIndex: 10 }}
    >
      <style>{markerReset}</style>

      {/* Raised above the backdrop, or the backdrop would cover the summary and
          swallow the click that closes the panel. It would still close — via the
          backdrop rather than the native toggle — but the cursor and hover state
          would belong to the wrong element. */}
      <summary
        className={summaryClassName}
        style={{ cursor: 'pointer', position: 'relative', zIndex: 1, listStyle: 'none', ...summaryStyle }}
        title={title}
      >
        {summary}
      </summary>

      {isOpen && (
        <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
      )}

      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          zIndex: 1,
          ...panelStyle,
        }}
      >
        {children}

        {/* Plain <button>, so it takes MVP.css's default link-blue — type="reset" is
            the only variant the override restyles, and dismissing isn't a secondary
            action here, it's the one thing this button is for. Trailing edge per HIG. */}
        {showClose && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <button onClick={close}>Close</button>
          </div>
        )}
      </div>
    </details>
  );
}
