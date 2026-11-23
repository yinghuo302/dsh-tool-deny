# dsh-tool-deny

<div align="center">

<p>
<a href="README.md">English</a> · <strong>简体中文</strong>
</p>

<p>
<a href="https://www.npmjs.com/package/dsh-tool-deny"><img alt="npm version" src="https://img.shields.io/npm/v/dsh-tool-deny?color=5b8def&label=npm"></a>
<a href="https://github.com/hhuangpanda/dsh-tool-deny/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/hhuangpanda/dsh-tool-deny/actions/workflows/ci.yml/badge.svg"></a>
<a href="https://awesome-dsh-plugin.com/p/hhuangpanda/dsh-tool-deny/"><img alt="Awesome DSH Plugin" src="https://awesome-dsh-plugin.com/badge.svg"></a>
</p>

<img alt="dsh-tool-deny" src="assets/splash.png" width="800">

</div>

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）中的每个智能体预设（preset）选择可用的工具。

在 profile 根部加载的插件会全局注册其工具，因此所有预设都会继承这些工具。预设可以添加插件，却没有移除全局工具的设置。dsh-tool-deny 用几行 YAML 补上了这个空缺。

## 功能

| 选项 | 位置 | 值 | 作用 |
|---|---|---|---|
| `globalHide` | 根行 / 设置界面 | 工具名列表 | 对所有 Agent 和预设隐藏指定工具 |
| `hideByPreset` | 根行 / 设置界面 | 预设 id 到工具名列表的映射 | 在指定预设中隐藏工具 |
| `allowByPreset` | 根行 / 设置界面 | 预设 id 到工具名列表的映射 | 指定预设只保留列出的继承工具 |
| `denyByPreset` | 根行 / 设置界面 | 预设 id 到工具名列表的映射 | 工具仍显示，但该预设内拒绝调用 |
| `hide` / `allow` / `deny` | 预设内 | 工具名列表 | 为挂载该插件的预设设置隐藏、白名单或调用拒绝策略 |
| `hideSections` | 根行或预设 | 段落名 | 为匹配的 Agent 清空全局系统提示词段落 |
| `.dsh-tools.yml` | 工作区根目录 | `hide`、`allow`、`deny` 列表 | 为该工作区会话增加本地策略 |

全局与预设选项可在 **设置 → 插件 → 工具策略** 页面编辑；工作区策略仍保存在各自的 `.dsh-tools.yml`。`allowByPreset` 是白名单：指定后，该预设只会看到列出的继承全局工具；也可与 `hideByPreset` 及工作区策略叠加，进一步收紧可见工具。

被隐藏的工具不消耗 token，因为其定义不会发送给模型。其他预设不受影响。子智能体、自动化运行和恢复的会话同样适用。

## 环境要求

| 插件版本 | 支持的 dsh 版本 |
| --- | --- |
| 0.4.0 及更高 | 0.2.0-rc.2 至最新的 0.2 版本 |
| 0.3.0 | 0.2.0-rc.2 至最新的 0.2 版本 |
| 0.2.0 | 0.2.0-rc.2 至最新的 0.2 版本 |
| 0.1.2 及更早 | 0.2.1-rc.1 至最新的 0.2 版本 |

## 安装

```sh
dsh plugin --profile web add dsh-tool-deny
```

配置之前，插件不会产生任何效果。

## 快速开始

假设你想全局关闭 `bash`、让 `minimal` 看不到 `image_search`，并将 `safe` 预设限制为只使用少量工具。将以下插件行加入 profile 的 `cordis.patch.yml`：

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

新建和现有 Agent 都会看不到 `bash`；`minimal` 额外看不到 `image_search`；`safe` 只看到白名单中的继承工具。

## 设置界面

插件行启用后，打开 **设置 → 插件 → 工具策略**。页面提供 `globalHide`、`hideByPreset`、`allowByPreset` 和 `denyByPreset` 编辑栏；保存会以一次原子更新写回当前 profile 配置并重新应用策略。预设映射使用 JSON 对象，键为预设 id（例如 `minimal`），每个值是 DSH 工具名数组。只影响一个工作区的规则继续写在该工作区的 `.dsh-tools.yml`。


## 按工作区配置工具

在工作区根目录创建 `.dsh-tools.yml`。插件会为工作目录属于该工作区的会话读取此文件；不需要在 profile 全局配置中维护工作区路径或工具列表。

```yaml
# <工作区>/.dsh-tools.yml
hide:
  - web_search
  - shell
allow:
  - read_file
  - search_files
deny:
  - delete_records
```

`hide` 会从模型工具列表中移除指定工具；`allow` 只保留列出的继承全局工具，`allow: []` 会关闭所有继承的全局工具；`deny` 会保留工具显示但拒绝调用。省略某项表示不改变该项行为。文件不存在时不产生影响；格式错误时记录警告并忽略。文件在每个 Agent 创建时读取，修改后请新建会话。旧的全局 `hideByWorkspace` 配置不再支持。

如果多个预设共用同一份列表，可以用 YAML 锚点避免重复：

```yaml
hideByPreset:
  minimal: &extra-tools
    - image_search
    - translate
  reviewer: *extra-tools
```

## 在预设内使用

当预设需要自带规则，或需要使用 `deny` 时，请这样做。将该行添加到预设的 `plugins` 列表：

```yaml
- id: tool-deny
  name: dsh-tool-deny
  config:
    hide:
      - image_search
    deny:
      - delete_records
```

`image_search` 会从列表中消失。`delete_records` 仍在列表中，调用它会返回 `"delete_records" is not available to this agent.`。

## 隐藏还是拒绝？

优先使用隐藏：模型看不到该工具，还能节省它占用的 token。对于隐藏无法覆盖的工具，请使用 `deny`。这类工具由插件直接注册在每个智能体上（通过 `agent.ctx`），而不是全局注册。若尝试隐藏它们，它们仍然可见。

## 隐藏提示词段落

有些插件会向系统提示词中添加全局段落。可以按名称为相同的智能体清空它：

```yaml
config:
  hideByPreset:
    minimal:
      - image_search
  hideSections:
    - my-plugin:notes
```

在根部，`hideSections` 适用于 `hideByPreset` 中列出的每个预设。段落名由注册它的插件定义。

## 局限性

- **失效时不会报错。** 如果移除了该行，或插件无法加载，工具会悄悄恢复。不要把它作为敏感智能体的唯一保护措施。
- **按名称列出。** 插件更新新增的工具在你添加之前仍然可见。
- **未知名称会被跳过。** `hide` 或 `hideByPreset` 中不存在的工具名只会记录一条警告，其余情况下被忽略。`deny` 中拼错的名称不会有警告，只是永远不会匹配，请仔细检查拼写。
- **隐藏的是工具，而不是插件。** 插件仍在运行。它在工具之外的行为（例如作为 `web_search` 背后的提供方）不会改变。
- **切换预设可能丢失工具。** 将新会话切换到另一个预设再切回来，可能会丢失 `subagent`，这是 dsh 本身的行为。开启新会话即可恢复。

## 工作原理

根级 `globalHide`、预设映射和工作区文件规则会按 Agent 计算后挂到对应的 `agent.ctx`；预设行内规则也会路由到使用该预设的 Agent，而不是限制插件行本身的作用域。`allowByPreset` 会对继承工具添加白名单限制，隐藏规则与白名单叠加收紧。dsh 在构建 Agent 工具列表时过滤继承定义，因此其他 Agent 不受影响。`deny` 会添加 Agent 作用域的执行 guard，在 Agent 离开匹配预设或工作区时清理。插件 Config schema 会交给 DSH 原生 Settings 表单，保存会写回当前 profile 配置。

## 许可证

[MIT](LICENSE)
