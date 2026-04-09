import { useState, useEffect } from 'react'
import {
  Wrench,
  Search,
  Plus,
  Play,
  Settings,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Zap,
  ShoppingCart,
  Palette,
  BarChart3,
  Globe,
  MessageSquare,
  FileText,
  Image,
  Code,
  Shield,
  Database,
  TrendingUp,
  Loader2,
  X,
  Share2,
  Target,
  Users,
  Building,
  PenTool,
  Terminal,
  Code2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSkills, executeSkill, installSkill } from '@/api/skills'
import { getClaudeCodeSkills, convertToUnifiedSkill, type ClaudeCodeSkill } from '@/api/claudeCodeSkills'
import type { Skill } from '@/types'

type SkillTab = 'webui' | 'claudecode'

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  ShoppingCart,
  FileText,
  Image,
  Globe,
  MessageSquare,
  BarChart3,
  Database,
  Shield,
  Zap,
  TrendingUp,
  Code,
  Wrench,
  Palette,
  Search,
  Share2,
  Target,
  Users,
  Building,
  PenTool,
  Terminal,
  Code2,
}

// Category labels for web-ui skills
const categoryLabels: Record<string, string> = {
  procurement: '采购管理',
  content: '内容创作',
  store: '店铺运营',
  marketing: '营销推广',
  analytics: '数据分析',
  research: '市场调研',
}

// Category labels for Claude Code skills
const claudeCodeCategoryLabels: Record<string, string> = {
  git: 'Git 版本控制',
  debug: '调试与诊断',
  config: '配置管理',
  skill: '技能管理',
  integration: '集成与插件',
  agent: '智能体与任务',
  file: '文件操作',
  other: '其他',
}

const skillCategories = [
  { id: 'all', name: '全部技能' },
  { id: 'research', name: '市场调研' },
  { id: 'content', name: '内容创作' },
  { id: 'store', name: '店铺运营' },
  { id: 'procurement', name: '采购管理' },
  { id: 'marketing', name: '营销推广' },
  { id: 'analytics', name: '数据分析' },
]

const claudeCodeCategories = [
  { id: 'all', name: '全部' },
  { id: 'git', name: 'Git' },
  { id: 'debug', name: '调试' },
  { id: 'config', name: '配置' },
  { id: 'skill', name: '技能' },
  { id: 'integration', name: '集成' },
  { id: 'agent', name: '智能体' },
  { id: 'file', name: '文件' },
]

const platforms = [
  { id: 'xiaohongshu', name: '小红书' },
  { id: 'weibo', name: '微博' },
  { id: 'douyin', name: '抖音' },
  { id: 'wechat', name: '微信公众号' },
  { id: 'twitter', name: 'Twitter/X' },
  { id: 'linkedin', name: 'LinkedIn' },
]

const styles = ['专业', '幽默', '文艺', '促销', '故事']

export default function Skills() {
  // Tab state
  const [activeTab, setActiveTab] = useState<SkillTab>('webui')

  // Web-UI skills state
  const [webUiSkills, setWebUiSkills] = useState<Skill[]>([])
  const [isLoadingWebUi, setIsLoadingWebUi] = useState(false)

  // Claude Code skills state
  const [claudeCodeSkills, setClaudeCodeSkills] = useState<ClaudeCodeSkill[]>([])
  const [isLoadingClaudeCode, setIsLoadingClaudeCode] = useState(false)

  // Common state
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [selectedClaudeSkill, setSelectedClaudeSkill] = useState<ClaudeCodeSkill | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [runResult, setRunResult] = useState<unknown>(null)
  const [runError, setRunError] = useState<string | null>(null)

  // Social post test form state
  const [socialPlatform, setSocialPlatform] = useState('xiaohongshu')
  const [socialTopic, setSocialTopic] = useState('')
  const [socialStyle, setSocialStyle] = useState('专业')
  const [socialImage, setSocialImage] = useState(false)
  const [socialVideo, setSocialVideo] = useState(false)

  // Create skill modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newSkill, setNewSkill] = useState({
    name: '',
    description: '',
    category: 'content',
    executionType: 'http' as 'builtin' | 'http' | 'mcp' | 'code' | 'proxy',
    timeoutMs: 30000,
  })
  const [isCreating, setIsCreating] = useState(false)

  // Load skills on mount and tab change
  useEffect(() => {
    if (activeTab === 'webui') {
      loadWebUiSkills()
    } else {
      loadClaudeCodeSkills()
    }
  }, [activeTab])

  const loadWebUiSkills = async () => {
    setIsLoadingWebUi(true)
    setError(null)
    try {
      const data = await getSkills()
      setWebUiSkills(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoadingWebUi(false)
    }
  }

  const loadClaudeCodeSkills = async () => {
    setIsLoadingClaudeCode(true)
    setError(null)
    try {
      const data = await getClaudeCodeSkills()
      setClaudeCodeSkills(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoadingClaudeCode(false)
    }
  }

  // Filter skills based on active tab
  const filteredWebUiSkills = webUiSkills.filter((skill) => {
    const matchesCategory = activeCategory === 'all' || skill.category === activeCategory
    const matchesSearch =
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const filteredClaudeCodeSkills = claudeCodeSkills.filter((skill) => {
    const matchesCategory = activeCategory === 'all' || skill.category === activeCategory
    const matchesSearch =
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const activeSkills = webUiSkills.filter((s) => s.status === 'active').length
  const activeClaudeSkills = claudeCodeSkills.filter((s) => s.isActive).length

  const handleCreateSkill = async () => {
    if (!newSkill.name || !newSkill.description) {
      setError('请填写技能名称和描述')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const skillId = newSkill.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

      await installSkill({
        id: skillId,
        name: newSkill.name,
        description: newSkill.description,
        category: newSkill.category,
        executionType: newSkill.executionType,
        timeoutMs: newSkill.timeoutMs,
        status: 'active',
      })

      // 重置表单
      setNewSkill({
        name: '',
        description: '',
        category: 'content',
        executionType: 'http',
        timeoutMs: 30000,
      })
      setIsCreateModalOpen(false)

      // 刷新技能列表
      await loadWebUiSkills()

      // 显示成功提示
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleRunSkill = async () => {
    if (!selectedSkill) return
    setIsRunning(true)
    setRunResult(null)
    setRunError(null)

    try {
      const params: Record<string, unknown> = {}
      if (selectedSkill.id === 'social-post') {
        params.platform = socialPlatform
        params.topic = socialTopic || '自媒体运营'
        params.style = socialStyle
        params.needImage = socialImage
        params.needVideo = socialVideo
      }

      const data = await executeSkill(selectedSkill.id, params)
      setRunResult(data.result)
    } catch (err) {
      setRunError(err instanceof Error ? err.message : '执行失败')
    } finally {
      setIsRunning(false)
    }
  }

  const closeModal = () => {
    setSelectedSkill(null)
    setSelectedClaudeSkill(null)
    setRunResult(null)
    setRunError(null)
    setSocialTopic('')
    setSocialImage(false)
    setSocialVideo(false)
    setIsCreateModalOpen(false)
  }

  // Get icon component
  const getIcon = (iconName: string) => {
    return iconMap[iconName] || Wrench
  }

  const isLoading = activeTab === 'webui' ? isLoadingWebUi : isLoadingClaudeCode
  const currentCategories = activeTab === 'webui' ? skillCategories : claudeCodeCategories
  const currentCategoryLabels = activeTab === 'webui' ? categoryLabels : claudeCodeCategoryLabels

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">技能库</h1>
          <p className="text-gray-500 mt-1">管理和配置您的AI技能，扩展智能体能力</p>
        </div>
        {activeTab === 'webui' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accio-600 hover:bg-accio-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            创建技能
          </button>
        )}
      </div>

      {/* Info Banner */}
      {activeTab === 'webui' && (
        <div className="bg-gradient-to-r from-accio-50 to-blue-50 border border-accio-200 rounded-lg p-4 flex items-center gap-3">
          <Terminal className="w-5 h-5 text-accio-600" />
          <div className="flex-1">
            <p className="text-sm text-accio-800">
              <span className="font-medium">Claude Code 集成：</span>
              在此处创建的技能将自动同步到 Claude Code，可通过 <code className="bg-white px-1.5 py-0.5 rounded text-accio-700 font-mono">/{'{技能ID}'}</code> 直接调用
            </p>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => {
            setActiveTab('webui')
            setActiveCategory('all')
            setSearchQuery('')
          }}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
            activeTab === 'webui'
              ? 'bg-white text-accio-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Zap className="w-4 h-4" />
          平台技能
          <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
            {webUiSkills.length}
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab('claudecode')
            setActiveCategory('all')
            setSearchQuery('')
          }}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
            activeTab === 'claudecode'
              ? 'bg-white text-accio-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Code2 className="w-4 h-4" />
          内置技能库
          <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
            {claudeCodeSkills.length}
          </span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {activeTab === 'webui' ? (
          <>
            {[
              { label: '技能总数', value: webUiSkills.length, color: 'bg-blue-500' },
              { label: '已激活', value: activeSkills, color: 'bg-green-500' },
              { label: '本月调用', value: '5.2K', color: 'bg-ali-500' },
              { label: '自定义技能', value: webUiSkills.filter((s) => !s.isBuiltIn).length, color: 'bg-purple-500' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </>
        ) : (
          <>
            {[
              { label: '技能总数', value: claudeCodeSkills.length, color: 'bg-blue-500' },
              { label: '已激活', value: activeClaudeSkills, color: 'bg-green-500' },
              { label: 'Commands', value: claudeCodeSkills.filter((s) => s.type === 'command').length, color: 'bg-ali-500' },
              { label: 'Bundled', value: claudeCodeSkills.filter((s) => s.type === 'bundled').length, color: 'bg-purple-500' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'webui' ? "搜索技能..." : "搜索内置技能..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
          />
        </div>
        <div className="flex gap-2">
          {currentCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                activeCategory === category.id
                  ? 'bg-accio-100 text-accio-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Skills Grid */}
      {activeTab === 'webui' ? (
        <div className="grid grid-cols-3 gap-4">
          {filteredWebUiSkills.map((skill) => {
            const IconComponent = getIcon(skill.icon)
            return (
              <div
                key={skill.id}
                onClick={() => setSelectedSkill(skill)}
                className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-accio-300 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      skill.status === 'active' ? 'bg-accio-100' : 'bg-gray-100'
                    )}
                  >
                    <IconComponent
                      className={cn(
                        'w-6 h-6',
                        skill.status === 'active' ? 'text-accio-600' : 'text-gray-400'
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {skill.isBuiltIn && (
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                        内置
                      </span>
                    )}
                    <StatusBadge status={skill.status} />
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{skill.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4">{skill.description}</p>

                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>已使用 {skill.usage} 次</span>
                  <div className="flex items-center gap-2">
                    {skill.status === 'active' && (
                      <span className="flex items-center gap-1 text-xs text-accio-600" title="可在终端中使用">
                        <Terminal className="w-3 h-3" />
                        Claude
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filteredClaudeCodeSkills.map((skill) => (
            <div
              key={skill.id}
              onClick={() => setSelectedClaudeSkill(skill)}
              className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-accio-300 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    skill.isActive ? 'bg-blue-100' : 'bg-gray-100'
                  )}
                >
                  <Code2
                    className={cn(
                      'w-6 h-6',
                      skill.isActive ? 'text-blue-600' : 'text-gray-400'
                    )}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-full">
                    {skill.type === 'command' ? 'Command' : 'Bundled'}
                  </span>
                  {skill.isActive ? (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      可用
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                      <AlertCircle className="w-3 h-3" />
                      禁用
                    </span>
                  )}
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">/{skill.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4">{skill.description}</p>

              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>分类: {currentCategoryLabels[skill.category] || skill.category}</span>
                {skill.aliases && skill.aliases.length > 0 && (
                  <span className="text-xs text-gray-400">
                    别名: {skill.aliases.join(', ')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {activeTab === 'claudecode' && filteredClaudeCodeSkills.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Code2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无内置技能</h3>
          <p className="text-gray-500">无法从源码中解析到技能</p>
        </div>
      )}

      {/* Web-UI Skill Detail Modal */}
      {selectedSkill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start gap-4 mb-6">
              <div
                className={cn(
                  'w-16 h-16 rounded-xl flex items-center justify-center',
                  selectedSkill.status === 'active' ? 'bg-accio-100' : 'bg-gray-100'
                )}
              >
                {(() => {
                  const IconComponent = getIcon(selectedSkill.icon)
                  return (
                    <IconComponent
                      className={cn(
                        'w-8 h-8',
                        selectedSkill.status === 'active' ? 'text-accio-600' : 'text-gray-400'
                      )}
                    />
                  )
                })()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-gray-900">{selectedSkill.name}</h3>
                  <StatusBadge status={selectedSkill.status} />
                </div>
                <p className="text-gray-500">{selectedSkill.description}</p>
                <p className="text-xs text-gray-400 mt-1">分类: {categoryLabels[selectedSkill.category] || selectedSkill.category}</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">使用统计</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{selectedSkill.usage}</p>
                    <p className="text-xs text-gray-500">总调用次数</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">98%</p>
                    <p className="text-xs text-gray-500">成功率</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">2.3s</p>
                    <p className="text-xs text-gray-500">平均响应</p>
                  </div>
                </div>
              </div>

              {selectedSkill.status === 'active' && (
                <div className="border border-accio-200 bg-accio-50/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-accio-800 mb-2 flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    终端集成
                  </h4>
                  <p className="text-xs text-accio-700 mb-3">
                    此技能已同步到 Claude Code 技能库，可在终端中直接使用技能命令调用：
                  </p>
                  <div className="bg-white rounded p-3 font-mono text-xs text-gray-700 space-y-1">
                    <code>/{selectedSkill.id}</code>
                    <div className="text-gray-400"># 或使用 SkillTool</div>
                    <code>Skill(skill: "{selectedSkill.id}")</code>
                  </div>
                </div>
              )}

              {selectedSkill.id === 'social-post' && (
                <div className="border border-accio-200 bg-accio-50/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-accio-800 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    测试发布自媒体内容
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">主题 / 内容描述</label>
                      <input
                        type="text"
                        value={socialTopic}
                        onChange={(e) => setSocialTopic(e.target.value)}
                        placeholder="例如：夏季护肤技巧"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">发布平台</label>
                      <select
                        value={socialPlatform}
                        onChange={(e) => setSocialPlatform(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                      >
                        {platforms.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">内容风格</label>
                      <select
                        value={socialStyle}
                        onChange={(e) => setSocialStyle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                      >
                        {styles.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={socialImage}
                        onChange={(e) => setSocialImage(e.target.checked)}
                        className="w-4 h-4 text-accio-600 rounded"
                      />
                      生成配图
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={socialVideo}
                        onChange={(e) => setSocialVideo(e.target.checked)}
                        className="w-4 h-4 text-accio-600 rounded"
                      />
                      生成视频
                    </label>
                  </div>
                </div>
              )}

              {(runResult || runError) && (
                <div
                  className={cn(
                    'rounded-lg p-4 max-h-80 overflow-y-auto',
                    runError ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'
                  )}
                >
                  <h4 className={cn('text-sm font-medium mb-2', runError ? 'text-red-700' : 'text-gray-700')}>
                    {runError ? '执行失败' : '执行结果'}
                  </h4>
                  {runError ? (
                    <p className="text-sm text-red-600">{runError}</p>
                  ) : (
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(runResult, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">配置参数</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">自动执行</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accio-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">失败时通知</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accio-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <Settings className="w-4 h-4" />
                高级设置
              </button>
              <button
                onClick={handleRunSkill}
                disabled={isRunning || selectedSkill.status !== 'active'}
                className="flex items-center gap-2 px-4 py-2 bg-accio-600 hover:bg-accio-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg"
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                立即运行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claude Code Skill Detail Modal */}
      {selectedClaudeSkill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start gap-4 mb-6">
              <div
                className={cn(
                  'w-16 h-16 rounded-xl flex items-center justify-center',
                  selectedClaudeSkill.isActive ? 'bg-blue-100' : 'bg-gray-100'
                )}
              >
                <Code2
                  className={cn(
                    'w-8 h-8',
                    selectedClaudeSkill.isActive ? 'text-blue-600' : 'text-gray-400'
                  )}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-gray-900">/{selectedClaudeSkill.name}</h3>
                  <span className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-full">
                    {selectedClaudeSkill.type === 'command' ? 'Command' : 'Bundled'}
                  </span>
                </div>
                <p className="text-gray-500">{selectedClaudeSkill.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                  分类: {claudeCodeCategoryLabels[selectedClaudeSkill.category] || selectedClaudeSkill.category}
                </p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">技能信息</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">ID:</span>
                    <span className="font-mono text-gray-700">{selectedClaudeSkill.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">类型:</span>
                    <span className="text-gray-700">{selectedClaudeSkill.type === 'command' ? 'Command' : 'Bundled Skill'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">状态:</span>
                    <span className={selectedClaudeSkill.isActive ? 'text-green-600' : 'text-gray-500'}>
                      {selectedClaudeSkill.isActive ? '可用' : '禁用'}
                    </span>
                  </div>
                  {selectedClaudeSkill.aliases && selectedClaudeSkill.aliases.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">别名:</span>
                      <span className="text-gray-700">{selectedClaudeSkill.aliases.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  在终端中使用
                </h4>
                <p className="text-xs text-blue-700 mb-3">
                  此技能是内置技能，可在终端中使用以下命令调用：
                </p>
                <div className="bg-white rounded p-3 font-mono text-xs text-gray-700 space-y-1">
                  <code>/{selectedClaudeSkill.name}</code>
                  {selectedClaudeSkill.aliases && selectedClaudeSkill.aliases.map((alias) => (
                    <div key={alias}><code>/{alias}</code></div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">源码位置</h4>
                <p className="text-xs text-gray-500 font-mono break-all">{selectedClaudeSkill.source}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Skill Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">创建新技能</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  技能名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  placeholder="例如：数据分析助手"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  技能描述 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newSkill.description}
                  onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                  placeholder="描述这个技能的功能..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类
                </label>
                <select
                  value={newSkill.category}
                  onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                >
                  {skillCategories.filter(c => c.id !== 'all').map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  执行类型
                </label>
                <select
                  value={newSkill.executionType}
                  onChange={(e) => setNewSkill({ ...newSkill, executionType: e.target.value as typeof newSkill.executionType })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                >
                  <option value="http">HTTP API</option>
                  <option value="builtin">内置处理</option>
                  <option value="mcp">MCP 协议</option>
                  <option value="code">代码执行</option>
                  <option value="proxy">代理转发</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  超时时间 (毫秒)
                </label>
                <input
                  type="number"
                  value={newSkill.timeoutMs}
                  onChange={(e) => setNewSkill({ ...newSkill, timeoutMs: parseInt(e.target.value) || 30000 })}
                  min={1000}
                  max={300000}
                  step={1000}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <Terminal className="w-4 h-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-700">
                  创建后，此技能将自动同步到 Claude Code，可通过 /{newSkill.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'skill-id'} 调用
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleCreateSkill}
                disabled={isCreating || !newSkill.name || !newSkill.description}
                className="flex items-center gap-2 px-4 py-2 bg-accio-600 hover:bg-accio-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    创建技能
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs = {
    active: { icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
    inactive: { icon: AlertCircle, color: 'bg-gray-100 text-gray-600' },
    beta: { icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
    pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
  }
  const config = configs[status as keyof typeof configs] || configs.inactive

  return (
    <span className={cn('flex items-center gap-1 px-2 py-1 text-xs rounded-full', config.color)}>
      <config.icon className="w-3 h-3" />
      {status === 'active' ? '已激活' : status === 'inactive' ? '未激活' : status === 'beta' ? '测试中' : '配置中'}
    </span>
  )
}
