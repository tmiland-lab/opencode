import { createMemo, createSignal } from "solid-js"
import { useLocal } from "../context/local"
import { map, pipe, flatMap, entries, filter, sortBy, take } from "remeda"
import { DialogSelect } from "../ui/dialog-select"
import { useDialog } from "../ui/dialog"
import { createDialogProviderOptions, DialogProvider } from "./dialog-provider"
import { DialogVariant } from "./dialog-variant"
import * as fuzzysort from "fuzzysort"
import { useConnected } from "./use-connected"
import { useSync } from "../context/sync"

export function DialogModel(props: { providerID?: string }) {
  const local = useLocal()
  const sync = useSync()
  const dialog = useDialog()
  const [query, setQuery] = createSignal("")

  const connected = useConnected()
  const providers = createDialogProviderOptions()

  const showExtra = createMemo(() => connected() && !props.providerID)

  const options = createMemo(() => {
    const needle = query().trim()
    const showSections = showExtra() && needle.length === 0
    const favorites = connected() ? local.model.favorite() : []
    const recents = local.model.recent()

    function toOptions(items: typeof favorites, category: string) {
      if (!showSections) return []
      return items.flatMap((item) => {
        const provider = sync.data.provider.find((provider) => provider.id === item.providerID)
        if (!provider) return []
        const model = provider.models[item.modelID]
        if (!model) return []
        // Fork: full names (no 61-char cut) + best-at-work tag.
        const work = bestForWork(provider.id, model.id)
        return [
          {
            key: item,
            value: { providerID: provider.id, modelID: model.id },
            title: model.name ?? item.modelID,
            truncateTitle: false as const,
            details: [`Best for ${work.label}`],
            description: provider.name,
            category,
            disabled: provider.id === "opencode" && model.id.includes("-nano"),
            footer: model.cost?.input === 0 && provider.id === "opencode" ? "Free" : undefined,
            onSelect: () => {
              onSelect(provider.id, model.id)
            },
          },
        ]
      })
    }

    const favoriteOptions = toOptions(favorites, "Favorites")
    const recentOptions = toOptions(
      recents.filter(
        (item) => !favorites.some((fav) => fav.providerID === item.providerID && fav.modelID === item.modelID),
      ),
      "Recent",
    )

    const providerOptionsRaw = pipe(
      sync.data.provider,
      sortBy(
        (provider) => provider.id !== "opencode",
        (provider) => provider.name,
      ),
      flatMap((provider) =>
        pipe(
          provider.models,
          entries(),
          filter(([_, info]) => info.status !== "deprecated"),
          filter(([_, info]) => (props.providerID ? info.providerID === props.providerID : true)),
          map(([model, info]) => {
            // Fork: full names (no 61-char cut) + best-at-work tag.
            const work = bestForWork(provider.id, model)
            return {
              value: { providerID: provider.id, modelID: model },
              title: info.name ?? model,
              truncateTitle: false as const,
              details: [`Best for ${work.label}`],
              workRank: work.rank,
              releaseDate: info.release_date,
              description: favorites.some((item) => item.providerID === provider.id && item.modelID === model)
                ? "(Favorite)"
                : undefined,
              category: connected() ? provider.name : undefined,
              disabled: provider.id === "opencode" && model.includes("-nano"),
              footer: info.cost?.input === 0 && provider.id === "opencode" ? "Free" : undefined,
              onSelect() {
                onSelect(provider.id, model)
              },
            }
          }),
          filter((option) => {
            if (!showSections) return true
            if (
              favorites.some(
                (item) => item.providerID === option.value.providerID && item.modelID === option.value.modelID,
              )
            )
              return false
            if (
              recents.some(
                (item) => item.providerID === option.value.providerID && item.modelID === option.value.modelID,
              )
            )
              return false
            return true
          }),
        ),
      ),
    )

    // Fork: browse mode sorts by best-at-work first (Favorites/Recent stay
    // pinned above via the section concat below); provider-scoped mode keeps
    // upstream newest-first.
    const providerOptions =
      props.providerID !== undefined
        ? sortModelOptions(providerOptionsRaw, true)
        : sortBy(
            providerOptionsRaw,
            (option) => option.workRank,
            (option) => option.category ?? "",
            [(option) => option.releaseDate, "desc"],
            (option) => option.title,
          )

    const popularProviders = !connected()
      ? pipe(
          providers(),
          map((option) => ({
            ...option,
            category: "Popular providers",
          })),
          take(6),
        )
      : []

    if (needle) {
      return [
        ...sortModelOptions(
          fuzzysort.go(needle, providerOptions, { keys: ["title", "category"] }).map((x) => x.obj),
          false,
        ),
        ...fuzzysort.go(needle, popularProviders, { keys: ["title"] }).map((x) => x.obj),
      ]
    }

    return [...favoriteOptions, ...recentOptions, ...providerOptions, ...popularProviders]
  })

  const provider = createMemo(() =>
    props.providerID ? sync.data.provider.find((item) => item.id === props.providerID) : null,
  )

  const title = createMemo(() => {
    const value = provider()
    if (!value) return "Select model"
    return value.name
  })

  function onSelect(providerID: string, modelID: string) {
    local.model.set({ providerID, modelID }, { recent: true })
    const list = local.model.variant.list()
    const cur = local.model.variant.selected()
    if (cur === "default" || (cur && list.includes(cur))) {
      dialog.clear()
      return
    }
    if (list.length > 0) {
      dialog.replace(() => <DialogVariant />)
      return
    }
    dialog.clear()
  }

  return (
    <DialogSelect<ReturnType<typeof options>[number]["value"]>
      options={options()}
      actions={[
        {
          command: "model.dialog.provider",
          title: connected() ? "Connect provider" : "View all providers",
          onTrigger() {
            dialog.replace(() => <DialogProvider />)
          },
        },
        {
          command: "model.dialog.favorite",
          title: "Favorite",
          hidden: !connected(),
          onTrigger: (option) => {
            local.model.toggleFavorite(option.value as { providerID: string; modelID: string })
          },
        },
      ]}
      onFilter={setQuery}
      flat={true}
      skipFilter={true}
      title={title()}
      current={local.model.current()}
    />
  )
}

// Fork: work-type tags for the model picker, so each model shows what it
// is best at and the list sorts by job instead of only recency. Rules are
// substring-based and deliberately coarse; unknown models land in general.
export function bestForWork(
  providerID: string,
  modelID: string,
): { label: string; rank: number } {
  const id = `${providerID}/${modelID}`.toLowerCase()
  const fast = /mini|flash|haiku|lite|light|nano|small|nemo|7b|8b|27b|30b|31b|32b/.test(id)
  let label: string
  let rank: number
  if (/cod|code/.test(id)) {
    label = "code"
    rank = 0
  } else if (/120b|550b|ultra|opus|max|sonnet|gpt-5|pro|475|5\.3|k3|thinking/.test(id)) {
    label = "smart"
    rank = 1
  } else if (/reason|r1|deepseek|qwq|rmodel/.test(id)) {
    label = "reasoning"
    rank = 2
  } else if (fast) {
    label = "fast everyday"
    rank = 3
  } else {
    label = "general"
    rank = 4
  }
  if (fast && rank !== 3) label += " · fast"
  return { label, rank }
}

export function sortModelOptions<T extends { footer?: string; releaseDate: string | number; title: string }>(
  options: T[],
  newestFirst: boolean,
) {
  if (newestFirst) return sortBy(options, [(option) => option.releaseDate, "desc"], (option) => option.title)
  return sortBy(
    options,
    (option) => option.footer !== "Free",
    [(option) => option.releaseDate, "desc"],
    (option) => option.title,
  )
}
