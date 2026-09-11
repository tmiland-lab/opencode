import { describe, expect, test } from "bun:test"
import { FOLLOW_EDGE_TOLERANCE, isAtBottom } from "../../../src/routes/session/follow"

describe("session follow-tail lock", () => {
  test("counts the bottom edge as at bottom", () => {
    // viewport 20 rows, content 100 rows -> max scroll y is 80
    expect(isAtBottom(80, 100, 20)).toBe(true)
  })

  test("tolerates a couple of rows above the edge", () => {
    expect(isAtBottom(80 - FOLLOW_EDGE_TOLERANCE, 100, 20)).toBe(true)
  })

  test("locks once the user scrolls further up", () => {
    expect(isAtBottom(80 - FOLLOW_EDGE_TOLERANCE - 1, 100, 20)).toBe(false)
    expect(isAtBottom(0, 100, 20)).toBe(false)
  })

  test("short content that fits the viewport counts as at bottom", () => {
    expect(isAtBottom(0, 10, 20)).toBe(true)
  })
})
