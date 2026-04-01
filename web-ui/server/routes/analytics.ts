import { Elysia, t } from 'elysia'

const analyticsData = {
  sales: [
    { date: '01/01', sales: 4200, orders: 45, visitors: 1200 },
    { date: '01/02', sales: 5100, orders: 52, visitors: 1450 },
    { date: '01/03', sales: 4800, orders: 48, visitors: 1320 },
    { date: '01/04', sales: 6200, orders: 65, visitors: 1680 },
    { date: '01/05', sales: 7500, orders: 78, visitors: 2100 },
    { date: '01/06', sales: 6800, orders: 71, visitors: 1850 },
    { date: '01/07', sales: 8900, orders: 92, visitors: 2400 },
  ],
  products: [
    { name: '可拆卸宠物窝', sales: 12500, percentage: 35 },
    { name: '北欧风猫爬架', sales: 9800, percentage: 28 },
    { name: '环保材质食盆', sales: 6200, percentage: 18 },
    { name: '智能喂食器', sales: 4500, percentage: 13 },
    { name: '其他', sales: 2100, percentage: 6 },
  ],
  summary: {
    totalSales: 43500,
    totalOrders: 451,
    totalVisitors: 12000,
    conversion: 3.76,
    salesChange: 12.5,
    ordersChange: 8.2,
    visitorsChange: 15.3,
    conversionChange: -0.5,
  }
}

export const analyticsRoutes = new Elysia({ prefix: '/api/analytics' })
  .get('/', () => analyticsData)
  .get('/sales', () => analyticsData.sales)
  .get('/products', () => analyticsData.products)
  .get('/summary', () => analyticsData.summary)
