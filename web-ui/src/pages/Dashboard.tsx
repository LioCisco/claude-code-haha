import { useEffect } from 'react'
import {
  MessageSquare,
  Bot,
  Store,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useChatStore } from '@/store/useChatStore'
import { useStoreBuilderStore } from '@/store/useStoreBuilderStore'

const quickActions = [
  {
    title: 'AI 智能对话',
    description: '与AI团队协作处理电商任务',
    icon: MessageSquare,
    to: '/chat',
    color: 'bg-blue-500',
  },
  {
    title: '配置AI团队',
    description: '自定义您的AI智能体成员',
    icon: Bot,
    to: '/agents',
    color: 'bg-purple-500',
  },
  {
    title: '一键开店',
    description: '30分钟完成店铺搭建',
    icon: Store,
    to: '/store-builder',
    color: 'bg-accio-500',
  },
  {
    title: '数据分析',
    description: '查看店铺运营数据',
    icon: TrendingUp,
    to: '/analytics',
    color: 'bg-ali-500',
  },
]

export default function Dashboard() {
  const { tasks, agents } = useChatStore()
  const { projects } = useStoreBuilderStore()

  const activeAgents = agents.filter((a) => a.status === 'working')
  const recentTasks = tasks.slice(-5).reverse()
  const recentProjects = projects.slice(-3).reverse()

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-accio-600 to-accio-500 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-accio-100 text-sm font-medium">Kane Work</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">欢迎回来，商家用户</h1>
          <p className="text-accio-100 max-w-xl">
            您的AI电商团队已就绪。今天想要探索什么新机会？我可以帮您选品、建站、找供应商，或者优化现有店铺。
          </p>

          <div className="flex gap-3 mt-6">
            <Link
              to="/chat"
              className="px-5 py-2.5 bg-white text-accio-700 font-medium rounded-lg hover:bg-accio-50 transition-colors"
            >
              开始对话
            </Link>
            <Link
              to="/store-builder"
              className="px-5 py-2.5 bg-accio-700 text-white font-medium rounded-lg hover:bg-accio-800 transition-colors"
            >
              一键开店
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            to={action.to}
            className="group p-5 bg-white rounded-xl border border-gray-100 hover:border-accio-200 hover:shadow-lg transition-all"
          >
            <div
              className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
            >
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
            <p className="text-sm text-gray-500">{action.description}</p>
          </Link>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Active Agents */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">AI 团队状态</h3>
            <Link
              to="/agents"
              className="text-sm text-accio-600 hover:text-accio-700 flex items-center gap-1"
            >
              管理 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {agents.slice(0, 5).map((agent) => (
                <div
                  key={agent.id}
                  className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-lg"
                  style={{ backgroundColor: agent.color + '20' }}
                  title={agent.name}
                >
                  {agent.avatar}
                </div>
              ))}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
              <p className="text-sm text-gray-500">智能体成员</p>
            </div>
          </div>
          {activeAgents.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-accio-600">
              <span className="w-2 h-2 bg-accio-500 rounded-full animate-pulse" />
              {activeAgents.length} 个智能体正在工作中
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">进行中的任务</h3>
            <span className="text-sm text-gray-500">
              {tasks.filter((t) => t.status === 'in_progress').length} 进行中
            </span>
          </div>
          <div className="space-y-3">
            {recentTasks.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无任务</p>
            ) : (
              recentTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : task.status === 'in_progress' ? (
                    <Clock className="w-4 h-4 text-ali-500 animate-pulse" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-700 flex-1 truncate">
                    {task.title}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Projects */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">店铺项目</h3>
            <Link
              to="/store-builder"
              className="text-sm text-accio-600 hover:text-accio-700 flex items-center gap-1"
            >
              查看全部 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentProjects.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400 mb-2">还没有店铺项目</p>
                <Link
                  to="/store-builder"
                  className="text-sm text-accio-600 hover:underline"
                >
                  立即创建
                </Link>
              </div>
            ) : (
              recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-accio-400 to-accio-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                    {project.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {project.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {project.products} 个产品
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      project.status === 'live'
                        ? 'bg-green-100 text-green-700'
                        : project.status === 'building'
                        ? 'bg-ali-100 text-ali-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {project.status === 'live'
                      ? '已上线'
                      : project.status === 'building'
                      ? '搭建中'
                      : '草稿'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
