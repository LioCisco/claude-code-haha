import { useState } from 'react'
import {
  Store,
  ChevronRight,
  ChevronLeft,
  Check,
  Globe,
  ShoppingBag,
  Upload,
  Plus,
  Sparkles,
  Wand2,
  Search,
  ExternalLink,
  Save,
} from 'lucide-react'
import { useStoreBuilderStore } from '@/store/useStoreBuilderStore'
import { cn } from '@/lib/utils'

const steps = [
  { id: 'idea', name: '商业创意', description: '描述您的商业想法' },
  { id: 'research', name: '市场调研', description: 'AI分析市场和选品' },
  { id: 'products', name: '产品选择', description: '选择要销售的产品' },
  { id: 'store', name: '店铺搭建', description: '创建您的在线店铺' },
  { id: 'launch', name: '发布上线', description: '正式发布您的店铺' },
]

const platforms = [
  { id: 'shopify', name: 'Shopify', icon: '🛍️', description: '全球领先的电商平台' },
  { id: 'woocommerce', name: 'WooCommerce', icon: '🔌', description: 'WordPress电商插件' },
  { id: 'amazon', name: 'Amazon', icon: '📦', description: '全球最大的电商平台' },
]

export default function StoreBuilder() {
  const { currentStep, setCurrentStep, projects, currentProject } = useStoreBuilderStore()
  const [businessIdea, setBusinessIdea] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState('shopify')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleGenerate = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      handleNext()
    }, 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">一键开店</h1>
        <p className="text-gray-500 mt-1">30分钟完成从创意到上线的全流程，AI自动完成选品、建站、找供应商</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    index < currentStep
                      ? 'bg-accio-600 text-white'
                      : index === currentStep
                      ? 'bg-accio-100 text-accio-700 ring-2 ring-accio-500'
                      : 'bg-gray-100 text-gray-400'
                  )}
                >
                  {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
                </div>
                <span
                  className={cn(
                    'text-xs mt-2 font-medium',
                    index <= currentStep ? 'text-gray-900' : 'text-gray-400'
                  )}
                >
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-24 h-0.5 mx-2',
                    index < currentStep ? 'bg-accio-600' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 min-h-[400px]">
        {currentStep === 0 && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-accio-400 to-accio-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">描述您的商业创意</h2>
            <p className="text-gray-500 mb-8">
              告诉我们您想做什么生意，AI团队将为您完成市场调研、选品分析和店铺搭建
            </p>

            <div className="space-y-4">
              <textarea
                value={businessIdea}
                onChange={(e) => setBusinessIdea(e.target.value)}
                placeholder="例如：我想卖环保材质的宠物家具，主打北欧简约风格，面向欧美市场..."
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-accio-500"
              />

              <div className="flex flex-wrap gap-2 justify-center">
                {['可持续时尚女装', '智能家居小电器', '手工皮具配饰', '有机护肤产品', '户外运动装备'].map(
                  (idea) => (
                    <button
                      key={idea}
                      onClick={() => setBusinessIdea(`我想做${idea}的跨境电商`)}
                      className="px-4 py-2 bg-gray-50 hover:bg-accio-50 text-sm text-gray-600 hover:text-accio-700 rounded-full transition-colors"
                    >
                      {idea}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={handleGenerate}
                disabled={!businessIdea.trim() || isGenerating}
                className="flex items-center gap-2 px-8 py-3 bg-accio-600 hover:bg-accio-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    AI分析中...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    开始AI分析
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Search className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">市场调研与选品分析</h2>
                <p className="text-sm text-gray-500">基于阿里10亿+商品数据的智能分析</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Market Analysis */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-4">市场分析</h3>
                <div className="space-y-4">
                  {[
                    { label: '市场规模', value: '$12.5B', trend: '+15%' },
                    { label: '年增长率', value: '23%', trend: '↑' },
                    { label: '竞争强度', value: '中等', trend: '可控' },
                    { label: '目标客群', value: '25-40岁', trend: '女性为主' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{item.value}</span>
                        <span className="text-xs text-green-600">{item.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Products */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-4">推荐品类</h3>
                <div className="space-y-3">
                  {[
                    { name: '可拆卸宠物窝', score: 95, margin: '45%' },
                    { name: '北欧风猫爬架', score: 92, margin: '52%' },
                    { name: '环保材质食盆', score: 88, margin: '38%' },
                    { name: '智能喂食器', score: 85, margin: '41%' },
                  ].map((product) => (
                    <div key={product.name} className="flex items-center justify-between p-2 bg-white rounded-lg">
                      <span className="text-sm font-medium text-gray-900">{product.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">毛利 {product.margin}</span>
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          潜力 {product.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={handlePrev} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                上一步
              </button>
              <button onClick={handleNext} className="px-6 py-2 bg-accio-600 hover:bg-accio-700 text-white rounded-lg">
                确认选品
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">选择产品</h2>
                  <p className="text-sm text-gray-500">从1688供应商库中选择具体产品</p>
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-accio-100 text-accio-700 rounded-lg">
                <Sparkles className="w-4 h-4" />
                AI自动选品
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <ShoppingBag className="w-12 h-12 text-gray-300" />
                  </div>
                  <div className="p-4">
                    <h4 className="font-medium text-gray-900 mb-1">北欧风宠物窝 #{i}</h4>
                    <p className="text-sm text-gray-500 mb-3">供应商：浙江XX家居</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-gray-900">¥{(50 + i * 10).toFixed(0)}</span>
                        <span className="text-xs text-gray-400 ml-1">成本价</span>
                      </div>
                      <button className="px-3 py-1 bg-accio-600 text-white text-sm rounded-lg">选择</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={handlePrev} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                上一步
              </button>
              <button onClick={handleNext} className="px-6 py-2 bg-accio-600 hover:bg-accio-700 text-white rounded-lg">
                确认选择
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">选择电商平台</h2>
                <p className="text-sm text-gray-500">选择您要搭建店铺的平台</p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {platforms.map((platform) => (
                <div
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={cn(
                    'flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all',
                    selectedPlatform === platform.id
                      ? 'border-accio-500 bg-accio-50'
                      : 'border-gray-200 hover:border-accio-300'
                  )}
                >
                  <span className="text-3xl">{platform.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                    <p className="text-sm text-gray-500">{platform.description}</p>
                  </div>
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      selectedPlatform === platform.id
                        ? 'border-accio-600 bg-accio-600'
                        : 'border-gray-300'
                    )}
                  >
                    {selectedPlatform === platform.id && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-xl p-5 mb-8">
              <h3 className="font-medium text-gray-900 mb-3">店铺配置</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">店铺名称</label>
                  <input
                    type="text"
                    placeholder="例如：PetComfort家居"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">店铺描述</label>
                  <textarea
                    placeholder="简短描述您的店铺..."
                    className="w-full h-20 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-accio-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={handlePrev} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                上一步
              </button>
              <button onClick={handleNext} className="px-6 py-2 bg-accio-600 hover:bg-accio-700 text-white rounded-lg">
                开始搭建
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">店铺搭建完成！</h2>
            <p className="text-gray-500 mb-8">
              您的宠物家具店铺已成功创建，包含8款产品、完整的店铺页面和SEO优化
            </p>

            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: '上架产品', value: '8款' },
                  { label: '预计月流量', value: '2,500' },
                  { label: '预计毛利率', value: '45%' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors">
                <Save className="w-5 h-5" />
                保存草稿
              </button>
              <button className="flex items-center gap-2 px-6 py-3 bg-accio-600 hover:bg-accio-700 text-white font-medium rounded-xl transition-colors">
                <Globe className="w-5 h-5" />
                立即上线
              </button>
              <button className="flex items-center gap-2 px-6 py-3 bg-ali-600 hover:bg-ali-700 text-white font-medium rounded-xl transition-colors">
                <ExternalLink className="w-5 h-5" />
                预览店铺
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
