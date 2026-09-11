import { describe, expect, test } from "bun:test"
import { ModelV2 } from "@opencode-ai/core/model"
import { ProviderV2 } from "@opencode-ai/core/provider"
import { MessageV2 } from "../../src/session/message-v2"
import { SessionFallback } from "../../src/session/fallback"

const providerID = ProviderV2.ID.make("test")

function transportError() {
  return MessageV2.fromError(new Error("fetch failed"), { providerID })
}

function authError() {
  return MessageV2.fromError(new Error("invalid api key"), { providerID })
}

describe("session.fallback.parse", () => {
  test("parses provider/model refs", () => {
    expect(SessionFallback.parse("ollama/qwen3")).toEqual({
      providerID: ProviderV2.ID.make("ollama"),
      modelID: ModelV2.ID.make("qwen3"),
    })
  })

  test("keeps slashes inside the model id", () => {
    expect(SessionFallback.parse("test/a/b"))?.toEqual({
      providerID: ProviderV2.ID.make("test"),
      modelID: ModelV2.ID.make("a/b"),
    })
  })

  test("rejects missing and malformed values", () => {
    expect(SessionFallback.parse(undefined)).toBeUndefined()
    expect(SessionFallback.parse("")).toBeUndefined()
    expect(SessionFallback.parse("nonslash")).toBeUndefined()
    expect(SessionFallback.parse("test/")).toBeUndefined()
    expect(SessionFallback.parse("/test")).toBeUndefined()
  })
})

describe("session.fallback.shouldFallback", () => {
  test("falls back on retryable transport errors", () => {
    expect(
      SessionFallback.shouldFallback({
        error: transportError(),
        providerID: "test",
        modelID: "big-model",
        fallback: "ollama/qwen3",
        fellBack: false,
      }),
    ).toEqual({
      providerID: ProviderV2.ID.make("ollama"),
      modelID: ModelV2.ID.make("qwen3"),
    })
  })

  test("does not fall back twice", () => {
    expect(
      SessionFallback.shouldFallback({
        error: transportError(),
        providerID: "ollama",
        modelID: "qwen3",
        fallback: "ollama/qwen3",
        fellBack: true,
      }),
    ).toBeUndefined()
  })

  test("does not fall back on non-retryable errors", () => {
    expect(
      SessionFallback.shouldFallback({
        error: authError(),
        providerID: "test",
        modelID: "big-model",
        fallback: "ollama/qwen3",
        fellBack: false,
      }),
    ).toBeUndefined()
  })

  test("does not fall back without configuration", () => {
    expect(
      SessionFallback.shouldFallback({
        error: transportError(),
        providerID: "test",
        modelID: "big-model",
        fallback: undefined,
        fellBack: false,
      }),
    ).toBeUndefined()
  })

  test("does not fall back to the model that just failed", () => {
    expect(
      SessionFallback.shouldFallback({
        error: transportError(),
        providerID: "test",
        modelID: "big-model",
        fallback: "test/big-model",
        fellBack: false,
      }),
    ).toBeUndefined()
  })

  test("falls back to a different model on the same provider", () => {
    expect(
      SessionFallback.shouldFallback({
        error: transportError(),
        providerID: "test",
        modelID: "big-model",
        fallback: "test/small-model",
        fellBack: false,
      }),
    ).toEqual({
      providerID: ProviderV2.ID.make("test"),
      modelID: ModelV2.ID.make("small-model"),
    })
  })
})
