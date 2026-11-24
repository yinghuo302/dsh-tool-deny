window.__ModuleLoader__.load({
  id: "dsh-tool-deny",
  factory(require) {
    const React = require("react")
    const h = React.createElement
    const NS = "dsh-tool-deny"

    const dictionaries = {
      en: {
        tab: "Tool policies",
        title: "Tool policies",
        intro: "Edit tool visibility for every Agent, workspace, or preset. Saving applies the ordered policies: workspace hide > workspace allow > preset hide > preset allow > global hide > global allow.",
        loading: "Loading tool policy settings…",
        notFound: "No active tool-policy namespace is available. Installing or enabling the dsh-tool-deny bundle creates its empty policy row automatically; then restart DSH and reopen this page.",
        unavailable: "Settings are unavailable in this connection.",
        globalTitle: "Global hide",
        globalHelp: "One tool name per line. Workspace and preset rules can override this lower-priority global rule.",
        globalAllowToggle: "Enable global allow-list",
        globalAllowTitle: "Global allow-list",
        globalAllowHelp: "When enabled, only these tools are allowed globally. Higher-priority workspace and preset rules may override it; an empty list disables all tools unless overridden.",
        hideTitle: "Hide by preset (JSON)",
        hideHelp: "Map preset ids to arrays of tool names, for example {\"minimal\":[\"bash\"]}.",
        allowTitle: "Allow-list by preset (JSON)",
        allowHelp: "A configured preset sees only these inherited tools. This overrides global rules but is overridden by workspace rules; an empty array disables all inherited tools for that preset.",
        save: "Save changes",
        reset: "Reset draft",
        saving: "Saving…",
        saved: "Tool policies saved.",
        saveFailed: "The Host refused the update. Check preset ids and tool names, then retry.",
        invalidMap: "Each preset map must be a JSON object whose values are arrays of tool names.",
        unavailableWrite: "This connection does not allow profile settings to be saved.",
        dirty: "Unsaved changes",
      },
      zh: {
        tab: "工具策略",
        title: "工具策略",
        intro: "编辑全局、工作区或预设的工具可见性。优先级从高到低为：工作区 hide > 工作区 allow > 预设 hide > 预设 allow > 全局 hide > 全局 allow。保存后会应用到运行中的 Agent。",
        loading: "正在读取工具策略设置…",
        notFound: "当前页面尚未收到工具策略设置命名空间。安装或启用 dsh-tool-deny bundle 会自动创建空策略行；完成后重启 DSH 并重新打开此页面。",
        unavailable: "当前连接无法读取设置。",
        globalTitle: "全局隐藏",
        globalHelp: "每行一个工具名。工作区和预设规则的优先级高于全局隐藏。",
        globalAllowToggle: "启用全局白名单",
        globalAllowTitle: "全局白名单",
        globalAllowHelp: "启用后全局只允许这些工具；更高优先级的工作区和预设规则可以覆盖。空列表会关闭所有工具，除非被更高优先级规则覆盖。",
        hideTitle: "按预设隐藏（JSON）",
        hideHelp: "预设 id 到工具名数组的映射，例如 {\"minimal\":[\"bash\"]}。",
        allowTitle: "按预设白名单（JSON）",
        allowHelp: "配置后，该预设只看到列出的继承工具。它覆盖全局规则，但低于工作区规则；空数组会关闭该预设的继承工具。",
        save: "保存更改",
        reset: "重置草稿",
        saving: "正在保存…",
        saved: "工具策略已保存。",
        saveFailed: "Host 拒绝了更新。请检查预设 id 和工具名后重试。",
        invalidMap: "预设映射必须是 JSON 对象，且每个值都是工具名数组。",
        unavailableWrite: "当前连接不允许保存 Profile 设置。",
        dirty: "有未保存更改",
      },
    }

    function uniqueNames(text) {
      return [...new Set(String(text ?? "").split(/[\n,]+/).map((name) => name.trim()).filter(Boolean))]
    }

    function parsePresetMap(text) {
      let value
      try {
        value = JSON.parse(text || "{}")
      } catch {
        throw new Error("json")
      }
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("shape")
      for (const [preset, names] of Object.entries(value)) {
        if (!preset.trim() || !Array.isArray(names) || names.some((name) => typeof name !== "string")) throw new Error("shape")
        value[preset] = uniqueNames(names.join("\n"))
      }
      return value
    }

    function makeDraft(value = {}) {
      const encodeMap = (value) => JSON.stringify(value && typeof value === "object" && !Array.isArray(value) ? value : {}, null, 2)
      return {
        globalHide: Array.isArray(value.globalHide) ? value.globalHide.join("\n") : "",
        globalAllowEnabled: value.globalAllowEnabled === true,
        globalAllow: Array.isArray(value.globalAllow) ? value.globalAllow.join("\n") : "",
        hideByPreset: encodeMap(value.hideByPreset),
        allowByPreset: encodeMap(value.allowByPreset),
      }
    }

    function isPolicyNamespace(namespace) {
      const value = namespace?.value
      if (value && typeof value === "object" &&
        Object.prototype.hasOwnProperty.call(value, "globalHide") &&
        Object.prototype.hasOwnProperty.call(value, "allowByPreset")) return true
      const entryId = String(namespace?.ns ?? "")
      if (entryId.includes("dsh-tool-deny")) return true
      // Settings projects Config schemas separately from values; defaults may be
      // omitted from the value view even though the namespace is present.
      const schema = JSON.stringify(namespace?.schema ?? {})
      return schema.includes("globalHide") && schema.includes("allowByPreset")
    }

    function PolicyEditor({ ctx, t }) {
      const [form, setForm] = React.useState(null)
      const [snapshot, setSnapshot] = React.useState(null)
      const [draft, setDraft] = React.useState(() => makeDraft())
      const [pageState, setPageState] = React.useState("loading")
      const [busy, setBusy] = React.useState(false)
      const [message, setMessage] = React.useState("")
      const [error, setError] = React.useState("")
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

      const setField = (field, value) => {
        dirty.current = true
        setDraft((previous) => ({ ...previous, [field]: value }))
        setMessage("")
        setError("")
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
        let hideByPreset
        let allowByPreset
        try {
          hideByPreset = parsePresetMap(draft.hideByPreset)
          allowByPreset = parsePresetMap(draft.allowByPreset)
        } catch {
          setError(t("invalidMap"))
          return
        }
        setBusy(true)
        setError("")
        setMessage("")
        try {
          const accepted = await form.mutate([
            { op: "set", path: ["globalHide"], value: uniqueNames(draft.globalHide) },
            { op: "set", path: ["globalAllowEnabled"], value: draft.globalAllowEnabled === true },
            { op: "set", path: ["globalAllow"], value: uniqueNames(draft.globalAllow) },
            { op: "set", path: ["hideByPreset"], value: hideByPreset },
            { op: "set", path: ["allowByPreset"], value: allowByPreset },
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

      if (pageState !== "ready") {
        const text = pageState === "loading" ? t("loading") : pageState === "not-found" ? t("notFound") : pageState === "unavailable" ? t("unavailable") : error
        return h("section", { style: { maxWidth: 920, padding: "8px 0", color: "var(--dsw-alias-label-primary)" } },
          h("h2", { style: { margin: "0 0 8px", fontSize: 20 } }, t("title")),
          h("p", { role: "status", style: { color: "var(--dsw-alias-label-secondary)", lineHeight: 1.5 } }, text),
          pageState === "error" && error ? h("p", { role: "alert", style: { color: "var(--dsw-alias-state-error-primary)" } }, error) : null,
        )
      }

      const field = (key, title, help, rows, disabled = false) => h("label", {
        key,
        style: { display: "block", margin: "20px 0" },
      },
        h("span", { style: { display: "block", fontWeight: 600, marginBottom: 6, color: "var(--dsw-alias-label-primary)" } }, title),
        h("textarea", {
          value: draft[key],
          rows,
          spellCheck: false,
          disabled,
          "aria-label": title,
          onChange: (event) => setField(key, event.currentTarget.value),
          style: {
            boxSizing: "border-box",
            width: "100%",
            padding: "10px 12px",
            border: "1px solid var(--dsw-alias-border-l1)",
            borderRadius: 8,
            background: "var(--dsw-alias-bg-layer-1)",
            color: "var(--dsw-alias-label-primary)",
            font: "13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace",
            resize: "vertical",
          },
        }),
        h("span", { style: { display: "block", marginTop: 5, fontSize: 12, color: "var(--dsw-alias-label-secondary)" } }, help),
      )

      return h("section", { style: { maxWidth: 920, padding: "8px 0", color: "var(--dsw-alias-label-primary)" } },
        h("h2", { style: { margin: "0 0 8px", fontSize: 20 } }, t("title")),
        h("p", { style: { margin: "0 0 16px", lineHeight: 1.5, color: "var(--dsw-alias-label-secondary)" } }, t("intro")),
        field("globalHide", t("globalTitle"), t("globalHelp"), 5),
        h("label", { style: { display: "flex", alignItems: "center", gap: 9, margin: "20px 0 8px" } },
          h("input", {
            type: "checkbox",
            role: "switch",
            checked: draft.globalAllowEnabled,
            "aria-checked": draft.globalAllowEnabled,
            onChange: (event) => setField("globalAllowEnabled", event.currentTarget.checked),
          }),
          h("span", { style: { color: "var(--dsw-alias-label-primary)" } }, t("globalAllowToggle")),
        ),
        field("globalAllow", t("globalAllowTitle"), t("globalAllowHelp"), 5, !draft.globalAllowEnabled),
        field("hideByPreset", t("hideTitle"), t("hideHelp"), 7),
        field("allowByPreset", t("allowTitle"), t("allowHelp"), 7),
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
      inject: ["slots", "locale", "configForms"],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, dictionaries), "dsh-tool-deny: settings locale")
        const Page = (props) => h(PolicyEditor, { ctx, t, ...props })
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
