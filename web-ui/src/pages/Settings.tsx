import { useState } from 'react'
import {
  User,
  Bell,
  Shield,
  Globe,
  CreditCard,
  Key,
  Store,
  Users,
  ChevronRight,
  Save,
  Check,
} from 'lucide-react'

const settingsSections = [
  { id: 'account', name: '账户设置', icon: User },
  { id: 'notifications', name: '通知偏好', icon: Bell },
  { id: 'security', name: '安全与隐私', icon: Shield },
  { id: 'integrations', name: '平台集成', icon: Globe },
  { id: 'billing', name: '计费与订阅', icon: CreditCard },
  { id: 'team', name: '团队成员', icon: Users },
]

export default function Settings() {
  const [activeSection, setActiveSection] = useState('account')

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">设置</h1>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 space-y-1">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                activeSection === section.id
                  ? 'bg-accio-50 text-accio-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <section.icon className="w-5 h-5" />
              <span className="font-medium">{section.name}</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6">
          {activeSection === 'account' && <AccountSettings />}
          {activeSection === 'notifications' && <NotificationSettings />}
          {activeSection === 'security' && <SecuritySettings />}
          {activeSection === 'integrations' && <IntegrationSettings />}
          {activeSection === 'billing' && <BillingSettings />}
          {activeSection === 'team' && <TeamSettings />}
        </div>
      </div>
    </div>
  )
}

function AccountSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">账户信息</h2>
        <p className="text-sm text-gray-500">管理您的个人资料信息</p>
      </div>

      <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
        <div className="w-20 h-20 bg-gradient-to-br from-accio-400 to-accio-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
          商
        </div>
        <div>
          <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors">
            更换头像
          </button>
          <p className="text-xs text-gray-400 mt-2">支持 JPG、PNG 格式，最大 2MB</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">显示名称</label>
          <input
            type="text"
            defaultValue="商家用户"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">邮箱地址</label>
          <input
            type="email"
            defaultValue="user@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
          <input
            type="tel"
            defaultValue="+86 138****8888"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">所在地区</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500">
            <option>中国大陆</option>
            <option>中国香港</option>
            <option>美国</option>
            <option>新加坡</option>
          </select>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100">
        <button className="flex items-center gap-2 px-6 py-2 bg-accio-600 hover:bg-accio-700 text-white rounded-lg">
          <Save className="w-4 h-4" />
          保存更改
        </button>
      </div>
    </div>
  )
}

function NotificationSettings() {
  const [settings, setSettings] = useState({
    email: true,
    push: true,
    sms: false,
    marketing: false,
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">通知偏好</h2>
        <p className="text-sm text-gray-500">选择您希望接收的通知类型</p>
      </div>

      <div className="space-y-4">
        {[
          { key: 'email', label: '邮件通知', description: '接收订单、系统更新等邮件通知' },
          { key: 'push', label: '推送通知', description: '在浏览器或App中接收实时推送' },
          { key: 'sms', label: '短信通知', description: '重要事件通过短信通知' },
          { key: 'marketing', label: '营销邮件', description: '接收产品更新、优惠活动等信息' },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">{item.label}</p>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings[item.key as keyof typeof settings]}
                onChange={(e) =>
                  setSettings({ ...settings, [item.key]: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accio-600"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">安全与隐私</h2>
        <p className="text-sm text-gray-500">管理账户安全和数据隐私设置</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">双重验证 (2FA)</p>
                <p className="text-sm text-gray-500">已启用 Google Authenticator</p>
              </div>
            </div>
            <button className="text-sm text-accio-600 hover:text-accio-700">管理</button>
          </div>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">API 密钥</p>
                <p className="text-sm text-gray-500">管理API访问密钥</p>
              </div>
            </div>
            <button className="text-sm text-accio-600 hover:text-accio-700">查看</button>
          </div>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">登录历史</p>
                <p className="text-sm text-gray-500">查看最近登录活动</p>
              </div>
            </div>
            <button className="text-sm text-accio-600 hover:text-accio-700">查看</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function IntegrationSettings() {
  const [connected, setConnected] = useState({
    shopify: true,
    woocommerce: false,
    amazon: false,
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">平台集成</h2>
        <p className="text-sm text-gray-500">连接您的电商平台账号</p>
      </div>

      <div className="space-y-4">
        {[
          { key: 'shopify', name: 'Shopify', icon: '🛍️', description: '已连接 1 个店铺' },
          { key: 'woocommerce', name: 'WooCommerce', icon: '🔌', description: '未连接' },
          { key: 'amazon', name: 'Amazon Seller', icon: '📦', description: '未连接' },
        ].map((platform) => (
          <div key={platform.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{platform.icon}</span>
              <div>
                <p className="font-medium text-gray-900">{platform.name}</p>
                <p className="text-sm text-gray-500">{platform.description}</p>
              </div>
            </div>
            <button
              onClick={() =>
                setConnected({ ...connected, [platform.key]: !connected[platform.key as keyof typeof connected] })
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                connected[platform.key as keyof typeof connected]
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-accio-600 text-white hover:bg-accio-700'
              }`}
            >
              {connected[platform.key as keyof typeof connected] ? '已连接' : '连接'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function BillingSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">计费与订阅</h2>
        <p className="text-sm text-gray-500">管理您的订阅计划和支付方式</p>
      </div>

      <div className="bg-gradient-to-r from-accio-500 to-accio-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-accio-100 text-sm">当前方案</p>
            <p className="text-2xl font-bold">Pro Plan</p>
            <p className="text-sm text-accio-100 mt-1">每月 $29，包含 50,000 Token</p>
          </div>
          <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors">
            升级方案
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-medium text-gray-900 mb-3">Token 使用</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">本月已使用</span>
            <span className="font-medium text-gray-900">32,450 / 50,000</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-accio-500 rounded-full" style={{ width: '65%' }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">将在 12 天后重置</p>
        </div>
      </div>
    </div>
  )
}

function TeamSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">团队成员</h2>
        <p className="text-sm text-gray-500">管理可以访问您账户的团队成员</p>
      </div>

      <div className="space-y-3">
        {[
          { name: '商家用户', email: 'owner@example.com', role: '所有者', avatar: '商' },
          { name: '运营专员', email: 'ops@example.com', role: '管理员', avatar: '运' },
          { name: '选品助理', email: 'buyer@example.com', role: '成员', avatar: '选' },
        ].map((member) => (
          <div key={member.email} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-medium">
                {member.avatar}
              </div>
              <div>
                <p className="font-medium text-gray-900">{member.name}</p>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{member.role}</span>
              <button className="text-sm text-gray-400 hover:text-gray-600">⋮</button>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-accio-400 hover:text-accio-600 transition-colors">
        + 邀请新成员
      </button>
    </div>
  )
}
