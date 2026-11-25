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
| `globalHide` | 根行 / 设置界面 | 工具名或 glob 模式 | 全局隐藏匹配工具；更高优先级的 workspace 或 preset 规则可覆盖 |
| `globalAllow` | 根行 / 设置界面 | `null` 或工具名/模式列表 | `null` 关闭全局白名单；数组匹配并追加到合并白名单 |
| `hideByPreset` | 根行 / 设置界面 | 预设 id 到名称/模式列表的映射 | 在指定预设中隐藏匹配工具 |
| `allowByPreset` | 根行 / 设置界面 | 预设 id 到名称/模式列表的映射 | 将匹配名称追加到所选预设的合并白名单 |
| `hide` / `allow` | 预设内 | 工具名或 glob 模式 | 为挂载该插件的预设设置隐藏或白名单 |
| `hideSections` | 根行或预设 | 段落名 | 为匹配的 Agent 清空全局系统提示词段落 |
| `.dsh-tools.yml` | 工作区根目录 | `hide`、`allow` 名称/模式列表 | 为该工作区会话增加本地策略并支持热更新 |

全局与预设策略可在 **设置 → 插件 → 工具策略** 的实时工具目录中勾选，也可在高级模式编辑器中添加 glob。hide/allow 项支持区分大小写的 `*`（任意长度）和 `?`（单字符），并对当前已注册工具名匹配。allow 表示白名单：启用的工作区、预设、全局 allow 按 `workspace → preset → global` 顺序追加，并按工具名去重；如果至少一个 allow 模式启用，合并结果之外的工具会隐藏。冲突优先级为 `workspace hide > workspace allow > preset hide > preset allow > globalHide > globalAllow`：同层或更高层 hide 胜过 allow，更高层 allow 可覆盖更低层 hide。全局 allow 关闭时存为 `null`；启用的空数组是明确的空白名单。

被隐藏的工具不消耗 token，因为其定义不会发送给模型。其他预设不受影响。子智能体、自动化运行和恢复的会话同样适用。

## 环境要求

| 插件版本 | 支持的 dsh 版本 |
| --- | --- |
| 0.5.0 及更高 | 0.2.0-rc.2 至最新的 0.2 版本 |
| 0.4.0 | 0.2.0-rc.2 至最新的 0.2 版本 |
| 0.2.0 | 0.2.0-rc.2 至最新的 0.2 版本 |
| 0.1.2 及更早 | 0.2.1-rc.1 至最新的 0.2 版本 |

## 安装

```sh
dsh plugin --profile web add dsh-tool-deny
```

配置之前，插件不会产生任何效果。

## 快速开始

安装 bundle 后会自动插入一条空的根级策略行，不需要预先手工创建 `dsh-tool-deny` 配置行。默认 `globalAllow: null` 表示关闭全局白名单，不会改变工具列表。打开 **设置 → 插件 → 工具策略**，从实时目录直接勾选全局 hide/allow，或选择预设后勾选；需要批量匹配时可用高级 glob 编辑器（例如 `mcp_*`）。启用 allow 开关后，空清单是明确的空白名单，页面会在配置可能留下零个工具时给出警告。点击保存后会原子写入当前 Profile；工作区规则仍保存在 `.dsh-tools.yml`。

## 设置界面

打开 **设置 → 插件 → 工具策略** 后，页面会读取 Host 的全局工具目录，并显示全局与所选预设的 hide/allow 勾选列；高级 glob 编辑器可添加 `*` / `?` 模式。全局 allow 关闭时写入 `null`；开启后列表（包括显式空列表）参与白名单合并。每个预设也有独立的 allow 启用开关。保存会以一次原子更新写回 Profile。只影响某个工作区的策略仍保存在 `.dsh-tools.yml`。


## 按工作区配置工具

在工作区根目录创建 `.dsh-tools.yml`。插件会为工作目录属于该工作区的会话读取此文件；不需要在 profile 全局配置中维护工作区路径或工具列表。

```yaml
# <工作区>/.dsh-tools.yml
hide:
  - "web_*"
  - shell
allow:
  - "read_*"
  - search_files
```

`hide` 会从模型工具列表中移除匹配工具；`hide` 和 `allow` 可写精确工具名或 glob：`*` 匹配任意长度，`?` 匹配一个字符，区分大小写。YAML 中请给模式加引号。`allow` 是合并白名单的一部分，不在当前层列表中的工具仍可能由其他启用层级追加。`allow: []` 本身不添加名称；如果所有启用的 allow 列表合并后仍为空，就没有工具可用。工作区策略优先级最高：workspace hide 胜过同层 allow；工作区 allow 中的匹配工具可覆盖较低层级 hide。省略 hide/allow 键表示该层不贡献相应规则。存在 Host 文件系统 watcher 时，文件变化会去抖并立即重算该工作区的活动 Agent；不支持 watcher 时，新建 Agent 或刷新预设后读取。文件不存在时不产生影响；格式错误时记录警告并忽略。旧的全局 `hideByWorkspace` 配置不再支持；旧 `.dsh-tools.yml` 的 `deny` 字段不再执行。

如果多个预设共用同一份列表，可以用 YAML 锚点避免重复：

```yaml
hideByPreset:
  minimal: &extra-tools
    - image_search
    - translate
  reviewer: *extra-tools
```

## 在预设内使用

当预设需要自带隐藏或白名单规则时，将该行添加到预设的 `plugins` 列表：

```yaml
- id: tool-policy
  name: dsh-tool-deny
  config:
    hide: [image_search]
    allow: [read_file, search_files]
```

工作区规则优先于 preset-local 规则。Agent 自身作用域注册的工具不一定能从列表移除；插件会记录警告，并用执行 guard 阻止这些被策略选中的工具运行。

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
- **通配符语法有限。** 仅支持区分大小写的 `*` 和 `?`，不是正则或路径模式。
- **工具注册变化不会主动触发策略刷新。** 模式按 Agent 当前工具目录展开；新注册的工具会在下一次策略刷新或创建 Agent 时处理。
- **allow 模式未命中可能留下空白名单。** 如果 allow 已启用但所有名称/模式都未匹配任何工具，且其他层也没有匹配项，就不会有工具可用。
- **隐藏的是工具，而不是插件。** 插件仍在运行。它在工具之外的行为（例如作为 `web_search` 背后的提供方）不会改变。
- **切换预设可能丢失工具。** 将新会话切换到另一个预设再切回来，可能会丢失 `subagent`，这是 dsh 本身的行为。开启新会话即可恢复。

## 工作原理

Host 通过 Typert Remote 暴露与会话无关的全局工具目录；Web 设置页挂载该 Remote 并显示可勾选工具表，而非手工输入工具名。对每个 Agent，启用的 allow 列表按 `workspace → preset → global` 顺序追加并去重；只要任一 allow 模式启用，合并列表之外的工具就隐藏。某工具第一次出现在 allow 列表的层级决定它相对于 hide 的优先级，再按 `workspace hide > workspace allow > preset hide > preset allow > global hide > global allow` 解决冲突：同层或更高层 hide 胜过 allow。结果挂到对应 Agent 的 `agent.ctx`，因此其他 Agent 不受影响；Web 页面通过原生 Settings 原子保存 Profile 配置。

## 许可证

[MIT](LICENSE)
