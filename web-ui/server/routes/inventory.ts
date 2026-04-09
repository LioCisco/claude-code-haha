import { Elysia, t } from 'elysia'
import { query, execute } from '../db'

// 库存商品类型
interface InventoryItem {
  id: string
  sku: string
  asin?: string
  name: string
  currentStock: number
  safetyStock: number
  reorderPoint: number
  reorderQuantity: number
  salesVelocity: number // 日均销量
  status: 'critical' | 'low' | 'normal' | 'excess'
  estimatedDaysRemaining: number
  lastRestocked: Date
  supplier?: string
  cost?: number
}

// 模拟库存数据（实际应从数据库获取）
const mockInventory: InventoryItem[] = [
  {
    id: '1',
    sku: 'PET-BED-001-GR',
    asin: 'B08N5WRWNW',
    name: '可拆卸宠物窝 - 灰色款',
    currentStock: 8,
    safetyStock: 50,
    reorderPoint: 30,
    reorderQuantity: 200,
    salesVelocity: 25,
    status: 'critical',
    estimatedDaysRemaining: 3,
    lastRestocked: new Date('2024-12-15'),
    supplier: '深圳宠物用品厂',
    cost: 40
  },
  {
    id: '2',
    sku: 'PET-FEED-002-WF',
    asin: 'B08N5M7S6K',
    name: '智能喂食器 WiFi版',
    currentStock: 12,
    safetyStock: 30,
    reorderPoint: 20,
    reorderQuantity: 150,
    salesVelocity: 8,
    status: 'critical',
    estimatedDaysRemaining: 5,
    lastRestocked: new Date('2024-12-20'),
    supplier: '东莞智能科技',
    cost: 100
  },
  {
    id: '3',
    sku: 'PET-TREE-003-LG',
    asin: 'B08N5WRWNW',
    name: '北欧风猫爬架 - 大型',
    currentStock: 25,
    safetyStock: 40,
    reorderPoint: 30,
    reorderQuantity: 100,
    salesVelocity: 5,
    status: 'low',
    estimatedDaysRemaining: 10,
    lastRestocked: new Date('2024-12-10'),
    supplier: '浙江木制品厂',
    cost: 120
  },
  {
    id: '4',
    sku: 'PET-BOWL-004-SET',
    asin: 'B08N5M7S6K',
    name: '环保材质食盆套装',
    currentStock: 35,
    safetyStock: 60,
    reorderPoint: 40,
    reorderQuantity: 120,
    salesVelocity: 6,
    status: 'low',
    estimatedDaysRemaining: 14,
    lastRestocked: new Date('2024-12-18'),
    supplier: '广州环保材料',
    cost: 40
  },
  {
    id: '5',
    sku: 'PET-WATER-005-AU',
    asin: 'B08N5WRWNW',
    name: '宠物自动饮水机',
    currentStock: 42,
    safetyStock: 50,
    reorderPoint: 35,
    reorderQuantity: 80,
    salesVelocity: 4,
    status: 'low',
    estimatedDaysRemaining: 18,
    lastRestocked: new Date('2024-12-22'),
    supplier: '深圳电子厂',
    cost: 80
  },
  {
    id: '6',
    sku: 'PET-NAIL-006-SET',
    asin: 'B08N5M7S6K',
    name: '宠物指甲剪套装',
    currentStock: 48,
    safetyStock: 50,
    reorderPoint: 35,
    reorderQuantity: 60,
    salesVelocity: 3,
    status: 'low',
    estimatedDaysRemaining: 20,
    lastRestocked: new Date('2024-12-25'),
    supplier: '阳江五金厂',
    cost: 30
  },
  {
    id: '7',
    sku: 'PET-TOY-007-SET',
    name: '宠物玩具球套装',
    currentStock: 150,
    safetyStock: 50,
    reorderPoint: 40,
    reorderQuantity: 100,
    salesVelocity: 8,
    status: 'normal',
    estimatedDaysRemaining: 45,
    lastRestocked: new Date('2025-01-05'),
    supplier: '义乌玩具厂',
    cost: 15
  },
  {
    id: '8',
    sku: 'PET-LEASH-008-RF',
    name: '宠物牵引绳 - 反光款',
    currentStock: 120,
    safetyStock: 40,
    reorderPoint: 30,
    reorderQuantity: 80,
    salesVelocity: 6,
    status: 'normal',
    estimatedDaysRemaining: 50,
    lastRestocked: new Date('2025-01-08'),
    supplier: '东莞织带厂',
    cost: 25
  },
  {
    id: '9',
    sku: 'PET-COMB-009-SET',
    name: '宠物梳子套装',
    currentStock: 95,
    safetyStock: 30,
    reorderPoint: 25,
    reorderQuantity: 60,
    salesVelocity: 4,
    status: 'normal',
    estimatedDaysRemaining: 60,
    lastRestocked: new Date('2025-01-10'),
    supplier: '宁波塑料制品厂',
    cost: 20
  },
  {
    id: '10',
    sku: 'PET-WIPE-010-100',
    name: '宠物湿巾 - 100抽',
    currentStock: 200,
    safetyStock: 80,
    reorderPoint: 60,
    reorderQuantity: 150,
    salesVelocity: 10,
    status: 'normal',
    estimatedDaysRemaining: 40,
    lastRestocked: new Date('2025-01-12'),
    supplier: '江苏无纺布厂',
    cost: 8
  },
  {
    id: '11',
    sku: 'PET-SPRAY-011-OD',
    name: '宠物除臭喷雾',
    currentStock: 180,
    safetyStock: 60,
    reorderPoint: 45,
    reorderQuantity: 120,
    salesVelocity: 7,
    status: 'normal',
    estimatedDaysRemaining: 55,
    lastRestocked: new Date('2025-01-08'),
    supplier: '广州日化厂',
    cost: 18
  },
  {
    id: '12',
    sku: 'PET-MAT-012-WA',
    name: '宠物床垫 - 可拆洗',
    currentStock: 88,
    safetyStock: 35,
    reorderPoint: 28,
    reorderQuantity: 70,
    salesVelocity: 5,
    status: 'normal',
    estimatedDaysRemaining: 52,
    lastRestocked: new Date('2025-01-10'),
    supplier: '南通纺织品厂',
    cost: 35
  },
  {
    id: '13',
    sku: 'PET-SNACK-013-CN',
    name: '宠物零食罐',
    currentStock: 250,
    safetyStock: 100,
    reorderPoint: 80,
    reorderQuantity: 200,
    salesVelocity: 15,
    status: 'normal',
    estimatedDaysRemaining: 45,
    lastRestocked: new Date('2025-01-15'),
    supplier: '山东食品厂',
    cost: 12
  },
  {
    id: '14',
    sku: 'PET-BAG-014-OU',
    name: '宠物背包外出包',
    currentStock: 65,
    safetyStock: 25,
    reorderPoint: 20,
    reorderQuantity: 50,
    salesVelocity: 3,
    status: 'normal',
    estimatedDaysRemaining: 58,
    lastRestocked: new Date('2025-01-10'),
    supplier: '广州箱包厂',
    cost: 45
  },
  {
    id: '15',
    sku: 'PET-PAD-015-TR',
    name: '宠物训练垫',
    currentStock: 300,
    safetyStock: 120,
    reorderPoint: 90,
    reorderQuantity: 250,
    salesVelocity: 18,
    status: 'normal',
    estimatedDaysRemaining: 42,
    lastRestocked: new Date('2025-01-12'),
    supplier: '江苏无纺布厂',
    cost: 10
  }
]

// 获取库存状态
function getInventoryStatus(item: InventoryItem): string {
  if (item.currentStock <= item.safetyStock * 0.3) return 'critical'
  if (item.currentStock <= item.safetyStock) return 'low'
  if (item.currentStock >= item.safetyStock * 3) return 'excess'
  return 'normal'
}

// 生成库存报告
export function generateInventoryReport(): any {
  const items = mockInventory.map(item => ({
    ...item,
    status: getInventoryStatus(item)
  }))

  const critical = items.filter(i => i.status === 'critical')
  const low = items.filter(i => i.status === 'low')
  const normal = items.filter(i => i.status === 'normal')
  const excess = items.filter(i => i.status === 'excess')

  // 计算补货建议
  const reorderSuggestions = [...critical, ...low].map(item => ({
    id: item.id,
    sku: item.sku,
    name: item.name,
    currentStock: item.currentStock,
    safetyStock: item.safetyStock,
    suggestedQuantity: item.reorderQuantity,
    estimatedCost: item.reorderQuantity * (item.cost || 0),
    priority: item.status === 'critical' ? 'urgent' : 'high',
    estimatedDaysRemaining: item.estimatedDaysRemaining,
    supplier: item.supplier
  }))

  // 按优先级分组
  const urgentReorder = reorderSuggestions.filter(r => r.priority === 'urgent')
  const highReorder = reorderSuggestions.filter(r => r.priority === 'high')

  return {
    summary: {
      totalProducts: items.length,
      criticalCount: critical.length,
      lowCount: low.length,
      normalCount: normal.length,
      excessCount: excess.length,
      totalInventoryValue: items.reduce((sum, i) => sum + i.currentStock * (i.cost || 0), 0),
      estimatedReorderCost: reorderSuggestions.reduce((sum, r) => sum + r.estimatedCost, 0)
    },
    critical: critical.map(i => ({
      id: i.id,
      sku: i.sku,
      asin: i.asin,
      name: i.name,
      currentStock: i.currentStock,
      safetyStock: i.safetyStock,
      salesVelocity: i.salesVelocity,
      estimatedDaysRemaining: i.estimatedDaysRemaining,
      suggestedReorder: i.reorderQuantity,
      estimatedCost: i.reorderQuantity * (i.cost || 0),
      supplier: i.supplier
    })),
    low: low.map(i => ({
      id: i.id,
      sku: i.sku,
      asin: i.asin,
      name: i.name,
      currentStock: i.currentStock,
      safetyStock: i.safetyStock,
      salesVelocity: i.salesVelocity,
      estimatedDaysRemaining: i.estimatedDaysRemaining,
      suggestedReorder: i.reorderQuantity,
      estimatedCost: i.reorderQuantity * (i.cost || 0),
      supplier: i.supplier
    })),
    normal: normal.map(i => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      currentStock: i.currentStock,
      safetyStock: i.safetyStock,
      status: '充足'
    })),
    reorderPlan: {
      urgent: {
        items: urgentReorder,
        totalQuantity: urgentReorder.reduce((sum, r) => sum + r.suggestedQuantity, 0),
        totalCost: urgentReorder.reduce((sum, r) => sum + r.estimatedCost, 0),
        timeline: '24小时内'
      },
      high: {
        items: highReorder,
        totalQuantity: highReorder.reduce((sum, r) => sum + r.suggestedQuantity, 0),
        totalCost: highReorder.reduce((sum, r) => sum + r.estimatedCost, 0),
        timeline: '本周内'
      }
    },
    recommendations: [
      '立即联系供应商确认可拆卸宠物窝和智能喂食器的交货时间',
      '对库存告急商品设置"限量抢购"标签，制造紧迫感',
      '建议将安全库存标准提高20%，应对春节物流延迟',
      '建立自动补货预警，当库存低于安全线时自动通知',
      '对库存充足商品加大推广力度，平衡销售'
    ],
    generatedAt: new Date().toISOString()
  }
}

// 库存路由
export const inventoryRoutes = new Elysia({ prefix: '/api/inventory' })
  // 获取库存概览
  .get('/', () => {
    const items = mockInventory.map(item => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      currentStock: item.currentStock,
      safetyStock: item.safetyStock,
      status: getInventoryStatus(item),
      estimatedDaysRemaining: item.estimatedDaysRemaining
    }))

    return {
      items,
      summary: {
        total: items.length,
        critical: items.filter(i => i.status === 'critical').length,
        low: items.filter(i => i.status === 'low').length,
        normal: items.filter(i => i.status === 'normal').length
      }
    }
  })

  // 获取库存报告
  .get('/report', () => {
    return generateInventoryReport()
  })

  // 获取库存告急商品
  .get('/critical', () => {
    const critical = mockInventory
      .filter(item => getInventoryStatus(item) === 'critical')
      .map(item => ({
        id: item.id,
        sku: item.sku,
        asin: item.asin,
        name: item.name,
        currentStock: item.currentStock,
        safetyStock: item.safetyStock,
        salesVelocity: item.salesVelocity,
        estimatedDaysRemaining: item.estimatedDaysRemaining,
        suggestedReorder: item.reorderQuantity,
        supplier: item.supplier
      }))
    
    return {
      count: critical.length,
      items: critical,
      totalReorderCost: critical.reduce((sum, i) => sum + i.suggestedReorder * (mockInventory.find(m => m.id === i.id)?.cost || 0), 0)
    }
  })

  // 获取补货建议
  .get('/reorder-suggestions', () => {
    const report = generateInventoryReport()
    return {
      urgent: report.reorderPlan.urgent,
      high: report.reorderPlan.high,
      totalCost: report.reorderPlan.urgent.totalCost + report.reorderPlan.high.totalCost
    }
  })

  // 更新库存（模拟）
  .post('/update', ({ body }) => {
    const { sku, quantity } = body as { sku: string; quantity: number }
    const item = mockInventory.find(i => i.sku === sku)
    
    if (!item) {
      return { success: false, error: '商品不存在' }
    }

    item.currentStock = quantity
    item.estimatedDaysRemaining = quantity / item.salesVelocity

    return {
      success: true,
      item: {
        sku: item.sku,
        name: item.name,
        newStock: item.currentStock,
        status: getInventoryStatus(item)
      }
    }
  }, {
    body: t.Object({
      sku: t.String(),
      quantity: t.Number()
    })
  })
