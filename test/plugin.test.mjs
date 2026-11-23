import assert from "node:assert/strict"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { apply, Config } from "../index.js"

function workspace(config) {
  const cwd = mkdtempSync(join(tmpdir(), "dsh-tools-"))
  if (config !== undefined) writeFileSync(join(cwd, ".dsh-tools.yml"), config)
  return cwd
}

function harness(cwd, pluginPreset) {
  const restrictions = []
  const guards = []
  const listeners = new Map()
  const disposedGuards = []
  const settingsPolicies = []
  let selectedPreset = "review"
  let root
  const agent = {
    session: { header: { cwd } },
    ctx: {
      tools: {
        restrict(filter) {
          restrictions.push(filter)
          return () => restrictions.push({ undo: filter })
        },
        guard(fn) {
          guards.push(fn)
          return () => {
            guards.splice(guards.indexOf(fn), 1)
            disposedGuards.push(fn)
          }
        },
      },
      systemPrompt: { section: () => () => {} },
    },
  }
  const scope = {
    agents: { list: () => [agent], get: () => agent },
    agentPresets: {
      composedPreset(target) {
        return target === root ? pluginPreset : target === agent.ctx ? selectedPreset : undefined
      },
    },
    logger: { warn() {} },
    on(name, handler) { listeners.set(name, handler) },
    effect() {},
  }
  const rootRestrictions = []
  root = {
    inject(_services, callback) { callback(scope) },
    logger: { warn() {} },
    tools: { restrict(filter) { rootRestrictions.push(filter); return () => {} } },
    systemPrompt: { section: () => () => {} },
    get(name) {
      if (name !== "settings") return undefined
      return { configure(policy) { settingsPolicies.push(policy); return () => {} } }
    },
    effect() {},
  }
  return {
    root, agent, restrictions, guards, rootRestrictions, listeners, disposedGuards, settingsPolicies,
    setAgentPreset(value) { selectedPreset = value },
  }
}

test("Config exposes the global and preset policy fields to Settings", () => {
  const schema = Config.toJSON()
  const objectSchema = Object.values(schema.refs).find((entry) => entry.type === "object")
  const fields = objectSchema.dict
  assert.deepEqual(
    Object.keys(fields).sort(),
    ["allow", "allowByPreset", "deny", "denyByPreset", "globalHide", "hide", "hideByPreset", "hideSections"].sort(),
  )
  assert.equal(schema.refs[fields.hide].meta.hidden, true)
  assert.equal(schema.refs[fields.hide].meta.default, undefined)
})

test("loads allow policy from workspace file", () => {
  const cwd = workspace("allow:\n  - read\n")
  const { root, restrictions } = harness(cwd)
  apply(root)
  assert.deepEqual(restrictions, [{ allow: ["read"] }])
})

test("empty allow list disables inherited tools", () => {
  const cwd = workspace("allow: []\n")
  const { root, restrictions } = harness(cwd)
  apply(root)
  assert.deepEqual(restrictions, [{ allow: [] }])
})

test("loads hide and deny policies from workspace file", () => {
  const cwd = workspace("hide:\n  - search\ndeny:\n  - delete\n")
  const { root, restrictions, guards } = harness(cwd)
  apply(root)
  assert.deepEqual(restrictions, [{ deny: ["search"] }])
  assert.equal(guards.length, 1)
  assert.match(guards[0]({ name: "delete" }), /not available/)
})

test("workspace without config is unchanged", () => {
  const cwd = workspace()
  const { root, restrictions, guards } = harness(cwd)
  apply(root)
  assert.deepEqual(restrictions, [])
  assert.equal(guards.length, 0)
})

test("globalHide removes the named tool for the Agent", () => {
  const { root, restrictions } = harness(workspace())
  apply(root, { globalHide: ["bash"] })
  assert.deepEqual(restrictions, [{ deny: ["bash"] }])
})

test("allowByPreset keeps only the preset whitelist", () => {
  const { root, restrictions } = harness(workspace())
  apply(root, { allowByPreset: { review: ["read_file", "search_files"] } })
  assert.deepEqual(restrictions, [{ allow: ["read_file", "search_files"] }])
})

test("globalHide and preset allow-list intersect", () => {
  const { root, restrictions } = harness(workspace())
  apply(root, { globalHide: ["bash"], allowByPreset: { review: ["read_file", "bash"] } })
  assert.deepEqual(restrictions, [
    { allow: ["read_file", "bash"] },
    { deny: ["bash"] },
  ])
})

test("registers native Settings page for editing tool policies", () => {
  const { root, settingsPolicies } = harness(workspace())
  apply(root)
  assert.deepEqual(settingsPolicies, [{ auto: true }])
})

test("preset-local hide applies to the agent, not the plugin row scope", () => {
  const { root, restrictions, rootRestrictions } = harness(workspace(), "review")
  apply(root, { hide: ["search"] })
  assert.deepEqual(restrictions, [{ deny: ["search"] }])
  assert.deepEqual(rootRestrictions, [])
})

test("preset-local allow list applies only to its Agent", () => {
  const { root, restrictions } = harness(workspace(), "review")
  apply(root, { allow: ["read_file"] })
  assert.deepEqual(restrictions, [{ allow: ["read_file"] }])
})

test("empty preset-local allow list disables inherited tools", () => {
  const { root, restrictions } = harness(workspace(), "review")
  apply(root, { allow: [] })
  assert.deepEqual(restrictions, [{ allow: [] }])
})

test("hideByPreset applies the selected preset policy to the agent", () => {
  const { root, restrictions, rootRestrictions } = harness(workspace())
  apply(root, { hideByPreset: { review: ["search"] } })
  assert.deepEqual(restrictions, [{ deny: ["search"] }])
  assert.deepEqual(rootRestrictions, [])
})

test("preset-local deny guard is removed after the agent leaves the owning preset", () => {
  const { root, guards, listeners, disposedGuards, setAgentPreset } = harness(workspace(), "review")
  apply(root, { deny: ["delete"] })
  assert.equal(guards.length, 1)
  setAgentPreset("other")
  listeners.get("agent-preset/selected")("session-1")
  assert.equal(guards.length, 0)
  assert.equal(disposedGuards.length, 1)
})

