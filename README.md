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
| `globalHide` | Root row / Settings UI | Tool names | Hides the named tools for every Agent and preset |
| `hideByPreset` | Root row / Settings UI | Map of preset id to tool names | Hides named tools in selected presets |
| `allowByPreset` | Root row / Settings UI | Map of preset id to tool names | Keeps only the listed inherited tools for selected presets |
| `denyByPreset` | Root row / Settings UI | Map of preset id to tool names | Keeps tools listed but refuses calls in selected presets |
| `hide` / `allow` / `deny` | Inside a preset | Tool-name lists | Applies a hide, allow-list, or call-deny rule to that preset |
| `hideSections` | Root row or preset | Section names | Blanks global system-prompt sections for matching Agents |
| `.dsh-tools.yml` | Workspace root | `hide`, `allow`, and `deny` lists | Adds local policy for Sessions in that workspace |

Global and preset options can be set in the generated **Settings → Plugins → dsh-tool-deny** page. Workspace-only policy stays in the workspace's `.dsh-tools.yml`. `allowByPreset` is a whitelist: when configured, only those inherited global tools remain visible in that preset; it can be combined with `hideByPreset` and workspace rules, which further restrict the result.

Hidden tools cost no tokens, because their definitions are never sent to the model. Other presets are unaffected. Subagents, automation runs and resumed sessions are covered too.

## Requirements

| Plugin version | Supported dsh versions |
| --- | --- |
| 0.3.0 and later | 0.2.0-rc.2 to the latest 0.2 release |
| 0.2.0 | 0.2.0-rc.2 to the latest 0.2 release |
| 0.1.2 and earlier | 0.2.1-rc.1 to the latest 0.2 release |

## Install

```sh
dsh plugin --profile web add dsh-tool-deny
```

The plugin does nothing until you configure it.

## Quick start

Say you want to disable `bash` everywhere, hide `image_search` in `minimal`, and restrict `safe` to a short allow-list. Add the plugin row to your profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: tool-deny-root
      name: dsh-tool-deny
      config:
        globalHide: [bash]
        hideByPreset:
          minimal: [image_search]
        allowByPreset:
          safe: [read_file, search_files]
```

New and existing Agents lose `bash`; `minimal` also loses `image_search`; `safe` sees only the two allow-listed inherited tools.

## Settings UI

After the plugin row is loaded, open **Settings → Plugins → dsh-tool-deny**. The generated settings form edits `globalHide`, `hideByPreset`, `allowByPreset`, and `denyByPreset`; saving updates the active profile configuration and reapplies the policy. Preset-map keys are preset ids (for example `minimal`); each value is a list of DSH tool names. Use the separate workspace file for rules that should not be profile-global.

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
deny:
  - delete_records
```

`hide` removes named tools from the model's list. `allow` keeps only the listed inherited global tools; `allow: []` disables all inherited global tools. `deny` leaves tools listed but refuses calls. Omit a key to leave that behavior unchanged. Missing files have no effect; malformed files are logged and ignored. The file is read when each Agent is created, so start a new Session after changing it. The legacy `hideByWorkspace` global option is no longer supported.

If several presets share a list, a YAML anchor avoids repeating it:

```yaml
hideByPreset:
  minimal: &extra-tools
    - image_search
    - translate
  reviewer: *extra-tools
```

## Use inside a preset

Use this when a preset should carry its own rules, or when you need `deny`. Add the row to the preset's `plugins` list:

```yaml
- id: tool-deny
  name: dsh-tool-deny
  config:
    hide:
      - image_search
    deny:
      - delete_records
```

`image_search` disappears from the list. `delete_records` stays listed, and calling it returns `"delete_records" is not available to this agent.`

## Hide or refuse?

Prefer hiding: the model never sees the tool, and you save its tokens. Use `deny` for tools that hiding can't reach, which are the ones a plugin registers on each agent directly (through `agent.ctx`) instead of globally. If you try to hide one, it stays visible.

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
- **Unknown names are skipped.** A tool name in `hide` or `hideByPreset` that doesn't exist logs a warning and is otherwise ignored. A misspelled `deny` name gets no warning and simply never matches, so check your spelling.
- **It hides tools, not plugins.** The plugin keeps running. Anything it does beyond its tools, such as acting as the provider behind `web_search`, is unchanged.
- **Preset switches can drop tools.** Switching a new session to another preset and back can leave out `subagent`, which is dsh behavior. Starting a fresh session restores it.

## How it works

Root `globalHide`, preset maps and workspace-file rules are resolved for each Agent and attached to its `agent.ctx`; inline preset rules target Agents using the owning preset rather than the plugin row's own scope. `allowByPreset` adds an inherited-tool allow restriction, while hide rules further intersect it. dsh filters the inherited schemas when building the Agent's tool list; tools remain registered, so other Agents are unaffected. `deny` adds an Agent-scoped call guard and is disposed when the Agent leaves the matching preset or workspace. The plugin's Config schema is exposed through the native Settings form, which persists edits through the active profile configuration.

## License

[MIT](LICENSE)
