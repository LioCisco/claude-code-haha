import { useRef, useEffect, useState, useCallback } from 'react'
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
} from 'lucide-react'
import { useChatStore } from '@/store/useChatStore'
import { cn, formatTime } from '@/lib/utils'
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

// Singleton WebSocket manager outside React
class WsManager {
  private ws: WebSocket | null = null
  private listeners: Array<(data: ChatEvent) => void> = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private isConnecting = false
  private currentSessionId: string | null = null
  private pendingMessages: unknown[] = []

  connect(sessionId?: string) {
    // If already connecting to the same session, don't reconnect
    if (this.isConnecting && this.currentSessionId === sessionId) {
      return
    }

    // If connected to a different session, disconnect first
    if (this.ws?.readyState === WebSocket.OPEN && this.currentSessionId !== sessionId) {
      console.log('[WsManager] Switching from session', this.currentSessionId, 'to', sessionId)
      this.disconnect(false) // Don't clear reconnect timer when switching sessions
    }

    // If already connected to the same session, do nothing
    if (this.ws?.readyState === WebSocket.OPEN && this.currentSessionId === sessionId) {
      return
    }

    this.isConnecting = true
    this.currentSessionId = sessionId || null

    console.log('[WsManager] Connecting... sessionId:', sessionId)
    const ws = new WebSocket(`ws://localhost:8080/ws/chat${sessionId ? `?sessionId=${sessionId}` : ''}`)
    this.ws = ws

    ws.onopen = () => {
      console.log('[WsManager] Connected, sessionId:', sessionId)
      this.isConnecting = false

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

    ws.onclose = () => {
      console.log('[WsManager] Closed')
      this.ws = null
      this.isConnecting = false
      // Auto reconnect only if we have a current session and no timer
      if (this.currentSessionId && !this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null
          this.connect(this.currentSessionId || undefined)
        }, 3000)
      }
    }
  }

  disconnect(clearSession = true) {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (clearSession) {
      this.currentSessionId = null
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

  get sessionId() {
    return this.currentSessionId
  }
}

const wsManager = new WsManager()

export default function Chat() {
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
  const streamingMsgIdRef = useRef<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load all sessions and agents on mount
  useEffect(() => {
    loadSessions()
    // Load agents from API
    const { loadAgents } = useChatStore.getState()
    loadAgents()
  }, [])

  // Connect WebSocket and load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      // Disconnect any existing connection first
      wsManager.disconnect(false) // false = keep session tracking for reconnect
      // Connect with the new session ID
      wsManager.connect(currentSessionId)
      // Load messages via REST API (more reliable than WebSocket for history)
      loadSessionMessages(currentSessionId)
    }
  }, [currentSessionId])

  // Setup WebSocket listeners
  useEffect(() => {
    const unsubscribe = wsManager.subscribe((data) => {
      const store = useChatStore.getState()

      switch (data.type) {
        case 'connected':
          console.log('[Chat] Connected to server')
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

        case 'error': {
          store.addMessage({
            content: `⚠️ ${data.message}`,
            role: 'assistant',
          })
          store.setTyping(false)
          streamingMsgIdRef.current = null
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
      const res = await fetch('/api/chat/sessions')
      const data = await res.json()
      if (data.sessions) {
        // Always use server data, replacing local cache
        setSessions(data.sessions)
      } else {
        // Server returned no sessions, clear local state
        setSessions([])
      }
    } catch (err) {
      console.error('Failed to load sessions:', err)
    } finally {
      setIsLoadingSessions(false)
    }
  }

  // Load messages for a specific session
  const loadSessionMessages = async (sessionId: string) => {
    console.log('[Chat] Loading messages for session:', sessionId)
    try {
      const res = await fetch(`/api/chat/history/${sessionId}`)
      const data = await res.json()
      console.log('[Chat] Loaded messages:', data.messages?.length || 0)

      // Always clear messages first to avoid duplicates
      clearMessages()

      if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        // Use setTimeout to ensure clearMessages completes before adding new ones
        setTimeout(() => {
          for (const msg of data.messages) {
            addMessage({
              id: msg.id || Math.random().toString(36).substring(2, 15),
              content: msg.content,
              role: msg.role,
              agentId: msg.agentId,
              agentName: msg.agentName,
              agentAvatar: msg.agentAvatar,
            })
          }
        }, 0)
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
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `新对话 ${new Date().toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          agentId: currentAgent?.id,
          agentName: currentAgent?.name,
          agentAvatar: currentAgent?.avatar,
        }),
      })
      const data = await res.json()
      if (data.sessionId) {
        addSession({
          id: data.sessionId,
          title: data.title,
          updatedAt: new Date().toISOString(),
          agentId: currentAgent?.id,
          agentName: currentAgent?.name,
          agentAvatar: currentAgent?.avatar,
        })
        setCurrentSessionId(data.sessionId)
        clearMessages()
      }
    } catch (err) {
      console.error('Failed to create session:', err)
    }
  }

  // Delete session
  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确定要删除这个对话吗？')) return

    try {
      await fetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' })
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
      await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle }),
      })
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
    if (!currentSessionId) {
      await createNewSession()
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
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
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-4 h-4" />
            配置
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
          <div className="absolute inset-x-0 bottom-24 mx-auto w-full max-w-2xl px-4">
            <div className="bg-white border border-orange-200 rounded-xl shadow-lg p-4">
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
          <div className="absolute inset-x-0 bottom-24 mx-auto w-full max-w-2xl px-4">
            <div className="bg-white border border-blue-200 rounded-xl shadow-lg p-4">
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

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
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
          <button className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-accio-400 hover:text-accio-600 transition-colors flex items-center justify-center gap-2">
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
