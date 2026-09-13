import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { PermissionV1 } from "@opencode-ai/core/v1/permission"
import { approvedFilePath, dedupeRules, evaluate, loadApproved, persistApproved } from "../../src/permission/index"

const originalXdg = process.env.XDG_DATA_HOME

function isolate(): void {
  process.env.XDG_DATA_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-approved-test-"))
}

function restore(): void {
  if (originalXdg === undefined) delete process.env.XDG_DATA_HOME
  else process.env.XDG_DATA_HOME = originalXdg
}

test("dedupeRules drops exact duplicates, keeps distinct actions", () => {
  const rules: PermissionV1.Rule[] = [
    { permission: "bash", pattern: "npm *", action: "allow" },
    { permission: "bash", pattern: "npm *", action: "allow" },
    { permission: "bash", pattern: "npm *", action: "ask" },
    { permission: "bash", pattern: "ls *", action: "allow" },
  ]
  expect(dedupeRules(rules)).toEqual([
    { permission: "bash", pattern: "npm *", action: "allow" },
    { permission: "bash", pattern: "npm *", action: "ask" },
    { permission: "bash", pattern: "ls *", action: "allow" },
  ])
})

test("persist/load roundtrip", () => {
  isolate()
  try {
    expect(loadApproved()).toEqual([])
    persistApproved([{ permission: "bash", pattern: "npm *", action: "allow" }])
    expect(fs.existsSync(approvedFilePath())).toBe(true)
    expect(loadApproved()).toEqual([{ permission: "bash", pattern: "npm *", action: "allow" }])
  } finally {
    restore()
  }
})

test("loaded rules evaluate to allow without asking", () => {
  isolate()
  try {
    persistApproved([{ permission: "bash", pattern: "npm *", action: "allow" }])
    // simulates a fresh process: seed from disk, then evaluate like ask() does
    const seeded = loadApproved()
    expect(evaluate("bash", "npm test", [], seeded).action).toBe("allow")
    expect(evaluate("bash", "rm -rf /", [], seeded).action).toBe("ask")
  } finally {
    restore()
  }
})
test("corrupt or missing file loads empty", () => {
  isolate()
  try {
    expect(loadApproved()).toEqual([])
    fs.mkdirSync(path.dirname(approvedFilePath()), { recursive: true })
    fs.writeFileSync(approvedFilePath(), "{nope")
    expect(loadApproved()).toEqual([])
    fs.writeFileSync(approvedFilePath(), JSON.stringify([{ permission: "bash" }]))
    expect(loadApproved()).toEqual([])
  } finally {
    restore()
  }
})
