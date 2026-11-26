import { z } from "zod"

let resultSchema
const toolListSchema = z.array(z.object({
  name: z.string(),
  description: z.string(),
}))
const createToolCatalogSchema = () => resultSchema ??= z.object({
  tools: toolListSchema,
  presets: z.array(z.object({
    id: z.string(),
    tools: toolListSchema,
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
        description: "Session-independent catalogs of globally and per-preset visible tools for the tool-policy Settings UI.",
        summary: "Global and preset-aware tool catalogs for policy checkboxes.",
        tags: [],
        jsDoc: "Provides global and preset-scoped tool names and descriptions without requiring a live Agent session.",
        members: [
          {
            kind: "method",
            name: "listTools",
            signature: "@Remote('listTools') listTools(): ToolCatalog",
            summary: "List global and per-preset tools for policy selection.",
            tags: [],
            jsDoc: "Returns global tools and the visible tool list for each declared preset without creating an Agent.",
          },
        ],
        types: [
          {
            name: "ToolOption",
            declaration: "export interface ToolOption { readonly name: string; readonly description: string; }",
          },
          {
            name: "PresetToolCatalog",
            declaration: "export interface PresetToolCatalog { readonly id: string; readonly tools: readonly ToolOption[]; }",
          },
          {
            name: "ToolCatalog",
            declaration: "export interface ToolCatalog { readonly tools: readonly ToolOption[]; readonly presets: readonly PresetToolCatalog[]; }",
          },
        ],
      },
    ],
    events: [],
    objects: [],
  },
}
