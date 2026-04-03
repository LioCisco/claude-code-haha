import Anthropic from '@anthropic-ai/sdk'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile, readdir, stat } from 'fs/promises'
import { glob } from 'glob'

const execAsync = promisify(exec)

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

  constructor(options: {
    apiKey: string
    baseURL?: string
    model?: string
    onEvent: (event: ChatEvent) => void | Promise<void>
  }) {
    this.anthropic = new Anthropic({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    })
    this.model = options.model || 'kimi-k2.5'
    this.onEvent = options.onEvent
  }

  getMessages() {
    return this.messages
  }

  async submitUserMessage(content: string, systemPrompt?: string) {
    console.log('[ClaudeSession] submitUserMessage:', content.slice(0, 100))
    this.messages.push({ role: 'user', content })
    try {
      await this.runLoop(systemPrompt)
    } catch (err) {
      console.error('[ClaudeSession] submitUserMessage error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      await this.onEvent({ type: 'error', message: `处理失败: ${msg}` })
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

  private async runLoop(systemPrompt?: string) {
    try {
      for (let turn = 0; turn < this.maxTurns; turn++) {
        console.log(`[ClaudeSession] Turn ${turn + 1}, calling API...`)

        const response = await this.anthropic.messages.create({
          model: this.model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: this.messages,
          tools: TOOL_DEFINITIONS,
        }).catch((err) => {
          console.error('[ClaudeSession] API Error:', err)
          // Try to extract detailed error info
          const errorMessage = err?.error?.message || err?.message || String(err)
          const errorType = err?.error?.type || err?.type || 'unknown'
          throw new Error(`API Error (${errorType}): ${errorMessage}`)
        })

        console.log(`[ClaudeSession] API response received, stop_reason: ${response.stop_reason}`)

        // Record assistant message
        this.messages.push({
          role: 'assistant',
          content: response.content,
        })

        const textBlocks = response.content.filter((c) => c.type === 'text')
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
        default:
          result = `Tool "${name}" is not implemented yet.`
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
