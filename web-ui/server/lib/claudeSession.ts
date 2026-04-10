import Anthropic from '@anthropic-ai/sdk'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile, readdir, stat } from 'fs/promises'
import { glob } from 'glob'
import { saveMessage, getSessionMessages, createSession, getSession, updateSessionTitle, getUserMemories } from '../db'
import { findRelevantMemories, extractMemoryFromConversation, generateMemorySystemPrompt } from './memoryAI'
import { syncMemoriesToFiles } from './memorySync'
import { getPluginToolDefinitions } from './pluginEngine'

const execAsync = promisify(exec)

// ================== Tool Formatting ==================
function formatToolUse(name: string, input: Record<string, unknown>): string {
  const icon =
    name === 'bash' ? '🔧' :
    name === 'read_file' ? '📄' :
    name === 'write_file' ? '✍️' :
    name === 'edit_file' ? '✏️' :
    name === 'glob' ? '📂' :
    name === 'grep' ? '🔍' :
    name === 'web_fetch' ? '🌐' :
    name === 'web_search' ? '🔎' :
    '🛠️'
  const lines = Object.entries(input).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
  return `${icon} 调用工具 **${name}**\n\`\`\`\n${lines.join('\n')}\n\`\`\``
}

function formatToolResult(name: string, result: string, isError?: boolean): string {
  const prefix = isError ? '❌ 工具执行失败' : '✅ 工具执行完成'
  const truncated = result.length > 800 ? result.slice(0, 800) + '\n... [truncated]' : result
  return `${prefix} (${name}):\n\`\`\`\n${truncated}\n\`\`\``
}

// ================== Types ==================
export type PermissionRequest = {
  id: string
  type: 'tool_permission'
  toolName: string
  toolInput: Record<string, unknown>
  message: string
}

export type ChatEvent =
  | { type: 'assistant_text'; text: string }
  | { type: 'assistant_tool_use'; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: string; isError?: boolean }
  | { type: 'permission_request'; request: PermissionRequest }
  | { type: 'ask_user_question'; question: string; options?: string[] }
  | { type: 'done' }
  | { type: 'error'; message: string }

export type PendingPermission = {
  resolve: (allowed: boolean) => void
  request: PermissionRequest
}

// ================== Core Tools ==================
const SENSITIVE_TOOLS = new Set([
  'bash',
  'Bash',
  'file_write',
  'FileWrite',
  'file_edit',
  'FileEdit',
])

function isSensitiveTool(name: string): boolean {
  return SENSITIVE_TOOLS.has(name) || name.toLowerCase().includes('bash')
}

async function callBash(command: string, timeout = 120000): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      cwd: process.cwd(),
    })
    return stdout + (stderr ? `\n[stderr]\n${stderr}` : '')
  } catch (err: unknown) {
    const e = err as Error & { stdout?: string; stderr?: string }
    throw new Error((e.stdout || '') + '\n[stderr]\n' + (e.stderr || e.message))
  }
}

async function callFileRead(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, 'utf-8')
    return content
  } catch (err) {
    throw new Error(`Failed to read ${filePath}: ${err}`)
  }
}

async function callFileWrite(filePath: string, content: string): Promise<string> {
  await writeFile(filePath, content, 'utf-8')
  return `Wrote ${content.length} bytes to ${filePath}`
}

async function callFileEdit(filePath: string, oldString: string, newString: string): Promise<string> {
  const content = await readFile(filePath, 'utf-8')
  if (!content.includes(oldString)) {
    throw new Error('old_string not found in file')
  }
  const updated = content.replace(oldString, newString)
  await writeFile(filePath, updated, 'utf-8')
  return `Edited ${filePath}`
}

async function callGlob(pattern: string): Promise<string> {
  const files = await glob(pattern, { cwd: process.cwd() })
  return files.join('\n')
}

async function callGrep(pattern: string, path?: string, outputMode?: string): Promise<string> {
  // Simple in-memory grep for demonstration
  if (!path) {
    return 'Please provide a path to search'
  }
  const s = await stat(path).catch(() => null)
  if (!s) return `Path not found: ${path}`
  const results: string[] = []
  if (s.isDirectory()) {
    const entries = await readdir(path)
    for (const entry of entries.slice(0, 50)) {
      const full = `${path}/${entry}`
      const es = await stat(full).catch(() => null)
      if (es?.isFile()) {
        const text = await readFile(full, 'utf-8').catch(() => '')
        const lines = text.split('\n')
        lines.forEach((line, idx) => {
          if (line.includes(pattern)) {
            results.push(`${full}:${idx + 1}:${line}`)
          }
        })
      }
    }
  } else {
    const text = await readFile(path, 'utf-8').catch(() => '')
    text.split('\n').forEach((line, idx) => {
      if (line.includes(pattern)) {
        results.push(`${path}:${idx + 1}:${line}`)
      }
    })
  }
  const out = results.slice(0, 100).join('\n')
  return out || 'No matches found'
}

async function callWebFetch(url: string): Promise<string> {
  try {
    const res = await fetch(url, { redirect: 'follow' })
    const text = await res.text()
    return text.slice(0, 50000)
  } catch (err) {
    throw new Error(`Fetch failed: ${err}`)
  }
}

async function callWebSearch(query: string): Promise<string> {
  // Placeholder: in production integrate real search API
  return `Search results for "${query}":\n1. Example result A\n2. Example result B\n(Integrate real search API for production use)`
}

// ================== Tool Definitions ==================
const TOOL_DEFINITIONS: Anthropic.Messages.Tool[] = [
  {
    name: 'bash',
    description: 'Execute bash commands in the project directory. Use with care.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The bash command to execute' },
        timeout: { type: 'number', description: 'Timeout in milliseconds' },
      },
      required: ['command'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file',
    input_schema: {
      type: 'object',
      properties: {
        file_path: { type: 'string' },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file (create or overwrite)',
    input_schema: {
      type: 'object',
      properties: {
        file_path: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['file_path', 'content'],
    },
  },
  {
    name: 'edit_file',
    description: 'Edit a file by replacing an exact string',
    input_schema: {
      type: 'object',
      properties: {
        file_path: { type: 'string' },
        old_string: { type: 'string' },
        new_string: { type: 'string' },
      },
      required: ['file_path', 'old_string', 'new_string'],
    },
  },
  {
    name: 'glob',
    description: 'Find files matching a glob pattern',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'grep',
    description: 'Search for a pattern in files',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string' },
        path: { type: 'string' },
        output_mode: { type: 'string', enum: ['content', 'files_with_matches'] },
      },
      required: ['pattern', 'path'],
    },
  },
  {
    name: 'web_fetch',
    description: 'Fetch content from a URL',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
      },
      required: ['url'],
    },
  },
  {
    name: 'web_search',
    description: 'Search the web for a query',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
  },
  {
    name: 'ask_user_question',
    description: 'Ask the user a clarifying question with optional choices',
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        options: { type: 'array', items: { type: 'string' } },
      },
      required: ['question'],
    },
  },
]

// ================== Session ==================
export class ClaudeSession {
  private anthropic: Anthropic
  private model: string
  private messages: Anthropic.Messages.MessageParam[] = []
  private onEvent: (event: ChatEvent) => void | Promise<void>
  private pendingPermission: PendingPermission | null = null
  private pendingQuestion: { resolve: (answer: string) => void } | null = null
  private maxTurns = 20
  private sessionId: string
  private dbEnabled: boolean
  private userId: string | null = null
  private relevantMemories: Array<{ name: string; content: string }> = []

  constructor(options: {
    apiKey: string
    baseURL?: string
    model?: string
    sessionId: string
    dbEnabled?: boolean
    userId?: string
    onEvent: (event: ChatEvent) => void | Promise<void>
  }) {
    this.anthropic = new Anthropic({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    })
    this.model = options.model || 'kimi-k2.5'
    this.sessionId = options.sessionId
    this.dbEnabled = options.dbEnabled ?? false
    this.userId = options.userId || null
    this.onEvent = options.onEvent
  }

  getSessionId() {
    return this.sessionId
  }

  async loadHistoryFromDB() {
    if (!this.dbEnabled) return

    try {
      const dbMessages = await getSessionMessages(this.sessionId, 50)

      // Convert DB messages to Anthropic format
      for (const msg of dbMessages) {
        if (msg.role === 'user') {
          this.messages.push({ role: 'user', content: msg.content })
        } else if (msg.role === 'assistant' || msg.role === 'agent') {
          this.messages.push({ role: 'assistant', content: msg.content })
        }
        // System/tool messages are handled separately
      }

      console.log(`[ClaudeSession] Loaded ${dbMessages.length} messages from DB for session ${this.sessionId}`)
    } catch (err) {
      console.error('[ClaudeSession] Failed to load history from DB:', err)
    }
  }

  private async saveMessageToDB(message: {
    role: 'user' | 'assistant' | 'system' | 'agent'
    content: string
    agentId?: string
    agentName?: string
    agentAvatar?: string
    toolName?: string
    toolInput?: Record<string, unknown>
    toolResult?: string
    isError?: boolean
  }) {
    if (!this.dbEnabled) return

    try {
      // Ensure toolInput is properly serialized to JSON string
      const serializedMessage = {
        ...message,
        toolInput: message.toolInput ? JSON.stringify(message.toolInput) : undefined
      }
      await saveMessage({
        sessionId: this.sessionId,
        ...serializedMessage,
      })
    } catch (err) {
      console.error('[ClaudeSession] Failed to save message to DB:', err)
    }
  }

  getMessages() {
    return this.messages
  }

  async submitUserMessage(content: string, systemPrompt?: string, agentInfo?: { agentId?: string; agentName?: string; agentAvatar?: string }) {
    console.log('[ClaudeSession] submitUserMessage:', content.slice(0, 100))

    // Check if this is the first user message (for title generation)
    const isFirstMessage = this.messages.filter(m => m.role === 'user').length === 0

    // Fetch relevant memories if userId is available
    let enhancedSystemPrompt = systemPrompt
    if (this.userId && this.dbEnabled) {
      try {
        const relevant = await findRelevantMemories(this.userId, content, 3)
        if (relevant.length > 0) {
          this.relevantMemories = relevant.map(m => ({ name: m.name, content: m.content }))
          const memoryPrompt = generateMemorySystemPrompt(this.relevantMemories)
          enhancedSystemPrompt = systemPrompt
            ? `${systemPrompt}\n\n${memoryPrompt}`
            : memoryPrompt
          console.log(`[ClaudeSession] Added ${relevant.length} relevant memories to context`)
        }
      } catch (err) {
        console.error('[ClaudeSession] Failed to fetch relevant memories:', err)
      }
    }

    // Add to memory
    this.messages.push({ role: 'user', content })

    // Save to database
    await this.saveMessageToDB({
      role: 'user',
      content,
      agentId: agentInfo?.agentId,
      agentName: agentInfo?.agentName,
      agentAvatar: agentInfo?.agentAvatar,
    })

    // Generate title if this is the first message
    if (isFirstMessage && this.dbEnabled) {
      this.generateTitle(content).catch(err => {
        console.error('[ClaudeSession] Failed to generate title:', err)
      })
    }

    try {
      await this.runLoop(enhancedSystemPrompt, agentInfo)
      // Try to extract memory after conversation completes
      await this.tryExtractMemory()
    } catch (err) {
      console.error('[ClaudeSession] submitUserMessage error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      await this.onEvent({ type: 'error', message: `处理失败: ${msg}` })
    }
  }

  // Try to extract memory from recent conversation
  private async tryExtractMemory() {
    if (!this.userId || !this.dbEnabled) return

    // Get last 6 messages
    const recentMessages = this.messages.slice(-6)
    if (recentMessages.length < 2) return

    const conversation = recentMessages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string'
        ? m.content
        : JSON.stringify(m.content)
    }))

    try {
      const result = await extractMemoryFromConversation(this.userId, conversation)
      if (result.shouldExtract) {
        console.log(`[ClaudeSession] Extracted memory: ${result.name}`)
        // Sync to file system
        await syncMemoriesToFiles(this.userId)
        // Notify client about extracted memory
        await this.onEvent({
          type: 'memory_extracted',
          memory: {
            name: result.name,
            description: result.description,
            type: result.type,
            content: result.content,
            tags: result.tags
          }
        } as any)
      }
    } catch (err) {
      console.error('[ClaudeSession] Failed to extract memory:', err)
    }
  }

  private async generateTitle(content: string) {
    try {
      // Use a simple heuristic to generate title from first message
      // For Chinese content, extract key nouns/phrases
      let title = content.trim()

      // Limit length (max 20 chars)
      if (title.length > 20) {
        title = title.substring(0, 20) + '...'
      }

      // Update database
      await updateSessionTitle(this.sessionId, title)
      console.log(`[ClaudeSession] Generated title for session ${this.sessionId}: ${title}`)

      // Notify frontend
      await this.onEvent({ type: 'title_updated', title } as any)
    } catch (err) {
      console.error('[ClaudeSession] Error generating title:', err)
    }
  }

  resolvePermission(allowed: boolean) {
    if (this.pendingPermission) {
      this.pendingPermission.resolve(allowed)
      this.pendingPermission = null
    }
  }

  resolveQuestion(answer: string) {
    if (this.pendingQuestion) {
      this.pendingQuestion.resolve(answer)
      this.pendingQuestion = null
    }
  }

  private async runLoop(systemPrompt?: string, agentInfo?: { agentId?: string; agentName?: string; agentAvatar?: string }) {
    try {
      for (let turn = 0; turn < this.maxTurns; turn++) {
        console.log(`[ClaudeSession] Turn ${turn + 1}, calling API...`)

        let response: Anthropic.Messages.Message
        try {
          response = await this.anthropic.messages.create({
            model: this.model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: this.messages,
            tools: [...TOOL_DEFINITIONS, ...getPluginToolDefinitions()],
          })
        } catch (err: any) {
          console.error('[ClaudeSession] API Error:', err)
          // Try to extract detailed error info
          const errorMessage = err?.error?.message || err?.message || String(err)
          const errorType = err?.error?.type || err?.type || 'unknown'
          throw new Error(`API Error (${errorType}): ${errorMessage}`)
        }

        console.log(`[ClaudeSession] API response received, stop_reason: ${response.stop_reason}`)

        // Record assistant message
        this.messages.push({
          role: 'assistant',
          content: response.content,
        })

        // Extract text content and save to DB
        const textBlocks = response.content.filter((c) => c.type === 'text')
        const fullText = textBlocks.map((c) => c.text).join('')

        // Save assistant message to database
        if (fullText) {
          await this.saveMessageToDB({
            role: 'assistant',
            content: fullText,
            agentId: agentInfo?.agentId,
            agentName: agentInfo?.agentName,
            agentAvatar: agentInfo?.agentAvatar,
          })
        }

        for (const block of textBlocks) {
          await this.onEvent({ type: 'assistant_text', text: block.text })
        }

        const toolUseBlocks = response.content.filter((c) => c.type === 'tool_use')

        if (response.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) {
          await this.onEvent({ type: 'done' })
          return
        }

        // Execute tools
        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []

        for (const toolUse of toolUseBlocks) {
          await this.onEvent({
            type: 'assistant_tool_use',
            name: toolUse.name,
            input: toolUse.input as Record<string, unknown>,
          })

          // Save tool use to database (formatted same as frontend)
          await this.saveMessageToDB({
            role: 'system',
            content: formatToolUse(toolUse.name, toolUse.input as Record<string, unknown>),
            agentId: agentInfo?.agentId,
            agentName: agentInfo?.agentName,
            agentAvatar: agentInfo?.agentAvatar,
            toolName: toolUse.name,
            toolInput: toolUse.input as Record<string, unknown>,
          })

          const result = await this.executeTool(
            toolUse.name,
            toolUse.input as Record<string, unknown>
          )

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result.result,
            is_error: result.isError,
          })

          // Save tool result to database (formatted same as frontend)
          await this.saveMessageToDB({
            role: 'system',
            content: formatToolResult(toolUse.name, result.result, result.isError),
            agentId: agentInfo?.agentId,
            agentName: agentInfo?.agentName,
            agentAvatar: agentInfo?.agentAvatar,
            toolName: toolUse.name,
            toolResult: result.result,
            isError: result.isError,
          })
        }

        this.messages.push({ role: 'user', content: toolResults })
      }

      await this.onEvent({ type: 'error', message: 'Reached maximum number of turns' })
    } catch (err) {
      const errorDetails = err instanceof Error ? err.message : String(err)
      console.error('[ClaudeSession] runLoop error:', errorDetails, err)
      await this.onEvent({
        type: 'error',
        message: `AI 调用失败: ${errorDetails}`,
      })
    }
  }

  private async executeTool(
    name: string,
    input: Record<string, unknown>
  ): Promise<{ result: string; isError?: boolean }> {
    // Permission gate for sensitive tools
    if (isSensitiveTool(name)) {
      const allowed = await this.requestPermission(name, input)
      if (!allowed) {
        return { result: 'User denied permission for this tool call.', isError: true }
      }
    }

    try {
      let result = ''
      switch (name) {
        case 'bash': {
          const cmd = String(input.command || '')
          const timeout = typeof input.timeout === 'number' ? input.timeout : 120000
          result = await callBash(cmd, timeout)
          break
        }
        case 'read_file': {
          result = await callFileRead(String(input.file_path || ''))
          break
        }
        case 'write_file': {
          result = await callFileWrite(
            String(input.file_path || ''),
            String(input.content || '')
          )
          break
        }
        case 'edit_file': {
          result = await callFileEdit(
            String(input.file_path || ''),
            String(input.old_string || ''),
            String(input.new_string || '')
          )
          break
        }
        case 'glob': {
          result = await callGlob(String(input.pattern || ''))
          break
        }
        case 'grep': {
          result = await callGrep(
            String(input.pattern || ''),
            input.path ? String(input.path) : undefined,
            input.output_mode ? String(input.output_mode) : undefined
          )
          break
        }
        case 'web_fetch': {
          result = await callWebFetch(String(input.url || ''))
          break
        }
        case 'web_search': {
          result = await callWebSearch(String(input.query || ''))
          break
        }
        case 'ask_user_question': {
          const answer = await this.askUserQuestion(
            String(input.question || ''),
            Array.isArray(input.options) ? input.options.map(String) : undefined
          )
          result = answer
          break
        }
        default: {
          // Try to execute as plugin tool
          const { executeToolByName } = await import('./pluginEngine')
          const pluginResult = await executeToolByName(name, input, {
            userId: this.userId || undefined,
            sessionId: this.sessionId,
          })

          if (pluginResult) {
            if (pluginResult.success) {
              result = typeof pluginResult.data === 'string'
                ? pluginResult.data
                : JSON.stringify(pluginResult.data, null, 2)
            } else {
              result = pluginResult.error || 'Plugin execution failed'
              await this.onEvent({ type: 'tool_result', name, result, isError: true })
              return { result, isError: true }
            }
          } else {
            result = `Tool "${name}" is not implemented yet.`
          }
        }
      }

      await this.onEvent({ type: 'tool_result', name, result, isError: false })
      // Truncate very long results for context window
      const maxLen = 30000
      return {
        result: result.length > maxLen ? result.slice(0, maxLen) + '\n... [truncated]' : result,
        isError: false,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await this.onEvent({ type: 'tool_result', name, result: msg, isError: true })
      return { result: msg, isError: true }
    }
  }

  private async requestPermission(toolName: string, toolInput: Record<string, unknown>): Promise<boolean> {
    return new Promise((resolve) => {
      const request: PermissionRequest = {
        id: Math.random().toString(36).substring(2, 15),
        type: 'tool_permission',
        toolName,
        toolInput,
        message: `请求执行工具 **${toolName}**，是否允许？`,
      }
      this.pendingPermission = { resolve, request }
      this.onEvent({ type: 'permission_request', request })
    })
  }

  private async askUserQuestion(question: string, options?: string[]): Promise<string> {
    return new Promise((resolve) => {
      this.pendingQuestion = { resolve }
      this.onEvent({ type: 'ask_user_question', question, options })
    })
  }
}
