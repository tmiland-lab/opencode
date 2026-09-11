import { ModelV2 } from "@opencode-ai/core/model"
import { ProviderV2 } from "@opencode-ai/core/provider"
import type { NamedError } from "@opencode-ai/core/util/error"
import { SessionRetry } from "./retry"

export type Ref = {
  readonly providerID: ProviderV2.ID
  readonly modelID: ModelV2.ID
}

export type Err = ReturnType<NamedError["toObject"]>

// Parse a "provider/model" ref like the `model` and `small_model` config
// options. Returns undefined for missing or malformed values.
export function parse(input: string | undefined): Ref | undefined {
  if (!input) return undefined
  const [providerID, ...rest] = input.split("/")
  const modelID = rest.join("/")
  if (!providerID || !modelID) return undefined
  return {
    providerID: ProviderV2.ID.make(providerID),
    modelID: ModelV2.ID.make(modelID),
  }
}

// Decide whether a failed turn should continue on the fallback model.
// Only transport-classified (retryable) failures qualify — callers check this
// after the retry policy has already given up (`stop`). Skips when the
// session already fell back or the fallback is the model that just failed.
export function shouldFallback(input: {
  error: Err
  providerID: string
  modelID: string
  fallback: string | undefined
  fellBack: boolean
}): Ref | undefined {
  if (input.fellBack) return undefined
  const ref = parse(input.fallback)
  if (!ref) return undefined
  if (ref.providerID === input.providerID && ref.modelID === input.modelID) return undefined
  if (!SessionRetry.retryable(input.error, input.providerID)) return undefined
  return ref
}

export * as SessionFallback from "./fallback"
