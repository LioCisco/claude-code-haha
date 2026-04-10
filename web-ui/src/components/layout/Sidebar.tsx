import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Wrench,
  Store,
  BarChart3,
  Settings,
  Sparkles,
  Zap,
  Clock,
  GitBranch,
  Brain,
  Puzzle,
  ShoppingBag,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: '工作台', to: '/', icon: LayoutDashboard },
  { name: '智能对话', to: '/chat', icon: MessageSquare },
  { name: 'AI 团队', to: '/agents', icon: Bot },
  { name: '技能库', to: '/skills', icon: Wrench },
  { name: '工作流', to: '/workflows', icon: GitBranch },
  { name: '记忆管理', to: '/memories', icon: Brain },
  { name: '插件', to: '/plugins', icon: Puzzle },
  { name: '店铺搭建', to: '/store-builder', icon: Store },
  { name: '数据分析', to: '/analytics', icon: BarChart3 },
  { name: '定时任务', to: '/scheduled-tasks', icon: Clock },
]

export default function Sidebar() {
  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-accio-500 to-accio-600 rounded-xl flex items-center justify-center shadow-lg shadow-accio-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-ali-500 rounded-full flex items-center justify-center">
            <Zap className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Kane Work</h1>
          <p className="text-xs text-gray-500">AI 电商智能体</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-accio-50 text-accio-700 shadow-sm ring-1 ring-accio-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-100">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50'
            )
          }
        >
          <Settings className="w-5 h-5" />
          设置
        </NavLink>

        {/* Token Usage */}
        <div className="mt-4 px-4 py-3 bg-gradient-to-br from-accio-500 to-accio-600 rounded-xl">
          <div className="flex items-center justify-between text-white">
            <span className="text-sm font-medium">剩余 Token</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Free</span>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-white/80 mb-1">
              <span>8,432 / 10,000</span>
              <span>84%</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: '84%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
