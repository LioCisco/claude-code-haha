import { useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  MousePointer,
  Calendar,
  Download,
  Filter,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const timeRanges = [
  { id: '7d', name: '近7天' },
  { id: '30d', name: '近30天' },
  { id: '90d', name: '近90天' },
  { id: '1y', name: '近1年' },
]

const salesData = [
  { date: '01/01', sales: 4200, orders: 45, visitors: 1200 },
  { date: '01/02', sales: 5100, orders: 52, visitors: 1450 },
  { date: '01/03', sales: 4800, orders: 48, visitors: 1320 },
  { date: '01/04', sales: 6200, orders: 65, visitors: 1680 },
  { date: '01/05', sales: 7500, orders: 78, visitors: 2100 },
  { date: '01/06', sales: 6800, orders: 71, visitors: 1850 },
  { date: '01/07', sales: 8900, orders: 92, visitors: 2400 },
]

const productData = [
  { name: '可拆卸宠物窝', sales: 12500, percentage: 35 },
  { name: '北欧风猫爬架', sales: 9800, percentage: 28 },
  { name: '环保材质食盆', sales: 6200, percentage: 18 },
  { name: '智能喂食器', sales: 4500, percentage: 13 },
  { name: '其他', sales: 2100, percentage: 6 },
]

const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#8b5cf6', '#64748b']

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('7d')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据分析</h1>
          <p className="text-gray-500 mt-1">查看店铺运营数据和销售趋势</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {timeRanges.map((range) => (
              <button
                key={range.id}
                onClick={() => setTimeRange(range.id)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  timeRange === range.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range.name}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-sm">
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: '总销售额',
            value: '$43,500',
            change: '+12.5%',
            up: true,
            icon: DollarSign,
            color: 'bg-green-500',
          },
          {
            label: '订单数',
            value: '451',
            change: '+8.2%',
            up: true,
            icon: ShoppingCart,
            color: 'bg-blue-500',
          },
          {
            label: '访客数',
            value: '12,000',
            change: '+15.3%',
            up: true,
            icon: Users,
            color: 'bg-purple-500',
          },
          {
            label: '转化率',
            value: '3.76%',
            change: '-0.5%',
            up: false,
            icon: MousePointer,
            color: 'bg-ali-500',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{kpi.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
              </div>
              <div className={`w-10 h-10 ${kpi.color} rounded-lg flex items-center justify-center`}>
                <kpi.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4">
              {kpi.up ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm ${kpi.up ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.change}
              </span>
              <span className="text-sm text-gray-400">较上期</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">销售趋势</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Sales Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">产品销售分布</h3>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie
                  data={productData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="percentage"
                >
                  {productData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {productData.map((product, index) => (
                <div key={product.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-sm text-gray-600 flex-1">{product.name}</span>
                  <span className="text-sm font-medium text-gray-900">{product.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Orders Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">订单与访客趋势</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
              <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} name="订单数" />
              <Line type="monotone" dataKey="visitors" stroke="#8b5cf6" strokeWidth={2} name="访客数" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
