import assert from "node:assert/strict"
import { test } from "node:test"
import { remoteMethods } from "@deepseek-ai/dsh-typert-protocol"
import { TYPERT } from "../typert.host.js"
import TYPERT_REMOTE from "../typert.remote-client.js"
import { ToolCatalogService } from "../tool-catalog.js"

test("Host catalog Remote is session-independent and lists sorted global tools", () => {
  const ctx = {
    tools: {
      schemas: () => [
        { name: "zeta", description: "last" },
        { name: "alpha", description: "first" },
      ],
    },
  }
  const catalog = ToolCatalogService.prototype.listTools.call({ ctx })
  assert.deepEqual(catalog, {
    tools: [
      { name: "alpha", description: "first" },
      { name: "zeta", description: "last" },
    ],
  })
  assert.deepEqual(ToolCatalogService.inject, ["tools"])
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
  assert.deepEqual(endpoint.result.create().parse({ tools: [{ name: "read_file", description: "Read a file" }] }), {
    tools: [{ name: "read_file", description: "Read a file" }],
  })
})

test("Client Remote contribution can be mounted without a Host session", () => {
  const host = TYPERT.invocations[0]
  const client = TYPERT_REMOTE.descriptors[0]
  assert.equal(TYPERT_REMOTE.package, TYPERT.package)
  assert.equal(client.id, host.id)
  assert.equal(client.service, host.service)
  assert.equal(client.namespace, host.namespace)
  assert.equal(client.method, host.method)
  assert.deepEqual(client.invocation, host.invocation)
  assert.deepEqual(client.parameters, host.parameters)
  assert.deepEqual(client.result.create().parse({ tools: [{ name: "read_file", description: "Read a file" }] }), {
    tools: [{ name: "read_file", description: "Read a file" }],
  })
})
