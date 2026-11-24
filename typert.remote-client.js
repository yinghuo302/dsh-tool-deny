function createToolCatalogResult() {
  return {
    parse(value) {
      if (!value || typeof value !== "object" || Array.isArray(value) || !Array.isArray(value.tools)) {
        throw new TypeError("toolCatalog.listTools returned an invalid catalog")
      }
      const tools = value.tools.map((tool) => {
        if (!tool || typeof tool.name !== "string" || typeof tool.description !== "string") {
          throw new TypeError("toolCatalog.listTools returned an invalid tool entry")
        }
        return { name: tool.name, description: tool.description }
      })
      return { tools }
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
