function parseTools(value) {
  if (!Array.isArray(value)) throw new TypeError("toolCatalog.listTools returned an invalid tool list")
  return value.map((tool) => {
    if (!tool || typeof tool.name !== "string" || typeof tool.description !== "string") {
      throw new TypeError("toolCatalog.listTools returned an invalid tool entry")
    }
    return { name: tool.name, description: tool.description }
  })
}

function createToolCatalogResult() {
  return {
    parse(value) {
      if (!value || typeof value !== "object" || Array.isArray(value) || !Array.isArray(value.tools) || !Array.isArray(value.presets)) {
        throw new TypeError("toolCatalog.listTools returned an invalid catalog")
      }
      const presets = value.presets.map((preset) => {
        if (!preset || typeof preset.id !== "string") {
          throw new TypeError("toolCatalog.listTools returned an invalid preset catalog")
        }
        return { id: preset.id, tools: parseTools(preset.tools) }
      })
      return { tools: parseTools(value.tools), presets }
    },
  }
}

export const TYPERT_REMOTE = {
  package: "dsh-tool-deny",
  descriptors: [
    {
      id: "dsh-tool-deny#toolCatalog/listTools",
      service: "toolCatalog",
      namespace: "toolCatalog",
      method: "listTools",
      invocation: { kind: "direct" },
      parameters: [],
      result: {
        mode: "strict",
        typeSymbol: "dsh-tool-deny/client#ToolCatalog",
        create: createToolCatalogResult,
      },
    },
  ],
}

export default TYPERT_REMOTE
