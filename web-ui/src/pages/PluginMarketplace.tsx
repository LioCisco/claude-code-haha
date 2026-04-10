import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Download,
  Star,
  Puzzle,
  Sparkles,
  Code,
  Plus,
  Filter,
  Check,
  ExternalLink,
  Wrench,
  Globe,
  Zap,
  Brain,
  ChevronRight,
  X,
  Loader2,
  ThumbsUp,
  MessageSquare,
  GitBranch,
  Terminal,
  FileJson,
} from 'lucide-react'
import { marketplaceApi, type MarketplacePlugin, type PluginCategory } from '../api/marketplace'

const categoryIcons: Record<string, typeof Puzzle> = {
  utility: Wrench,
  integration: Globe,
  automation: Zap,
  ai: Brain,
  dev: Code,
  data: FileJson,
}

const categoryColors: Record<string, string> = {
  utility: 'bg-blue-100 text-blue-700',
  integration: 'bg-green-100 text-green-700',
  automation: 'bg-yellow-100 text-yellow-700',
  ai: 'bg-purple-100 text-purple-700',
  dev: 'bg-gray-100 text-gray-700',
  data: 'bg-orange-100 text-orange-700',
}

export default function PluginMarketplace() {
  const [plugins, setPlugins] = useState<MarketplacePlugin[]>([])
  const [categories, setCategories] = useState<PluginCategory[]>([])
  const [featured, setFeatured] = useState<MarketplacePlugin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'rating'>('popular')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createMode, setCreateMode] = useState<'manual' | 'ai' | 'natural'>('manual')

  useEffect(() => {
    loadPlugins()
    loadCategories()
    loadFeatured()
  }, [selectedCategory, sortBy])

  const loadPlugins = async () => {
    try {
      setLoading(true)
      const category = selectedCategory === 'all' ? undefined : selectedCategory
      const response = await marketplaceApi.getPlugins({
        category,
        sort: sortBy,
        page: 1,
        limit: 50,
      })
      if (response.success) {
        setPlugins(response.plugins)
      }
    } catch (error) {
      console.error('Failed to load plugins:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await marketplaceApi.getCategories()
      if (response.success) {
        setCategories(response.categories)
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const loadFeatured = async () => {
    try {
      const response = await marketplaceApi.getFeatured()
      if (response.success) {
        setFeatured(response.plugins)
      }
    } catch (error) {
      console.error('Failed to load featured:', error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadPlugins()
      return
    }
    try {
      setLoading(true)
      const response = await marketplaceApi.getPlugins({
        search: searchQuery,
        sort: sortBy,
        page: 1,
        limit: 50,
      })
      if (response.success) {
        setPlugins(response.plugins)
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Puzzle className="w-7 h-7 text-blue-600" />
                插件市场
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                发现和安装社区分享的 Claude Code 插件，或使用 AI 创建你自己的插件
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/plugins"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Terminal className="w-4 h-4" />
                我的插件
              </Link>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Sparkles className="w-4 h-4" />
                创建插件
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索插件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部分类</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="popular">最受欢迎</option>
            <option value="newest">最新发布</option>
            <option value="rating">评分最高</option>
          </select>
        </div>
      </div>

      {/* Featured Section */}
      {featured.length > 0 && !searchQuery && selectedCategory === 'all' && (
        <div className="px-6 py-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            精选插件
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featured.slice(0, 3).map((plugin) => (
              <PluginCard key={plugin.id} plugin={plugin} featured />
            ))}
          </div>
        </div>
      )}

      {/* Plugin Grid */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {searchQuery ? `搜索结果 (${plugins.length})` : '全部插件'}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {plugins.map((plugin) => (
              <PluginCard key={plugin.id} plugin={plugin} />
            ))}
          </div>
        )}

        {!loading && plugins.length === 0 && (
          <div className="text-center py-12">
            <Puzzle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">没有找到匹配的插件</p>
            <p className="text-sm text-gray-400 mt-1">试试其他搜索词或分类</p>
          </div>
        )}
      </div>

      {/* Create Plugin Modal */}
      {showCreateModal && (
        <CreatePluginModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  )
}

// Plugin Card Component
function PluginCard({
  plugin,
  featured = false,
}: {
  plugin: MarketplacePlugin
  featured?: boolean
}) {
  const Icon = categoryIcons[plugin.category] || Puzzle
  const colorClass = categoryColors[plugin.category] || 'bg-gray-100 text-gray-700'
  const [isInstalling, setIsInstalling] = useState(false)
  const [isInstalled, setIsInstalled] = useState(plugin.isInstalled)

  const handleInstall = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isInstalled) return

    setIsInstalling(true)
    try {
      const response = await marketplaceApi.install(plugin.id)
      if (response.success) {
        setIsInstalled(true)
      }
    } catch (error) {
      console.error('Install failed:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  return (
    <Link
      to={`/marketplace/${plugin.id}`}
      className={`bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all cursor-pointer group ${
        featured ? 'ring-2 ring-yellow-200' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {plugin.name}
            </h3>
            <p className="text-xs text-gray-500">v{plugin.version}</p>
          </div>
        </div>
        {featured && <Sparkles className="w-5 h-5 text-yellow-500" />}
      </div>

      <p className="text-sm text-gray-600 mt-3 line-clamp-2">
        {plugin.shortDescription || plugin.description}
      </p>

      <div className="flex flex-wrap gap-1 mt-3">
        {plugin.tags?.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Download className="w-4 h-4" />
            {plugin.downloadCount}
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500" />
            {plugin.ratingAvg.toFixed(1)} ({plugin.ratingCount})
          </span>
        </div>
        <button
          onClick={handleInstall}
          disabled={isInstalling || isInstalled}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isInstalled
              ? 'bg-green-100 text-green-700 cursor-default'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isInstalling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isInstalled ? (
            <>
              <Check className="w-4 h-4" />
              已安装
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              安装
            </>
          )}
        </button>
      </div>
    </Link>
  )
}

// Create Plugin Modal
function CreatePluginModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'manual' | 'ai' | 'natural'>('manual')
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [generatedPlugin, setGeneratedPlugin] = useState<any>(null)

  const handleNaturalLanguageSubmit = async () => {
    if (!naturalLanguageInput.trim()) return
    setAiGenerating(true)
    try {
      const response = await marketplaceApi.aiNaturalLanguage(naturalLanguageInput)
      if (response.success) {
        setGeneratedPlugin(response)
      }
    } catch (error) {
      console.error('Generation failed:', error)
    } finally {
      setAiGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            创建新插件
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selection */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setMode('manual')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                mode === 'manual'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Code className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900">手动创建</h3>
              <p className="text-sm text-gray-500 mt-1">
                自己编写代码和配置
              </p>
            </button>

            <button
              onClick={() => setMode('ai')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                mode === 'ai'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Sparkles className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-semibold text-gray-900">AI 辅助</h3>
              <p className="text-sm text-gray-500 mt-1">
                描述需求，AI 生成代码
              </p>
            </button>

            <button
              onClick={() => setMode('natural')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                mode === 'natural'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <MessageSquare className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900">自然语言</h3>
              <p className="text-sm text-gray-500 mt-1">
                用自然语言描述功能
              </p>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {mode === 'manual' && (
            <div className="text-center py-8">
              <Code className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">跳转到插件管理页面手动创建</p>
              <Link
                to="/plugins"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                前往创建
              </Link>
            </div>
          )}

          {mode === 'natural' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  描述你想要的插件功能
                </label>
                <textarea
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  placeholder="例如：创建一个可以查询天气的插件，支持输入城市名返回当前温度和天气状况..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-32"
                />
              </div>
              <button
                onClick={handleNaturalLanguageSubmit}
                disabled={aiGenerating || !naturalLanguageInput.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    AI 生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    生成插件
                  </>
                )}
              </button>

              {generatedPlugin && (
                <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="font-semibold text-gray-900 mb-2">生成结果</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    名称: {generatedPlugin.name}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    分类: {generatedPlugin.category}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        // Navigate to plugin editor with generated code
                        onClose()
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                      编辑并发布
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'ai' && (
            <AIGeneratePluginForm onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  )
}

// AI Generate Plugin Form
function AIGeneratePluginForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'utility',
    tools: [
      {
        name: '',
        description: '',
        parameters: [{ name: '', type: 'string', description: '', required: true }],
      },
    ],
    requirements: [''],
  })
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleAddTool = () => {
    setFormData({
      ...formData,
      tools: [
        ...formData.tools,
        {
          name: '',
          description: '',
          parameters: [{ name: '', type: 'string', description: '', required: true }],
        },
      ],
    })
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const response = await marketplaceApi.aiGenerate({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        tools: formData.tools,
        requirements: formData.requirements.filter(Boolean),
      })
      if (response.success) {
        setResult(response)
      }
    } catch (error) {
      console.error('Generation failed:', error)
    } finally {
      setGenerating(false)
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 flex items-center gap-2">
            <Check className="w-5 h-5" />
            插件生成成功！
          </h4>
          <p className="text-sm text-green-700 mt-1">{result.explanation}</p>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">生成的代码</span>
            <button
              onClick={() => navigator.clipboard.writeText(result.code)}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              复制
            </button>
          </div>
          <pre className="p-4 text-sm overflow-auto max-h-64 bg-gray-900 text-gray-100">
            {result.code}
          </pre>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              // Publish to marketplace
              onClose()
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Globe className="w-5 h-5" />
            发布到市场
          </button>
          <button
            onClick={() => setResult(null)}
            className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            重新生成
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-h-[60vh] overflow-auto">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">插件名称</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="例如：天气查询助手"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="简单描述这个插件的功能"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="utility">实用工具</option>
          <option value="integration">集成服务</option>
          <option value="automation">自动化</option>
          <option value="ai">AI 增强</option>
          <option value="dev">开发工具</option>
          <option value="data">数据处理</option>
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">工具定义</label>
          <button
            onClick={handleAddTool}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + 添加工具
          </button>
        </div>
        {formData.tools.map((tool, toolIndex) => (
          <div key={toolIndex} className="border border-gray-200 rounded-lg p-3 mb-2">
            <input
              type="text"
              value={tool.name}
              onChange={(e) => {
                const newTools = [...formData.tools]
                newTools[toolIndex].name = e.target.value
                setFormData({ ...formData, tools: newTools })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
              placeholder="工具名称（如：getWeather）"
            />
            <input
              type="text"
              value={tool.description}
              onChange={(e) => {
                const newTools = [...formData.tools]
                newTools[toolIndex].description = e.target.value
                setFormData({ ...formData, tools: newTools })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="工具描述"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating || !formData.name || !formData.description}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            AI 生成中...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            生成插件代码
          </>
        )}
      </button>
    </div>
  )
}
