import assert from "node:assert/strict"
import { test } from "node:test"
import { remoteMethods } from "@deepseek-ai/dsh-typert-protocol"
import { TYPERT } from "../typert.host.js"
import TYPERT_REMOTE from "../typert.remote-client.js"
import { ToolCatalogService } from "../tool-catalog.js"

const expectedCatalog = {
  tools: [
    { name: "alpha", description: "first" },
    { name: "zeta", description: "last" },
  ],
  presets: [
    {
      id: "minimal",
      tools: [
        { name: "alpha", description: "first" },
        { name: "read_file", description: "Built-in read" },
      ],
    },
    {
      id: "review",
      tools: [
        { name: "alpha", description: "first" },
        { name: "web_search", description: "Preset web search" },
      ],
    },
  ],
}

function catalogContext() {
  const disposed = []
  const scopes = new Map([
    ["minimal", { key: { preset: "minimal" }, async [Symbol.asyncDispose]() { disposed.push("minimal") } }],
    ["review", { key: { preset: "review" }, async [Symbol.asyncDispose]() { disposed.push("review") } }],
  ])
  return {
    disposed,
    ctx: {
      logger: { warn() {} },
      tools: {
        schemas(scope) {
          if (scope?.preset === "minimal") return [
            { name: "read_file", description: "Built-in read" },
            { name: "alpha", description: "first" },
          ]
          if (scope?.preset === "review") return [
            { name: "web_search", description: "Preset web search" },
            { name: "alpha", description: "first" },
          ]
          return [
            { name: "zeta", description: "last" },
            { name: "alpha", description: "first" },
          ]
        },
      },
      agentPresets: {
        async list() { return [{ id: "minimal" }, { id: "review" }] },
        async acquireScope(id) { return scopes.get(id) },
      },
    },
  }
}

test("Host catalog Remote lists sorted global and per-preset visible tools", async () => {
  const { ctx, disposed } = catalogContext()
  const catalog = await ToolCatalogService.prototype.listTools.call({ ctx })
  assert.deepEqual(catalog, expectedCatalog)
  assert.deepEqual(disposed, ["minimal", "review"])
  assert.deepEqual(ToolCatalogService.inject, ["tools", "agentPresets"])
})

test("Typert Host manifest and Remote marker agree on the catalog endpoint", () => {
  assert.equal(TYPERT.package, "dsh-tool-deny")
  const endpoint = TYPERT.invocations[0]
  assert.equal(endpoint.id, "dsh-tool-deny#toolCatalog/listTools")
  assert.equal(endpoint.service, "toolCatalog")
  assert.equal(endpoint.namespace, "toolCatalog")
  assert.equal(endpoint.method, "listTools")
  assert.deepEqual(endpoint.parameters, [])
  assert.deepEqual(remoteMethods(Object.create(ToolCatalogService.prototype)).map(({ method, invocation }) => ({ method, invocation })), [
    { method: "listTools", invocation: { kind: "direct" } },
  ])
  assert.deepEqual(endpoint.result.create().parse(expectedCatalog), expectedCatalog)
})

test("Client Remote contribution validates preset-aware catalogs", () => {
  const host = TYPERT.invocations[0]
  const client = TYPERT_REMOTE.descriptors[0]
  assert.equal(TYPERT_REMOTE.package, TYPERT.package)
  assert.equal(client.id, host.id)
  assert.equal(client.service, host.service)
  assert.equal(client.namespace, host.namespace)
  assert.equal(client.method, host.method)
  assert.deepEqual(client.invocation, host.invocation)
  assert.deepEqual(client.parameters, host.parameters)
  assert.deepEqual(client.result.create().parse(expectedCatalog), expectedCatalog)
})
