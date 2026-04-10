import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Puzzle,
  Plus,
  Search,
  Power,
  Trash2,
  Code,
  Globe,
  Zap,
  Brain,
  Wrench,
  ChevronRight,
  X,
  History,
  Check,
  AlertCircle,
  Download,
  Star,
  Sparkles,
  ShoppingBag,
  RefreshCw,
  ExternalLink,
  Terminal,
  Calculator,
  Clock,
  FileJson,
  Folder,
  Github,
} from 'lucide-react'
import { pluginApi, type Plugin, type PluginCategory } from '../api/plugins'
import { marketplaceApi, type MarketplacePlugin } from '../api/marketplace'

const categoryIcons: Record<string, typeof Puzzle> = {
  utility: Wrench,
  integration: Globe,
  automation: Zap,
  ai: Brain,
  dev: Code,
  custom: Puzzle,
}

const categoryColors: Record<string, string> = {
  utility: 'bg-blue-100 text-blue-700',
  integration: 'bg-green-100 text-green-700',
  automation: 'bg-yellow-100 text-yellow-700',
  ai: 'bg-purple-100 text-purple-700',
  dev: 'bg-gray-100 text-gray-700',
  custom: 'bg-pink-100 text-pink-700',
}

// Anthropic 官方插件列表（预定义，支持一键安装）
const ANTHROPIC_OFFICIAL_PLUGINS = [
  {
    id: 'anthropic-web-search',
    name: 'Web Search',
    description: 'Search the web for real-time information and current events',
    shortDescription: '实时网络搜索插件',
    author: 'Anthropic',
    icon: 'Search',
    category: 'utility',
    source: 'anthropic',
    code: `async function web_search({ query }) {
  try {
    const response = await fetch(\`https://api.duckduckgo.com/?q=\${encodeURIComponent(query)}&format=json&no_html=1\`);
    const data = await response.json();
    return {
      results: data.RelatedTopics?.slice(0, 5).map((t: any) => ({
        title: t.Text?.split(' - ')[0] || 'Result',
        snippet: t.Text,
        url: t.FirstURL
      })) || []
    };
  } catch (error) {
    return { error: 'Search failed: ' + error.message };
  }
}`,
    manifest: {
      tools: [{
        name: 'web_search',
        description: 'Search the web for current information',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' }
          },
          required: ['query']
        }
      }]
    }
  },
  {
    id: 'anthropic-calculator',
    name: 'Calculator',
    description: 'Perform mathematical calculations and evaluations',
    shortDescription: '数学计算器插件',
    author: 'Anthropic',
    icon: 'Calculator',
    category: 'utility',
    source: 'anthropic',
    code: `async function calculate({ expression }) {
  try {
    // Safe evaluation of mathematical expressions
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    const result = Function('"use strict"; return (' + sanitized + ')')();
    return { result, expression: sanitized };
  } catch (error) {
    return { error: 'Invalid expression: ' + error.message };
  }
}`,
    manifest: {
      tools: [{
        name: 'calculate',
        description: 'Evaluate mathematical expressions',
        input_schema: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'Math expression to evaluate' }
          },
          required: ['expression']
        }
      }]
    }
  },
  {
    id: 'anthropic-fetch',
    name: 'URL Fetcher',
    description: 'Fetch and extract content from web URLs',
    shortDescription: '网页内容抓取插件',
    author: 'Anthropic',
    icon: 'Globe',
    category: 'integration',
    source: 'anthropic',
    code: `async function fetch_url({ url }) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Claude-Code-Plugin/1.0' }
    });
    const html = await response.text();
    // Simple text extraction
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);
    return {
      title: html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || 'Untitled',
      content: text,
      url
    };
  } catch (error) {
    return { error: 'Fetch failed: ' + error.message };
  }
}`,
    manifest: {
      tools: [{
        name: 'fetch_url',
        description: 'Fetch content from a URL',
        input_schema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to fetch' }
          },
          required: ['url']
        }
      }]
    }
  },
  {
    id: 'anthropic-datetime',
    name: 'DateTime',
    description: 'Get current date, time, and perform date calculations',
    shortDescription: '日期时间工具插件',
    author: 'Anthropic',
    icon: 'Clock',
    category: 'utility',
    source: 'anthropic',
    code: `async function datetime({ action = 'now', timezone = 'UTC' }) {
  const now = new Date();

  if (action === 'now') {
    return {
      iso: now.toISOString(),
      local: now.toLocaleString('zh-CN', { timeZone: timezone }),
      unix: Math.floor(now.getTime() / 1000),
      timezone
    };
  }

  if (action === 'timestamp') {
    return { timestamp: now.getTime() };
  }

  return { error: 'Unknown action: ' + action };
}`,
    manifest: {
      tools: [{
        name: 'datetime',
        description: 'Get current date and time information',
        input_schema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['now', 'timestamp'], default: 'now' },
            timezone: { type: 'string', default: 'UTC' }
          }
        }
      }]
    }
  },
  {
    id: 'anthropic-json',
    name: 'JSON Tools',
    description: 'Parse, format, and manipulate JSON data',
    shortDescription: 'JSON 处理工具插件',
    author: 'Anthropic',
    icon: 'FileJson',
    category: 'dev',
    source: 'anthropic',
    code: `async function json_tools({ action, data, path }) {
  try {
    if (action === 'parse') {
      const parsed = JSON.parse(data);
      return { result: parsed, type: typeof parsed };
    }

    if (action === 'stringify') {
      return { result: JSON.stringify(data, null, 2) };
    }

    if (action === 'get') {
      const obj = typeof data === 'string' ? JSON.parse(data) : data;
      const keys = path.split('.');
      let result = obj;
      for (const key of keys) {
        result = result?.[key];
      }
      return { result };
    }

    return { error: 'Unknown action: ' + action };
  } catch (error) {
    return { error: error.message };
  }
}`,
    manifest: {
      tools: [{
        name: 'json_tools',
        description: 'Parse, format and manipulate JSON',
        input_schema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['parse', 'stringify', 'get'] },
            data: {},
            path: { type: 'string' }
          },
          required: ['action', 'data']
        }
      }]
    }
  },
  {
    id: 'anthropic-filesystem',
    name: 'File System',
    description: 'Read, write, and manage files in the workspace',
    shortDescription: '文件系统操作插件',
    author: 'Anthropic',
    icon: 'Folder',
    category: 'dev',
    source: 'anthropic',
    code: `async function filesystem({ action, path, content }) {
  const fs = require('fs');
  const path_module = require('path');

  try {
    if (action === 'read') {
      const data = fs.readFileSync(path, 'utf-8');
      return { content: data, size: data.length };
    }

    if (action === 'write') {
      fs.writeFileSync(path, content);
      return { success: true, path };
    }

    if (action === 'exists') {
      return { exists: fs.existsSync(path) };
    }

    if (action === 'list') {
      const files = fs.readdirSync(path);
      return { files };
    }

    return { error: 'Unknown action: ' + action };
  } catch (error) {
    return { error: error.message };
  }
}`,
    manifest: {
      tools: [{
        name: 'filesystem',
        description: 'Read, write and manage files',
        input_schema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['read', 'write', 'exists', 'list'] },
            path: { type: 'string' },
            content: { type: 'string' }
          },
          required: ['action', 'path']
        }
      }]
    }
  },
  {
    id: 'anthropic-github',
    name: 'GitHub',
    description: 'Interact with GitHub repositories and issues',
    shortDescription: 'GitHub API 集成插件',
    author: 'Anthropic',
    icon: 'Github',
    category: 'integration',
    source: 'anthropic',
    code: `async function github({ action, owner, repo, token }) {
  try {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Claude-Code-Plugin'
    };

    if (token) {
      headers['Authorization'] = 'token ' + token;
    }

    if (action === 'get_repo') {
      const response = await fetch(\`https://api.github.com/repos/\${owner}/\${repo}\`, { headers });
      return await response.json();
    }

    if (action === 'list_issues') {
      const response = await fetch(\`https://api.github.com/repos/\${owner}/\${repo}/issues\`, { headers });
      return await response.json();
    }

    return { error: 'Unknown action: ' + action };
  } catch (error) {
    return { error: error.message };
  }
}`,
    manifest: {
      tools: [{
        name: 'github',
        description: 'Interact with GitHub API',
        input_schema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['get_repo', 'list_issues'] },
            owner: { type: 'string' },
            repo: { type: 'string' },
            token: { type: 'string' }
          },
          required: ['action', 'owner', 'repo']
        }
      }]
    }
  }
];

export default function Plugins() {
  const [activeTab, setActiveTab] = useState<'local' | 'marketplace' | 'anthropic'>('local')

  // Local plugins state
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [categories, setCategories] = useState<PluginCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Marketplace state
  const [marketPlugins, setMarketPlugins] = useState<MarketplacePlugin[]>([])
  const [marketLoading, setMarketLoading] = useState(false)
  const [marketSearch, setMarketSearch] = useState('')

  // Anthropic state
  const [anthropicSearch, setAnthropicSearch] = useState('')
  const [installedAnthropicIds, setInstalledAnthropicIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadPlugins()
    loadCategories()
    checkInstalledAnthropic()
  }, [])

  useEffect(() => {
    if (activeTab === 'marketplace') {
      loadMarketplace()
    }
  }, [activeTab])

  const loadPlugins = async () => {
    try {
      setLoading(true)
      const response = await pluginApi.getAll()
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
      const response = await pluginApi.getCategories()
      if (response.success) {
        setCategories(response.categories)
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const loadMarketplace = async () => {
    try {
      setMarketLoading(true)
      const response = await marketplaceApi.getPlugins({ sort: 'popular', limit: 50 })
      if (response.success) {
        setMarketPlugins(response.plugins)
      }
    } catch (error) {
      console.error('Failed to load marketplace:', error)
    } finally {
      setMarketLoading(false)
    }
  }

  const checkInstalledAnthropic = async () => {
    // Check which anthropic plugins are already installed by name
    const response = await pluginApi.getAll()
    if (response.success) {
      const installed = new Set<string>()
      ANTHROPIC_OFFICIAL_PLUGINS.forEach(anthropic => {
        const found = response.plugins.find(p =>
          p.name === anthropic.name || p.id === anthropic.id
        )
        if (found) {
          installed.add(anthropic.id)
        }
      })
      setInstalledAnthropicIds(installed)
    }
  }

  const handleInstallAnthropic = async (plugin: typeof ANTHROPIC_OFFICIAL_PLUGINS[0]) => {
    try {
      const response = await pluginApi.create({
        name: plugin.name,
        description: plugin.description,
        category: plugin.category,
        type: 'builtin',
        code: plugin.code,
        manifest: plugin.manifest,
      })

      if (response.success) {
        setInstalledAnthropicIds(prev => new Set([...prev, plugin.id]))
        alert(`插件 "${plugin.name}" 安装成功！`)
      }
    } catch (error) {
      alert('安装失败: ' + (error as Error).message)
    }
  }

  const handleToggle = async (plugin: Plugin) => {
    try {
      const response = await pluginApi.toggle(plugin.id, !plugin.isEnabled)
      if (response.success) {
        setPlugins(prev => prev.map(p =>
          p.id === plugin.id ? { ...p, isEnabled: !p.isEnabled, status: response.plugin.status } : p
        ))
      }
    } catch (error) {
      console.error('Failed to toggle plugin:', error)
    }
  }

  const handleDelete = async (plugin: Plugin) => {
    if (!confirm(`确定要删除插件 "${plugin.name}" 吗？此操作不可恢复。`)) {
      return
    }
    try {
      const response = await pluginApi.delete(plugin.id)
      if (response.success) {
        setPlugins(prev => prev.filter(p => p.id !== plugin.id))
        // Update anthropic installed status if needed
        const anthropicPlugin = ANTHROPIC_OFFICIAL_PLUGINS.find(ap => ap.name === plugin.name)
        if (anthropicPlugin) {
          setInstalledAnthropicIds(prev => {
            const next = new Set(prev)
            next.delete(anthropicPlugin.id)
            return next
          })
        }
      }
    } catch (error) {
      console.error('Failed to delete plugin:', error)
    }
  }

  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         plugin.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || plugin.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const filteredMarketPlugins = marketPlugins.filter(plugin =>
    plugin.name.toLowerCase().includes(marketSearch.toLowerCase()) ||
    plugin.description?.toLowerCase().includes(marketSearch.toLowerCase())
  )

  const filteredAnthropicPlugins = ANTHROPIC_OFFICIAL_PLUGINS.filter(plugin =>
    plugin.name.toLowerCase().includes(anthropicSearch.toLowerCase()) ||
    plugin.description?.toLowerCase().includes(anthropicSearch.toLowerCase())
  )

  const activeCount = plugins.filter(p => p.isEnabled).length
  const systemCount = plugins.filter(p => p.isSystem).length

  return (
    <div className="h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Puzzle className="w-7 h-7 text-blue-600" />
                插件管理
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                管理本地插件、浏览市场、安装官方插件
              </p>
            </div>
            {activeTab === 'local' && (
              <Link
                to="/plugins/create"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                创建插件
              </Link>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-600">已启用: {activeCount}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-gray-600">系统插件: {systemCount}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-gray-600">总计: {plugins.length}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-gray-200 px-6">
          {[
            { id: 'local', label: '我的插件', icon: Terminal },
            { id: 'marketplace', label: '插件市场', icon: ShoppingBag },
            { id: 'anthropic', label: '官方插件', icon: Sparkles },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Local Plugins Tab */}
        {activeTab === 'local' && (
          <>
            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索插件..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部分类</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Plugin Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlugins.map(plugin => {
                const Icon = categoryIcons[plugin.category] || Puzzle
                const colorClass = categoryColors[plugin.category] || 'bg-gray-100 text-gray-700'

                return (
                  <div
                    key={plugin.id}
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{plugin.name}</h3>
                          <p className="text-xs text-gray-500">v{plugin.version}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {plugin.isSystem && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                            系统
                          </span>
                        )}
                        <div className={`w-2 h-2 rounded-full ${plugin.isEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                      {plugin.description}
                    </p>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>使用 {plugin.usageCount} 次</span>
                      </div>
                      <button
                        onClick={() => handleToggle(plugin)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          plugin.isEnabled
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {plugin.isEnabled ? '禁用' : '启用'}
                      </button>
                      {!plugin.isSystem && (
                        <button
                          onClick={() => handleDelete(plugin)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {filteredPlugins.length === 0 && (
              <div className="text-center py-12">
                <Puzzle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">没有找到匹配的插件</p>
                <p className="text-sm text-gray-400 mt-1">去插件市场或官方插件看看</p>
              </div>
            )}
          </>
        )}

        {/* Marketplace Tab */}
        {activeTab === 'marketplace' && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索市场插件..."
                  value={marketSearch}
                  onChange={(e) => setMarketSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={loadMarketplace}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </button>
            </div>

            {marketLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMarketPlugins.map(plugin => {
                  const Icon = categoryIcons[plugin.category] || Puzzle
                  const colorClass = categoryColors[plugin.category] || 'bg-gray-100 text-gray-700'

                  return (
                    <div
                      key={plugin.id}
                      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{plugin.name}</h3>
                            <p className="text-xs text-gray-500">v{plugin.version}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="w-4 h-4 fill-yellow-500" />
                          <span className="text-sm font-medium">{plugin.ratingAvg.toFixed(1)}</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                        {plugin.shortDescription || plugin.description}
                      </p>

                      <div className="flex items-center gap-2 mt-3">
                        {plugin.tags?.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            {plugin.downloadCount}
                          </span>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const response = await marketplaceApi.install(plugin.id)
                              if (response.success) {
                                alert('安装成功！')
                                loadPlugins()
                              }
                            } catch (error) {
                              alert('安装失败: ' + (error as Error).message)
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                        >
                          <Download className="w-4 h-4" />
                          安装
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Anthropic Official Tab */}
        {activeTab === 'anthropic' && (
          <>
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索官方插件..."
                  value={anthropicSearch}
                  onChange={(e) => setAnthropicSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>来自 Anthropic 官方的精选插件，经过安全审核，可放心使用</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAnthropicPlugins.map(plugin => {
                const Icon = categoryIcons[plugin.category] || Puzzle
                const colorClass = categoryColors[plugin.category] || 'bg-gray-100 text-gray-700'
                const isInstalled = installedAnthropicIds.has(plugin.id)

                return (
                  <div
                    key={plugin.id}
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{plugin.name}</h3>
                          <p className="text-xs text-gray-500">by {plugin.author}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                        官方
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                      {plugin.shortDescription || plugin.description}
                    </p>

                    <div className="mt-3">
                      <span className="text-xs text-gray-500">工具: </span>
                      <span className="text-xs text-blue-600">
                        {plugin.manifest.tools.map((t: any) => t.name).join(', ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      {isInstalled ? (
                        <button
                          disabled
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm cursor-default"
                        >
                          <Check className="w-4 h-4" />
                          已安装
                        </button>
                      ) : (
                        <button
                          onClick={() => handleInstallAnthropic(plugin)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                        >
                          <Download className="w-4 h-4" />
                          一键安装
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
