import path from "node:path"
import { readFileSync } from "node:fs"
import { load as loadYaml } from "js-yaml"
import z from "@deepseek-ai/schemastery"

const toolList = () => z.array(z.string()).default([])
const presetToolLists = () => z.dict(z.array(z.string()), z.string()).default({})

export const name = "dsh-tool-deny"
export const inject = ["tools", "systemPrompt"]

export const Config = z.object({
  globalHide: toolList().description("Tools to remove from every Agent's model tool list."),
  hideByPreset: presetToolLists().description("Map preset ids to tool names to hide for those presets."),
  allowByPreset: presetToolLists().description("Map preset ids to the only inherited tools allowed for those presets."),
  denyByPreset: presetToolLists().description("Map preset ids to tools that stay visible but cannot be called."),
  hideSections: z.array(z.string()).default([]).description("Global system-prompt section names to blank for matching Agents."),
  hide: z.any().hidden(),
  allow: z.any().hidden(),
  deny: z.any().hidden(),
})

function refuseCalls(ctx, toolNames) {
  if (toolNames.length === 0) return undefined
  const refused = new Set(toolNames)
  return ctx.tools.guard((execution) =>
    refused.has(execution?.name)
      ? `\"${execution.name}\" is not available to this agent.`
      : undefined,
  )
}

function hide(ctx, logger, toolNames, sectionNames, allowLists = []) {
  const undo = []
  for (const allowNames of allowLists) {
    if (!Array.isArray(allowNames)) continue
    try {
      undo.push(ctx.tools.restrict({ allow: allowNames }))
    } catch (error) {
      logger?.warn?.(`dsh-tool-deny: cannot apply tool allow-list: ${error}`)
    }
  }
  for (const toolName of new Set(toolNames)) {
    try {
      undo.push(ctx.tools.restrict({ deny: [toolName] }))
    } catch (error) {
      logger?.warn?.(`dsh-tool-deny: cannot hide \"${toolName}\": ${error}`)
    }
  }
  for (const sectionName of sectionNames) {
    undo.push(ctx.systemPrompt.section({ name: sectionName, order: 500, text: "" }))
  }
  return undo
}

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
      throw new TypeError("expected a mapping with hide, allow, or deny lists")
    }
    for (const key of ["hide", "allow", "deny"]) {
      if (policy[key] !== undefined && (!Array.isArray(policy[key]) || policy[key].some((name) => typeof name !== "string"))) {
        throw new TypeError(`expected ${key} to be a list of tool names`)
      }
    }
    return policy
  } catch (error) {
    logger?.warn?.(`dsh-tool-deny: invalid ${file}: ${error}`)
    return undefined
  }
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

      const local = readWorkspacePolicy(agent.session?.header?.cwd, sctx.logger) ?? {}
      const hides = presetOnly
        ? [
            ...(config.hide ?? []),
            ...(config.hideByPreset?.[presetOnly] ?? []),
          ]
        : [
            ...(config.globalHide ?? []),
            ...(config.hideByPreset?.[preset] ?? []),
            ...(local.hide ?? []),
          ]
      const allowLists = presetOnly
        ? [config.allow, config.allowByPreset?.[presetOnly]].filter(Array.isArray)
        : [config.allowByPreset?.[preset], local.allow].filter(Array.isArray)
      const denies = presetOnly
        ? [
            ...(config.deny ?? []),
            ...(config.denyByPreset?.[presetOnly] ?? []),
          ]
        : [
            ...(config.denyByPreset?.[preset] ?? []),
            ...(local.deny ?? []),
          ]
      const sections = presetOnly ? config.hideSections ?? [] : config.hideSections ?? []
      const disposers = hide(agent.ctx, sctx.logger, hides, sections, allowLists)
      const unguard = refuseCalls(agent.ctx, denies)
      if (unguard) disposers.push(unguard)
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
  const settings = ctx.get?.("settings")
  if (settings?.configure) {
    const disposeSettings = settings.configure({ auto: true })
    ctx.effect(() => disposeSettings, "dsh-tool-deny: settings page")
  }

  if (config.hideByWorkspace) {
    ctx.logger?.warn?.("dsh-tool-deny: hideByWorkspace is no longer supported; configure each workspace in its .dsh-tools.yml")
  }

  ctx.inject(["agentPresets"], (sctx) => {
    const preset = sctx.agentPresets.composedPreset(ctx)
    if (preset) {
      installAgentPolicies(ctx, config, { presetOnly: preset })
      return
    }
    if (config.hide?.length || config.allow !== undefined || config.deny?.length) {
      sctx.logger?.warn?.("dsh-tool-deny: hide, allow and deny require the plugin to be mounted inside an agent preset")
    }
    // Root-level global, preset and workspace rules are projected onto each Agent.
    installAgentPolicies(ctx, config)
  })
}
