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
              if (!value || typeof value !== "object" || Array.isArray(value) || !Array.isArray(value.tools)) {
                throw new TypeError("toolCatalog.listTools returned an invalid catalog")
              }
              const tools = value.tools.map((tool) => {
                if (!tool || typeof tool.name !== "string" || typeof tool.description !== "string") {
                  throw new TypeError("toolCatalog.listTools returned an invalid tool entry")
                }
                return { name: tool.name, description: tool.description }
              })
              return { tools }
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
        intro: "Select tools from the live global catalog. Priority: workspace hide > workspace allow > preset hide > preset allow > global hide > global allow.",
        loading: "Loading tool policy settings…",
        notFound: "No active tool-policy namespace is available. Installing or enabling the dsh-tool-deny bundle creates its empty policy row automatically; then restart DSH and reopen this page.",
        unavailable: "Settings are unavailable in this connection.",
        catalogLoading: "Loading registered tools…",
        catalogUnavailable: "Could not load the global tool catalog.",
        noTools: "No global tools are currently registered.",
        catalogError: "Tool catalog error",
        globalTitle: "Global rules",
        globalAllowToggle: "Enable global allow-list",
        presetTitle: "Preset rules",
        presetLabel: "Preset",
        choosePreset: "Select a preset",
        noPresets: "No preset roster is available; global rules can still be edited.",
        presetAllowToggle: "Enable allow-list for this preset",
        allowHelp: "Allow is whitelist-only. Enabled lists merge by deduplicated append in this order: workspace → preset → global. A hide at the same or a higher-priority layer wins.",
        workspaceHelp: "Workspace-specific policy comes from .dsh-tools.yml and is not edited here.",
        tool: "Tool",
        globalHide: "Global hide",
        globalAllow: "Global allow",
        presetHide: "Preset hide",
        presetAllow: "Preset allow",
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
        intro: "从实时全局工具目录中勾选工具。优先级：工作区 hide > 工作区 allow > 预设 hide > 预设 allow > 全局 hide > 全局 allow。",
        loading: "正在读取工具策略设置…",
        notFound: "当前页面尚未收到工具策略设置命名空间。安装或启用 dsh-tool-deny bundle 会自动创建空策略行；完成后重启 DSH 并重新打开此页面。",
        unavailable: "当前连接无法读取设置。",
        catalogLoading: "正在读取已注册工具…",
        catalogUnavailable: "无法读取全局工具目录。",
        noTools: "当前没有已注册的全局工具。",
        catalogError: "工具目录错误",
        globalTitle: "全局规则",
        globalAllowToggle: "启用全局白名单",
        presetTitle: "预设规则",
        presetLabel: "预设",
        choosePreset: "选择预设",
        noPresets: "当前无法读取预设列表；仍可编辑全局规则。",
        presetAllowToggle: "启用此预设的白名单",
        allowHelp: "allow 表示仅允许。启用的列表按工作区 → 预设 → 全局顺序追加，并按工具名去重；同层或更高优先级的 hide 胜过 allow。",
        workspaceHelp: "工作区策略仍从 .dsh-tools.yml 读取，不在此 Profile 页面编辑。",
        tool: "工具",
        globalHide: "全局隐藏",
        globalAllow: "全局允许",
        presetHide: "预设隐藏",
        presetAllow: "预设允许",
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
    const cleanMap = (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return {}
      return Object.fromEntries(Object.entries(value)
        .filter(([preset, names]) => preset.trim() && Array.isArray(names) && names.every((name) => typeof name === "string"))
        .map(([preset, names]) => [preset, uniqueList(names)]))
    }
    const makeDraft = (value = {}) => ({
      globalHide: uniqueList(value.globalHide),
      globalAllowEnabled: value.globalAllowEnabled === true,
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
    function mergeNames(lists) {
      return [...new Set(lists.flatMap((list) => uniqueList(list)))]
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

    function PolicyEditor({ ctx, t, catalogRemoteError }) {
      const [form, setForm] = React.useState(null)
      const [snapshot, setSnapshot] = React.useState(null)
      const [draft, setDraft] = React.useState(() => makeDraft())
      const [pageState, setPageState] = React.useState("loading")
      const [busy, setBusy] = React.useState(false)
      const [message, setMessage] = React.useState("")
      const [error, setError] = React.useState("")
      const [tools, setTools] = React.useState([])
      const [catalogState, setCatalogState] = React.useState("loading")
      const [catalogError, setCatalogError] = React.useState("")
      const [presetRows, setPresetRows] = React.useState([])
      const [presetError, setPresetError] = React.useState("")
      const [selectedPreset, setSelectedPreset] = React.useState("")
      const [query, setQuery] = React.useState("")
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
            if (catalogRemoteError) throw new Error(catalogRemoteError)
            const result = await ctx.remote.toolCatalog.listTools()
            if (!result?.ok) throw new Error(result?.error?.message ?? t("catalogUnavailable"))
            const list = Array.isArray(result.value?.tools) ? result.value.tools : []
            if (!disposed) {
              setTools(list.filter((item) => typeof item?.name === "string")
                .map((item) => ({ name: item.name, description: String(item.description ?? "") }))
                .sort((left, right) => left.name.localeCompare(right.name)))
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

      const setDraftField = (field, value) => {
        dirty.current = true
        setDraft((previous) => ({ ...previous, [field]: value }))
        setError("")
        setMessage("")
      }
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
      const setPresetAllowEnabled = (enabled) => {
        if (!selectedPreset) return
        dirty.current = true
        setDraft((previous) => {
          const allowByPreset = { ...previous.allowByPreset }
          if (enabled) allowByPreset[selectedPreset] = uniqueList(allowByPreset[selectedPreset])
          else delete allowByPreset[selectedPreset]
          return { ...previous, allowByPreset }
        })
        setError("")
        setMessage("")
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
            { op: "set", path: ["globalAllowEnabled"], value: draft.globalAllowEnabled === true },
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
      const allowByPresetEnabled = Boolean(selectedPreset && hasOwn(draft.allowByPreset, selectedPreset))
      const presetHide = selectedPreset ? draft.hideByPreset[selectedPreset] ?? [] : []
      const presetAllow = selectedPreset ? draft.allowByPreset[selectedPreset] ?? [] : []
      const search = query.trim().toLowerCase()
      const filteredTools = tools.filter((tool) => !search || tool.name.toLowerCase().includes(search) || tool.description.toLowerCase().includes(search))
      const mergedAllow = mergeNames([
        ...(selectedPreset && allowByPresetEnabled ? [presetAllow] : []),
        ...(draft.globalAllowEnabled ? [draft.globalAllow] : []),
      ])
      const allowModeEnabled = Boolean((selectedPreset && allowByPresetEnabled) || draft.globalAllowEnabled)
      const profileVisible = tools.filter((tool) => {
        const allowLayer = !mergedAllow.includes(tool.name)
          ? undefined
          : (selectedPreset && allowByPresetEnabled && presetAllow.includes(tool.name) ? 1 : 2)
        if (allowModeEnabled && allowLayer === undefined) return false
        const hideLayer = presetHide.includes(tool.name) ? 1 : draft.globalHide.includes(tool.name) ? 2 : -1
        return hideLayer === -1 || (allowLayer !== undefined && hideLayer > allowLayer)
      }).length
      const noToolsAfterPolicy = tools.length > 0 && profileVisible === 0

      if (pageState !== "ready") {
        const text = pageState === "loading" ? t("loading") : pageState === "not-found" ? t("notFound") : pageState === "unavailable" ? t("unavailable") : error
        return h("section", { style: { maxWidth: 920, padding: "8px 0", color: "var(--dsw-alias-label-primary)" } },
          h("h2", { style: { margin: "0 0 8px", fontSize: 20 } }, t("title")),
          h("p", { role: "status", style: { color: "var(--dsw-alias-label-secondary)", lineHeight: 1.5 } }, text),
          pageState === "error" && error ? h("p", { role: "alert", style: { color: "var(--dsw-alias-state-error-primary)" } }, error) : null,
        )
      }

      const checkbox = (checked, label, disabled, onChange) => h("input", {
        type: "checkbox",
        checked,
        disabled,
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
      const table = h("div", { style: { overflowX: "auto", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 8 } },
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
            filteredTools.map((tool) => h("tr", { key: tool.name },
              h("td", { style: tdStyle, title: tool.description },
                h("div", { style: { fontWeight: 600 } }, tool.name),
                tool.description ? h("div", { style: { marginTop: 3, fontSize: 12, color: "var(--dsw-alias-label-secondary)", maxWidth: 560, overflow: "hidden", textOverflow: "ellipsis" } }, tool.description) : null,
              ),
              h("td", { style: tdStyle, align: "center" }, checkbox(draft.globalHide.includes(tool.name), `${tool.name}: ${t("globalHide")}`, false, (enabled) => toggleGlobal("globalHide", tool.name, enabled))),
              h("td", { style: tdStyle, align: "center" }, checkbox(draft.globalAllow.includes(tool.name), `${tool.name}: ${t("globalAllow")}`, !draft.globalAllowEnabled, (enabled) => toggleGlobal("globalAllow", tool.name, enabled))),
              h("td", { style: tdStyle, align: "center" }, checkbox(presetHide.includes(tool.name), `${tool.name}: ${t("presetHide")}`, !selectedPreset, (enabled) => togglePreset("hideByPreset", tool.name, enabled))),
              h("td", { style: tdStyle, align: "center" }, checkbox(presetAllow.includes(tool.name), `${tool.name}: ${t("presetAllow")}`, !selectedPreset || !allowByPresetEnabled, (enabled) => togglePreset("allowByPreset", tool.name, enabled, true))),
            )),
          ),
        ),
      )

      return h("section", { style: { maxWidth: 1160, padding: "8px 0", color: "var(--dsw-alias-label-primary)" } },
        h("h2", { style: { margin: "0 0 8px", fontSize: 20 } }, t("title")),
        h("p", { style: { margin: "0 0 16px", lineHeight: 1.5, color: "var(--dsw-alias-label-secondary)" } }, t("intro")),
        h("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "end", gap: 16, marginBottom: 14 } },
          h("label", { style: { display: "grid", gap: 6, minWidth: 220 } },
            h("span", { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary)" } }, t("presetLabel")),
            h("select", {
              value: selectedPreset,
              onChange: (event) => setSelectedPreset(event.currentTarget.value),
              disabled: availablePresets.length === 0,
              style: { padding: "8px 10px", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 7, background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)" },
            },
              availablePresets.length === 0 ? h("option", { value: "" }, t("choosePreset")) : null,
              availablePresets.map((preset) => h("option", { key: preset.id, value: preset.id }, preset.name)),
            ),
          ),
          h("label", { style: { display: "flex", alignItems: "center", gap: 8, minHeight: 38 } },
            checkbox(draft.globalAllowEnabled, t("globalAllowToggle"), false, (enabled) => setDraftField("globalAllowEnabled", enabled)),
            h("span", null, t("globalAllowToggle")),
          ),
          h("label", { style: { display: "flex", alignItems: "center", gap: 8, minHeight: 38, opacity: selectedPreset ? 1 : 0.6 } },
            checkbox(allowByPresetEnabled, `${t("presetAllowToggle")} ${selectedPresetName}`, !selectedPreset, setPresetAllowEnabled),
            h("span", null, t("presetAllowToggle")),
          ),
          h("label", { style: { display: "grid", gap: 6, minWidth: 220, flex: 1 } },
            h("span", { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary)" } }, t("search")),
            h("input", {
              type: "search",
              value: query,
              onChange: (event) => setQuery(event.currentTarget.value),
              style: { padding: "8px 10px", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 7, background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)" },
            }),
          ),
        ),
        h("p", { style: { margin: "0 0 12px", fontSize: 12, lineHeight: 1.5, color: "var(--dsw-alias-label-secondary)" } },
          `${t("allowHelp")} ${t("workspaceHelp")}`,
        ),
        presetError ? h("p", { role: "status", style: { color: "var(--dsw-alias-label-secondary)" } }, `${t("noPresets")} (${presetError})`) : null,
        catalogState === "loading" ? h("p", { role: "status", style: { color: "var(--dsw-alias-label-secondary)" } }, t("catalogLoading")) : null,
        catalogState === "error" ? h("p", { role: "alert", style: { color: "var(--dsw-alias-state-error-primary)" } }, `${t("catalogError")}: ${catalogError || t("catalogUnavailable")}`) : null,
        catalogState === "ready" && tools.length === 0 ? h("p", { role: "status", style: { color: "var(--dsw-alias-label-secondary)" } }, t("noTools")) : null,
        catalogState === "ready" ? h("p", { style: { margin: "0 0 8px", fontSize: 12, color: "var(--dsw-alias-label-secondary)" } }, `${filteredTools.length} / ${tools.length} ${t("showing")}`) : null,
        catalogState === "ready" ? table : null,
        noToolsAfterPolicy ? h("p", { role: "alert", style: { marginTop: 12, color: "var(--dsw-alias-state-warn-primary)" } }, t("noToolsWarning")) : null,
        error ? h("p", { role: "alert", style: { color: "var(--dsw-alias-state-error-primary)", margin: "12px 0" } }, error) : null,
        message ? h("p", { role: "status", style: { color: "var(--dsw-alias-state-success-primary)", margin: "12px 0" } }, message) : null,
        h("div", { style: { display: "flex", alignItems: "center", gap: 10, marginTop: 16 } },
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

    return {
      inject: ["slots", "locale", "configForms", "remote"],
      async apply(ctx) {
        const t = ctx.locale.bind(NS)
        let catalogRemoteError = toolCatalogRemoteError
        if (toolCatalogRemote) {
          try {
            const disposeRemote = await ctx.remote.$mount(toolCatalogRemote)
            ctx.effect(() => () => { void disposeRemote() }, "dsh-tool-deny: tool catalog Remote")
            catalogRemoteError = ""
          } catch (reason) {
            catalogRemoteError = String(reason?.message ?? reason)
          }
        }
        ctx.effect(() => ctx.locale.register(NS, dictionaries), "dsh-tool-deny: settings locale")
        const Page = (props) => h(PolicyEditor, { ctx, t, catalogRemoteError, ...props })
        ctx.effect(() => ctx.slots.inject("settings.plugins.tab", () => ctx.slots.register({
          name: "settings.plugins.tab",
          id: "tool-policies",
          order: 50,
          label: () => t("tab"),
        }, Page)), "dsh-tool-deny: tool policy Settings tab")
      },
    }
  },
})
