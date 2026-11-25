import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
const originalWindow = globalThis.window
let definition

globalThis.window = { __ModuleLoader__: { load(entry) { definition = entry } } }
await import("../client.js")
if (originalWindow === undefined) delete globalThis.window
else globalThis.window = originalWindow

function makeModule(React) {
  return definition.factory((name) => {
    if (name === "react") return React
    throw new Error(`unexpected Client dependency: ${name}`)
  })
}

function createReactRuntime() {
  const hooks = []
  const refs = []
  const effectRecords = []
  let cursor = 0
  let effectCursor = 0
  return {
    Fragment: Symbol("Fragment"),
    createElement(type, props, ...children) { return { type, props, children } },
    useState(initial) {
      const index = cursor++
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial
      return [hooks[index], (next) => { hooks[index] = typeof next === "function" ? next(hooks[index]) : next }]
    },
    useRef(initial) {
      const index = cursor++
      if (!(index in refs)) refs[index] = { current: initial }
      return refs[index]
    },
    useEffect(callback, dependencies = []) {
      const index = effectCursor++
      const previous = effectRecords[index]
      const changed = !previous || dependencies.length !== previous.dependencies.length ||
        dependencies.some((value, position) => value !== previous.dependencies[position])
      if (!changed) return
      previous?.cleanup?.()
      effectRecords[index] = { dependencies: [...dependencies], cleanup: callback() }
    },
    reset() { cursor = 0; effectCursor = 0 },
  }
}

function flatten(node, result = []) {
  if (Array.isArray(node)) { node.forEach((child) => flatten(child, result)); return result }
  if (!node || typeof node !== "object" || !("type" in node)) return result
  result.push(node)
  flatten(node.children, result)
  return result
}

function makeContext({ description, form, tools = [], presets = [], mountRemote } = {}) {
  const entries = []
  const remoteMounts = []
  const childPlugins = []
  const context = {
    locale: { bind: () => (key) => key, register: () => () => {} },
    slots: {
      inject: (_name, callback) => callback(),
      register: (_options, component) => { entries.push(component); return () => {} },
    },
    configForms: {
      describe: () => description,
      get: (entryId) => { assert.equal(entryId, "include:dsh-tool-deny-runtime"); return form },
    },
    remote: {
      async $mount(remote) {
        remoteMounts.push(remote)
        return mountRemote ? mountRemote(remote) : async () => {}
      },
      toolCatalog: { listTools: async () => ({ ok: true, value: { tools } }) },
      agentPresets: { list: async () => ({ ok: true, value: { presets } }) },
    },
    effect(callback) { return callback() },
    plugin(plugin) {
      childPlugins.push(plugin)
      plugin({
        locale: context.locale,
        slots: context.slots,
        configForms: context.configForms,
        remote: {
          agentPresets: context.remote.agentPresets,
          toolCatalog: context.remote.toolCatalog,
        },
        effect: context.effect,
      })
      return { dispose() {} }
    },
  }
  return { context, entries, remoteMounts, childPlugins }
}

function schemaDescription(namespace = { ns: "include:dsh-tool-deny-runtime", value: {}, schema: { dict: { globalHide: {}, allowByPreset: {} } } }) {
  return {
    getSnapshot: () => ({ status: "ready", view: { namespaces: namespace ? [namespace] : [] } }),
    subscribe: () => () => {},
    ensure: async () => {},
  }
}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve))
}

test("Client graph does not declare its own package as an external dependency", () => {
  const external = manifest.dsh.client.external ?? []
  assert.equal(external.some((specifier) => specifier === "dsh-tool-deny" || specifier.startsWith("dsh-tool-deny/")), false)
  assert.equal(manifest.dsh.client.inject.includes("@deepseek-ai/dsh-api-remotes"), true)
})

test("Client mounts its Remote catalog and registers the localized Settings tab", async () => {
  assert.equal(definition.id, "dsh-tool-deny")
  const React = createReactRuntime()
  const module = makeModule(React)
  assert.deepEqual(module.inject, ["remote"])
  const { context, entries, remoteMounts, childPlugins } = makeContext({ description: schemaDescription() })
  await module.apply(context)
  assert.deepEqual(childPlugins[0].inject, ["slots", "locale", "configForms", "remote.agentPresets", "remote.toolCatalog"])
  assert.equal(remoteMounts.length, 1)
  assert.equal(remoteMounts[0].package, "dsh-tool-deny")
  const descriptor = remoteMounts[0].descriptors[0]
  assert.equal(descriptor.id, "dsh-tool-deny#toolCatalog/listTools")
  assert.deepEqual(descriptor.result.create().parse({ tools: [{ name: "read_file", description: "Read a file" }] }), {
    tools: [{ name: "read_file", description: "Read a file" }],
  })
  assert.equal(entries.length, 1)
  assert.equal(typeof entries[0], "function")
})

test("Remote catalog mount failure does not blank the Settings tab", async () => {
  const React = createReactRuntime()
  const module = makeModule(React)
  const { context, entries, childPlugins } = makeContext({
    description: schemaDescription(),
    mountRemote: async () => { throw new Error("gateway not ready") },
  })
  await module.apply(context)
  assert.deepEqual(childPlugins[0].inject, ["slots", "locale", "configForms"])
  assert.equal(entries.length, 1)
})

test("schema-only ConfigForms namespace renders tool checkboxes and saves selected names", async () => {
  const React = createReactRuntime()
  const module = makeModule(React)
  const value = { globalHide: [], globalAllow: null, globalAllowEnabled: false, hideByPreset: {}, allowByPreset: {} }
  const snapshot = { status: "ready", value, revision: 3, writable: true }
  const mutations = []
  const form = {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    mutate: async (ops, revision) => { mutations.push({ ops, revision }); return true },
  }
  const { context, entries } = makeContext({
    description: schemaDescription(),
    form,
    tools: [
      { name: "read_file", description: "Read a file" },
      { name: "search_files", description: "Search files" },
    ],
    presets: [{ id: "review", name: "Review" }],
  })
  await module.apply(context)
  const page = entries[0]({})
  const render = () => { React.reset(); return page.type(page.props) }
  render()
  await settle()
  render()
  const tree = render()
  const nodes = flatten(tree)
  assert.equal(nodes.filter((node) => node.type === "textarea").length, 0)
  assert.equal(nodes.filter((node) => node.type === "table").length, 1)
  assert.equal(nodes.filter((node) => node.type === "tr").length, 3)
  assert.equal(nodes.filter((node) => node.type === "input" && node.props.type === "checkbox").length, 10)
  assert.equal(nodes.some((node) => node.type === "option" && node.props.value === "review"), true)
  const hideCheckbox = nodes.find((node) => node.type === "input" && node.props["aria-label"] === "read_file: globalHide")
  hideCheckbox.props.onChange({ currentTarget: { checked: true } })
  const updatedNodes = flatten(render())
  const saveButton = updatedNodes.find((node) => node.type === "button" && node.children[0] === "save")
  await saveButton.props.onClick()
  assert.deepEqual(mutations[0].ops.find((op) => op.path[0] === "globalHide").value, ["read_file"])
  assert.equal(mutations[0].ops.find((op) => op.path[0] === "globalAllow").value, null)

  const controls = flatten(render())
  const allowToggle = controls.find((node) => node.type === "input" && node.props["aria-label"] === "globalAllowToggle")
  allowToggle.props.onChange({ currentTarget: { checked: true } })
  const enabledNodes = flatten(render())
  const allowCheckbox = enabledNodes.find((node) => node.type === "input" && node.props["aria-label"] === "search_files: globalAllow")
  allowCheckbox.props.onChange({ currentTarget: { checked: true } })
  const allowNodes = flatten(render())
  const saveAllowButton = allowNodes.find((node) => node.type === "button" && node.children[0] === "save")
  await saveAllowButton.props.onClick()
  assert.deepEqual(mutations[1].ops.find((op) => op.path[0] === "globalAllow").value, ["search_files"])
  assert.equal(mutations[1].ops.find((op) => op.path[0] === "globalAllowEnabled").value, true)
})

test("missing ConfigForms row explains that the bundle creates it automatically", async () => {
  const React = createReactRuntime()
  const module = makeModule(React)
  const { context, entries } = makeContext({ description: schemaDescription(null), tools: [], presets: [] })
  await module.apply(context)
  const page = entries[0]({})
  const render = () => { React.reset(); return page.type(page.props) }
  render()
  await settle()
  const nodes = flatten(render())
  assert.equal(nodes.some((node) => node.type === "p" && node.children[0] === "notFound"), true)
  assert.equal(nodes.some((node) => node.type === "pre" || node.type === "button" || node.type === "textarea"), false)
})
