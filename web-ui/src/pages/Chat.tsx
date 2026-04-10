import { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Send,
  Paperclip,
  Bot,
  User,
  Sparkles,
  Plus,
  Settings,
  ShieldAlert,
  CheckCircle,
  XCircle,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  Brain,
  Lightbulb,
  Puzzle,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useChatStore } from '@/store/useChatStore'
import { cn, formatTime } from '@/lib/utils'
import { getChatSessions, createChatSession, updateChatSession, deleteChatSession } from '@/api/chat'
import { getRelevantMemories } from '@/api/memories'
import type { Memory } from '@/api/memories'
import { pluginApi, type Plugin, type PluginTool } from '@/api/plugins'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type PermissionRequest = {
  id: string
  type: 'tool_permission'
  toolName: string
  toolInput: Record<string, unknown>
  message: string
}

type ChatEvent =
  | { type: 'connected'; message: string; sessionId?: string }
  | { type: 'history_loaded'; messages: Array<{ id: string; content: string; role: string; agentId?: string; agentName?: string; agentAvatar?: string; timestamp: string }> }
  | { type: 'assistant_text'; text: string }
  | { type: 'assistant_tool_use'; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: string; isError?: boolean }
  | { type: 'permission_request'; request: PermissionRequest }
  | { type: 'ask_user_question'; question: string; options?: string[] }
  | { type: 'done' }
  | { type: 'error'; message: string }
  | { type: 'title_updated'; title: string }
  | { type: 'memory_extracted'; memory: { name: string; description: string; type: string; content: string; tags: string[] } }
  | { type: 'pong' }
  // Skill events
  | { type: 'skill_invoke'; skill: string; args?: string; status: 'running' | 'completed' | 'error' }
  | { type: 'skill_progress'; skill: string; message: string }
  | { type: 'skill_result'; skill: string; result: string; isError?: boolean }

// Slash commands definition
interface SlashCommand {
  command: string
  description: string
  usage?: string
  icon?: string
}

const SLASH_COMMANDS: SlashCommand[] = [
  { command: '/skill', description: '执行技能', usage: '/skill <技能名> [参数]', icon: '⚡' },
  { command: '/model', description: '切换AI模型', usage: '/model <模型名>', icon: '🤖' },
  { command: '/agent', description: '切换智能体', usage: '/agent <智能体名>', icon: '👤' },
  { command: '/social', description: '发布社媒内容', usage: '/social <平台> <主题> [--image]', icon: '📱' },
  { command: '/clear', description: '清空当前对话', usage: '/clear', icon: '🧹' },
  { command: '/help', description: '查看帮助', usage: '/help [命令]', icon: '❓' },
]

// Singleton WebSocket manager outside React
class WsManager {
  private ws: WebSocket | null = null
  private listeners: Array<(data: ChatEvent) => void> = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private _isConnecting = false
  private currentSessionId: string | null = null
  private pendingMessages: unknown[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private baseReconnectDelay = 1000

  connect(sessionId?: string) {
    // If already connecting to the same session, don't reconnect
    if (this._isConnecting && this.currentSessionId === sessionId) {
      console.log('[WsManager] Already connecting to session:', sessionId)
      return
    }

    // If connected to a different session, disconnect first
    if (this.ws?.readyState === WebSocket.OPEN && this.currentSessionId !== sessionId) {
      console.log('[WsManager] Switching from session', this.currentSessionId, 'to', sessionId)
      this.disconnect(false) // Don't clear reconnect timer when switching sessions
    }

    // If already connected to the same session, do nothing
    if (this.ws?.readyState === WebSocket.OPEN && this.currentSessionId === sessionId) {
      console.log('[WsManager] Already connected to session:', sessionId)
      return
    }

    this._isConnecting = true
    this.currentSessionId = sessionId || null

    console.log('[WsManager] Connecting... sessionId:', sessionId)
    // Get token from localStorage
    let token: string | null = null
    try {
      const stored = localStorage.getItem('accio-auth-store')
      if (stored) {
        const parsed = JSON.parse(stored)
        token = parsed.state?.token || null
      }
    } catch {
      // ignore
    }
    const wsUrl = `ws://localhost:8080/ws/chat?${sessionId ? `sessionId=${sessionId}&` : ''}${token ? `token=${token}` : ''}`
    const ws = new WebSocket(wsUrl)
    this.ws = ws

    ws.onopen = () => {
      console.log('[WsManager] Connected, sessionId:', sessionId)
      this.isConnecting = false
      this.reconnectAttempts = 0 // Reset reconnect attempts on successful connection

      // Start ping to keep connection alive
      this.startPing()

      // Send any pending messages
      while (this.pendingMessages.length > 0) {
        const msg = this.pendingMessages.shift()
        if (msg) this.send(msg)
      }
    }

    ws.onmessage = (event) => {
      const data: ChatEvent = JSON.parse(event.data)
      console.log('[WsManager] Received:', data.type)
      this.listeners.forEach(fn => fn(data))
    }

    ws.onerror = (err) => {
      console.error('[WsManager] Error:', err)
      this.isConnecting = false
    }

    ws.onclose = (event) => {
      console.log('[WsManager] Closed, code:', event.code, 'reason:', event.reason)
      this.stopPing()
      this.ws = null
      this.isConnecting = false

      // Don't reconnect if explicitly closed (code 1000 or 1001)
      if (event.code === 1000 || event.code === 1001) {
        console.log('[WsManager] Explicit close, not reconnecting')
        return
      }

      // Auto reconnect only if we have a current session and no timer
      if (this.currentSessionId && !this.reconnectTimer) {
        this.scheduleReconnect()
      }
    }
  }

  private startPing() {
    this.stopPing()
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Ping every 30 seconds
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WsManager] Max reconnect attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    )
    console.log(`[WsManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect(this.currentSessionId || undefined)
    }, delay)
  }

  disconnect(clearSession = true) {
    this.stopPing()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    // Close WebSocket with explicit code to prevent auto-reconnect
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect')
      this.ws = null
    }

    if (clearSession) {
      this.currentSessionId = null
      this.reconnectAttempts = 0
    }
    this.pendingMessages = []
  }

  send(msg: unknown): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
      return true
    }
    // Queue message if not connected
    this.pendingMessages.push(msg)
    console.log('[WsManager] Message queued, ws state:', this.ws?.readyState)
    return false
  }

  subscribe(fn: (data: ChatEvent) => void) {
    this.listeners.push(fn)
    return () => {
      const idx = this.listeners.indexOf(fn)
      if (idx > -1) this.listeners.splice(idx, 1)
    }
  }

  get isOpen() {
    return this.ws?.readyState === WebSocket.OPEN
  }

  get connecting() {
    return this._isConnecting
  }

  get sessionId() {
    return this.currentSessionId
  }
}

const wsManager = new WsManager()

export default function Chat() {
  const navigate = useNavigate()
  const {
    messages,
    agents,
    activeAgents,
    isTyping,
    currentAgent,
    sessions,
    currentSessionId,
    addMessage,
    setTyping,
    setCurrentAgent,
    toggleAgent,
    setSessions,
    setCurrentSessionId,
    addSession,
    removeSession,
    updateSessionTitle,
    clearMessages,
  } = useChatStore()

  const [input, setInput] = useState('')
  const [permission, setPermission] = useState<PermissionRequest | null>(null)
  const [question, setQuestion] = useState<{ question: string; options?: string[] } | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  // Slash command completion state
  const [showSlashCommands, setShowSlashCommands] = useState(false)
  const [slashCommandFilter, setSlashCommandFilter] = useState('')
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)
  const slashCommandRef = useRef<HTMLDivElement>(null)
  const pluginPanelRef = useRef<HTMLDivElement>(null)
  const [relevantMemories, setRelevantMemories] = useState<Array<{ id: string; name: string; type: string; content: string; relevance: number }>>([])
  const [showMemories, setShowMemories] = useState(false)
  const [extractedMemory, setExtractedMemory] = useState<Memory | null>(null)
  // Skill invocation state
  const [activeSkills, setActiveSkills] = useState<Map<string, {
    skill: string
    args?: string
    status: 'running' | 'completed' | 'error'
    result?: string
  }>>(new Map())
  // Plugin state
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [activePlugins, setActivePlugins] = useState<Set<string>>(new Set())
  const [showPluginPanel, setShowPluginPanel] = useState(false)
  const [isLoadingPlugins, setIsLoadingPlugins] = useState(false)
  const streamingMsgIdRef = useRef<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load all sessions, agents, and plugins on mount
  useEffect(() => {
    loadSessions()
    loadPlugins()
    // Load agents from API
    const { loadAgents } = useChatStore.getState()
    loadAgents()

    // Restore WebSocket connection if there's a currentSessionId (page refresh case)
    const { currentSessionId: savedSessionId } = useChatStore.getState()
    if (savedSessionId && !wsManager.isOpen) {
      console.log('[Chat] Restoring connection after page refresh, session:', savedSessionId)
      // Small delay to let the store fully hydrate
      setTimeout(() => {
        wsManager.connect(savedSessionId)
        loadSessionMessages(savedSessionId)
      }, 100)
    }

    // Handle page visibility change (tab switch back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const { currentSessionId: currentId } = useChatStore.getState()
        if (currentId && !wsManager.isOpen) {
          console.log('[Chat] Reconnecting after tab visibility change')
          wsManager.connect(currentId)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Connect WebSocket and load messages when session changes
  useEffect(() => {
    if (currentSessionId && wsManager.sessionId !== currentSessionId) {
      // Only disconnect if we're actually switching to a different session
      wsManager.disconnect(false) // false = keep session tracking for reconnect
      // Connect with the new session ID
      wsManager.connect(currentSessionId)
    }
    // Load messages via REST API (more reliable than WebSocket for history)
    if (currentSessionId) {
      loadSessionMessages(currentSessionId)
    }
  }, [currentSessionId])

  // Fetch relevant memories when input changes
  const fetchRelevantMemories = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 10) {
      setRelevantMemories([])
      return
    }
    try {
      const memories = await getRelevantMemories(query, 3)
      setRelevantMemories(memories)
    } catch (error) {
      console.error('Failed to fetch relevant memories:', error)
    }
  }, [])

  // Debounced memory fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input.trim().length >= 10) {
        fetchRelevantMemories(input)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [input, fetchRelevantMemories])

  // Close plugin panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pluginPanelRef.current && !pluginPanelRef.current.contains(event.target as Node)) {
        setShowPluginPanel(false)
      }
    }
    if (showPluginPanel) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPluginPanel])

  // Setup WebSocket listeners
  useEffect(() => {
    const unsubscribe = wsManager.subscribe((data) => {
      const store = useChatStore.getState()

      switch (data.type) {
        case 'connected':
          console.log('[Chat] Connected to server')
          setConnectionStatus('connected')
          if (data.sessionId) {
            store.setCurrentSessionId(data.sessionId)
          }
          // Request history after connection
          wsManager.send({ type: 'load_history' })
          break
        case 'history_loaded': {
          // Only log, don't update store - we use REST API for loading history
          // This prevents race conditions between WebSocket and REST
          console.log('[Chat] WebSocket history loaded (ignored, using REST):', data.messages?.length || 0, 'messages')
          break
        }
        case 'assistant_text': {
          store.setTyping(true)
          if (streamingMsgIdRef.current) {
            const currentMsg = store.messages.find(m => m.id === streamingMsgIdRef.current)
            if (currentMsg) {
              store.updateMessage(streamingMsgIdRef.current, {
                content: currentMsg.content + data.text,
              })
            }
          } else {
            const newId = Math.random().toString(36).substring(2, 15)
            streamingMsgIdRef.current = newId
            store.addMessage({
              id: newId,
              content: data.text,
              role: 'assistant',
              agentId: store.currentAgent?.id,
              agentName: store.currentAgent?.name,
              agentAvatar: store.currentAgent?.avatar,
            })
          }
          break
        }
        case 'assistant_tool_use': {
          store.setTyping(true)
          streamingMsgIdRef.current = null
          store.addMessage({
            content: formatToolUse(data.name, data.input),
            role: 'assistant',
            agentId: store.currentAgent?.id,
            agentName: store.currentAgent?.name,
            agentAvatar: store.currentAgent?.avatar,
          })
          break
        }
        case 'tool_result': {
          streamingMsgIdRef.current = null
          store.addMessage({
            content: formatToolResult(data.name, data.result, data.isError),
            role: 'system',
          })
          break
        }
        case 'permission_request': {
          setPermission(data.request)
          store.setTyping(false)
          streamingMsgIdRef.current = null
          break
        }
        case 'ask_user_question': {
          setQuestion({ question: data.question, options: data.options })
          store.setTyping(false)
          streamingMsgIdRef.current = null
          break
        }
        case 'done': {
          store.setTyping(false)
          streamingMsgIdRef.current = null
          // Refresh sessions to update timestamp
          loadSessions()
          // Note: Memory extraction is now handled server-side
          break
        }
        case 'title_updated': {
          // Update session title in store
          const sessionId = store.currentSessionId
          if (sessionId && data.title) {
            store.updateSessionTitle(sessionId, data.title)
            console.log('[Chat] Title updated:', data.title)
          }
          break
        }

        case 'memory_extracted': {
          // Show extracted memory notification
          if (data.memory) {
            setExtractedMemory({
              id: 'temp-' + Date.now(),
              name: data.memory.name,
              description: data.memory.description,
              type: data.memory.type as any,
              content: data.memory.content,
              tags: data.memory.tags,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            // Clear after 5 seconds
            setTimeout(() => setExtractedMemory(null), 5000)
          }
          break
        }

        case 'skill_invoke': {
          setActiveSkills(prev => {
            const next = new Map(prev)
            next.set(data.skill, {
              skill: data.skill,
              args: data.args,
              status: data.status,
            })
            return next
          })

          // Add skill invocation message
          if (data.status === 'running') {
            store.addMessage({
              content: `🔧 使用 Skill: **${data.skill}**${data.args ? ` (${data.args})` : ''}`,
              role: 'system',
            })
          }
          break
        }

        case 'skill_progress': {
          // Update skill progress
          setActiveSkills(prev => {
            const next = new Map(prev)
            const existing = next.get(data.skill)
            if (existing) {
              next.set(data.skill, { ...existing, status: 'running' })
            }
            return next
          })
          break
        }

        case 'skill_result': {
          setActiveSkills(prev => {
            const next = new Map(prev)
            next.delete(data.skill)
            return next
          })

          // Add result message
          store.addMessage({
            content: data.isError
              ? `❌ Skill "${data.skill}" 执行失败: ${data.result}`
              : `✅ Skill "${data.skill}" 执行完成`,
            role: 'system',
          })
          break
        }

        case 'error': {
          store.addMessage({
            content: `⚠️ ${data.message}`,
            role: 'assistant',
          })
          store.setTyping(false)
          streamingMsgIdRef.current = null
          setConnectionStatus('disconnected')
          break
        }

        case 'pong': {
          // Connection is alive, do nothing
          break
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Load all sessions
  const loadSessions = async () => {
    try {
      const sessions = await getChatSessions()
      // Always use server data, replacing local cache
      setSessions(sessions)
    } catch (err) {
      console.error('Failed to load sessions:', err)
      setSessions([])
    } finally {
      setIsLoadingSessions(false)
    }
  }

  // Load plugins
  const loadPlugins = async () => {
    setIsLoadingPlugins(true)
    try {
      const response = await pluginApi.getAll()
      if (response.success) {
        setPlugins(response.plugins)
        // Set initially active plugins (enabled ones)
        const active = new Set<string>(response.plugins.filter(p => p.isEnabled).map(p => p.id))
        setActivePlugins(active)
      }
    } catch (err) {
      console.error('Failed to load plugins:', err)
    } finally {
      setIsLoadingPlugins(false)
    }
  }

  // Toggle plugin active state
  const togglePlugin = async (pluginId: string, enabled: boolean) => {
    try {
      const response = await pluginApi.toggle(pluginId, enabled)
      if (response.success) {
        setActivePlugins(prev => {
          const next = new Set(prev)
          if (enabled) {
            next.add(pluginId)
          } else {
            next.delete(pluginId)
          }
          return next
        })
      }
    } catch (err) {
      console.error('Failed to toggle plugin:', err)
    }
  }

  // Load messages for a specific session
  const loadSessionMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/history/${sessionId}`)
      const data = await res.json()

      // Always clear messages first to avoid duplicates
      clearMessages()

      if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        // Deduplicate messages by id
        const seenIds = new Set<string>()
        const uniqueMessages = data.messages.filter((msg: any) => {
          if (!msg.id || seenIds.has(msg.id)) return false
          seenIds.add(msg.id)
          return true
        })
        // Add messages in batch
        for (const msg of uniqueMessages) {
          addMessage({
            id: msg.id,
            content: msg.content,
            role: msg.role,
            agentId: msg.agentId,
            agentName: msg.agentName,
            agentAvatar: msg.agentAvatar,
          })
        }
      }
    } catch (err) {
      console.error('Failed to load session messages:', err)
      clearMessages()
    }
  }

  // Handle session switch
  const handleSwitchSession = async (sessionId: string) => {
    if (sessionId === currentSessionId) return
    console.log('[Chat] Switching to session:', sessionId)

    // Find the session to get agent info
    const session = sessions.find(s => s.id === sessionId)
    if (session?.agentId) {
      const agent = agents.find(a => a.id === session.agentId)
      if (agent) {
        setCurrentAgent(agent)
      }
    }

    setCurrentSessionId(sessionId)
    // Load messages immediately
    await loadSessionMessages(sessionId)
  }

  // Create new session
  const createNewSession = async () => {
    try {
      const currentAgent = useChatStore.getState().currentAgent
      const session = await createChatSession({
        title: `新对话 ${new Date().toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        agentId: currentAgent?.id,
        agentName: currentAgent?.name,
        agentAvatar: currentAgent?.avatar,
      })
      addSession({
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt,
        agentId: session.agentId,
        agentName: session.agentName,
        agentAvatar: session.agentAvatar,
      })
      setCurrentSessionId(session.id)
      clearMessages()

      // Connect WebSocket immediately for the new session
      console.log('[Chat] Connecting WebSocket for new session:', session.id)
      wsManager.connect(session.id)
    } catch (err) {
      console.error('Failed to create session:', err)
      alert('创建会话失败: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  // Delete session
  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确定要删除这个对话吗？')) return

    try {
      await deleteChatSession(sessionId)
      removeSession(sessionId)
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null)
        clearMessages()
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  // Start editing session title
  const startEditingTitle = (session: typeof sessions[0], e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingSessionId(session.id)
    setEditingTitle(session.title)
  }

  // Save session title
  const saveSessionTitle = async (sessionId: string) => {
    try {
      await updateChatSession(sessionId, editingTitle)
      updateSessionTitle(sessionId, editingTitle)
      setEditingSessionId(null)
    } catch (err) {
      console.error('Failed to update title:', err)
    }
  }

  const respondPermission = useCallback((allowed: boolean) => {
    if (wsManager.send({ type: 'permission_response', allowed })) {
      setPermission(null)
      setTyping(true)
    }
  }, [setTyping])

  const respondQuestion = useCallback((answer: string) => {
    if (wsManager.send({ type: 'question_response', answer })) {
      setQuestion(null)
      setTyping(true)
    }
  }, [setTyping])

  const handleSend = useCallback(async () => {
    if (!input.trim()) return

    // If no session, create one first
    let sessionId = currentSessionId
    if (!sessionId) {
      await createNewSession()
      // Get the newly created session ID from store
      sessionId = useChatStore.getState().currentSessionId
      if (!sessionId) {
        addMessage({ content: '⚠️ 创建会话失败，请重试', role: 'assistant' })
        return
      }
      // Wait for WebSocket to connect (give it more time)
      let attempts = 0
      while (!wsManager.isOpen && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }
    }

    // Ensure WebSocket is connected before sending
    if (!wsManager.isOpen) {
      console.log('[Chat] WebSocket not connected, attempting to reconnect...')
      setConnectionStatus('connecting')
      wsManager.connect(sessionId!)

      // Wait a bit for connection
      await new Promise(resolve => setTimeout(resolve, 500))

      if (!wsManager.isOpen) {
        addMessage({ content: '⚠️ 连接服务器失败，请检查网络后重试', role: 'assistant' })
        setConnectionStatus('disconnected')
        return
      }
    }

    const trimmed = input.trim()
    addMessage({ content: input, role: 'user' })
    setInput('')
    setTyping(true)

    // Handle /social skill command locally
    const socialMatch = trimmed.match(/^\/social\s+(\S+)\s+(.+)$/i)
    if (socialMatch) {
      const [, platform, rest] = socialMatch
      const topic = rest.replace(/--image|--video|--confirm|--style\s+\S+/g, '').trim()
      const needImage = rest.includes('--image')
      const needVideo = rest.includes('--video')
      const styleMatch = rest.match(/--style\s+(\S+)/)
      const style = styleMatch ? styleMatch[1] : undefined

      try {
        const res = await fetch('http://localhost:8080/api/skills/social-post/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ params: { platform, topic, style, needImage, needVideo } }),
        })
        const data = await res.json()
        if (data.success && data.result) {
          const r = data.result as {
            platform: string
            title: string
            body: string
            tags: string[]
            images: string[]
            videos: string[]
            estimatedReach: number
          }
          const content = `【社媒内容发布 - ${r.platform}】\n\n📌 标题：${r.title}\n\n✍️ 正文：\n${r.body}\n\n🏷️ 标签：${r.tags.join(' ')}\n\n${r.images.length ? `🖼️ 配图：${r.images[0]}\n` : ''}${r.videos.length ? `🎬 视频：${r.videos[0]}\n` : ''}\n📈 预估曝光：${r.estimatedReach.toLocaleString()}`
          addMessage({ content, role: 'agent', agentId: 'marketing-agent', agentName: '营销专员', agentAvatar: '📢' })
        } else {
          addMessage({ content: `发布失败：${data.message || '未知错误'}`, role: 'assistant' })
        }
      } catch (err) {
        addMessage({ content: `调用社媒发布技能失败：${err instanceof Error ? err.message : '网络错误'}`, role: 'assistant' })
      }
      setTyping(false)
      return
    }

    // Send via WebSocket
    console.log('[Chat] Sending message:', trimmed.slice(0, 50))
    if (!wsManager.send({ type: 'user_message', content: trimmed, agentId: currentAgent?.id })) {
      addMessage({ content: '⚠️ 连接失败，请刷新页面重试', role: 'assistant' })
      setTyping(false)
    }
  }, [input, currentAgent, addMessage, setTyping, currentSessionId])

  // Handle slash command selection
  const handleSelectCommand = (command: SlashCommand) => {
    setInput(command.usage || command.command + ' ')
    setShowSlashCommands(false)
    setSlashCommandFilter('')
  }

  // Filter commands based on input
  const filteredCommands = SLASH_COMMANDS.filter(cmd => {
    if (!slashCommandFilter) return true
    const filter = slashCommandFilter.toLowerCase()
    return cmd.command.toLowerCase().includes(filter) ||
           cmd.description.toLowerCase().includes(filter)
  })

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle slash command navigation
    if (showSlashCommands) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedCommandIndex(prev =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          )
          return
        case 'ArrowUp':
          e.preventDefault()
          setSelectedCommandIndex(prev => prev > 0 ? prev - 1 : 0)
          return
        case 'Tab':
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedCommandIndex]) {
            handleSelectCommand(filteredCommands[selectedCommandIndex])
          }
          return
        case 'Escape':
          e.preventDefault()
          setShowSlashCommands(false)
          return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Handle input change for slash commands
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInput(value)

    // Check for slash command
    if (value.startsWith('/')) {
      const match = value.match(/^\/([a-zA-Z]*)$/)
      if (match) {
        setShowSlashCommands(true)
        setSlashCommandFilter(match[1])
        setSelectedCommandIndex(0)
      } else if (value.includes(' ')) {
        // Hide commands once user starts typing arguments
        setShowSlashCommands(false)
      }
    } else {
      setShowSlashCommands(false)
    }
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-4 relative">
      {/* Sessions Sidebar */}
      <div className="w-64 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <button
            onClick={createNewSession}
            className="w-full py-2.5 px-4 bg-accio-600 hover:bg-accio-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新建对话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-5 h-5 border-2 border-accio-600 border-t-transparent rounded-full" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>暂无对话</p>
              <p className="text-xs mt-1">点击上方按钮开始</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSwitchSession(session.id)}
                className={cn(
                  'group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all',
                  currentSessionId === session.id
                    ? 'bg-accio-50 border border-accio-200'
                    : 'hover:bg-gray-50 border border-transparent'
                )}
              >
                <span className="text-lg flex-shrink-0" title={session.agentName || '默认助手'}>
                  {session.agentAvatar || '🤖'}
                </span>

                <div className="flex-1 min-w-0">
                  {editingSessionId === session.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveSessionTitle(session.id)
                          if (e.key === 'Escape') setEditingSessionId(null)
                        }}
                        onBlur={() => saveSessionTitle(session.id)}
                        autoFocus
                        className="flex-1 px-1.5 py-0.5 text-sm border border-accio-300 rounded focus:outline-none focus:ring-1 focus:ring-accio-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); saveSessionTitle(session.id); }}
                        className="p-1 text-accio-600 hover:bg-accio-100 rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className={cn(
                        'text-sm font-medium truncate',
                        currentSessionId === session.id ? 'text-accio-900' : 'text-gray-700'
                      )}>
                        {session.title}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        {session.agentName && <span>{session.agentName}</span>}
                        <span>{new Date(session.updatedAt).toLocaleDateString('zh-CN')}</span>
                      </p>
                    </>
                  )}
                </div>

                {editingSessionId !== session.id && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => startEditingTitle(session, e)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => deleteSession(session.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Chat Header */}
        <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {activeAgents.length > 0 ? (
                activeAgents.slice(0, 3).map((agentId) => {
                  const agent = agents.find((a) => a.id === agentId)
                  return agent ? (
                    <div
                      key={agent.id}
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-sm"
                      style={{ backgroundColor: agent.color + '20' }}
                    >
                      {agent.avatar}
                    </div>
                  ) : null
                })
              ) : (
                <div className="w-8 h-8 rounded-full bg-accio-100 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-accio-600" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                {activeAgents.length > 0 ? `AI 团队协作 (${activeAgents.length})` : '智能助手'}
              </h3>
              <p className="text-xs text-gray-500">
                {activeAgents.length > 0 ? '多智能体协同处理中' : '默认对话模式'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Plugin Selector */}
            <div className="relative">
              <button
                onClick={() => setShowPluginPanel(!showPluginPanel)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors",
                  activePlugins.size > 0
                    ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                <Zap className="w-4 h-4" />
                <span>插件 {activePlugins.size > 0 && `(${activePlugins.size})`}</span>
                {showPluginPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {/* Plugin Panel Dropdown */}
              {showPluginPanel && (
                <div ref={pluginPanelRef} className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-96 overflow-hidden">
                  <div className="p-3 border-b border-gray-100">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <Puzzle className="w-4 h-4 text-purple-600" />
                      插件管理
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">启用插件以增强 AI 能力</p>
                  </div>

                  <div className="max-h-72 overflow-y-auto">
                    {isLoadingPlugins ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full" />
                      </div>
                    ) : plugins.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm">
                        <Puzzle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>暂无插件</p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {plugins.map((plugin) => (
                          <div
                            key={plugin.id}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                              activePlugins.has(plugin.id)
                                ? "bg-purple-50 border border-purple-200"
                                : "hover:bg-gray-50 border border-transparent"
                            )}
                            onClick={() => togglePlugin(plugin.id, !activePlugins.has(plugin.id))}
                          >
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                              {plugin.icon === 'Zap' ? '⚡' :
                               plugin.icon === 'Search' ? '🔍' :
                               plugin.icon === 'Code' ? '💻' :
                               plugin.icon === 'GitBranch' ? '🔀' : '🧩'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-gray-900">{plugin.name}</span>
                                {plugin.isSystem && (
                                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">系统</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">{plugin.description}</p>
                            </div>
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                              activePlugins.has(plugin.id)
                                ? "bg-purple-600 border-purple-600"
                                : "border-gray-300"
                            )}>
                              {activePlugins.has(plugin.id) && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-3 border-t border-gray-100 bg-gray-50">
                    <button
                      onClick={() => navigate('/plugins')}
                      className="w-full py-2 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      管理插件
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Connection Status */}
            {connectionStatus !== 'connected' && currentSessionId && (
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                connectionStatus === 'connecting'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                )} />
                {connectionStatus === 'connecting' ? '连接中...' : '已断开'}
              </div>
            )}
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
              配置
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Active Skills */}
          {activeSkills.size > 0 && (
            <div className="px-4 py-2 space-y-2">
              {Array.from(activeSkills.values()).map((skill) => (
                <SkillInvokeCard
                  key={skill.skill}
                  skill={skill.skill}
                  args={skill.args}
                  status={skill.status}
                />
              ))}
            </div>
          )}

          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 bg-gradient-to-br from-accio-400 to-accio-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-accio-500/25">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">开始与您的AI团队协作</h3>
              <p className="text-gray-500 max-w-md mb-6">
                选择右侧的AI智能体加入对话，或直接在输入框中描述您的需求， 我们会自动分配合适的团队成员。
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['帮我找宠物家具的供应商', '生成10个夏季爆款产品创意', '/social 小红书 夏季护肤技巧 --style 专业 --image', '分析竞品定价策略'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-sm text-gray-600 rounded-full transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={cn('flex gap-3', message.role === 'user' ? 'flex-row-reverse' : '')}>
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  message.role === 'user' ? 'bg-ali-100' : message.role === 'agent' ? 'bg-accio-100' : 'bg-purple-100'
                )}
              >
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-ali-600" />
                ) : message.role === 'agent' ? (
                  <span className="text-sm">{message.agentAvatar}</span>
                ) : (
                  <Bot className="w-4 h-4 text-purple-600" />
                )}
              </div>

              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                  message.role === 'user'
                    ? 'bg-ali-500 text-white'
                    : message.role === 'system'
                    ? 'bg-yellow-50 text-yellow-900 border border-yellow-200'
                    : 'bg-gray-100 text-gray-900'
                )}
              >
                {message.role === 'agent' && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium" style={{ color: agents.find((a) => a.id === message.agentId)?.color }}>
                      {message.agentName}
                    </span>
                    <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
                  </div>
                )}
                <div className={cn(
                  "prose prose-sm max-w-none",
                  message.role === 'user' ? "prose-invert text-white" : "text-gray-900"
                )}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accio-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-accio-600" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-1">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Permission Request Overlay */}
        {permission && (
          <div className="absolute inset-x-0 bottom-24 mx-auto w-full max-w-2xl px-4 z-50">
            <div className="bg-white border border-orange-200 rounded-xl shadow-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">权限确认</h4>
                  <p className="text-sm text-gray-600 mt-1">请求执行工具 <code className="bg-gray-100 px-1 rounded">{permission.toolName}</code></p>
                  <pre className="mt-2 text-xs bg-gray-50 p-2 rounded max-h-32 overflow-auto">
                    {JSON.stringify(permission.toolInput, null, 2)}
                  </pre>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => respondPermission(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
                    >
                      <CheckCircle className="w-4 h-4" />
                      允许
                    </button>
                    <button
                      onClick={() => respondPermission(false)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg"
                    >
                      <XCircle className="w-4 h-4" />
                      拒绝
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Question Overlay */}
        {question && (
          <div className="absolute inset-x-0 bottom-24 mx-auto w-full max-w-2xl px-4 z-50">
            <div className="bg-white border border-blue-200 rounded-xl shadow-xl p-4">
              <h4 className="font-semibold text-gray-900">{question.question}</h4>
              <div className="flex flex-wrap gap-2 mt-3">
                {question.options && question.options.length > 0 ? (
                  question.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => respondQuestion(opt)}
                      className="px-3 py-1.5 bg-accio-100 hover:bg-accio-200 text-accio-800 text-sm rounded-lg"
                    >
                      {opt}
                    </button>
                  ))
                ) : (
                  <div className="flex gap-2 w-full">
                    <input
                      type="text"
                      autoFocus
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="输入回答..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') respondQuestion(e.currentTarget.value)
                      }}
                    />
                    <button
                      onClick={(e) => respondQuestion((e.currentTarget.previousElementSibling as HTMLInputElement)?.value || '')}
                      className="px-4 py-2 bg-accio-600 hover:bg-accio-700 text-white text-sm rounded-lg"
                    >
                      确认
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Relevant Memories */}
        {relevantMemories.length > 0 && (
          <div className="px-4 py-2 bg-violet-50 border-t border-violet-100">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-violet-600" />
              <span className="text-xs font-medium text-violet-700">相关记忆</span>
              <button
                onClick={() => setShowMemories(!showMemories)}
                className="text-xs text-violet-600 hover:text-violet-800 underline"
              >
                {showMemories ? '收起' : '展开'}
              </button>
            </div>
            {showMemories && (
              <div className="space-y-2">
                {relevantMemories.map((memory) => (
                  <div
                    key={memory.id}
                    className="p-2 bg-white rounded-lg border border-violet-200 text-xs"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{memory.name}</span>
                      <span className="text-violet-600">({Math.round(memory.relevance * 100)}% 匹配)</span>
                    </div>
                    <p className="text-gray-600 line-clamp-2">{memory.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Memory Extracted Notification */}
        {extractedMemory && (
          <div className="px-4 py-2 bg-green-50 border-t border-green-100">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-700">
                已自动保存记忆: <strong>{extractedMemory.name}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Active Plugins Bar */}
        {activePlugins.size > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 bg-purple-50/50">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs text-purple-600 font-medium flex-shrink-0">已启用插件:</span>
              {Array.from(activePlugins).map(pluginId => {
                const plugin = plugins.find(p => p.id === pluginId)
                if (!plugin) return null
                return (
                  <span
                    key={plugin.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-purple-200 rounded-full text-xs text-purple-700 flex-shrink-0"
                  >
                    <span>
                      {plugin.icon === 'Zap' ? '⚡' :
                       plugin.icon === 'Search' ? '🔍' :
                       plugin.icon === 'Code' ? '💻' :
                       plugin.icon === 'GitBranch' ? '🔀' : '🧩'}
                    </span>
                    {plugin.name}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100">
          <div className="relative">
            {/* Slash Command Suggestions */}
            {showSlashCommands && filteredCommands.length > 0 && (
              <div
                ref={slashCommandRef}
                className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto z-50"
              >
                <div className="p-2">
                  <div className="text-xs text-gray-500 px-3 py-1.5 border-b border-gray-100 mb-1">
                    可用命令
                  </div>
                  {filteredCommands.map((cmd, index) => (
                    <button
                      key={cmd.command}
                      onClick={() => handleSelectCommand(cmd)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors',
                        index === selectedCommandIndex
                          ? 'bg-accio-50 border-accio-200'
                          : 'hover:bg-gray-50'
                      )}
                    >
                      <span className="text-lg">{cmd.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-accio-700">
                            {cmd.command}
                          </span>
                          <span className="text-xs text-gray-500">
                            {cmd.description}
                          </span>
                        </div>
                        {cmd.usage && (
                          <div className="text-xs text-gray-400 mt-0.5 font-mono">
                            {cmd.usage}
                          </div>
                        )}
                      </div>
                      {index === selectedCommandIndex && (
                        <span className="text-xs text-accio-500">↵</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
                  <span>↑↓ 选择</span>
                  <span>Tab/Enter 确认</span>
                  <span>Esc 关闭</span>
                </div>
              </div>
            )}
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={currentSessionId ? "描述您的需求，AI团队将协同处理..." : "点击左侧「新建对话」开始聊天"}
              disabled={!currentSessionId}
              className="w-full pr-24 pl-12 py-4 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-accio-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              rows={2}
            />
            <button className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim() || !!permission || !!question || !currentSessionId}
              className="absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-accio-600 hover:bg-accio-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              发送
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400 text-center">
            {currentSessionId ? '按 Enter 发送，Shift + Enter 换行' : '请先创建或选择一个对话'}
          </p>
        </div>
      </div>

      {/* Agent Sidebar */}
      <div className="w-72 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Bot className="w-5 h-5 text-accio-600" />
            AI 团队成员
          </h3>
          <p className="text-xs text-gray-500 mt-1">选择要参与对话的智能体</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {agents.map((agent) => {
            const isActive = activeAgents.includes(agent.id)
            const isCurrent = currentAgent?.id === agent.id
            return (
              <div
                key={agent.id}
                onClick={() => setCurrentAgent(isCurrent ? null : agent)}
                className={cn(
                  'p-3 rounded-xl cursor-pointer transition-all',
                  isActive ? 'bg-accio-50 border border-accio-200' : 'bg-gray-50 hover:bg-gray-100 border border-transparent',
                  isCurrent && 'ring-2 ring-accio-500'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: agent.color + '20' }}>
                    {agent.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 text-sm">{agent.name}</h4>
                      {isActive && <span className="w-2 h-2 bg-accio-500 rounded-full animate-pulse" />}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{agent.role}</p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{agent.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {agent.skills.slice(0, 2).map((skill) => (
                      <span key={skill} className="text-xs px-2 py-0.5 bg-white rounded-full text-gray-600">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleAgent(agent.id)
                    }}
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                      isActive ? 'bg-accio-100 text-accio-700 hover:bg-accio-200' : 'bg-white text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {isActive ? '已加入' : '加入'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => navigate('/agents')}
            className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-accio-400 hover:text-accio-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            创建自定义智能体
          </button>
        </div>
      </div>
    </div>
  )
}

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

// Skill invocation card component
function SkillInvokeCard({ skill, args, status }: {
  skill: string
  args?: string
  status: 'running' | 'completed' | 'error'
}) {
  const statusConfig = {
    running: { icon: '🔧', color: 'bg-blue-100 text-blue-700 border-blue-200', text: '执行中...' },
    completed: { icon: '✅', color: 'bg-green-100 text-green-700 border-green-200', text: '已完成' },
    error: { icon: '❌', color: 'bg-red-100 text-red-700 border-red-200', text: '执行失败' },
  }

  const config = statusConfig[status]

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border mb-3",
      config.color
    )}>
      <span className="text-xl">{config.icon}</span>
      <div className="flex-1">
        <div className="font-medium">使用 Skill: <code className="font-mono text-sm">/{skill}</code></div>
        {args && <div className="text-sm opacity-75 font-mono">{args}</div>}
      </div>
      <div className="text-sm font-medium">{config.text}</div>
    </div>
  )
}
