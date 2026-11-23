import assert from "node:assert/strict"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { apply } from "../index.js"

function workspace(config) {
  const cwd = mkdtempSync(join(tmpdir(), "dsh-tools-"))
  if (config !== undefined) writeFileSync(join(cwd, ".dsh-tools.yml"), config)
  return cwd
}

function harness(cwd) {
  const restrictions = []
  const guards = []
  const listeners = new Map()
  const agent = {
    session: { header: { cwd } },
    ctx: {
      tools: {
        restrict(filter) {
          restrictions.push(filter)
          return () => restrictions.push({ undo: filter })
        },
        guard(fn) { guards.push(fn); return () => {} },
      },
      systemPrompt: { section: () => () => {} },
    },
  }
  const scope = {
    agents: { list: () => [agent], get: () => agent },
    logger: { warn() {} },
    on(name, handler) { listeners.set(name, handler) },
    effect() {},
  }
  const root = {
    inject(_services, callback) { callback(scope) },
    logger: { warn() {} },
  }
  return { root, agent, restrictions, guards }
}

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

