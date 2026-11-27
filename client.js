window.__ModuleLoader__.load({
  id: "dsh-tool-deny",
  factory(require) {
    const React = require("react")
    const h = React.createElement
    const NS = "dsh-tool-deny"
    const toolCatalogRemote = {
      package: "dsh-tool-deny",
      descriptors: [{
        id: "dsh-tool-deny#toolCatalog/listTools",
        service: "toolCatalog",
        namespace: "toolCatalog",
        method: "listTools",
        invocation: { kind: "direct" },
        parameters: [],
        result: {
          mode: "strict",
          typeSymbol: "dsh-tool-deny/client#ToolCatalog",
          create: () => ({
            parse(value) {
              const parseTools = (items) => {
                if (!Array.isArray(items)) throw new TypeError("toolCatalog.listTools returned an invalid tool list")
                return items.map((tool) => {
                  if (!tool || typeof tool.name !== "string" || typeof tool.description !== "string") {
                    throw new TypeError("toolCatalog.listTools returned an invalid tool entry")
                  }
                  return { name: tool.name, description: tool.description }
                })
              }
              if (!value || typeof value !== "object" || Array.isArray(value) || !Array.isArray(value.tools) || !Array.isArray(value.presets)) {
                throw new TypeError("toolCatalog.listTools returned an invalid catalog")
              }
              const presets = value.presets.map((preset) => {
                if (!preset || typeof preset.id !== "string") throw new TypeError("toolCatalog.listTools returned an invalid preset catalog")
                return { id: preset.id, tools: parseTools(preset.tools) }
              })
              return { tools: parseTools(value.tools), presets }
            },
          }),
        },
      }],
    }
    const toolCatalogRemoteError = ""

    const dictionaries = {
      en: {
        tab: "Tool policies",
        title: "Tool policies",
        intro: "Select a preset to view the exact tools visible in that preset, including built-in and preset-scoped tools. Priority: workspace hide > workspace allow > preset hide > preset allow > global hide > global allow.",
        loading: "Loading tool policy settings…",
        notFound: "No active tool-policy namespace is available. Installing or enabling the dsh-tool-deny bundle creates its empty policy row automatically; then restart DSH and reopen this page.",
        unavailable: "Settings are unavailable in this connection.",
        catalogLoading: "Loading registered tools…",
        catalogUnavailable: "Could not load the global tool catalog.",
        noTools: "No tools are visible in the selected scope.",
        catalogError: "Tool catalog error",
        globalTitle: "Global rules",
        globalAllowHelp: "Allow entries are explicit exceptions: they do not hide other tools.",
        presetTitle: "Preset rules",
        presetLabel: "Preset",
        choosePreset: "Select a preset",
        noPresets: "No preset roster is available; global rules can still be edited.",
        allowHelp: "Allow entries merge by first occurrence in this order: workspace → preset → global. A higher-priority allow overrides a lower-priority hide; a hide at the same or a higher-priority layer wins.",
        workspaceHelp: "Workspace-specific policy comes from .dsh-tools.yml and is not edited here.",
        tool: "Tool",
        globalHide: "Global hide",
        globalAllow: "Global allow",
        presetHide: "Preset hide",
        presetAllow: "Preset allow",
        patternsTitle: "Wildcard patterns (advanced)",
        patternsHelp: "Use * for any sequence and ? for one character. Matching is case-sensitive and applies to registered tool names; quote patterns in YAML.",
        patternScopeLabel: "Pattern applies to",
        patternPlaceholder: "e.g. mcp_*",
        patternAdd: "Add pattern",
        patternNeedsWildcard: "A pattern must contain * or ?.",
        patternRemove: "Remove pattern",
        noPatterns: "No wildcard patterns in this scope.",
        patternMatched: "Matched by wildcard",
        search: "Filter tools…",
        showing: "tools",
        save: "Save changes",
        reset: "Reset draft",
        saving: "Saving…",
        saved: "Tool policies saved.",
        saveFailed: "The Host refused the update. Retry after checking the active profile.",
        unavailableWrite: "This connection does not allow profile settings to be saved.",
        dirty: "Unsaved changes",
        noToolsWarning: "These profile rules leave no registered global tools available for this preset. Saving may make sessions unable to call tools.",
      },
      zh: {
        tab: "工具策略",
        title: "工具策略",
        intro: "选择预设后显示该预设实际可见的工具，包括 DSH 内置工具和预设局部工具。优先级：工作区 hide > 工作区 allow > 预设 hide > 预设 allow > 全局 hide > 全局 allow。",
        loading: "正在读取工具策略设置…",
        notFound: "当前页面尚未收到工具策略设置命名空间。安装或启用 dsh-tool-deny bundle 会自动创建空策略行；完成后重启 DSH 并重新打开此页面。",
        unavailable: "当前连接无法读取设置。",
        catalogLoading: "正在读取已注册工具…",
        catalogUnavailable: "无法读取全局工具目录。",
        noTools: "当前选中范围没有可见工具。",
        catalogError: "工具目录错误",
        globalTitle: "全局规则",
        globalAllowHelp: "allow 是明确的允许例外，不会隐藏未勾选的其他工具。",
        presetTitle: "预设规则",
        presetLabel: "预设",
        choosePreset: "选择预设",
        noPresets: "当前无法读取预设列表；仍可编辑全局规则。",
        allowHelp: "allow 表示允许。列表按工作区 → 预设 → 全局顺序取首次命中：高优先级 allow 可覆盖低优先级 hide；同层或更高优先级 hide 仍胜出。",
        workspaceHelp: "工作区策略仍从 .dsh-tools.yml 读取，不在此 Profile 页面编辑。",
        tool: "工具",
        globalHide: "全局隐藏",
        globalAllow: "全局允许",
        presetHide: "预设隐藏",
        presetAllow: "预设允许",
        patternsTitle: "通配符规则（高级）",
        patternsHelp: "使用 * 匹配任意字符序列，? 匹配一个字符；区分大小写，按已注册工具名匹配。YAML 中请给通配符加引号。",
        patternScopeLabel: "应用到",
        patternPlaceholder: "例如 mcp_*",
        patternAdd: "添加模式",
        patternNeedsWildcard: "模式中必须包含 * 或 ?。",
        patternRemove: "移除模式",
        noPatterns: "此层没有通配符模式。",
        patternMatched: "由通配符匹配",
        search: "筛选工具…",
        showing: "个工具",
        save: "保存更改",
        reset: "重置草稿",
        saving: "正在保存…",
        saved: "工具策略已保存。",
        saveFailed: "Host 拒绝了更新。请确认当前 Profile 后重试。",
        unavailableWrite: "当前连接不允许保存 Profile 设置。",
        dirty: "有未保存更改",
        noToolsWarning: "这些 Profile 规则会使此预设没有可用的全局工具；保存后会话可能无法调用工具。",
      },
    }

    const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value ?? {}, key)
    const uniqueList = (value) => Array.isArray(value)
      ? [...new Set(value.filter((name) => typeof name === "string" && name.trim()).map((name) => name.trim()))]
      : []
    const hasWildcard = (pattern) => typeof pattern === "string" && /[*?]/.test(pattern)
    const wildcardCache = new Map()
    function matchesToolPattern(pattern, name) {
      if (!hasWildcard(pattern)) return pattern === name
      let matcher = wildcardCache.get(pattern)
      if (!matcher) {
        let source = "^"
        for (const char of pattern) {
          if (char === "*") source += ".*"
          else if (char === "?") source += "."
          else source += "\\^$+?.()|[]{}".includes(char) ? `\\${char}` : char
        }
        matcher = new RegExp(`${source}$`)
        wildcardCache.set(pattern, matcher)
      }
      return matcher.test(name)
    }
    const matchesAnyPattern = (patterns, name) => uniqueList(patterns).some((pattern) => matchesToolPattern(pattern, name))
    function expandPatternLists(lists, toolNames) {
      const names = []
      const seen = new Set()
      for (const pattern of lists.flatMap((list) => uniqueList(list))) {
        for (const name of toolNames) {
          if (!seen.has(name) && matchesToolPattern(pattern, name)) {
            seen.add(name)
            names.push(name)
          }
        }
      }
      return names
    }
    const cleanMap = (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return {}
      return Object.fromEntries(Object.entries(value)
        .filter(([preset, names]) => preset.trim() && Array.isArray(names) && names.every((name) => typeof name === "string"))
        .map(([preset, names]) => [preset, uniqueList(names)]))
    }
    const makeDraft = (value = {}) => ({
      globalHide: uniqueList(value.globalHide),
      globalAllow: uniqueList(value.globalAllow),
      hideByPreset: cleanMap(value.hideByPreset),
      allowByPreset: cleanMap(value.allowByPreset),
    })
    const toggleName = (names, name, enabled) => {
      const next = uniqueList(names)
      return enabled
        ? next.includes(name) ? next : [...next, name]
        : next.filter((item) => item !== name)
    }
    function toggleMapName(map, preset, name, enabled, keepEmpty = false) {
      const next = { ...map }
      const list = toggleName(next[preset], name, enabled)
      if (list.length || keepEmpty) next[preset] = list
      else delete next[preset]
      return next
    }
    function mergeNames(lists, toolNames) {
      return expandPatternLists(lists, toolNames)
    }
    function isPolicyNamespace(namespace) {
      const value = namespace?.value
      if (value && typeof value === "object" &&
        Object.prototype.hasOwnProperty.call(value, "globalHide") &&
        Object.prototype.hasOwnProperty.call(value, "allowByPreset")) return true
      const entryId = String(namespace?.ns ?? "")
      if (entryId.includes("dsh-tool-deny")) return true
      const schema = JSON.stringify(namespace?.schema ?? {})
      return schema.includes("globalHide") && schema.includes("allowByPreset")
    }

    function PolicyEditor({ ctx, t, remoteAvailable, catalogRemoteError }) {
      const [form, setForm] = React.useState(null)
      const [snapshot, setSnapshot] = React.useState(null)
      const [draft, setDraft] = React.useState(() => makeDraft())
      const [pageState, setPageState] = React.useState("loading")
      const [busy, setBusy] = React.useState(false)
      const [message, setMessage] = React.useState("")
      const [error, setError] = React.useState("")
      const [toolCatalog, setToolCatalog] = React.useState(() => ({ tools: [], presets: {} }))
      const [catalogState, setCatalogState] = React.useState("loading")
      const [catalogError, setCatalogError] = React.useState("")
      const [presetRows, setPresetRows] = React.useState([])
      const [presetError, setPresetError] = React.useState("")
      const [selectedPreset, setSelectedPreset] = React.useState("")
      const [query, setQuery] = React.useState("")
      const [patternScope, setPatternScope] = React.useState("globalHide")
      const [patternInput, setPatternInput] = React.useState("")
      const dirty = React.useRef(false)

      React.useEffect(() => {
        let disposed = false
        let entryId = null
        let activeForm = null
        let unsubscribeForm = () => {}
        const describe = ctx.configForms.describe()

        const updateForm = () => {
          if (disposed || !activeForm) return
          const next = activeForm.getSnapshot()
          setSnapshot(next)
          if (next.status === "ready") {
            setPageState("ready")
            setError("")
            if (!dirty.current) setDraft(makeDraft(next.value))
          } else if (next.status === "unavailable") {
            setPageState("unavailable")
          } else {
            setPageState("loading")
          }
        }

        const attach = () => {
          if (disposed) return
          const state = describe.getSnapshot()
          if (state.status === "unavailable") {
            setPageState("unavailable")
            return
          }
          if (!state.view) {
            setPageState("loading")
            return
          }
          const namespace = state.view.namespaces.find(isPolicyNamespace)
          if (!namespace) {
            setPageState("not-found")
            return
          }
          if (entryId === namespace.ns && activeForm) {
            updateForm()
            return
          }
          unsubscribeForm()
          entryId = namespace.ns
          activeForm = ctx.configForms.get(entryId)
          setForm(activeForm)
          unsubscribeForm = activeForm.subscribe(updateForm)
          updateForm()
        }

        const unsubscribeDescribe = describe.subscribe(attach)
        describe.ensure().then(attach).catch((reason) => {
          if (!disposed) {
            setPageState("error")
            setError(String(reason?.message ?? reason))
          }
        })
        return () => {
          disposed = true
          unsubscribeDescribe()
          unsubscribeForm()
        }
      }, [ctx])

      React.useEffect(() => {
        let disposed = false
        setCatalogState("loading")
        setCatalogError("")
        setPresetError("")
        const loadTools = async () => {
          try {
            if (!remoteAvailable) throw new Error(catalogRemoteError || t("catalogUnavailable"))
            const result = await ctx.remote.toolCatalog.listTools()
            if (!result?.ok) throw new Error(result?.error?.message ?? t("catalogUnavailable"))
            const normalizeTools = (list) => (Array.isArray(list) ? list : [])
              .filter((item) => typeof item?.name === "string")
              .map((item) => ({ name: item.name, description: String(item.description ?? "") }))
              .sort((left, right) => left.name.localeCompare(right.name))
            const presets = Object.fromEntries((Array.isArray(result.value?.presets) ? result.value.presets : [])
              .filter((item) => typeof item?.id === "string")
              .map((item) => [item.id, normalizeTools(item.tools)]))
            if (!disposed) {
              setToolCatalog({ tools: normalizeTools(result.value?.tools), presets })
              setCatalogState("ready")
            }
          } catch (reason) {
            if (!disposed) {
              setCatalogError(String(reason?.message ?? reason))
              setCatalogState("error")
            }
          }
        }
        const loadPresets = async () => {
          if (!remoteAvailable) {
            if (!disposed) setPresetRows([])
            return
          }
          try {
            const result = await ctx.remote.agentPresets.list()
            if (!result?.ok) {
              if (result?.error?.code === "gateway/invocation-unavailable") {
                if (!disposed) setPresetRows([])
                return
              }
              throw new Error(result?.error?.message ?? t("noPresets"))
            }
            const list = Array.isArray(result.value?.presets) ? result.value.presets : []
            if (!disposed) setPresetRows(list.filter((item) => typeof item?.id === "string"))
          } catch (reason) {
            if (!disposed) setPresetError(String(reason?.message ?? reason))
          }
        }
        void loadTools()
        void loadPresets()
        return () => { disposed = true }
      }, [ctx, t])

      const availablePresets = [...new Map([
        ...Object.keys(draft.hideByPreset).map((id) => [id, { id, name: id }]),
        ...Object.keys(draft.allowByPreset).map((id) => [id, { id, name: id }]),
        ...presetRows.map((preset) => [preset.id, { id: preset.id, name: preset.name ?? preset.id }]),
      ]).values()]

      React.useEffect(() => {
        if (!availablePresets.length) {
          if (selectedPreset) setSelectedPreset("")
          return
        }
        if (!availablePresets.some((preset) => preset.id === selectedPreset)) setSelectedPreset(availablePresets[0].id)
      }, [selectedPreset, presetRows, draft.hideByPreset, draft.allowByPreset])

      const toggleGlobal = (field, name, enabled) => {
        dirty.current = true
        setDraft((previous) => ({ ...previous, [field]: toggleName(previous[field], name, enabled) }))
        setError("")
        setMessage("")
      }
      const togglePreset = (field, name, enabled, keepEmpty = false) => {
        if (!selectedPreset) return
        dirty.current = true
        setDraft((previous) => ({
          ...previous,
          [field]: toggleMapName(previous[field], selectedPreset, name, enabled, keepEmpty),
        }))
        setError("")
        setMessage("")
      }
      const addPattern = () => {
        const pattern = patternInput.trim()
        if (!hasWildcard(pattern)) {
          setError(t("patternNeedsWildcard"))
          return
        }
        if ((patternScope === "presetHide" || patternScope === "presetAllow") && !selectedPreset) return
        dirty.current = true
        setDraft((previous) => {
          if (patternScope === "globalHide") return { ...previous, globalHide: toggleName(previous.globalHide, pattern, true) }
          if (patternScope === "globalAllow") return {
            ...previous,
            globalAllow: toggleName(previous.globalAllow, pattern, true),
          }
          if (patternScope === "presetHide") return {
            ...previous,
            hideByPreset: toggleMapName(previous.hideByPreset, selectedPreset, pattern, true),
          }
          return {
            ...previous,
            allowByPreset: toggleMapName(previous.allowByPreset, selectedPreset, pattern, true),
          }
        })
        setPatternInput("")
        setError("")
        setMessage("")
      }
      const removePattern = (pattern) => {
        if (patternScope === "globalHide") toggleGlobal("globalHide", pattern, false)
        else if (patternScope === "globalAllow") toggleGlobal("globalAllow", pattern, false)
        else if (patternScope === "presetHide") togglePreset("hideByPreset", pattern, false)
        else togglePreset("allowByPreset", pattern, false)
      }
      const resetDraft = () => {
        dirty.current = false
        setDraft(makeDraft(snapshot?.value))
        setError("")
        setMessage("")
      }

      const save = async () => {
        if (!form || !snapshot || snapshot.status !== "ready") return
        if (!snapshot.writable) {
          setError(t("unavailableWrite"))
          return
        }
        setBusy(true)
        setError("")
        setMessage("")
        try {
          const accepted = await form.mutate([
            { op: "set", path: ["globalHide"], value: uniqueList(draft.globalHide) },
            { op: "set", path: ["globalAllow"], value: uniqueList(draft.globalAllow) },
            { op: "set", path: ["hideByPreset"], value: cleanMap(draft.hideByPreset) },
            { op: "set", path: ["allowByPreset"], value: cleanMap(draft.allowByPreset) },
          ], snapshot.revision)
          if (!accepted) {
            setError(t("saveFailed"))
            return
          }
          dirty.current = false
          setMessage(t("saved"))
          const latest = form.getSnapshot()
          setSnapshot(latest)
          setDraft(makeDraft(latest.value))
        } catch (reason) {
          setError(String(reason?.message ?? reason))
        } finally {
          setBusy(false)
        }
      }

      const selectedPresetName = availablePresets.find((preset) => preset.id === selectedPreset)?.name ?? selectedPreset
      const presetHide = selectedPreset ? draft.hideByPreset[selectedPreset] ?? [] : []
      const presetAllow = selectedPreset ? draft.allowByPreset[selectedPreset] ?? [] : []
      const patternsForScope = (scope) => {
        if (scope === "globalHide") return draft.globalHide
        if (scope === "globalAllow") return draft.globalAllow
        if (scope === "presetHide") return presetHide
        return presetAllow
      }
      const activePatterns = uniqueList(patternsForScope(patternScope)).filter(hasWildcard)
      const tools = selectedPreset && hasOwn(toolCatalog.presets, selectedPreset)
        ? toolCatalog.presets[selectedPreset]
        : toolCatalog.tools
      const search = query.trim().toLowerCase()
      const filteredTools = tools.filter((tool) => !search || tool.name.toLowerCase().includes(search) || tool.description.toLowerCase().includes(search))
      const toolNames = tools.map((tool) => tool.name)
      const mergedAllow = mergeNames([
        ...(selectedPreset ? [presetAllow] : []),
        draft.globalAllow,
      ], toolNames)
      const profileVisible = tools.filter((tool) => {
        const presetAllowsTool = Boolean(selectedPreset && matchesAnyPattern(presetAllow, tool.name))
        const allowLayer = !mergedAllow.includes(tool.name) ? undefined : presetAllowsTool ? 1 : 2
        const hideLayer = matchesAnyPattern(presetHide, tool.name) ? 1 : matchesAnyPattern(draft.globalHide, tool.name) ? 2 : -1
        return hideLayer === -1 || (allowLayer !== undefined && hideLayer > allowLayer)
      }).length
      const noToolsAfterPolicy = tools.length > 0 && profileVisible === 0

      if (pageState !== "ready") {
        const text = pageState === "loading" ? t("loading") : pageState === "not-found" ? t("notFound") : pageState === "unavailable" ? t("unavailable") : error
        return h("section", { style: { width: "100%", maxWidth: 920, minWidth: 0, boxSizing: "border-box", padding: "8px 0", color: "var(--dsw-alias-label-primary)" } },
          h("h2", { style: { margin: "0 0 8px", fontSize: 20 } }, t("title")),
          h("p", { role: "status", style: { color: "var(--dsw-alias-label-secondary)", lineHeight: 1.5 } }, text),
          pageState === "error" && error ? h("p", { role: "alert", style: { color: "var(--dsw-alias-state-error-primary)" } }, error) : null,
        )
      }

      const checkbox = (checked, label, disabled, onChange, title) => h("input", {
        type: "checkbox",
        checked,
        disabled,
        title,
        "aria-label": label,
        onChange: (event) => onChange(event.currentTarget.checked),
        style: { accentColor: "var(--dsw-alias-brand-primary)", cursor: disabled ? "not-allowed" : "pointer" },
      })
      const thStyle = {
        padding: "10px 12px",
        borderBottom: "1px solid var(--dsw-alias-border-l1)",
        color: "var(--dsw-alias-label-secondary)",
        fontSize: 12,
        textAlign: "left",
        whiteSpace: "nowrap",
      }
      const tdStyle = {
        padding: "8px 12px",
        borderBottom: "1px solid var(--dsw-alias-border-l1)",
        color: "var(--dsw-alias-label-primary)",
        verticalAlign: "middle",
      }
      const patternEditor = h("details", { style: { width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", margin: "12px 0", padding: 12, border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 8, overflow: "hidden" } },
        h("summary", { style: { cursor: "pointer", fontWeight: 600 } }, t("patternsTitle")),
        h("p", { style: { margin: "8px 0", fontSize: 12, lineHeight: 1.5, color: "var(--dsw-alias-label-secondary)" } }, t("patternsHelp")),
        h("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "end", gap: 10 } },
          h("label", { style: { display: "grid", gap: 5, minWidth: 0, flex: "1 1 180px" } },
            h("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary)" } }, t("patternScopeLabel")),
            h("select", {
              value: patternScope,
              onChange: (event) => setPatternScope(event.currentTarget.value),
              style: { width: "100%", minWidth: 0, boxSizing: "border-box", padding: "7px 9px", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 7, background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)" },
            },
              h("option", { value: "globalHide" }, t("globalHide")),
              h("option", { value: "globalAllow" }, t("globalAllow")),
              h("option", { value: "presetHide", disabled: !selectedPreset }, selectedPreset ? `${t("presetHide")} · ${selectedPresetName}` : t("presetHide")),
              h("option", { value: "presetAllow", disabled: !selectedPreset }, selectedPreset ? `${t("presetAllow")} · ${selectedPresetName}` : t("presetAllow")),
            ),
          ),
          h("label", { style: { display: "grid", gap: 5, minWidth: 0, flex: "2 1 220px" } },
            h("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary)" } }, t("patternPlaceholder")),
            h("input", {
              type: "text",
              value: patternInput,
              "aria-label": t("patternPlaceholder"),
              onChange: (event) => setPatternInput(event.currentTarget.value),
              style: { width: "100%", minWidth: 0, boxSizing: "border-box", padding: "7px 9px", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 7, background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)" },
            }),
          ),
          h("button", {
            type: "button",
            disabled: !hasWildcard(patternInput) || busy || ((patternScope === "presetHide" || patternScope === "presetAllow") && !selectedPreset),
            onClick: addPattern,
            style: { padding: "8px 12px", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 7, background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)", cursor: !hasWildcard(patternInput) || busy ? "not-allowed" : "pointer" },
          }, t("patternAdd")),
        ),
        activePatterns.length
          ? h("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 } },
            activePatterns.map((pattern) => h("button", {
              key: pattern,
              type: "button",
              title: `${t("patternRemove")}: ${pattern}`,
              onClick: () => removePattern(pattern),
              style: { padding: "4px 8px", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 999, background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)", cursor: "pointer" },
            }, `${pattern} ×`)),
          )
          : h("p", { style: { margin: "10px 0 0", fontSize: 12, color: "var(--dsw-alias-label-secondary)" } }, t("noPatterns")),
      )
      const table = h("div", { style: { width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", overflowX: "auto", overscrollBehaviorX: "contain", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 8 } },
        h("table", { style: { borderCollapse: "collapse", minWidth: 760, width: "100%" } },
          h("thead", null,
            h("tr", null,
              h("th", { style: thStyle }, t("tool")),
              h("th", { style: thStyle }, t("globalHide")),
              h("th", { style: thStyle }, t("globalAllow")),
              h("th", { style: thStyle }, selectedPresetName ? `${t("presetHide")} · ${selectedPresetName}` : t("presetHide")),
              h("th", { style: thStyle }, selectedPresetName ? `${t("presetAllow")} · ${selectedPresetName}` : t("presetAllow")),
            ),
          ),
          h("tbody", null,
            filteredTools.map((tool) => {
              const globalHidePattern = draft.globalHide.find((pattern) => hasWildcard(pattern) && matchesToolPattern(pattern, tool.name))
              const globalAllowPattern = draft.globalAllow.find((pattern) => hasWildcard(pattern) && matchesToolPattern(pattern, tool.name))
              const presetHidePattern = presetHide.find((pattern) => hasWildcard(pattern) && matchesToolPattern(pattern, tool.name))
              const presetAllowPattern = presetAllow.find((pattern) => hasWildcard(pattern) && matchesToolPattern(pattern, tool.name))
              return h("tr", { key: tool.name },
                h("td", { style: tdStyle, title: tool.description },
                  h("div", { style: { fontWeight: 600 } }, tool.name),
                  tool.description ? h("div", { style: { marginTop: 3, fontSize: 12, color: "var(--dsw-alias-label-secondary)", maxWidth: 560, overflow: "hidden", textOverflow: "ellipsis" } }, tool.description) : null,
                ),
                h("td", { style: tdStyle, align: "center" }, checkbox(draft.globalHide.includes(tool.name) || Boolean(globalHidePattern), `${tool.name}: ${t("globalHide")}`, Boolean(globalHidePattern), (enabled) => toggleGlobal("globalHide", tool.name, enabled), globalHidePattern ? `${t("patternMatched")}: ${globalHidePattern}` : undefined)),
                h("td", { style: tdStyle, align: "center" }, checkbox(draft.globalAllow.includes(tool.name) || Boolean(globalAllowPattern), `${tool.name}: ${t("globalAllow")}`, Boolean(globalAllowPattern), (enabled) => toggleGlobal("globalAllow", tool.name, enabled), globalAllowPattern ? `${t("patternMatched")}: ${globalAllowPattern}` : undefined)),
                h("td", { style: tdStyle, align: "center" }, checkbox(presetHide.includes(tool.name) || Boolean(presetHidePattern), `${tool.name}: ${t("presetHide")}`, !selectedPreset || Boolean(presetHidePattern), (enabled) => togglePreset("hideByPreset", tool.name, enabled), presetHidePattern ? `${t("patternMatched")}: ${presetHidePattern}` : undefined)),
                h("td", { style: tdStyle, align: "center" }, checkbox(presetAllow.includes(tool.name) || Boolean(presetAllowPattern), `${tool.name}: ${t("presetAllow")}`, !selectedPreset || Boolean(presetAllowPattern), (enabled) => togglePreset("allowByPreset", tool.name, enabled), presetAllowPattern ? `${t("patternMatched")}: ${presetAllowPattern}` : undefined)),
              )
            }),
          ),
        ),
      )

      return h("section", { style: { width: "100%", maxWidth: 1160, minWidth: 0, boxSizing: "border-box", padding: "8px 0", color: "var(--dsw-alias-label-primary)", overflow: "hidden" } },
        h("h2", { style: { margin: "0 0 8px", fontSize: 20 } }, t("title")),
        h("p", { style: { margin: "0 0 16px", lineHeight: 1.5, color: "var(--dsw-alias-label-secondary)" } }, t("intro")),
        h("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "end", gap: 16, marginBottom: 14 } },
          h("label", { style: { display: "grid", gap: 6, minWidth: 0, flex: "1 1 220px" } },
            h("span", { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary)" } }, t("presetLabel")),
            h("select", {
              value: selectedPreset,
              onChange: (event) => setSelectedPreset(event.currentTarget.value),
              disabled: availablePresets.length === 0,
              style: { width: "100%", minWidth: 0, boxSizing: "border-box", padding: "8px 10px", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 7, background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)" },
            },
              availablePresets.length === 0 ? h("option", { value: "" }, t("choosePreset")) : null,
              availablePresets.map((preset) => h("option", { key: preset.id, value: preset.id }, preset.name)),
            ),
          ),
          h("label", { style: { display: "grid", gap: 6, minWidth: 0, flex: "2 1 220px" } },
            h("span", { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary)" } }, t("search")),
            h("input", {
              type: "search",
              value: query,
              onChange: (event) => setQuery(event.currentTarget.value),
              style: { width: "100%", minWidth: 0, boxSizing: "border-box", padding: "8px 10px", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 7, background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)" },
            }),
          ),
        ),
        h("p", { style: { margin: "0 0 12px", fontSize: 12, lineHeight: 1.5, color: "var(--dsw-alias-label-secondary)" } },
          `${t("globalAllowHelp")} ${t("allowHelp")} ${t("workspaceHelp")}`,
        ),
        patternEditor,
        presetError ? h("p", { role: "status", style: { color: "var(--dsw-alias-label-secondary)" } }, `${t("noPresets")} (${presetError})`) : null,
        catalogState === "loading" ? h("p", { role: "status", style: { color: "var(--dsw-alias-label-secondary)" } }, t("catalogLoading")) : null,
        catalogState === "error" ? h("p", { role: "alert", style: { color: "var(--dsw-alias-state-error-primary)" } }, `${t("catalogError")}: ${catalogError || t("catalogUnavailable")}`) : null,
        catalogState === "ready" && tools.length === 0 ? h("p", { role: "status", style: { color: "var(--dsw-alias-label-secondary)" } }, t("noTools")) : null,
        catalogState === "ready" ? h("p", { style: { margin: "0 0 8px", fontSize: 12, color: "var(--dsw-alias-label-secondary)" } }, `${filteredTools.length} / ${tools.length} ${t("showing")}`) : null,
        catalogState === "ready" ? table : null,
        noToolsAfterPolicy ? h("p", { role: "alert", style: { marginTop: 12, color: "var(--dsw-alias-state-warn-primary)" } }, t("noToolsWarning")) : null,
        error ? h("p", { role: "alert", style: { color: "var(--dsw-alias-state-error-primary)", margin: "12px 0" } }, error) : null,
        message ? h("p", { role: "status", style: { color: "var(--dsw-alias-state-success-primary)", margin: "12px 0" } }, message) : null,
        h("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 16, minWidth: 0 } },
          h("button", {
            type: "button",
            disabled: busy || !snapshot?.writable,
            onClick: save,
            style: {
              padding: "8px 14px",
              borderRadius: 7,
              border: "1px solid var(--dsw-alias-brand-primary)",
              background: "var(--dsw-alias-brand-primary)",
              color: "var(--dsw-alias-bg-base)",
              cursor: busy || !snapshot?.writable ? "not-allowed" : "pointer",
              opacity: busy || !snapshot?.writable ? 0.65 : 1,
            },
          }, busy ? t("saving") : t("save")),
          h("button", {
            type: "button",
            disabled: busy || !dirty.current,
            onClick: resetDraft,
            style: {
              padding: "8px 14px",
              borderRadius: 7,
              border: "1px solid var(--dsw-alias-border-l1)",
              background: "transparent",
              color: "var(--dsw-alias-label-primary)",
              cursor: busy || !dirty.current ? "not-allowed" : "pointer",
              opacity: busy || !dirty.current ? 0.65 : 1,
            },
          }, t("reset")),
          dirty.current ? h("span", { style: { fontSize: 12, color: "var(--dsw-alias-state-warn-primary)" } }, t("dirty")) : null,
        ),
      )
    }

    function settingsPagePlugin(remoteAvailable, catalogRemoteError) {
      function SettingsPage(ctx) {
        const t = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, dictionaries), "dsh-tool-deny: settings locale")
        const Page = (props) => h(PolicyEditor, { ctx, t, remoteAvailable, catalogRemoteError, ...props })
        ctx.effect(() => ctx.slots.inject("settings.plugins.tab", () => ctx.slots.register({
          name: "settings.plugins.tab",
          id: "tool-policies",
          order: 50,
          label: () => t("tab"),
        }, Page)), "dsh-tool-deny: tool policy Settings tab")
      }
      SettingsPage.inject = remoteAvailable
        ? ["slots", "locale", "configForms", "remote.agentPresets", "remote.toolCatalog"]
        : ["slots", "locale", "configForms"]
      return SettingsPage
    }

    return {
      inject: ["remote"],
      async apply(ctx) {
        let remoteAvailable = false
        let catalogRemoteError = toolCatalogRemoteError
        if (toolCatalogRemote) {
          try {
            const disposeRemote = await ctx.remote.$mount(toolCatalogRemote)
            ctx.effect(() => () => { void disposeRemote() }, "dsh-tool-deny: tool catalog Remote")
            remoteAvailable = true
            catalogRemoteError = ""
          } catch (reason) {
            catalogRemoteError = String(reason?.message ?? reason)
          }
        }
        ctx.plugin(settingsPagePlugin(remoteAvailable, catalogRemoteError))
      },
    }
  },
})
