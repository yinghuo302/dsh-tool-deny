import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol"

function projectTools(schemas) {
  return schemas
    .map(({ name, description }) => ({ name, description: description ?? "" }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

export class ToolCatalogService extends TypertRemoteService {
  static inject = ["tools", "agentPresets"]

  constructor(ctx) {
    super(ctx, "toolCatalog")
  }

  async listTools() {
    const tools = projectTools(this.ctx.tools.schemas())
    const presets = []
    for (const preset of await this.ctx.agentPresets.list()) {
      let scope
      try {
        scope = await this.ctx.agentPresets.acquireScope(preset.id)
        presets.push({
          id: preset.id,
          tools: projectTools(this.ctx.tools.schemas(scope.key)),
        })
      } catch (error) {
        this.ctx.logger?.warn?.(`dsh-tool-deny: cannot read tool catalog for preset ${preset.id}: ${error}`)
        presets.push({ id: preset.id, tools: [] })
      } finally {
        if (scope) await scope[Symbol.asyncDispose]()
      }
    }
    return { tools, presets }
  }
}

// The package's checked-in Typert manifest describes this endpoint. Mark the
// concrete method too so Host-side runtime reflection and the manifest agree.
const initializers = []
Remote("listTools")(ToolCatalogService.prototype.listTools, {
  kind: "method",
  name: "listTools",
  static: false,
  private: false,
  access: {
    has: (instance) => "listTools" in instance,
    get: (instance) => instance.listTools,
  },
  addInitializer(initializer) { initializers.push(initializer) },
})
for (const initialize of initializers) initialize.call(Object.create(ToolCatalogService.prototype))
