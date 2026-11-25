# dsh-tool-deny

<div align="center">

<p>
<strong>English</strong> · <a href="README.zh.md">简体中文</a>
</p>

<p>
<a href="https://www.npmjs.com/package/dsh-tool-deny"><img alt="npm version" src="https://img.shields.io/npm/v/dsh-tool-deny?color=5b8def&label=npm"></a>
<a href="https://github.com/hhuangpanda/dsh-tool-deny/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/hhuangpanda/dsh-tool-deny/actions/workflows/ci.yml/badge.svg"></a>
<a href="https://awesome-dsh-plugin.com/p/hhuangpanda/dsh-tool-deny/"><img alt="Awesome DSH Plugin" src="https://awesome-dsh-plugin.com/badge.svg"></a>
</p>

<img alt="dsh-tool-deny" src="assets/splash.png" width="800">

</div>

Choose which tools each agent preset gets in [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh).

A plugin loaded at the root of a profile registers its tools globally, so every preset inherits them. A preset can add plugins, but it has no setting to remove a global tool. dsh-tool-deny fills that gap with a few lines of YAML.

## Features

| Option | Where | Value | What it does |
|---|---|---|---|
| `globalHide` | Root row / Settings UI | Names or glob patterns | Hides matching tools globally unless a higher-priority workspace or preset rule allows them |
| `globalAllow` | Root row / Settings UI | `null` or names/patterns | `null` disables the global whitelist; an array contributes matching names to the combined whitelist |
| `hideByPreset` | Root row / Settings UI | Map of preset id to names/patterns | Hides matching tools in selected presets |
| `allowByPreset` | Root row / Settings UI | Map of preset id to names/patterns | Adds matching names to the combined whitelist for selected presets |
| `hide` / `allow` | Inside a preset | Names or glob patterns | Applies hide or allow rules to the preset mounting the plugin |
| `hideSections` | Root row or preset | Section names | Blanks global system-prompt sections for matching Agents |
| `.dsh-tools.yml` | Workspace root | `hide` and `allow` names/patterns | Adds workspace-local policy and hot reloads it when supported |

Global and preset options are edited in **Settings → Plugins → Tool policies**, where the Host's global tool catalog is shown as a checkbox table with an advanced pattern editor. Lists accept exact names or case-sensitive `*` / `?` globs; allow patterns expand to currently registered tool names before merging. Allow lists are whitelist-only: enabled workspace, preset, and global lists merge by ordered, deduplicated append (`workspace → preset → global`). If any allow-list mode is enabled, tools outside the merged set are hidden. For conflicts, policy order is `workspace hide > workspace allow > preset hide > preset allow > globalHide > globalAllow`: a matching hide wins over an allow at the same or higher-priority scope; an allow can restore a lower-priority hide. The global allow switch stores `null` when off; an enabled empty array is an explicit empty whitelist.

Hidden tools cost no tokens, because their definitions are never sent to the model. Other presets are unaffected. Subagents, automation runs and resumed sessions are covered too.

## Requirements

| Plugin version | Supported dsh versions |
| --- | --- |
| 0.5.0 and later | 0.2.0-rc.2 to the latest 0.2 release |
| 0.4.0 | 0.2.0-rc.2 to the latest 0.2 release |
| 0.2.0 | 0.2.0-rc.2 to the latest 0.2 release |
| 0.1.2 and earlier | 0.2.1-rc.1 to the latest 0.2 release |

## Install

```sh
dsh plugin --profile web add dsh-tool-deny
```

The plugin does nothing until you configure it.

## Quick start

Installing the bundle inserts an empty root policy row automatically, so no `dsh-tool-deny` configuration row needs to be prepared by hand. The empty defaults leave tools unchanged, with `globalAllow: null` meaning the global whitelist is off. Open **Settings → Plugins → Tool policies** to choose tools from the live catalog and check `Global hide` or `Global allow`. Select a preset to set its hide/allow checkboxes; an enabled empty allow list is an explicit empty whitelist. The page warns when profile rules would leave no global tools available. The Save button writes all profile policies atomically. Workspace-only policy remains in each workspace's `.dsh-tools.yml`.

## Settings UI

Open **Settings → Plugins → Tool policies** after installing the bundle. The page fetches the globally registered tool catalog and renders checkboxes for global hide/allow and the selected preset's hide/allow lists, plus an advanced editor for `*`/`?` patterns; it does not require hand-entered arrays or JSON. The global allow switch stores `null` when off and an array when on; the preset switch marks whether that preset contributes an allow list. An enabled empty list is explicit. Saving writes changes atomically and reapplies policy. Workspace hide/allow remain in `.dsh-tools.yml`.

## Configure tools per workspace

Create a `.dsh-tools.yml` in a workspace root. The plugin reads it for Sessions whose working directory is that workspace; no workspace paths or tool lists need to be stored in profile configuration.

```yaml
# <workspace>/.dsh-tools.yml
hide:
  - "web_*"
  - shell
allow:
  - "read_*"
  - search_files
```

`hide` removes matching tools from the model's list. Entries in `hide` and `allow` may be exact tool names or case-sensitive glob patterns: `*` matches any sequence and `?` matches one character. Quote wildcard strings in YAML. `allow` contributes names to the whitelist merged from every active scope; `allow: []` contributes no names but still enables allow mode, while lower scopes can append names. If the merged allow set is empty, no tools are allowed unless a higher-priority rule restores one. Workspace rules have the highest priority: `hide` wins over workspace allow for the same tool, while a matching workspace allow can restore a tool hidden by a lower preset/global rule. When a Host filesystem watcher is available, edits are debounced and reapplied to active Agents using that workspace; otherwise the change is read on Agent creation or preset refresh. Missing files have no effect; malformed files are logged and ignored. The legacy `hideByWorkspace` global option is no longer supported.

If several presets share a list, a YAML anchor avoids repeating it:

```yaml
hideByPreset:
  minimal: &extra-tools
    - image_search
    - translate
  reviewer: *extra-tools
```

## Use inside a preset

A preset may carry its own hide or allow-list rules by mounting the plugin in that preset's `plugins` list:

```yaml
- id: tool-policy
  name: dsh-tool-deny
  config:
    hide: [image_search]
    allow: [read_file, search_files]
```

The workspace `.dsh-tools.yml` still has higher priority than this preset-local policy. Tool registrations owned by an Agent scope may not be removable from its schema surface through `tools.restrict`; the plugin logs a warning and keeps a guard so such tools cannot execute.

## Hide prompt sections

Some plugins add a global section to the system prompt. Blank it by name for the same agents:

```yaml
config:
  hideByPreset:
    minimal:
      - image_search
  hideSections:
    - my-plugin:notes
```

At the root, `hideSections` applies to every preset named in `hideByPreset`. The section name is defined by the plugin that registers it.

## Limitations

- **Failures are quiet.** If you remove the row or the plugin stops loading, the tools come back with no error. Don't rely on it as your only safeguard for a sensitive agent.
- **Patterns match registered tool names.** Only case-sensitive `*` and `?` globs are supported; this is not a regular-expression or path pattern language.
- **Tool registration is not watched.** Policies expand against the Agent's current tool catalog; a newly registered tool is handled on the next policy refresh or Agent creation.
- **Unmatched allow patterns can empty the whitelist.** If allow mode is enabled but none of its names/patterns match a registered tool, no tools are allowed unless another active allow scope contributes a match.
- **It hides tools, not plugins.** The plugin keeps running. Anything it does beyond its tools, such as acting as the provider behind `web_search`, is unchanged.
- **Preset switches can drop tools.** Switching a new session to another preset and back can leave out `subagent`, which is dsh behavior. Starting a fresh session restores it.

## How it works

The Host exposes a session-independent global tool catalog through Typert Remote; the Web Settings page mounts that contribution and renders checkboxes instead of free-form tool lists. For each Agent, enabled allow lists merge by ordered, deduplicated append (`workspace → preset → global`); when any allow mode is active, only tools in the union are candidates. A tool's first allow occurrence sets its allow priority, then the ordered rules `workspace hide > workspace allow > preset hide > preset allow > global hide > global allow` resolve conflicts: a hide at the same or a higher-priority layer wins. The plugin applies resulting restrictions on each Agent's `agent.ctx`, so other Agents remain unaffected. The Web page saves profile changes atomically through native Settings.

## License

[MIT](LICENSE)
