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
| `hideByPreset` | Root row | Map of preset id to tool names | Removes tools from the model's tool list for the presets you name |
| `hide` | Inside a preset | Tool names | Same, for the preset that mounts the plugin |
| `deny` | Inside a preset | Tool names | Keeps tools listed, but refuses every call |
| `hideSections` | Either | Section names | Blanks global system prompt sections for those agents |
| `.dsh-tools.yml` | Workspace root | `hide`, `allow`, and `deny` tool-name lists | Loads tool policy locally for sessions in that workspace |

Use `hideByPreset` in a root row, and `hide` and `deny` in a preset row. If a row sets `hideByPreset`, `hide` and `deny` are ignored and a warning is logged.

Hidden tools cost no tokens, because their definitions are never sent to the model. Other presets are unaffected. Subagents, automation runs and resumed sessions are covered too.

## Requirements

| Plugin version | Supported dsh versions |
| --- | --- |
| 0.2.0 and later | 0.2.0-rc.2 to the latest 0.2 release |
| 0.1.2 and earlier | 0.2.1-rc.1 to the latest 0.2 release |

## Install

```sh
dsh plugin --profile web add dsh-tool-deny
```

The plugin does nothing until you configure it.

## Quick start

Say you installed a plugin that adds `image_search` and `translate`, and you want to keep them away from your `minimal` and `reviewer` presets. Add this to your profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: tool-deny-root
      name: dsh-tool-deny
      config:
        hideByPreset:
          minimal:
            - image_search
            - translate
          reviewer:
            - translate
```

Restart dsh. New `minimal` sessions no longer see either tool, `reviewer` sessions no longer see `translate`, and every other preset keeps both.

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

The root `hideByPreset` mode and workspace-file mode attach restrictions to each matching `agent.ctx`; inline preset rules are routed to Agents using that preset instead of restricting the plugin row's own scope. dsh then filters inherited tool schemas when it builds that Agent's tool list. The tools stay registered, so other Agents are unaffected. `deny` adds an Agent-scoped guard that rejects calls at execution time and is disposed when the Agent leaves the matching preset or workspace.

## License

[MIT](LICENSE)
