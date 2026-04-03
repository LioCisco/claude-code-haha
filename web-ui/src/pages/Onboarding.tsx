import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Bot,
  MessageSquare,
  Store,
  TrendingUp,
  Shield,
  Zap,
} from 'lucide-react'

const steps = [
  {
    id: 'welcome',
    title: '欢迎来到 Kane Work',
    description: '您的AI电商智能工作台',
  },
  {
    id: 'features',
    title: '探索核心功能',
    description: '了解AI团队如何帮助您',
  },
  {
    id: 'setup',
    title: '快速设置',
    description: '配置您的首选项',
  },
  {
    id: 'ready',
    title: '准备就绪',
    description: '开始您的AI电商之旅',
  },
]

const features = [
  {
    icon: Bot,
    title: 'AI 智能团队',
    description: '5个专业AI智能体，分别擅长选品、内容、运营、采购和营销',
    color: 'bg-blue-500',
  },
  {
    icon: MessageSquare,
    title: '自然语言交互',
    description: '像聊天一样与AI团队协作，无需学习复杂操作',
    color: 'bg-purple-500',
  },
  {
    icon: Store,
    title: '一键开店',
    description: '30分钟完成从创意到上线的全流程，自动完成选品和建站',
    color: 'bg-green-500',
  },
  {
    icon: TrendingUp,
    title: '智能分析',
    description: '基于阿里10亿+商品数据的智能市场分析和趋势预测',
    color: 'bg-ali-500',
  },
  {
    icon: Shield,
    title: '数据安全',
    description: '本地优先架构，核心数据存储在您设备上，完全可控',
    color: 'bg-red-500',
  },
  {
    icon: Zap,
    title: '自动化工作流',
    description: '7×24小时自动执行，包括社媒发布、库存监控、客户回复等',
    color: 'bg-yellow-500',
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedUseCase, setSelectedUseCase] = useState('')
  const [teamSize, setTeamSize] = useState('')

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      navigate('/')
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-accio-50/30 flex items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all duration-300 ${
                index <= currentStep ? 'w-16 bg-accio-500' : 'w-16 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {currentStep === 0 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-accio-400 to-accio-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-accio-500/30">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                欢迎来到 Kane Work
              </h1>
              <p className="text-lg text-gray-500 max-w-md mx-auto mb-8">
                您的AI电商智能工作台。一人+AI=一整个跨境团队，30分钟零基础开店。
              </p>

              <div className="flex flex-wrap gap-3 justify-center mb-8">
                {['AI选品', '自动建站', '供应商对接', '社媒营销', '7×24自动化'].map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-1.5 bg-accio-50 text-accio-700 rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-8 py-3 bg-accio-600 hover:bg-accio-700 text-white font-medium rounded-xl transition-colors"
              >
                开始使用
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  探索核心功能
                </h2>
                <p className="text-gray-500">
                  Kane Work 提供全方位的AI电商解决方案
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="p-5 bg-gray-50 rounded-xl hover:bg-accio-50 transition-colors group"
                  >
                    <div
                      className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-500">{feature.description}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-center mt-8">
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-accio-600 hover:bg-accio-700 text-white font-medium rounded-xl transition-colors"
                >
                  继续
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="max-w-lg mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  快速设置
                </h2>
                <p className="text-gray-500">
                  帮助我们为您定制最佳体验
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    您的主要业务场景是？
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'new', label: '零基础创业', desc: '想要开始跨境电商' },
                      { id: 'existing', label: '已有业务', desc: '想提升现有店铺' },
                      { id: 'agency', label: '代运营', desc: '为客户管理店铺' },
                      { id: 'brand', label: '品牌出海', desc: '拓展海外市场' },
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSelectedUseCase(option.id)}
                        className={`p-4 border-2 rounded-xl text-left transition-all ${
                          selectedUseCase === option.id
                            ? 'border-accio-500 bg-accio-50'
                            : 'border-gray-200 hover:border-accio-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900">{option.label}</p>
                        <p className="text-sm text-gray-500">{option.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    您的团队规模？
                  </label>
                  <div className="flex gap-3">
                    {['个人', '2-5人', '6-20人', '20人以上'].map((size) => (
                      <button
                        key={size}
                        onClick={() => setTeamSize(size)}
                        className={`flex-1 py-3 border-2 rounded-xl text-sm font-medium transition-all ${
                          teamSize === size
                            ? 'border-accio-500 bg-accio-50 text-accio-700'
                            : 'border-gray-200 text-gray-600 hover:border-accio-300'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  返回
                </button>
                <button
                  onClick={handleNext}
                  disabled={!selectedUseCase || !teamSize}
                  className="flex items-center gap-2 px-8 py-3 bg-accio-600 hover:bg-accio-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                >
                  继续
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                准备就绪！
              </h2>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                您的AI电商团队已配置完成。现在可以开始与AI协作，或一键创建您的第一家店铺。
              </p>

              <div className="bg-gray-50 rounded-xl p-6 mb-8 max-w-md mx-auto">
                <h3 className="font-medium text-gray-900 mb-4">您的配置</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">AI智能体</span>
                    <span className="font-medium text-gray-900">5个已激活</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">免费Token</span>
                    <span className="font-medium text-gray-900">10,000/月</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">数据存储</span>
                    <span className="font-medium text-gray-900">本地优先</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => navigate('/chat')}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                >
                  与AI对话
                </button>
                <button
                  onClick={() => navigate('/store-builder')}
                  className="flex items-center gap-2 px-6 py-3 bg-accio-600 hover:bg-accio-700 text-white font-medium rounded-xl transition-colors"
                >
                  <Store className="w-5 h-5" />
                  一键开店
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Skip */}
        {currentStep < steps.length - 1 && (
          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              跳过引导
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
