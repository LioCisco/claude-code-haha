import { useState, useEffect } from 'react'
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
  Loader2,
  X,
  Edit2,
} from 'lucide-react'
import { useChatStore } from '@/store/useChatStore'
import { cn } from '@/lib/utils'
import type { Agent, Skill } from '@/types'
import {
  getAgents,
  createAgent as createAgentApi,
  updateAgent as updateAgentApi,
  deleteAgent as deleteAgentApi,
} from '@/api/agents'
import { getSkills } from '@/api/skills'

const AVAILABLE_MODELS = [
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'deepseek-v3', name: 'DeepSeek V3' },
]

const AVAILABLE_AVATARS = ['🤖', '🔍', '✍️', '🏪', '🤝', '📢', '🎯', '📊', '🎨', '🔧', '💡', '📱']

const DEFAULT_COLORS = [
  '#22c55e', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899',
  '#ef4444', '#10b981', '#06b6d4', '#6366f1', '#f59e0b'
]

const categoryLabels: Record<string, string> = {
  procurement: '采购管理',
  content: '内容创作',
  store: '店铺运营',
  marketing: '营销推广',
  analytics: '数据分析',
  research: '市场调研',
}

interface AgentFormData {
  name: string
  role: string
  avatar: string
  description: string
  skills: string[]
  model: string
  color: string
  systemPrompt: string
}

const defaultFormData: AgentFormData = {
  name: '',
  role: '',
  avatar: '🤖',
  description: '',
  skills: [],
  model: 'claude-sonnet-4-6',
  color: '#3b82f6',
  systemPrompt: '',
}

export default function Agents() {
  const { agents, activeAgents, toggleAgent, setAgents } = useChatStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<AgentFormData>(defaultFormData)
  const [skillInput, setSkillInput] = useState('')
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([])
  const [showSkillSelector, setShowSkillSelector] = useState(false)

  // Load agents and skills on mount
  useEffect(() => {
    loadAgents()
    loadSkills()
  }, [])

  const loadAgents = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getAgents()
      setAgents(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSkills = async () => {
    try {
      const data = await getSkills()
      setAvailableSkills(data)
    } catch (err) {
      console.error('Failed to load skills:', err)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.role.trim()) return

    setIsSubmitting(true)
    try {
      await createAgentApi({
        name: formData.name,
        role: formData.role,
        avatar: formData.avatar,
        description: formData.description,
        skills: formData.skills,
        model: formData.model,
        color: formData.color,
        systemPrompt: formData.systemPrompt || undefined,
      })
      await loadAgents()
      setShowCreateModal(false)
      setFormData(defaultFormData)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedAgent || !formData.name.trim() || !formData.role.trim()) return

    setIsSubmitting(true)
    try {
      await updateAgentApi(selectedAgent.id, {
        name: formData.name,
        role: formData.role,
        avatar: formData.avatar,
        description: formData.description,
        skills: formData.skills,
        model: formData.model,
        color: formData.color,
        systemPrompt: formData.systemPrompt || undefined,
      })
      await loadAgents()
      setShowEditModal(false)
      setSelectedAgent(null)
      setFormData(defaultFormData)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (agent: Agent) => {
    if (!confirm(`确定要删除智能体「${agent.name}」吗？此操作不可恢复。`)) return

    try {
      await deleteAgentApi(agent.id)
      await loadAgents()
      if (selectedAgent?.id === agent.id) {
        setSelectedAgent(null)
      }
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const openEditModal = (agent: Agent) => {
    setFormData({
      name: agent.name,
      role: agent.role,
      avatar: agent.avatar,
      description: agent.description,
      skills: agent.skills,
      model: agent.model,
      color: agent.color,
      systemPrompt: agent.systemPrompt || '',
    })
    setSelectedAgent(agent)
    setShowEditModal(true)
  }

  const openCreateModal = () => {
    setFormData(defaultFormData)
    setShowCreateModal(true)
  }

  const addSkill = () => {
    if (!skillInput.trim()) return
    if (formData.skills.includes(skillInput.trim())) return
    setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] })
    setSkillInput('')
  }

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) })
  }

  if (isLoading && agents.length === 0) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accio-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 团队管理</h1>
          <p className="text-gray-500 mt-1">
            配置您的AI智能体成员，每个智能体都有独特的技能和专长
          </p>
        </div>
        <button
          onClick={openCreateModal}
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
          const isDefault = agent.isDefault

          return (
            <div
              key={agent.id}
              className={cn(
                'group bg-white rounded-xl border p-5 cursor-pointer transition-all',
                isActive
                  ? 'border-accio-300 shadow-md'
                  : 'border-gray-200 hover:border-accio-200 hover:shadow-lg'
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="flex items-center gap-3"
                  onClick={() => setSelectedAgent(agent)}
                >
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
                  {!isDefault && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(agent)
                      }}
                      className="p-2 rounded-lg transition-colors bg-gray-100 text-gray-400 hover:text-gray-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
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

              <div onClick={() => setSelectedAgent(agent)}>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {agent.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {agent.skills.slice(0, 3).map((skillId) => { const skill = availableSkills.find(s => s.id === skillId); return (
                      <span
                        key={skill?.name || skillId}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                      >
                        {skill?.name || skillId}
                      </span>
                    )})}
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
            </div>
          )
        })}

        {/* Add New Card */}
        <button
          onClick={openCreateModal}
          className="border-2 border-dashed border-gray-300 rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-gray-500 hover:border-accio-400 hover:text-accio-600 transition-colors min-h-[200px]"
        >
          <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-medium">创建新智能体</span>
        </button>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-accio-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accio-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {showCreateModal ? '创建自定义智能体' : '编辑智能体'}
                </h3>
                <p className="text-sm text-gray-500">
                  配置专属于您业务的AI助手
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Name & Role */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    智能体名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如：客服专员"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    角色描述 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="例如：专业处理客户咨询和售后问题"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                  />
                </div>
              </div>

              {/* Avatar & Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    选择头像
                  </label>
                  <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg">
                    {AVAILABLE_AVATARS.map((avatar) => (
                      <button
                        key={avatar}
                        onClick={() => setFormData({ ...formData, avatar })}
                        className={cn(
                          'w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all',
                          formData.avatar === avatar
                            ? 'bg-accio-100 ring-2 ring-accio-500'
                            : 'hover:bg-gray-100'
                        )}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    主题颜色
                  </label>
                  <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={cn(
                          'w-8 h-8 rounded-lg transition-all',
                          formData.color === color && 'ring-2 ring-offset-2 ring-gray-400'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  选择模型
                </label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                >
                  {AVAILABLE_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  智能体描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="描述这个智能体的职责和能力..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500 resize-none"
                />
              </div>

              {/* Skills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  技能标签
                </label>

                {/* Selected Skills */}
                <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                  {formData.skills.map((skillId) => {
                    const skill = availableSkills.find(s => s.id === skillId)
                    return (
                      <span
                        key={skillId}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-accio-50 text-accio-700 rounded-full text-sm"
                      >
                        {skill?.name || skillId}
                        <button
                          onClick={() => removeSkill(skillId)}
                          className="text-accio-400 hover:text-accio-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>

                {/* Add Skill Button & Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowSkillSelector(!showSkillSelector)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    添加技能
                  </button>

                  {/* Skill Selector Dropdown */}
                  {showSkillSelector && (
                    <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                      <div className="p-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500">从技能库中选择</p>
                      </div>
                      {availableSkills.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          暂无可用技能
                        </div>
                      ) : (
                        <div className="p-2">
                          {/* Group by category */}
                          {Object.entries(
                            availableSkills.reduce((acc, skill) => {
                              if (formData.skills.includes(skill.id)) return acc
                              const cat = skill.category || '其他'
                              if (!acc[cat]) acc[cat] = []
                              acc[cat].push(skill)
                              return acc
                            }, {} as Record<string, Skill[]>)
                          ).map(([category, skills]) => (
                            <div key={category} className="mb-2">
                              <p className="text-xs text-gray-400 px-2 py-1">
                                {categoryLabels[category] || category}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {skills.map((skill) => (
                                  <button
                                    key={skill.id}
                                    onClick={() => {
                                      setFormData({
                                        ...formData,
                                        skills: [...formData.skills, skill.id],
                                      })
                                      setShowSkillSelector(false)
                                    }}
                                    className="px-2 py-1 text-xs bg-gray-50 hover:bg-accio-50 hover:text-accio-700 text-gray-600 rounded-full transition-colors"
                                  >
                                    {skill.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  系统提示词（System Prompt）
                </label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  placeholder="定义这个智能体的行为模式和专业领域..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500 resize-none font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  系统提示词定义了智能体的专业领域和行为模式
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setShowEditModal(false)
                  setFormData(defaultFormData)
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={showCreateModal ? handleCreate : handleUpdate}
                disabled={!formData.name.trim() || !formData.role.trim() || isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-accio-600 hover:bg-accio-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {showCreateModal ? '创建' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedAgent && !showEditModal && (
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
                  {selectedAgent.skills.map((skillId) => {
                    const skill = availableSkills.find(s => s.id === skillId)
                    return (
                      <span
                        key={skillId}
                        className="px-3 py-1 bg-accio-50 text-accio-700 rounded-full text-sm"
                      >
                        {skill?.name || skillId}
                      </span>
                    )
                  })}
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

              {selectedAgent.systemPrompt && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    系统提示词
                  </h4>
                  <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                    <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono">
                      {selectedAgent.systemPrompt}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
              {!selectedAgent.isDefault && (
                <button
                  onClick={() => handleDelete(selectedAgent)}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              )}
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
