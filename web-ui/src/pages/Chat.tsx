import { useRef, useEffect, useState } from 'react'
import {
  Send,
  Paperclip,
  Bot,
  User,
  Sparkles,
  ChevronDown,
  Plus,
  Settings,
} from 'lucide-react'
import { useChatStore } from '@/store/useChatStore'
import { cn, formatTime } from '@/lib/utils'

export default function Chat() {
  const {
    messages,
    agents,
    activeAgents,
    isTyping,
    currentAgent,
    addMessage,
    setTyping,
    setCurrentAgent,
    toggleAgent,
  } = useChatStore()

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return

    // Add user message
    addMessage({
      content: input,
      role: 'user',
    })

    setInput('')
    setTyping(true)

    // Simulate AI response
    setTimeout(() => {
      setTyping(false)
      if (currentAgent) {
        addMessage({
          content: `我是${currentAgent.name}，收到您的消息："${input}"。

这是一个模拟回复。在实际实现中，这里会调用Claude API或其他AI模型来获取真实回复。`,
          role: 'agent',
          agentId: currentAgent.id,
          agentName: currentAgent.name,
          agentAvatar: currentAgent.avatar,
        })
      } else {
        addMessage({
          content: `收到您的消息："${input}"

在团队协作模式下，我会自动分配合适的AI智能体来处理您的请求。`,
          role: 'assistant',
        })
      }
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-6">
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
                {activeAgents.length > 0
                  ? `AI 团队协作 (${activeAgents.length})`
                  : '智能助手'}
              </h3>
              <p className="text-xs text-gray-500">
                {activeAgents.length > 0
                  ? '多智能体协同处理中'
                  : '默认对话模式'}
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                开始与您的AI团队协作
              </h3>
              <p className="text-gray-500 max-w-md mb-6">
                选择右侧的AI智能体加入对话，或直接在输入框中描述您的需求，
                我们会自动分配合适的团队成员。
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['帮我找宠物家具的供应商', '生成10个夏季爆款产品创意', '优化我的Shopify店铺SEO', '分析竞品定价策略'].map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-sm text-gray-600 rounded-full transition-colors"
                    >
                      {suggestion}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'flex-row-reverse' : ''
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  message.role === 'user'
                    ? 'bg-ali-100'
                    : message.role === 'agent'
                    ? 'bg-accio-100'
                    : 'bg-purple-100'
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
                  'max-w-[80%] rounded-2xl px-4 py-3',
                  message.role === 'user'
                    ? 'bg-ali-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                )}
              >
                {message.role === 'agent' && (
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs font-medium"
                      style={{
                        color:
                          agents.find((a) => a.id === message.agentId)?.color,
                      }}
                    >
                      {message.agentName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述您的需求，AI团队将协同处理..."
              className="w-full pr-24 pl-12 py-4 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-accio-500 focus:border-transparent transition-all"
              rows={2}
            />
            <button className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-accio-600 hover:bg-accio-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              发送
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400 text-center">
            按 Enter 发送，Shift + Enter 换行
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
          <p className="text-xs text-gray-500 mt-1">
            选择要参与对话的智能体
          </p>
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
                  isActive
                    ? 'bg-accio-50 border border-accio-200'
                    : 'bg-gray-50 hover:bg-gray-100 border border-transparent',
                  isCurrent && 'ring-2 ring-accio-500'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: agent.color + '20' }}
                  >
                    {agent.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {agent.name}
                      </h4>
                      {isActive && (
                        <span className="w-2 h-2 bg-accio-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {agent.role}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {agent.description}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {agent.skills.slice(0, 2).map((skill) => (
                      <span
                        key={skill}
                        className="text-xs px-2 py-0.5 bg-white rounded-full text-gray-600"
                      >
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
                      isActive
                        ? 'bg-accio-100 text-accio-700 hover:bg-accio-200'
                        : 'bg-white text-gray-600 hover:bg-gray-200'
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
