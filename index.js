import path from "node:path"
import { readFileSync } from "node:fs"
import { load as loadYaml } from "js-yaml"

/**
 * Limits which tools an agent gets. See README.md for the config options.
 */
export const name = "dsh-tool-deny"
export const inject = ["tools", "systemPrompt"]

function refuseCalls(ctx, toolNames) {
  if (toolNames.length === 0) return
  const refused = new Set(toolNames)
  return ctx.tools.guard((execution) =>
    refused.has(execution?.name)
      ? `"${execution.name}" is not available to this agent.`
      : undefined,
  )
}

// dsh names this filter "deny", but it hides the tool. It is unrelated to our `deny` option.
function removeFromToolList(ctx, toolName) {
  return ctx.tools.restrict({ deny: [toolName] })
}

function hide(ctx, logger, toolNames, sectionNames, allowNames) {
  const undo = []
  if (Array.isArray(allowNames)) {
    try {
      undo.push(ctx.tools.restrict({ allow: allowNames }))
    } catch (error) {
      logger?.warn?.(`dsh-tool-deny: cannot apply tool allow-list: ${error}`)
    }
  }
  for (const toolName of toolNames) {
    // One call per name: restrict() throws on an unknown tool, which would fail the agent.
    try {
      undo.push(removeFromToolList(ctx, toolName))
    } catch (error) {
      logger?.warn?.(`dsh-tool-deny: cannot hide "${toolName}": ${error}`)
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

function hideByWorkspace(ctx, sectionNames) {
  ctx.inject(["agents"], (sctx) => {
    const undoByAgent = new Map()
    const unhide = (agent) => {
      for (const undo of undoByAgent.get(agent) ?? []) undo()
      undoByAgent.delete(agent)
    }
    const refresh = (agent) => {
      unhide(agent)
      const cwd = agent.session?.header?.cwd
      const policy = readWorkspacePolicy(cwd, sctx.logger)
      if (policy) {
        const undo = hide(agent.ctx, sctx.logger, policy.hide ?? [], sectionNames, policy.allow)
        const unguard = refuseCalls(agent.ctx, policy.deny ?? [])
        if (unguard) undo.push(unguard)
        undoByAgent.set(agent, undo)
      }
    }
    for (const agent of sctx.agents.list()) refresh(agent)
    sctx.on("agent/created", ({ agent }) => { refresh(agent); return undefined })
    sctx.on("agent/disposed", ({ agent }) => unhide(agent))
    sctx.effect(() => () => {
      for (const agent of [...undoByAgent.keys()]) unhide(agent)
    }, "dsh-tool-deny: hide by workspace")
  })
}
function hideInOwningPreset(ctx, toolNames, denyNames, sectionNames) {
  ctx.inject(["agents", "agentPresets"], (sctx) => {
    const owningPreset = sctx.agentPresets.composedPreset(ctx)
    if (!owningPreset) {
      sctx.logger?.warn?.("dsh-tool-deny: hide and deny require the plugin to be mounted inside an agent preset")
      return
    }
    const undoByAgent = new Map()
    const unhide = (agent) => {
      for (const undo of undoByAgent.get(agent) ?? []) undo()
      undoByAgent.delete(agent)
    }
    const refresh = (agent) => {
      unhide(agent)
      if (sctx.agentPresets.composedPreset(agent.ctx) !== owningPreset) return
      const undo = hide(agent.ctx, sctx.logger, toolNames, sectionNames)
      const unguard = refuseCalls(agent.ctx, denyNames)
      if (unguard) undo.push(unguard)
      undoByAgent.set(agent, undo)
    }
    for (const agent of sctx.agents.list()) refresh(agent)
    sctx.on("agent/created", ({ agent }) => { refresh(agent); return undefined })
    sctx.on("agent-preset/selected", (sessionId) => {
      const agent = sctx.agents.get(sessionId)
      if (agent) refresh(agent)
    })
    sctx.on("agent/disposed", ({ agent }) => unhide(agent))
    sctx.effect(() => () => {
      for (const agent of [...undoByAgent.keys()]) unhide(agent)
    }, "dsh-tool-deny: hide in owning preset")
  })
}

function hideByPreset(ctx, toolNamesByPreset, sectionNames) {
  ctx.inject(["agents", "agentPresets"], (sctx) => {
    const undoByAgent = new Map()

    const unhide = (agent) => {
      for (const undo of undoByAgent.get(agent) ?? []) undo()
      undoByAgent.delete(agent)
    }
    const refresh = (agent) => {
      unhide(agent)
      const preset = sctx.agentPresets.composedPreset(agent.ctx)
      const toolNames = toolNamesByPreset[preset]
      if (toolNames) undoByAgent.set(agent, hide(agent.ctx, sctx.logger, toolNames, sectionNames))
    }

    for (const agent of sctx.agents.list()) refresh(agent)
    sctx.on("agent/created", ({ agent }) => {
      refresh(agent)
      return undefined
    })
    // A session can change preset before its first turn, after agent/created fired.
    sctx.on("agent-preset/selected", (sessionId) => {
      const agent = sctx.agents.get(sessionId)
      if (agent) refresh(agent)
    })
    sctx.on("agent/disposed", ({ agent }) => unhide(agent))
    sctx.effect(() => () => {
      for (const agent of [...undoByAgent.keys()]) unhide(agent)
    }, "dsh-tool-deny: hide by preset")
  })
}

export function apply(ctx, config = {}) {
  const sectionNames = config.hideSections ?? []
  if (config.hideByWorkspace) {
    ctx.logger?.warn?.("dsh-tool-deny: hideByWorkspace is no longer supported; configure each workspace in its .dsh-tools.yml")
  }
  hideByWorkspace(ctx, sectionNames)
  if (config.hideByPreset) {
    if (config.hide || config.deny) {
      ctx.logger?.warn?.("dsh-tool-deny: hide and deny only work inside a preset; ignoring them")
    }
    hideByPreset(ctx, config.hideByPreset, sectionNames)
    return
  }
  if (config.hide || config.deny || sectionNames.length) {
    hideInOwningPreset(ctx, config.hide ?? [], config.deny ?? [], sectionNames)
  }
}
