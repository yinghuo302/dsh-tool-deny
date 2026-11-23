import assert from "node:assert/strict"
import { test } from "node:test"
import { apply } from "../index.js"

function harness(cwd) {
  const restrictions = []
  const listeners = new Map()
  const agent = {
    session: { header: { cwd } },
    ctx: {
      tools: {
        restrict(filter) {
          restrictions.push(filter)
          return () => restrictions.push({ undo: filter })
        },
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
  return { root, agent, restrictions }
}

test("workspace allow policy restricts only matching workspace", () => {
  const { root, restrictions } = harness("/work/project")
  apply(root, { hideByWorkspace: { "/work/project/.": { allow: ["read"] } } })
  assert.deepEqual(restrictions, [{ allow: ["read"] }])
})

test("empty workspace allow list disables inherited tools", () => {
  const { root, restrictions } = harness("/work/project")
  apply(root, { hideByWorkspace: { "/work/project": { allow: [] } } })
  assert.deepEqual(restrictions, [{ allow: [] }])
})

test("workspace list shorthand hides named tools", () => {
  const { root, restrictions } = harness("/work/project")
  apply(root, { hideByWorkspace: { "/work/project": ["search"] } })
  assert.deepEqual(restrictions, [{ deny: ["search"] }])
})

test("unmatched workspace is unchanged", () => {
  const { root, restrictions } = harness("/work/other")
  apply(root, { hideByWorkspace: { "/work/project": ["search"] } })
  assert.deepEqual(restrictions, [])
})

