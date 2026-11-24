import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol"

export class ToolCatalogService extends TypertRemoteService {
  static inject = ["tools"]

  constructor(ctx) {
    super(ctx, "toolCatalog")
  }

  listTools() {
    const tools = this.ctx.tools.schemas()
      .map(({ name, description }) => ({ name, description: description ?? "" }))
      .sort((left, right) => left.name.localeCompare(right.name))
    return { tools }
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
