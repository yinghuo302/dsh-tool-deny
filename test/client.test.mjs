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
