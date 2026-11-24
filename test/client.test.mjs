import assert from "node:assert/strict"
import { test } from "node:test"

const originalWindow = globalThis.window
let definition

globalThis.window = {
  __ModuleLoader__: {
    load(entry) { definition = entry },
  },
}
await import("../client.js")
if (originalWindow === undefined) delete globalThis.window
else globalThis.window = originalWindow

test("Client module registers a localized Tool policies Plugins tab", () => {
  assert.equal(definition.id, "dsh-tool-deny")
  const module = definition.factory((name) => {
    assert.equal(name, "react")
    return { createElement() { return {} }, useState() {}, useEffect() {}, useRef() {} }
  })
  assert.deepEqual(module.inject, ["slots", "locale", "configForms"])

  const entries = []
  const cleanups = []
  const localeCalls = []
  const ctx = {
    locale: {
      bind(namespace) { assert.equal(namespace, "dsh-tool-deny"); return (key) => key },
      register(namespace, dictionaries) { localeCalls.push({ namespace, dictionaries }); return () => {} },
    },
    slots: {
      inject(name, callback) { assert.equal(name, "settings.plugins.tab"); return callback() },
      register(options, component) { entries.push({ options, component }); return () => {} },
    },
    effect(callback) { cleanups.push(callback()) },
  }
  module.apply(ctx)
  assert.equal(localeCalls.length, 1)
  assert.equal(entries.length, 1)
  assert.equal(entries[0].options.id, "tool-policies")
  assert.equal(entries[0].options.label(), "tab")
  assert.equal(typeof entries[0].component, "function")
  for (const cleanup of cleanups) cleanup?.()
})

test("schema-only ConfigForms namespace opens the editor without a prefilled row value", async () => {
  const hooks = []
  const refs = []
  let cursor = 0
  let effectRun = false
  const React = {
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
    useEffect(callback) {
      if (!effectRun) { effectRun = true; callback() }
    },
    reset() { cursor = 0 },
  }
  const module = definition.factory((name) => {
    assert.equal(name, "react")
    return React
  })
  const fields = {
    status: "ready",
    value: { globalHide: [], globalAllowEnabled: false, globalAllow: [], hideByPreset: {}, allowByPreset: {} },
    revision: 3,
    writable: true,
  }
  const form = {
    getSnapshot: () => fields,
    subscribe: () => () => {},
    mutate: async () => true,
  }
  const namespace = { ns: "include:dsh-tool-deny-runtime", value: {}, schema: { dict: { globalHide: {}, allowByPreset: {} } } }
  const description = {
    getSnapshot: () => ({ status: "ready", view: { namespaces: [namespace] } }),
    subscribe: () => () => {},
    ensure: async () => {},
  }
  const entries = []
  const ctx = {
    locale: { bind: () => (key) => key, register: () => () => {} },
    slots: {
      inject: (_name, callback) => callback(),
      register: (_options, component) => { entries.push(component); return () => {} },
    },
    configForms: { describe: () => description, get: (entryId) => { assert.equal(entryId, namespace.ns); return form } },
    effect(callback) { return callback() },
  }
  module.apply(ctx)
  const page = entries[0]({})
  React.reset()
  page.type(page.props)
  await Promise.resolve()
  React.reset()
  const tree = page.type(page.props)
  const nodes = []
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!node || typeof node !== "object" || !("type" in node)) return
    nodes.push(node)
    visit(node.children)
  }
  visit(tree)
  assert.equal(nodes.filter((node) => node.type === "textarea").length, 4)
  assert.equal(nodes.filter((node) => node.type === "input" && node.props.type === "checkbox").length, 1)
})

test("missing ConfigForms row explains that the bundle creates it automatically", async () => {
  const hooks = []
  const refs = []
  let cursor = 0
  let effectRun = false
  const React = {
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
    useEffect(callback) {
      if (!effectRun) { effectRun = true; callback() }
    },
    reset() { cursor = 0 },
  }
  const module = definition.factory((name) => {
    assert.equal(name, "react")
    return React
  })
  const description = {
    getSnapshot: () => ({ status: "ready", view: { namespaces: [] } }),
    subscribe: () => () => {},
    ensure: async () => {},
  }
  const entries = []
  const ctx = {
    locale: { bind: () => (key) => key, register: () => () => {} },
    slots: {
      inject: (_name, callback) => callback(),
      register: (_options, component) => { entries.push(component); return () => {} },
    },
    configForms: { describe: () => description },
    effect(callback) { return callback() },
  }
  module.apply(ctx)
  const page = entries[0]({})
  React.reset()
  page.type(page.props)
  await Promise.resolve()
  React.reset()
  const tree = page.type(page.props)
  const nodes = []
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!node || typeof node !== "object" || !("type" in node)) return
    nodes.push(node)
    visit(node.children)
  }
  visit(tree)
  assert.equal(nodes.some((node) => node.type === "p" && node.children[0] === "notFound"), true)
  assert.equal(nodes.some((node) => node.type === "pre" || node.type === "button"), false)
})
