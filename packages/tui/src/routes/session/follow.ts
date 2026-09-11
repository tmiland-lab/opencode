// Self-host fork: follow-tail lock helpers for the session message list.
//
// The scrollbox sticks to the bottom while new output streams, but once the
// user scrolls up to read, streaming must not yank the view away. The
// renderer tracks manual scrolling itself, but misses some scroll paths, so
// the session view enforces the lock explicitly: on every streamed update,
// if the user is away from the bottom edge, stickiness is forced off until
// they return (submit / jump-to-bottom re-engages).

// Distance in rows from the bottom edge within which the view still counts
// as "at bottom" (avoids flicker from rounding and partial rows).
export const FOLLOW_EDGE_TOLERANCE = 2

export function isAtBottom(scrollY: number, scrollHeight: number, viewportHeight: number): boolean {
  return scrollY >= scrollHeight - viewportHeight - FOLLOW_EDGE_TOLERANCE
}
