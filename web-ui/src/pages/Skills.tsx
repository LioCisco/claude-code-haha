import { useState } from 'react'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Skill {
  id: string
  name: string
  description: string
  icon: React.ElementType
  category: string
  status: 'active' | 'inactive' | 'pending'
  usage: number
  isBuiltIn: boolean
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

const skills: Skill[] = [
  {
    id: '1688-search',
    name: '1688 智能搜货',
    description: '基于图片或文字描述在1688平台搜索优质货源，自动比价和筛选供应商',
    icon: ShoppingCart,
    category: 'procurement',
    status: 'active',
    usage: 1234,
    isBuiltIn: true,
  },
  {
    id: 'product-description',
    name: '商品描述生成',
    description: '自动生成吸引人的商品标题和描述，支持多语言翻译',
    icon: FileText,
    category: 'content',
    status: 'active',
    usage: 892,
    isBuiltIn: true,
  },
  {
    id: 'ai-model-image',
    name: 'AI 模特生成',
    description: '自动生成专业的产品展示图和AI模特试穿图',
    icon: Image,
    category: 'content',
    status: 'active',
    usage: 567,
    isBuiltIn: true,
  },
  {
    id: 'shopify-builder',
    name: 'Shopify 店铺搭建',
    description: '自动创建和配置Shopify店铺，包括主题安装和页面设计',
    icon: Globe,
    category: 'store',
    status: 'active',
    usage: 234,
    isBuiltIn: true,
  },
  {
    id: 'seo-optimizer',
    name: 'SEO 优化器',
    description: '自动优化商品关键词、标题和描述，提升搜索排名',
    icon: TrendingUp,
    category: 'store',
    status: 'active',
    usage: 445,
    isBuiltIn: true,
  },
  {
    id: 'social-post',
    name: '社媒内容发布',
    description: '自动生成并发布Instagram、X、Reddit等社交平台内容',
    icon: MessageSquare,
    category: 'marketing',
    status: 'active',
    usage: 678,
    isBuiltIn: true,
  },
  {
    id: 'competitor-analysis',
    name: '竞品分析',
    description: '深度分析竞品定价策略、销售数据和市场定位',
    icon: BarChart3,
    category: 'research',
    status: 'active',
    usage: 345,
    isBuiltIn: true,
  },
  {
    id: 'rfq-automation',
    name: '自动询价系统',
    description: '自动向多个供应商发起RFQ并进行多轮谈判',
    icon: Database,
    category: 'procurement',
    status: 'pending',
    usage: 0,
    isBuiltIn: true,
  },
  {
    id: 'compliance-check',
    name: '合规性检查',
    description: '自动检查产品是否符合目标市场的法规要求',
    icon: Shield,
    category: 'research',
    status: 'inactive',
    usage: 123,
    isBuiltIn: true,
  },
  {
    id: 'ads-optimizer',
    name: '广告优化',
    description: '自动优化Facebook、Google广告投放策略',
    icon: Zap,
    category: 'marketing',
    status: 'active',
    usage: 289,
    isBuiltIn: true,
  },
  {
    id: 'custom-skill-1',
    name: '我的自定义技能',
    description: '用户自定义的技能描述',
    icon: Code,
    category: 'store',
    status: 'active',
    usage: 45,
    isBuiltIn: false,
  },
]

export default function Skills() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)

  const filteredSkills = skills.filter((skill) => {
    const matchesCategory = activeCategory === 'all' || skill.category === activeCategory
    const matchesSearch =
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const activeSkills = skills.filter((s) => s.status === 'active').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">技能库</h1>
          <p className="text-gray-500 mt-1">管理和配置您的AI技能，扩展智能体能力</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-accio-600 hover:bg-accio-700 text-white font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          创建技能
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '技能总数', value: skills.length, color: 'bg-blue-500' },
          { label: '已激活', value: activeSkills, color: 'bg-green-500' },
          { label: '本月调用', value: '5.2K', color: 'bg-ali-500' },
          { label: '自定义技能', value: skills.filter((s) => !s.isBuiltIn).length, color: 'bg-purple-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索技能..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
          />
        </div>
        <div className="flex gap-2">
          {skillCategories.map((category) => (
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
      <div className="grid grid-cols-3 gap-4">
        {filteredSkills.map((skill) => (
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
                <skill.icon
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
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-start gap-4 mb-6">
              <div
                className={cn(
                  'w-16 h-16 rounded-xl flex items-center justify-center',
                  selectedSkill.status === 'active' ? 'bg-accio-100' : 'bg-gray-100'
                )}
              >
                <selectedSkill.icon
                  className={cn(
                    'w-8 h-8',
                    selectedSkill.status === 'active' ? 'text-accio-600' : 'text-gray-400'
                  )}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-gray-900">{selectedSkill.name}</h3>
                  <StatusBadge status={selectedSkill.status} />
                </div>
                <p className="text-gray-500">{selectedSkill.description}</p>
              </div>
              <button onClick={() => setSelectedSkill(null)} className="text-gray-400 hover:text-gray-600">
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
              <button className="flex items-center gap-2 px-4 py-2 bg-accio-600 hover:bg-accio-700 text-white rounded-lg">
                <Play className="w-4 h-4" />
                立即运行
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
    pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
  }
  const config = configs[status as keyof typeof configs]

  return (
    <span className={cn('flex items-center gap-1 px-2 py-1 text-xs rounded-full', config.color)}>
      <config.icon className="w-3 h-3" />
      {status === 'active' ? '已激活' : status === 'inactive' ? '未激活' : '配置中'}
    </span>
  )
}
