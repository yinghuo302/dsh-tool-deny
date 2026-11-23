import path from "node:path"
import { readFileSync } from "node:fs"
import { load as loadYaml } from "js-yaml"
import z from "@deepseek-ai/schemastery"

const toolList = () => z.array(z.string()).default([])
const presetToolLists = () => z.dict(z.array(z.string()), z.string()).default({})
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value ?? {}, key)

export const name = "dsh-tool-deny"
export const inject = ["tools", "systemPrompt"]

export const Config = z.object({
  globalHide: toolList().description("Tools to remove from every Agent's model tool list."),
  globalAllowEnabled: z.boolean().default(false).description("Enable the global tool allow-list."),
  globalAllow: toolList().description("When globalAllowEnabled is true, keep only these tools unless a higher-priority scope overrides it."),
  hideByPreset: presetToolLists().description("Map preset ids to tool names to hide for those presets."),
  allowByPreset: presetToolLists().description("Map preset ids to the only inherited tools allowed for those presets."),
  hideSections: z.array(z.string()).default([]).description("Global system-prompt section names to blank for matching Agents."),
  hide: z.any().hidden(),
  allow: z.any().hidden(),
})

function readWorkspacePolicy(cwd, logger) {
  if (!cwd) return undefined
  const file = path.join(path.resolve(cwd), ".dsh-tools.yml")
  let source
  try {
    source = readFileSync(file, "utf8")
  } catch (error) {
    if (error?.code !== "ENOENT") logger?.warn?.(`dsh-tool-deny: cannot read ${file}: ${error}`)
    return undefined
  }
  try {
    const policy = loadYaml(source)
    if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
      throw new TypeError("expected a mapping with hide and/or allow lists")
    }
    for (const key of ["hide", "allow"]) {
      if (policy[key] !== undefined && (!Array.isArray(policy[key]) || policy[key].some((name) => typeof name !== "string"))) {
        throw new TypeError(`expected ${key} to be a list of tool names`)
      }
    }
    return { hide: policy.hide ?? [], ...(Array.isArray(policy.allow) ? { allow: policy.allow } : {}) }
  } catch (error) {
    logger?.warn?.(`dsh-tool-deny: invalid ${file}: ${error}`)
    return undefined
  }
}

function hidesByPriority(name, layers) {
  for (const layer of layers) {
    if (layer.hide.includes(name)) return true
    if (layer.allowLists.length > 0) return !layer.allowLists.every((list) => list.includes(name))
  }
  return false
}

function registerPolicy(ctx, logger, hiddenNames, sectionNames) {
  const undo = []
  const names = [...new Set(hiddenNames)]
  for (const toolName of names) {
    try {
      undo.push(ctx.tools.restrict({ deny: [toolName] }))
    } catch (error) {
      // Scope-owned tools cannot be removed from the inherited schema surface;
      // the guard below still prevents their execution.
      logger?.warn?.(`dsh-tool-deny: cannot hide \"${toolName}\" from the model list: ${error}`)
    }
  }
  if (names.length > 0) {
    const hidden = new Set(names)
    undo.push(ctx.tools.guard((execution) =>
      hidden.has(execution?.name) ? `\"${execution.name}\" is not available to this agent.` : undefined,
    ))
  }
  for (const sectionName of sectionNames) {
    undo.push(ctx.systemPrompt.section({ name: sectionName, order: 500, text: "" }))
  }
  return undo
}

function installAgentPolicies(ctx, config, { presetOnly } = {}) {
  ctx.inject(["agents", "agentPresets"], (sctx) => {
    const undoByAgent = new Map()
    const unapply = (agent) => {
      for (const dispose of undoByAgent.get(agent) ?? []) dispose()
      undoByAgent.delete(agent)
    }
    const refresh = (agent) => {
      unapply(agent)
      const preset = sctx.agentPresets.composedPreset(agent.ctx)
      if (presetOnly && preset !== presetOnly) return

      const local = readWorkspacePolicy(agent.session?.header?.cwd, sctx.logger) ?? { hide: [] }
      const presetHide = presetOnly
        ? [...(config.hide ?? []), ...(config.hideByPreset?.[presetOnly] ?? [])]
        : [...(config.hideByPreset?.[preset] ?? [])]
      const presetAllowLists = presetOnly
        ? [config.allow, hasOwn(config.allowByPreset, presetOnly) ? config.allowByPreset[presetOnly] : undefined].filter(Array.isArray)
        : [hasOwn(config.allowByPreset, preset) ? config.allowByPreset[preset] : undefined].filter(Array.isArray)
      const layers = [
        {
          hide: local.hide ?? [],
          allowLists: Array.isArray(local.allow) ? [local.allow] : [],
        },
        { hide: presetHide, allowLists: presetAllowLists },
        {
          hide: presetOnly ? [] : config.globalHide ?? [],
          allowLists: !presetOnly && config.globalAllowEnabled ? [config.globalAllow ?? []] : [],
        },
      ]
      const schemas = agent.ctx.tools.schemas()
      const names = schemas.map((schema) => schema.name).filter((toolName) => typeof toolName === "string")
      const hiddenNames = names.filter((toolName) => hidesByPriority(toolName, layers))
      const sections = config.hideSections ?? []
      const disposers = registerPolicy(agent.ctx, sctx.logger, hiddenNames, sections)
      if (disposers.length) undoByAgent.set(agent, disposers)
    }

    for (const agent of sctx.agents.list()) refresh(agent)
    sctx.on("agent/created", ({ agent }) => { refresh(agent); return undefined })
    sctx.on("agent-preset/selected", (sessionId) => {
      const agent = sctx.agents.get(sessionId)
      if (agent) refresh(agent)
    })
    sctx.on("agent/disposed", ({ agent }) => unapply(agent))
    sctx.effect(() => () => {
      for (const agent of [...undoByAgent.keys()]) unapply(agent)
    }, presetOnly ? "dsh-tool-deny: preset policy" : "dsh-tool-deny: global and workspace policies")
  })
}

export function apply(ctx, config = {}) {
  // Settings is optional for the policy engine but required to expose this
  // Config namespace to the Client Settings form. Inject it so auto-generation
  // is registered whenever the built-in Settings service is available.
  ctx.inject(["settings"], (sctx) => {
    const disposeSettings = sctx.settings.configure({ auto: true })
    sctx.effect(() => disposeSettings, "dsh-tool-deny: settings page")
  })

  if (config.hideByWorkspace) {
    ctx.logger?.warn?.("dsh-tool-deny: hideByWorkspace is no longer supported; configure each workspace in its .dsh-tools.yml")
  }

  ctx.inject(["agentPresets"], (sctx) => {
    const preset = sctx.agentPresets.composedPreset(ctx)
    if (preset) {
      installAgentPolicies(ctx, config, { presetOnly: preset })
      return
    }
    if (config.hide?.length || config.allow !== undefined) {
      sctx.logger?.warn?.("dsh-tool-deny: hide and allow require the plugin to be mounted inside an agent preset")
    }
    installAgentPolicies(ctx, config)
  })
}
