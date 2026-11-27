import path from "node:path"
import { readFileSync } from "node:fs"
import { load as loadYaml } from "js-yaml"
import z from "@deepseek-ai/schemastery"
import { ToolCatalogService } from "./tool-catalog.js"

const toolList = () => z.array(z.string()).default([])
const nullableToolList = () => z.union([z.array(z.string()), z.const(null)]).default(null)
const presetToolLists = () => z.dict(z.array(z.string()), z.string()).default({})
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value ?? {}, key)
const globalAllowActive = (config) => Array.isArray(config.globalAllow)
const globCache = new Map()

function compileToolPattern(pattern) {
  if (!pattern.includes("*") && !pattern.includes("?")) return undefined
  if (globCache.has(pattern)) return globCache.get(pattern)
  let source = "^"
  for (const char of pattern) {
    if (char === "*") source += ".*"
    else if (char === "?") source += "."
    else source += "\\^$+?.()|[]{}".includes(char) ? `\\${char}` : char
  }
  const matcher = new RegExp(`${source}$`)
  globCache.set(pattern, matcher)
  return matcher
}

export function matchesToolPattern(pattern, name) {
  if (typeof pattern !== "string" || typeof name !== "string") return false
  const matcher = compileToolPattern(pattern)
  return matcher ? matcher.test(name) : pattern === name
}

function expandToolPatterns(patterns, toolNames) {
  const result = []
  const seen = new Set()
  for (const pattern of patterns) {
    for (const name of toolNames) {
      if (!seen.has(name) && matchesToolPattern(pattern, name)) {
        seen.add(name)
        result.push(name)
      }
    }
  }
  return result
}

export const name = "dsh-tool-deny"
export const inject = ["tools", "systemPrompt"]

export const Config = z.object({
  globalHide: toolList().volatile().description("Tool names or case-sensitive * / ? patterns to remove from every Agent's model tool list."),
  globalAllowEnabled: z.boolean().volatile().hidden(),
  globalAllow: nullableToolList().volatile().description("Names or case-sensitive * / ? patterns explicitly allowed to override lower-priority hide rules; null means no global allow exceptions."),
  hideByPreset: presetToolLists().volatile().description("Map preset ids to tool names or case-sensitive * / ? patterns to hide."),
  allowByPreset: presetToolLists().volatile().description("Map preset ids to names or case-sensitive * / ? patterns appended to the merged allow-list."),
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

export function mergeAllowLists(layers, toolNames) {
  const names = []
  const firstLayer = new Map()
  const candidates = [...new Set(toolNames.filter((name) => typeof name === "string"))]
  for (let index = 0; index < layers.length; index += 1) {
    for (const list of layers[index].allowLists) {
      for (const name of expandToolPatterns(list, candidates)) {
        if (firstLayer.has(name)) continue
        firstLayer.set(name, index)
        names.push(name)
      }
    }
  }
  return { names, firstLayer }
}

function resolveHiddenNames(names, layers) {
  const allow = mergeAllowLists(layers, names)
  return names.filter((name) => {
    const allowLayer = allow.firstLayer.get(name)
    const hideLayer = layers.findIndex((layer) => layer.hide.some((pattern) => matchesToolPattern(pattern, name)))
    return hideLayer !== -1 && (allowLayer === undefined || hideLayer <= allowLayer)
  })
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
    const watchedFiles = new Map()
    const watchByAgent = new Map()
    const fsService = sctx.get("fs")
    const timerService = sctx.get("timer")
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
          allowLists: !presetOnly && globalAllowActive(config) ? [config.globalAllow] : [],
        },
      ]
      const schemas = agent.ctx.tools.schemas()
      const names = schemas.map((schema) => schema.name).filter((toolName) => typeof toolName === "string")
      const hiddenNames = resolveHiddenNames(names, layers)
      const sections = config.hideSections ?? []
      const disposers = registerPolicy(agent.ctx, sctx.logger, hiddenNames, sections)
      if (disposers.length) undoByAgent.set(agent, disposers)
    }
    const refreshFileAgents = (file, record) => {
      if (watchedFiles.get(file) !== record) return
      for (const agent of [...record.agents]) refresh(agent)
    }
    const unwatchAgent = (agent) => {
      const file = watchByAgent.get(agent)
      if (!file) return
      watchByAgent.delete(agent)
      const record = watchedFiles.get(file)
      if (!record) return
      record.agents.delete(agent)
      if (record.agents.size > 0) return
      watchedFiles.delete(file)
      record.controller.abort()
      record.debounced?.dispose?.()
      for (const close of record.closers) {
        Promise.resolve(close()).catch((error) => sctx.logger?.warn?.(`dsh-tool-deny: cannot close watcher for ${file}: ${error}`))
      }
    }
    const watchWorkspaceFile = async (agent) => {
      if (!fsService?.resolve || !fsService?.watch) return
      if (presetOnly && sctx.agentPresets.composedPreset(agent.ctx) !== presetOnly) {
        unwatchAgent(agent)
        return
      }
      const cwd = agent.session?.header?.cwd
      if (!cwd) { unwatchAgent(agent); return }
      const directory = path.resolve(cwd)
      const file = path.join(directory, ".dsh-tools.yml")
      if (watchByAgent.get(agent) === file) return
      unwatchAgent(agent)

      let record = watchedFiles.get(file)
      if (!record) {
        record = {
          agents: new Set(),
          controller: new AbortController(),
          closers: [],
          debounced: undefined,
          ready: undefined,
        }
        if (timerService?.debounce) record.debounced = timerService.debounce(() => refreshFileAgents(file, record), 120)
        watchedFiles.set(file, record)
        const changed = (error) => {
          if (watchedFiles.get(file) !== record) return
          if (error) sctx.logger?.warn?.(`dsh-tool-deny: workspace watcher reported ${file}: ${error}`)
          if (record.debounced) record.debounced()
          else refreshFileAgents(file, record)
        }
        record.ready = (async () => {
          try {
            const target = await fsService.resolve(file, { signal: record.controller.signal })
            if (record.controller.signal.aborted) return
            const close = await fsService.watch(target, changed, record.controller.signal)
            if (record.controller.signal.aborted) await close()
            else record.closers.push(close)
          } catch (error) {
            if (record.controller.signal.aborted) return
            sctx.logger?.warn?.(`dsh-tool-deny: cannot watch ${file}: ${error}`)
            if (watchedFiles.get(file) === record) {
              watchedFiles.delete(file)
              for (const tracked of record.agents) watchByAgent.delete(tracked)
              record.agents.clear()
              record.debounced?.dispose?.()
            }
          }
        })()
      }
      record.agents.add(agent)
      watchByAgent.set(agent, file)
      await record.ready
      if (watchedFiles.get(file) === record && !record.controller.signal.aborted) refresh(agent)
    }

    for (const agent of sctx.agents.list()) {
      refresh(agent)
      void watchWorkspaceFile(agent)
    }
    sctx.on("agent/created", ({ agent }) => {
      refresh(agent)
      void watchWorkspaceFile(agent)
      return undefined
    })
    sctx.on("agent-preset/selected", (sessionId) => {
      const agent = sctx.agents.get(sessionId)
      if (agent) {
        refresh(agent)
        void watchWorkspaceFile(agent)
      }
    })
    sctx.on("agent/disposed", ({ agent }) => {
      unapply(agent)
      unwatchAgent(agent)
    })
    sctx.effect(() => () => {
      for (const agent of [...undoByAgent.keys()]) unapply(agent)
      for (const agent of [...watchByAgent.keys()]) unwatchAgent(agent)
    }, presetOnly ? "dsh-tool-deny: preset policy" : "dsh-tool-deny: global and workspace policies")
  })
}

export function apply(ctx, config = {}) {
  ctx.plugin(ToolCatalogService)

  // Settings is optional for the policy engine but required to expose this
  // Config namespace to the Client Settings form. Inject it so auto-generation
  // is registered whenever the built-in Settings service is available.
  ctx.inject(["settings"], (sctx) => {
    sctx.effect(
      () => sctx.settings.configure({ auto: false }, ctx.fiber),
      "dsh-tool-deny: settings page",
    )
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
