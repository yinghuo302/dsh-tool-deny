import { z } from "zod"

let resultSchema
const createToolCatalogSchema = () => resultSchema ??= z.object({
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })),
})

export const TYPERT = {
  package: "dsh-tool-deny",
  face: "host",
  schemas: [],
  invocations: [
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
        create: createToolCatalogSchema,
      },
    },
  ],
  model: {
    services: [
      {
        key: "toolCatalog",
        exportName: "ToolCatalogService",
        description: "Session-independent catalog of globally registered tools for the tool-policy Settings UI.",
        summary: "Global tool catalog for policy checkboxes.",
        tags: [],
        jsDoc: "Provides global tool names and descriptions without requiring an Agent session.",
        members: [
          {
            kind: "method",
            name: "listTools",
            signature: "@Remote('listTools') listTools(): ToolCatalog",
            summary: "List global tools for policy selection.",
            tags: [],
            jsDoc: "Returns the current global tool names and descriptions without Session state.",
          },
        ],
        types: [
          {
            name: "ToolOption",
            declaration: "export interface ToolOption { readonly name: string; readonly description: string; }",
          },
          {
            name: "ToolCatalog",
            declaration: "export interface ToolCatalog { readonly tools: readonly ToolOption[]; }",
          },
        ],
      },
    ],
    events: [],
    objects: [],
  },
}
