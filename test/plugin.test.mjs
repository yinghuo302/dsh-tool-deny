import assert from "node:assert/strict"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { apply, Config, mergeAllowLists } from "../index.js"
import { ToolCatalogService } from "../tool-catalog.js"

const knownTools = ["bash", "read_file", "search_files", "search", "delete_records"]

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
  const settingsOwners = []
  const pluginClasses = []
  let selectedPreset = "review"
  let root
  const agent = {
    session: { header: { cwd } },
    ctx: {
      tools: {
        schemas() { return knownTools.map((name) => ({ name })) },
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
    settings: { configure(policy, owner) { settingsPolicies.push(policy); settingsOwners.push(owner); return () => {} } },
    on(name, handler) { listeners.set(name, handler) },
    effect(callback) { callback?.() },
  }
  const rootRestrictions = []
  root = {
    fiber: {},
    inject(_services, callback) { callback(scope) },
    logger: { warn() {} },
    tools: { restrict(filter) { rootRestrictions.push(filter); return () => {} } },
    systemPrompt: { section: () => () => {} },
    plugin(pluginClass) { pluginClasses.push(pluginClass); return { dispose() {} } },
    effect() {},
  }
  return {
    root, agent, restrictions, guards, rootRestrictions, listeners, disposedGuards, settingsPolicies, settingsOwners, pluginClasses,
    setAgentPreset(value) { selectedPreset = value },
  }
}

function hiddenNames(restrictions) {
  return restrictions.filter((filter) => Array.isArray(filter.deny)).map((filter) => filter.deny[0])
}

test("Config exposes global allow controls and no user-facing deny list", () => {
  const schema = Config.toJSON()
  const objectSchema = Object.values(schema.refs).find((entry) => entry.type === "object")
  const fields = objectSchema.dict
  assert.deepEqual(Object.keys(fields).sort(), [
    "allow", "allowByPreset", "globalAllow", "globalAllowEnabled", "globalHide", "hide", "hideByPreset", "hideSections",
  ].sort())
  for (const key of ["globalHide", "globalAllowEnabled", "globalAllow", "hideByPreset", "allowByPreset"]) {
    assert.equal(schema.refs[fields[key]].meta.volatile, true, `${key} must be editable through Settings`)
  }
})

test("loads workspace hide policy", () => {
  const { root, restrictions } = harness(workspace("hide:\n  - search\n"))
  apply(root)
  assert.deepEqual(hiddenNames(restrictions), ["search"])
})

test("workspace allow-list hides tools outside all active allow scopes", () => {
  const { root, restrictions } = harness(workspace("allow: [read_file, search_files]\n"))
  apply(root, {
    allowByPreset: { review: ["search_files", "search"] },
    globalAllowEnabled: true,
    globalAllow: ["search", "delete_records"],
  })
  assert.deepEqual(hiddenNames(restrictions), ["bash"])
})

test("allow lists merge by ordered, deduplicated append", () => {
  const merged = mergeAllowLists([
    { hide: [], allowLists: [["read_file", "search_files", "read_file"]] },
    { hide: [], allowLists: [["search_files", "search"]] },
    { hide: [], allowLists: [["search", "delete_records"]] },
  ])
  assert.deepEqual(merged.names, ["read_file", "search_files", "search", "delete_records"])
  assert.equal(merged.firstLayer.get("search_files"), 0)
})

test("higher-priority hides beat merged lower-priority allow entries", () => {
  const { root, restrictions } = harness(workspace("hide: [read_file]\nallow: [read_file, search_files]\n"))
  apply(root, { allowByPreset: { review: ["read_file", "search"] }, globalAllowEnabled: true, globalAllow: ["delete_records"] })
  assert.deepEqual(hiddenNames(restrictions), ["bash", "read_file"])
})

test("empty workspace allow-list hides every known tool", () => {
  const { root, restrictions } = harness(workspace("allow: []\n"))
  apply(root)
  assert.deepEqual(hiddenNames(restrictions), knownTools)
})

test("workspace hide wins over workspace allow at the same scope", () => {
  const { root, restrictions } = harness(workspace("hide: [read_file]\nallow: [read_file, search_files]\n"))
  apply(root)
  assert.deepEqual(hiddenNames(restrictions), ["bash", "read_file", "search", "delete_records"])
})

test("workspace allow overrides lower-priority preset and global hides", () => {
  const { root, restrictions } = harness(workspace("allow: [read_file, search_files]\n"))
  apply(root, { globalHide: ["read_file"], hideByPreset: { review: ["search_files"] } })
  assert.deepEqual(hiddenNames(restrictions), ["bash", "search", "delete_records"])
})

test("preset hide wins over preset allow", () => {
  const { root, restrictions } = harness(workspace())
  apply(root, {
    hideByPreset: { review: ["read_file"] },
    allowByPreset: { review: ["read_file", "search_files"] },
  })
  assert.deepEqual(hiddenNames(restrictions), ["bash", "read_file", "search", "delete_records"])
})

test("preset allow overrides lower-priority global hide", () => {
  const { root, restrictions } = harness(workspace())
  apply(root, { globalHide: ["read_file"], allowByPreset: { review: ["read_file", "search_files"] } })
  assert.deepEqual(hiddenNames(restrictions), ["bash", "search", "delete_records"])
})

test("global hide wins over global allow", () => {
  const { root, restrictions } = harness(workspace())
  apply(root, { globalHide: ["bash"], globalAllowEnabled: true, globalAllow: ["bash", "read_file"] })
  assert.deepEqual(hiddenNames(restrictions), ["bash", "search_files", "search", "delete_records"])
})

test("enabled empty global allow-list hides all tools", () => {
  const { root, restrictions } = harness(workspace())
  apply(root, { globalAllowEnabled: true, globalAllow: [] })
  assert.deepEqual(hiddenNames(restrictions), knownTools)
})

test("disabled global allow-list has no effect", () => {
  const { root, restrictions } = harness(workspace())
  apply(root, { globalAllowEnabled: false, globalAllow: ["read_file"] })
  assert.deepEqual(restrictions, [])
})

test("legacy workspace deny field is ignored", () => {
  const { root, restrictions, guards } = harness(workspace("deny: [delete_records]\n"))
  apply(root)
  assert.deepEqual(restrictions, [])
  assert.equal(guards.length, 0)
})

test("workspace without policy is unchanged", () => {
  const { root, restrictions, guards } = harness(workspace())
  apply(root)
  assert.deepEqual(restrictions, [])
  assert.equal(guards.length, 0)
})

test("mounts a Session-independent Host tool catalog service", () => {
  const { root, pluginClasses } = harness(workspace())
  apply(root)
  assert.deepEqual(pluginClasses, [ToolCatalogService])
  assert.deepEqual(ToolCatalogService.inject, ["tools"])
})

test("registers the custom Settings namespace on the plugin row, without duplicate auto form", () => {
  const { root, settingsPolicies, settingsOwners } = harness(workspace())
  apply(root)
  assert.deepEqual(settingsPolicies, [{ auto: false }])
  assert.equal(settingsOwners[0], root.fiber)
})

test("preset-local hide applies only to its Agent", () => {
  const { root, restrictions, rootRestrictions } = harness(workspace(), "review")
  apply(root, { hide: ["search"] })
  assert.deepEqual(hiddenNames(restrictions), ["search"])
  assert.deepEqual(rootRestrictions, [])
})

test("preset-local allow-list applies only to its Agent", () => {
  const { root, restrictions } = harness(workspace(), "review")
  apply(root, { allow: ["read_file"] })
  assert.deepEqual(hiddenNames(restrictions), ["bash", "search_files", "search", "delete_records"])
})

test("hideByPreset applies only to the selected preset", () => {
  const { root, restrictions, rootRestrictions } = harness(workspace())
  apply(root, { hideByPreset: { review: ["search"] } })
  assert.deepEqual(hiddenNames(restrictions), ["search"])
  assert.deepEqual(rootRestrictions, [])
})

test("preset policy restrictions are disposed when an Agent changes preset", () => {
  const { root, guards, listeners, disposedGuards, setAgentPreset } = harness(workspace(), "review")
  apply(root, { hide: ["search"] })
  assert.equal(guards.length, 1)
  setAgentPreset("other")
  listeners.get("agent-preset/selected")("session-1")
  assert.equal(guards.length, 0)
  assert.equal(disposedGuards.length, 1)
})
