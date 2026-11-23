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
| `globalHide` | Root row / Settings UI | Tool names | Hides named tools globally unless a higher-priority workspace or preset rule allows them |
| `globalAllowEnabled` / `globalAllow` | Root row / Settings UI | Switch and tool names | Optionally keeps only the global allow-list |
| `hideByPreset` | Root row / Settings UI | Map of preset id to tool names | Hides named tools in selected presets |
| `allowByPreset` | Root row / Settings UI | Map of preset id to tool names | Keeps only listed tools in selected presets |
| `hide` / `allow` | Inside a preset | Tool-name lists | Applies hide or allow rules to the preset mounting the plugin |
| `hideSections` | Root row or preset | Section names | Blanks global system-prompt sections for matching Agents |
| `.dsh-tools.yml` | Workspace root | `hide` and `allow` lists | Adds workspace-local policy |

Global and preset options are edited in **Settings → Plugins → Tool policies**. The precedence is `workspace hide > workspace allow > preset hide > preset allow > globalHide > globalAllow`. A higher-priority allow can restore a tool hidden by a lower-priority scope; a hide wins over an allow at the same scope. `globalAllowEnabled` distinguishes an unused global allow-list from an enabled empty list (which hides every inherited tool unless a higher-priority rule allows it).

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

Installing the bundle inserts an empty root policy row automatically, so no `dsh-tool-deny` configuration row needs to be prepared by hand. The empty defaults leave tools unchanged. Open **Settings → Plugins → Tool policies** and use:

- `Global hide`: one tool name per line.
- `Enable global allow-list` plus `Global allow-list`: set a global whitelist; an enabled empty list hides all tools unless a higher scope allows them.
- `Hide by preset` and `Allow-list by preset`: JSON objects keyed by preset id, such as `{"minimal":["search_files"]}` and `{"safe":["read_file","bash"]}`.

The Save button writes the settings to the active profile. Workspace-only policies remain in each workspace's `.dsh-tools.yml`.

## Settings UI

After the plugin row is loaded, open **Settings → Plugins → Tool policies**. The page edits `globalHide`, the `globalAllowEnabled` switch and `globalAllow` list, plus the `hideByPreset` and `allowByPreset` maps. Saving writes all changes atomically to the active profile and reapplies policy. Preset maps are JSON objects keyed by preset id (for example `minimal`), with an array of DSH tool names for each value. Use each workspace's `.dsh-tools.yml` for workspace-specific hide/allow rules.

## Configure tools per workspace

Create a `.dsh-tools.yml` in a workspace root. The plugin reads it for Sessions whose working directory is that workspace; no workspace paths or tool lists need to be stored in profile configuration.

```yaml
# <workspace>/.dsh-tools.yml
hide:
  - web_search
  - shell
allow:
  - read_file
  - search_files
```

`hide` removes named tools from the model's list. `allow` keeps only the listed inherited global tools; `allow: []` hides all inherited tools in that workspace. Workspace rules have the highest priority: `hide` wins over `allow` for the same tool, while a workspace allow can restore a tool hidden by a preset or global rule. Omit a key to leave that behavior to lower scopes. Missing files have no effect; malformed files are logged and ignored. The file is read when each Agent is created, so start a new Session after changing it. The legacy `hideByWorkspace` global option is no longer supported.

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
- **Lists are by name.** A new tool added by a plugin update stays visible until you add it.
- **Names must match registered tools.** Unknown names in hide/allow lists cannot change the model tool schema; check spelling and inspect the exact DSH tool name.
- **It hides tools, not plugins.** The plugin keeps running. Anything it does beyond its tools, such as acting as the provider behind `web_search`, is unchanged.
- **Preset switches can drop tools.** Switching a new session to another preset and back can leave out `subagent`, which is dsh behavior. Starting a fresh session restores it.

## How it works

The plugin evaluates each tool against ordered policy layers: workspace hide, workspace allow, preset hide, preset allow, global hide, then global allow. The first matching layer decides that tool. It resolves policies for each Agent and applies them on its `agent.ctx`, so other Agents remain unaffected. The Web page writes these settings atomically through the active profile's native Settings transport.

## License

[MIT](LICENSE)
