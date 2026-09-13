<p align="center">
  <a href="https://github.com/tmiland-lab/opencode">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">The open source AI coding agent — <strong>tmiland-lab fork</strong>.</p>
<p align="center">
  <a href="https://github.com/tmiland-lab/opencode/releases"><img alt="Releases" src="https://img.shields.io/github/release/tmiland-lab/opencode?style=flat-square" /></a>
  <a href="https://github.com/tmiland-lab/opencode/actions/workflows/typecheck.yml"><img alt="Typecheck" src="https://img.shields.io/github/actions/workflow/status/tmiland-lab/opencode/typecheck.yml?style=flat-square" /></a>
  <a href="https://github.com/tmiland-lab/opencode/actions/workflows/test.yml"><img alt="Tests" src="https://img.shields.io/github/actions/workflow/status/tmiland-lab/opencode/test.yml?style=flat-square" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

[![OpenCode Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://github.com/tmiland-lab/opencode)

---

> [!IMPORTANT]
> This is a **community fork** of the [OpenCode](https://github.com/sst/opencode)
> AI coding agent, maintained by **tmiland-lab**. It tracks upstream `dev` and
> carries a focused set of UX and reliability fixes. It is **not** affiliated
> with, or endorsed by, the OpenCode team — see the
> [Building on OpenCode](#building-on-opencode) note below.

## What's different in this fork

`release/fixes` is a clean build of the latest upstream `dev` plus the following
fixes, each developed and tested in its own branch:

### 📌 Reliability

- **Persistent approvals** (`permission-approved.json`) — allow-always answers
  survive restarts and directory switches. No more re-prompting the same rule
  every session, and no more sessions silently dying while waiting for a prompt.
- **Per-request image budget** (`image_budget`) — screenshots and tool images
  are capped per model request (default 40). Long screenshot-heavy sessions no
  longer die on provider image-per-request limits; oldest images degrade to a
  text placeholder, newest are kept.
- **Stock-runners CI** — test, typecheck, and e2e run on plain
  `ubuntu-latest`/`windows-latest` (no Blacksmith dependency), giving reliable
  public-fork CI on GitHub Actions.

### 🖥️ Terminal UI

- **Live thinking indicator** — a visible `◌ thinking… Ns` line (animated
  braille spinner, warning-amber) appears while the session is busy with zero
  visible output, and disappears on the first token. No more blank screen →
  "is it dead?" → aborting a model that was actually working.
- **Follow-tail lock** — the TUI stops auto-scrolling once you scroll up, so
  streamed output stays readable mid-stream. Submit / jump-to-bottom re-engages
  tail mode.
- **Model picker upgrades** — full model names (never clipped at 61 chars),
  `Best for <work>` tags (code / smart / reasoning / fast / general), and
  work-rank sorting in browse mode while keeping Favorites/Recent pinned.
- **Message timestamps** — timeline shows the date alongside the time, and
  bot-assisted GitHub comments are stamped with UTC date+time.

### ⚙️ CI / Tooling

- `fork-binary.yml` — one-click single-platform binary builds
  (`fork-opencode-linux-x64` artifact) for dogfooding fork branches without a
  local toolchain.
- Ripgrep installed in CI, e2e runner fixes, and a Windows
  test-suite workaround that keeps stock runners green.

## Branch model

This fork keeps a clean, reviewable history:

| Branch               | Contents                                                        |
| -------------------- | --------------------------------------------------------------- |
| `dev`                | Upstream `dev` + minimal fork plumbing (stock-runner CI).       |
| `fix/<name>`         | One branch per fix, based on clean `dev`, containing only it.   |
| `release/fixes`      | `dev` + all fixes merged — the recommended build branch.        |
| `contrib/<name>`     | Work intended to be proposed upstream as a PR.                  |

The fork fixes live behind the `fix/*` + `release/fixes` branches so upstream PRs
can be opened from cherry-picked commits without dragging fork-only code along.

## Installation

The fork builds from source. Prefer a prebuilt binary from the
[releases page](https://github.com/tmiland-lab/opencode/releases)
(`fork-opencode-linux-x64`) when available; otherwise build from source:

```bash
# Clone the recommended build branch
git clone -b release/fixes https://github.com/tmiland-lab/opencode.git
cd opencode

# Build (requires bun)
bun install
bun run build
```

> [!TIP]
> Remove versions older than 0.1.x before installing, and never mix the fork
> binary's data directory with the official install's.

### Desktop App (BETA)

OpenCode is also available as a desktop application via
[upstream](https://github.com/anomalyco/opencode/releases) or
[opencode.ai/download](https://opencode.ai/download).

| Platform              | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm`, or `.AppImage`     |

### Installation Directory

The install script respects the following priority order for the installation path:

1. `$OPENCODE_INSTALL_DIR` - Custom installation directory
2. `$XDG_BIN_DIR` - XDG Base Directory Specification compliant path
3. `$HOME/bin` - Standard user binary directory (if it exists or can be created)
4. `$HOME/.opencode/bin` - Default fallback

## Agents

OpenCode includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full-access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

Learn more about [agents](https://opencode.ai/docs/agents).

## Documentation

For more info on how to configure OpenCode, [**head over to the upstream docs**](https://opencode.ai/docs).

## Contributing

Want to contribute to upstream OpenCode? Please read the upstream
[contributing docs](./CONTRIBUTING.md) before submitting a pull request.

Fork-specific fixes should follow the branch model above: open a `fix/<name>`
branch from `dev`; single-repo integrations land via `release/fixes`; anything
intended for upstream goes on `contrib/<name>` for review.

### Building on OpenCode

If you are working on a project that's related to OpenCode and is using "opencode" as part of its name, for example "opencode-dashboard" or "opencode-mobile", please add a note to your README to clarify that it is not built by the OpenCode team and is not affiliated with us in any way.

---

**This fork** is maintained by **tmiland-lab**. Upstream live at [sst/opencode](https://github.com/sst/opencode). Community [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)