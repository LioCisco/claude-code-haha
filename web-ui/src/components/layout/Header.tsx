import { Bell, Search, Plus, Command } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索技能、对话、店铺..."
            className="w-full pl-10 pr-12 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accio-500 focus:border-transparent transition-all"
            onClick={() => setShowCommandPalette(true)}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs font-medium text-gray-400 bg-white border border-gray-200 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-accio-600 hover:bg-accio-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-accio-600/20">
          <Plus className="w-4 h-4" />
          新建项目
        </button>

        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900">商家用户</p>
            <p className="text-xs text-gray-500">Pro Plan</p>
          </div>
          <div className="w-9 h-9 bg-gradient-to-br from-ali-400 to-ali-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
            商
          </div>
        </div>
      </div>
    </header>
  )
}
