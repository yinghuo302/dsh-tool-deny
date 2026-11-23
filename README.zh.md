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
| `globalHide` | 根行 / 设置界面 | 工具名列表 | 全局隐藏指定工具；更高优先级的 workspace 或 preset 规则可覆盖 |
| `globalAllowEnabled` / `globalAllow` | 根行 / 设置界面 | 开关与工具名列表 | 可选启用全局白名单；空列表隐藏所有未被更高层允许的工具 |
| `hideByPreset` | 根行 / 设置界面 | 预设 id 到工具名列表的映射 | 在指定预设中隐藏工具 |
| `allowByPreset` | 根行 / 设置界面 | 预设 id 到工具名列表的映射 | 指定预设只保留列出的工具 |
| `hide` / `allow` | 预设内 | 工具名列表 | 为挂载该插件的预设设置隐藏或白名单 |
| `hideSections` | 根行或预设 | 段落名 | 为匹配的 Agent 清空全局系统提示词段落 |
| `.dsh-tools.yml` | 工作区根目录 | `hide`、`allow` 列表 | 为该工作区会话增加本地策略 |

全局与预设选项可在 **设置 → 插件 → 工具策略** 页面编辑；工作区策略仍保存在各自的 `.dsh-tools.yml`。优先级从高到低为 `workspace hide > workspace allow > preset hide > preset allow > globalHide > globalAllow`。高优先级 allow 可恢复低优先级隐藏的工具，同一层级 hide 胜过 allow。启用全局 allow 后，空列表会隐藏所有工具，除非被更高优先级规则允许。

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

安装 bundle 后会自动插入一条空的根级策略行，不需要预先手工创建 `dsh-tool-deny` 配置行。默认空策略不会改变工具列表。打开 **设置 → 插件 → 工具策略** 开始配置：

- `全局隐藏`：每行填写一个工具名。
- 开启 `启用全局白名单` 后，在 `全局白名单` 中填写允许的工具；已启用的空列表会隐藏所有工具，除非更高层级规则允许。
- `按预设隐藏` 和 `按预设白名单` 使用以预设 id 为键的 JSON 对象，例如 `{"minimal":["search_files"]}` 与 `{"safe":["read_file","bash"]}`。

点击保存后会写入当前 Profile。只影响某个工作区的策略仍保存在该工作区的 `.dsh-tools.yml`。

## 设置界面

插件行启用后，打开 **设置 → 插件 → 工具策略**。页面提供 `globalHide`、`globalAllowEnabled` 开关、`globalAllow` 清单，以及 `hideByPreset` / `allowByPreset` 映射；保存会以一次原子更新写回当前 profile 配置并重新应用策略。预设映射使用 JSON 对象，键为预设 id（例如 `minimal`），每个值是 DSH 工具名数组。只影响一个工作区的规则继续写在该工作区的 `.dsh-tools.yml`。


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
```

`hide` 会从模型工具列表中移除指定工具；`allow` 只保留列出的继承全局工具，`allow: []` 会关闭该工作区的所有继承工具。工作区策略优先级最高：hide 高于同一工作区 allow；workspace allow 可覆盖低优先级的 preset/global hide。省略某项表示由较低层级策略决定。文件不存在时不产生影响；格式错误时记录警告并忽略。文件在每个 Agent 创建时读取，修改后请新建会话。旧的全局 `hideByWorkspace` 配置不再支持；旧 `.dsh-tools.yml` 的 `deny` 字段不再执行。

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
- **按名称列出。** 插件更新新增的工具在你添加之前仍然可见。
- **名称必须与已注册工具一致。** `hide` 或 `allow` 中未知的工具名不会改变工具 schema；请核对 DSH 工具的准确名称。
- **隐藏的是工具，而不是插件。** 插件仍在运行。它在工具之外的行为（例如作为 `web_search` 背后的提供方）不会改变。
- **切换预设可能丢失工具。** 将新会话切换到另一个预设再切回来，可能会丢失 `subagent`，这是 dsh 本身的行为。开启新会话即可恢复。

## 工作原理

插件按六层优先级逐个工具计算最终可见性：workspace hide、workspace allow、preset hide、preset allow、global hide、global allow。最先命中的层级决定该工具；allow 可覆盖更低层级 hide，同层 hide 优先。结果挂到对应 Agent 的 `agent.ctx`；Preset 切换时重算并释放旧限制。Settings Web 页面通过 DSH 原生 Remote Settings 原子保存 Profile 配置。

## 许可证

[MIT](LICENSE)
