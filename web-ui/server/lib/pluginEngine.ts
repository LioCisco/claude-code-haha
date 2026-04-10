import { getPluginById, getActivePlugins, incrementPluginUsage, logPluginExecution } from '../db'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { Anthropic } from '@anthropic-ai/sdk'

// ================== Plugin Types ==================
export interface PluginTool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

export interface PluginManifest {
  tools?: PluginTool[]
  hooks?: {
    beforeMessage?: string
    afterMessage?: string
    beforeTool?: string
    afterTool?: string
    onError?: string
  }
  uiComponents?: {
    name: string
    type: 'page' | 'widget' | 'toolbar'
    route?: string
  }[]
  permissions?: string[]
}

export interface LoadedPlugin {
  id: string
  name: string
  type: 'builtin' | 'mcp' | 'http' | 'webhook'
  manifest: PluginManifest
  code?: string
  mcpClient?: Client
  mcpTransport?: StdioClientTransport | SSEClientTransport
  handlers: Map<string, Function>
}

// ================== Plugin Registry ==================
const loadedPlugins = new Map<string, LoadedPlugin>()

// ================== Tool Definitions Cache ==================
let cachedToolDefinitions: Anthropic.Messages.Tool[] = []
let toolsCacheTimestamp = 0
const TOOLS_CACHE_TTL = 30000 // 30 seconds

// ================== Load/Unload Plugins ==================

export async function loadPlugin(pluginId: string): Promise<boolean> {
  try {
    // If already loaded, unload first
    if (loadedPlugins.has(pluginId)) {
      await unloadPlugin(pluginId)
    }

    const plugin = await getPluginById(pluginId)
    if (!plugin) {
      console.error(`[PluginEngine] Plugin not found: ${pluginId}`)
      return false
    }

    const loaded: LoadedPlugin = {
      id: plugin.id,
      name: plugin.name,
      type: plugin.type,
      manifest: typeof plugin.manifest === 'string' ? JSON.parse(plugin.manifest) : plugin.manifest || {},
      handlers: new Map(),
    }

    switch (plugin.type) {
      case 'builtin':
        await loadBuiltinPlugin(loaded, plugin.code)
        break
      case 'mcp':
        await loadMcpPlugin(loaded, typeof plugin.mcp_config === 'string' ? JSON.parse(plugin.mcp_config) : plugin.mcp_config)
        break
      case 'http':
        await loadHttpPlugin(loaded, typeof plugin.config === 'string' ? JSON.parse(plugin.config) : plugin.config)
        break
      default:
        console.warn(`[PluginEngine] Unknown plugin type: ${plugin.type}`)
    }

    loadedPlugins.set(pluginId, loaded)
    console.log(`[PluginEngine] Loaded plugin: ${plugin.name} (${pluginId})`)

    // Invalidate tool cache
    invalidateToolCache()

    return true
  } catch (err) {
    console.error(`[PluginEngine] Failed to load plugin ${pluginId}:`, err)
    return false
  }
}

export async function unloadPlugin(pluginId: string): Promise<boolean> {
  const loaded = loadedPlugins.get(pluginId)
  if (!loaded) return false

  try {
    // Cleanup MCP client if exists
    if (loaded.mcpClient && loaded.mcpTransport) {
      await loaded.mcpClient.close()
      loaded.mcpTransport.close()
    }

    loadedPlugins.delete(pluginId)
    console.log(`[PluginEngine] Unloaded plugin: ${loaded.name} (${pluginId})`)

    // Invalidate tool cache
    invalidateToolCache()

    return true
  } catch (err) {
    console.error(`[PluginEngine] Error unloading plugin ${pluginId}:`, err)
    return false
  }
}

// Load all active plugins at startup
export async function loadActivePlugins(userId?: string): Promise<void> {
  const plugins = await getActivePlugins(userId)
  console.log(`[PluginEngine] Loading ${plugins.length} active plugins...`)

  for (const plugin of plugins) {
    await loadPlugin(plugin.id)
  }
}

// ================== Builtin Plugin Loader ==================

async function loadBuiltinPlugin(loaded: LoadedPlugin, code: string | null): Promise<void> {
  if (!code) {
    console.warn(`[PluginEngine] Builtin plugin ${loaded.id} has no code`)
    return
  }

  try {
    // Create a sandboxed context for the plugin
    const sandbox = createPluginSandbox(loaded.id, loaded.name) as Record<string, any>

    // Get tool names from manifest
    const toolNames = loaded.manifest.tools?.map(t => t.name) || []

    // Transform the code to capture function definitions
    // The issue: function declarations inside IIFE are not visible outside
    // Solution: Transform function declarations to assignments on the sandbox object
    let transformedCode = code
    for (const toolName of toolNames) {
      // Replace "async function toolName(...)" with "sandbox.toolName = async function(...)"
      // Use word boundary to avoid replacing already transformed code
      const asyncFnRegex = new RegExp(`(^|\\s|\\n|\\r|\\t)(async\\s+function\\s+${toolName}\\s*\\()`, 'g')
      transformedCode = transformedCode.replace(asyncFnRegex, `$1sandbox.${toolName} = $2`)
    }

    // Wrap code in async function
    // Use string concatenation to avoid issues with backticks in transformedCode
    const wrappedCode = '(async function(sandbox) {\n' + transformedCode + '\n})'

    // Execute the code
    // Note: In production, use a proper sandbox like vm2 or isolated-vm
    const fn = new Function('sandbox', 'return ' + wrappedCode)
    const pluginInit = fn(sandbox)
    await pluginInit(sandbox)

    // Register all functions found in sandbox as handlers
    for (const toolName of toolNames) {
      const fn = sandbox[toolName]
      if (typeof fn === 'function') {
        loaded.handlers.set(toolName, fn)
      } else {
        console.warn(`[PluginEngine] Tool '${toolName}' not found in plugin ${loaded.id}`)
      }
    }

  } catch (err) {
    console.error(`[PluginEngine] Error loading builtin plugin ${loaded.id}:`, err)
    throw err
  }
}

// ================== MCP Plugin Loader ==================

async function loadMcpPlugin(loaded: LoadedPlugin, mcpConfig: any): Promise<void> {
  if (!mcpConfig) {
    throw new Error('MCP config is required for MCP plugins')
  }

  try {
    let transport: StdioClientTransport | SSEClientTransport

    if (mcpConfig.transport === 'stdio') {
      transport = new StdioClientTransport({
        command: mcpConfig.command,
        args: mcpConfig.args || [],
        env: { ...process.env, ...mcpConfig.env }
      })
    } else if (mcpConfig.transport === 'sse') {
      transport = new SSEClientTransport(new URL(mcpConfig.url))
    } else {
      throw new Error(`Unsupported MCP transport: ${mcpConfig.transport}`)
    }

    const client = new Client({ name: 'kane-work', version: '1.0.0' }, { capabilities: {} })
    await client.connect(transport)

    loaded.mcpClient = client
    loaded.mcpTransport = transport

    // Fetch and cache tools from MCP server
    const tools = await client.listTools()
    if (loaded.manifest.tools === undefined) {
      loaded.manifest.tools = []
    }

    // Convert MCP tools to our format
    for (const tool of tools.tools) {
      loaded.manifest.tools.push({
        name: tool.name,
        description: tool.description || '',
        input_schema: tool.inputSchema
      })
      // Register MCP tool handler
      loaded.handlers.set(tool.name, async (params: any) => {
        return await client.callTool({ name: tool.name, arguments: params })
      })
    }

  } catch (err) {
    console.error(`[PluginEngine] Error loading MCP plugin ${loaded.id}:`, err)
    throw err
  }
}

// ================== HTTP Plugin Loader ==================

async function loadHttpPlugin(loaded: LoadedPlugin, config: any): Promise<void> {
  if (!config?.endpoint) {
    throw new Error('HTTP endpoint is required for HTTP plugins')
  }

  // Register HTTP-based tool handlers
  if (loaded.manifest.tools) {
    for (const tool of loaded.manifest.tools) {
      loaded.handlers.set(tool.name, async (params: any) => {
        const response = await fetch(`${config.endpoint}/${tool.name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...config.headers
          },
          body: JSON.stringify(params)
        })

        if (!response.ok) {
          throw new Error(`HTTP plugin error: ${response.statusText}`)
        }

        return await response.json()
      })
    }
  }
}

// ================== Plugin Sandbox ==================

function createPluginSandbox(pluginId: string, pluginName: string) {
  return {
    // Console (redirect to our logger)
    console: {
      log: (...args: any[]) => console.log(`[Plugin:${pluginName}]`, ...args),
      error: (...args: any[]) => console.error(`[Plugin:${pluginName}]`, ...args),
      warn: (...args: any[]) => console.warn(`[Plugin:${pluginName}]`, ...args),
      info: (...args: any[]) => console.info(`[Plugin:${pluginName}]`, ...args),
    },

    // Fetch (for HTTP requests)
    fetch: async (url: string, options?: RequestInit) => {
      // Add timeout and security checks
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        })
        clearTimeout(timeout)
        return response
      } catch (err) {
        clearTimeout(timeout)
        throw err
      }
    },

    // JSON utilities
    JSON: {
      parse: JSON.parse,
      stringify: JSON.stringify
    },

    // Text encoding
    TextEncoder,
    TextDecoder,

    // Date
    Date,
    setTimeout: (fn: Function, ms: number) => setTimeout(fn, ms),
    clearTimeout: (id: any) => clearTimeout(id),

    // Math
    Math,

    // Utilities
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    Promise,

    // Plugin metadata
    __pluginId: pluginId,
    __pluginName: pluginName,
  }
}

// ================== Tool Definitions for Claude ==================

export function getPluginToolDefinitions(): Anthropic.Messages.Tool[] {
  // Check cache
  const now = Date.now()
  if (now - toolsCacheTimestamp < TOOLS_CACHE_TTL && cachedToolDefinitions.length > 0) {
    return cachedToolDefinitions
  }

  const tools: Anthropic.Messages.Tool[] = []

  for (const [pluginId, plugin] of loadedPlugins) {
    if (plugin.manifest.tools) {
      for (const tool of plugin.manifest.tools) {
        tools.push({
          name: `${pluginId}__${tool.name}`,
          description: `[${plugin.name}] ${tool.description}`,
          input_schema: tool.input_schema
        })
      }
    }
  }

  cachedToolDefinitions = tools
  toolsCacheTimestamp = now

  return tools
}

function invalidateToolCache(): void {
  toolsCacheTimestamp = 0
}

// ================== Tool Execution ==================

export async function executePluginTool(
  pluginId: string,
  toolName: string,
  params: Record<string, unknown>,
  context: { userId?: string; sessionId?: string }
): Promise<{ success: boolean; data?: any; error?: string; durationMs?: number }> {
  const startTime = Date.now()
  const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  try {
    // Find the plugin
    const plugin = loadedPlugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`)
    }

    // Get the handler
    const handler = plugin.handlers.get(toolName)
    if (!handler) {
      throw new Error(`Tool not found: ${toolName} in plugin ${pluginId}`)
    }

    // Execute with timeout
    const timeoutMs = 60000 // 60 seconds
    const result = await Promise.race([
      handler(params),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Plugin execution timeout')), timeoutMs)
      )
    ])

    const durationMs = Date.now() - startTime

    // Update usage stats
    await incrementPluginUsage(pluginId)

    // Log execution
    await logPluginExecution({
      id: executionId,
      pluginId,
      userId: context.userId,
      sessionId: context.sessionId,
      toolName,
      params,
      result,
      status: 'success',
      durationMs
    })

    return { success: true, data: result, durationMs }
  } catch (err) {
    const durationMs = Date.now() - startTime
    const errorMessage = err instanceof Error ? err.message : String(err)

    // Log error
    await logPluginExecution({
      id: executionId,
      pluginId,
      userId: context.userId,
      sessionId: context.sessionId,
      toolName,
      params,
      status: 'error',
      errorMessage,
      durationMs
    })

    return { success: false, error: errorMessage, durationMs }
  }
}

// ================== Hook System ==================

export async function runHook(
  hookType: 'beforeMessage' | 'afterMessage' | 'beforeTool' | 'afterTool' | 'onError',
  data: any,
  context: { userId?: string; sessionId?: string }
): Promise<any> {
  let result = data

  for (const [pluginId, plugin] of loadedPlugins) {
    const hookHandler = plugin.manifest.hooks?.[hookType]
    if (hookHandler && plugin.handlers.has(hookHandler)) {
      try {
        const handler = plugin.handlers.get(hookHandler)!
        result = await handler(result, context) || result
      } catch (err) {
        console.error(`[PluginEngine] Hook error in ${pluginId}.${hookHandler}:`, err)
      }
    }
  }

  return result
}

// ================== Get Active Tools ==================

export async function getActivePluginTools(userId?: string): Promise<PluginTool[]> {
  const tools: PluginTool[] = []

  // Load plugins if not already loaded
  if (loadedPlugins.size === 0) {
    await loadActivePlugins(userId)
  }

  for (const [pluginId, plugin] of loadedPlugins) {
    if (plugin.manifest.tools) {
      for (const tool of plugin.manifest.tools) {
        tools.push({
          ...tool,
          name: `${pluginId}__${tool.name}`,
          description: `[${plugin.name}] ${tool.description}`
        })
      }
    }
  }

  return tools
}

// ================== Execute Tool by Full Name ==================

export async function executeToolByName(
  fullToolName: string,
  params: Record<string, unknown>,
  context: { userId?: string; sessionId?: string }
): Promise<{ success: boolean; data?: any; error?: string; durationMs?: number } | null> {
  // Parse pluginId__toolName format
  const separatorIndex = fullToolName.indexOf('__')
  if (separatorIndex === -1) {
    return null // Not a plugin tool
  }

  const pluginId = fullToolName.substring(0, separatorIndex)
  const toolName = fullToolName.substring(separatorIndex + 2)

  return await executePluginTool(pluginId, toolName, params, context)
}

// ================== Initialize ==================

export async function initializePluginEngine(): Promise<void> {
  console.log('[PluginEngine] Initializing...')
  await loadActivePlugins()
  console.log(`[PluginEngine] Initialized with ${loadedPlugins.size} plugins`)
}
