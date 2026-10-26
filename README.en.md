# dsh-client-ui-skin-claude

[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)

A Claude-style skin for the DSH Web GUI: warm-black canvas, clay accent, built-in Anthropic font modes, follows the native light/dark theme.

![Dark](docs/dark.png) · ![Light](docs/light.png)

## Features

- Warm-black (#141413) canvas with an Anthropic clay (#d97757) accent
- Font modes:
  - **Anthropic native (default)**: Anthropic Sans for UI, Anthropic Serif for conversation, Anthropic Mono for code
  - **Skin serif**: keeps the original serif UI style
  - **System default**: leaves DSH fonts untouched
- Slim scrollbars, clay selection/focus, pill badges
- Light and dark variants that follow the system theme
- Guarded `content-visibility: auto` for older offscreen conversation rows; keeps the last two rows fully rendered

## Compatibility

**0.3.0-next-compat** targets DSH NEXT (`@deepseek-ai/dsh-client-ui-primitives` 0.2.1-rc series):

- `IconChevronDownOutline14` was removed from primitives → resolved via a `Regular → Medium → text ⌄ fallback` chain
- The running-Turn shimmer now scopes to the native `[data-chat-running] [data-shimmer]` only (no longer hits every `role="status"` element)
- Risky `[class*="…"]` fuzzy selectors narrowed in favor of verified DSH hooks; clay accents use `--dsw-alias-*` design tokens
- Style injection is idempotent with generation-based ownership; repeated `apply()` / stale-context teardown no longer duplicates `<style>` nodes or removes a newer one

Static regression checks: `node scripts/check.mjs`

## Fonts

> **Important: the npm package does not ship font files.** Font files are available in the [`fonts/`](fonts/) folder of this repository; install them manually, then refresh/restart the web UI.

| Font | Used for | File |
|---|---|---|
| Anthropic Sans Web Text | UI | [`fonts/AnthropicSansWebText.ttf`](https://github.com/PAKIKNOWLEDGE/dsh-client-ui-skin-claude/raw/main/fonts/AnthropicSansWebText.ttf) |
| Anthropic Serif Web Text | Conversation / Markdown | [`fonts/AnthropicSerifWebText.ttf`](https://github.com/PAKIKNOWLEDGE/dsh-client-ui-skin-claude/raw/main/fonts/AnthropicSerifWebText.ttf) |
| Anthropic Mono Variable | Code / code blocks | [`fonts/AnthropicMonoVariable.ttf`](https://github.com/PAKIKNOWLEDGE/dsh-client-ui-skin-claude/raw/main/fonts/AnthropicMonoVariable.ttf) |

Install: on Windows double-click each `.ttf` → **Install**; on macOS import with Font Book. Refresh the page afterwards.

> The Anthropic fonts are proprietary to Anthropic and are provided for personal use only. They are **not** covered by the MIT license (see the font notice in [LICENSE](LICENSE)).

## Install

Install this fork's DSH NEXT compatibility branch (recommended):

```sh
dsh plugin --profile web add github:SpaceRelax/dsh-client-ui-skin-claude#next-compat
```

The package name remains `@pakiknowledge/dsh-client-ui-skin-claude`, but this branch is not published to npm; installing by package name retrieves the original author's release.

Restart `dsh web`, then refresh the page.

## Switching fonts

Open **Settings → General → Font style**:

- **Anthropic native (default)**: Sans UI / Serif body / Mono code
- **Skin serif**: Georgia-style serif UI
- **System default**: keep DSH's default fonts

The selection applies instantly and is saved in browser localStorage.

> If you previously installed `dsh-anthropic-fonts` separately, remove it first to avoid two font overrides fighting each other.

## Switching skins

Only one skin is active at a time. Edit `~/.dsh/cordis.patch.yml`:

```yaml
# outside the dsh-skin managed section
- insert:
    - id: ui-skin-claude
      name: '@pakiknowledge/dsh-client-ui-skin-claude'
```

(and add `disabled: true` to the currently active skin's row). The config watcher hot-reloads within seconds; refresh the page.

## Uninstall

1. Remove the `ui-skin-claude` insert row from `~/.dsh/cordis.patch.yml`.
2. `dsh plugin --profile web remove @pakiknowledge/dsh-client-ui-skin-claude`
3. Restart `dsh web`.

## License

MIT
