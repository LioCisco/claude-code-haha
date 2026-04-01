import { useState } from 'react'
import {
  Bot,
  Plus,
  Settings,
  Trash2,
  Copy,
  Power,
  Cpu,
  Wrench,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { useChatStore } from '@/store/useChatStore'
import { cn } from '@/lib/utils'
import type { Agent } from '@/types'

export default function Agents() {
  const { agents, activeAgents, toggleAgent } = useChatStore()
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 团队管理</h1>
          <p className="text-gray-500 mt-1">
            配置您的AI智能体成员，每个智能体都有独特的技能和专长
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accio-600 hover:bg-accio-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          创建智能体
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: '智能体总数',
            value: agents.length,
            icon: Bot,
            color: 'bg-blue-500',
          },
          {
            label: '运行中',
            value: activeAgents.length,
            icon: Power,
            color: 'bg-green-500',
          },
          {
            label: '总技能数',
            value: agents.reduce((acc, a) => acc + a.skills.length, 0),
            icon: Wrench,
            color: 'bg-purple-500',
          },
          {
            label: '本月调用',
            value: '12.5K',
            icon: Cpu,
            color: 'bg-ali-500',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
          >
            <div
              className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}
            >
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-3 gap-4">
        {agents.map((agent) => {
          const isActive = activeAgents.includes(agent.id)

          return (
            <div
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className={cn(
                'group bg-white rounded-xl border p-5 cursor-pointer transition-all',
                isActive
                  ? 'border-accio-300 shadow-md'
                  : 'border-gray-200 hover:border-accio-200 hover:shadow-lg'
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: agent.color + '20' }}
                  >
                    {agent.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-gray-500">{agent.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleAgent(agent.id)
                    }}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      isActive
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-400 hover:text-gray-600'
                    )}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {agent.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {agent.skills.slice(0, 3).map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                  {agent.skills.length > 3 && (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-400 rounded-full">
                      +{agent.skills.length - 3}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-accio-600 transition-colors" />
              </div>

              {isActive && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  正在参与对话
                </div>
              )}
            </div>
          )
        })}

        {/* Add New Card */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="border-2 border-dashed border-gray-300 rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-gray-500 hover:border-accio-400 hover:text-accio-600 transition-colors min-h-[200px]"
        >
          <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-medium">创建新智能体</span>
        </button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-accio-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accio-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  创建自定义智能体
                </h3>
                <p className="text-sm text-gray-500">
                  配置专属于您业务的AI助手
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  智能体名称
                </label>
                <input
                  type="text"
                  placeholder="例如：客服专员"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色描述
                </label>
                <input
                  type="text"
                  placeholder="例如：专业处理客户咨询和售后问题"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  选择模型
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500">
                  <option>Claude Sonnet 4.6</option>
                  <option>Claude Opus 4.6</option>
                  <option>GPT-4o</option>
                  <option>DeepSeek V3</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-accio-600 hover:bg-accio-700 text-white rounded-lg transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: selectedAgent.color + '20' }}
                >
                  {selectedAgent.avatar}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedAgent.name}
                  </h3>
                  <p className="text-gray-500">{selectedAgent.role}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  智能体描述
                </h4>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {selectedAgent.description}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  技能列表
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedAgent.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-accio-50 text-accio-700 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">
                    使用模型
                  </h4>
                  <p className="text-gray-600">{selectedAgent.model}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">
                    状态
                  </h4>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm',
                      activeAgents.includes(selectedAgent.id)
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        activeAgents.includes(selectedAgent.id)
                          ? 'bg-green-500'
                          : 'bg-gray-400'
                      )}
                    />
                    {activeAgents.includes(selectedAgent.id) ? '运行中' : '待机'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
              <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Copy className="w-4 h-4" />
                复制
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="w-4 h-4" />
                高级设置
              </button>
              <button
                onClick={() => setSelectedAgent(null)}
                className="px-4 py-2 bg-accio-600 hover:bg-accio-700 text-white rounded-lg transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
