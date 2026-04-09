import { Elysia, t } from 'elysia'
import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, execute } from '../db'
import type {
  AmazonStore,
  AmazonProduct,
  AmazonSales,
  ApiResponse,
  AddAmazonStoreRequest,
  UpdateAmazonStoreRequest,
  ProductQueryParams,
  SalesQueryParams,
  SyncLog
} from '../types'

// 亚马逊市场映射
const MARKETPLACES: Record<string, { name: string; region: string }> = {
  'ATVPDKIKX0DER': { name: 'US', region: 'North America' },
  'A2EUQ1WTGCTBG2': { name: 'CA', region: 'North America' },
  'A1AM78C64UM0Y8': { name: 'MX', region: 'North America' },
  'A1PA6795UKMFR9': { name: 'DE', region: 'Europe' },
  'A1RKKUPIH5469F': { name: 'ES', region: 'Europe' },
  'A13V1IB3VIYZZH': { name: 'FR', region: 'Europe' },
  'A1F83G8C2ARO7P': { name: 'UK', region: 'Europe' },
  'APJ6JRA9NG5V4': { name: 'IT', region: 'Europe' },
  'A1VC38T7YXB528': { name: 'JP', region: 'Asia' },
  'A39IBJ37TRP1C6': { name: 'AU', region: 'Asia' },
  'A2VIGQ35RCS4UG': { name: 'AE', region: 'Middle East' },
  'A2Q3Y263D00KWC': { name: 'BR', region: 'South America' },
  'A33AVAJ2PDY3EV': { name: 'TR', region: 'Middle East' },
  'A19VAU5U5O7RUS': { name: 'SG', region: 'Asia' },
  'A1805IZSGTT6HS': { name: 'NL', region: 'Europe' },
  'A2NODRKZP88ZB9': { name: 'SE', region: 'Europe' },
  'A1C3SOZRARQ6R3': { name: 'PL', region: 'Europe' }
}

export const amazonRoutes = new Elysia({ prefix: '/api/amazon' })
  // 获取所有支持的亚马逊市场
  .get('/marketplaces', () => ({
    success: true,
    message: '获取市场列表成功',
    data: Object.entries(MARKETPLACES).map(([id, info]) => ({
      marketplace_id: id,
      marketplace_name: info.name,
      region: info.region
    }))
  }))

  // 获取用户的亚马逊店铺列表
  .get('/stores', async ({ headers }): Promise<ApiResponse> => {
    const userId = await getUserIdFromToken(headers.authorization)

    const stores = await query<AmazonStore>(
      `SELECT id, store_name, marketplace_id, marketplace_name, seller_id,
              is_active, sync_enabled, last_sync_at, created_at, updated_at
       FROM amazon_stores
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    )

    return {
      success: true,
      message: '获取店铺列表成功',
      data: { stores }
    }
  })

  // 添加亚马逊店铺
  .post('/stores', async ({ body, headers }): Promise<ApiResponse> => {
    const userId = await getUserIdFromToken(headers.authorization)
    const { store_name, marketplace_id, auth_code } = body as AddAmazonStoreRequest

    // 验证市场ID
    if (!MARKETPLACES[marketplace_id]) {
      return {
        success: false,
        message: '无效的市场ID',
        error: 'InvalidMarketplace'
      }
    }

    // TODO: 使用auth_code换取refresh_token（需要实现亚马逊OAuth流程）
    // 这里暂时使用模拟数据
    const refreshToken = `refresh_token_${Date.now()}`
    const sellerId = `SELLER${Date.now()}`

    const storeId = uuidv4()
    const marketplaceInfo = MARKETPLACES[marketplace_id]

    await execute(
      `INSERT INTO amazon_stores
       (id, user_id, store_name, marketplace_id, marketplace_name, seller_id, refresh_token, is_active, sync_enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, true, true, NOW(), NOW())`,
      [storeId, userId, store_name, marketplace_id, marketplaceInfo.name, sellerId, refreshToken]
    )

    const newStore = await queryOne<AmazonStore>(
      'SELECT * FROM amazon_stores WHERE id = ?',
      [storeId]
    )

    return {
      success: true,
      message: '添加店铺成功',
      data: { store: newStore }
    }
  }, {
    body: t.Object({
      store_name: t.String(),
      marketplace_id: t.String(),
      auth_code: t.String()
    })
  })

  // 获取单个店铺详情
  .get('/stores/:storeId', async ({ params, headers, set }): Promise<ApiResponse> => {
    const userId = await getUserIdFromToken(headers.authorization)
    const { storeId } = params

    const store = await queryOne<AmazonStore>(
      `SELECT id, store_name, marketplace_id, marketplace_name, seller_id,
              is_active, sync_enabled, last_sync_at, created_at, updated_at
       FROM amazon_stores
       WHERE id = ? AND user_id = ?`,
      [storeId, userId]
    )

    if (!store) {
      set.status = 404
      return {
        success: false,
        message: '店铺不存在',
        error: 'StoreNotFound'
      }
    }

    return {
      success: true,
      message: '获取店铺详情成功',
      data: { store }
    }
  })

  // 更新店铺
  .put('/stores/:storeId', async ({ params, body, headers, set }): Promise<ApiResponse> => {
    const userId = await getUserIdFromToken(headers.authorization)
    const { storeId } = params
    const { store_name, is_active, sync_enabled } = body as UpdateAmazonStoreRequest

    // 检查店铺是否存在
    const existingStore = await queryOne<AmazonStore>(
      'SELECT * FROM amazon_stores WHERE id = ? AND user_id = ?',
      [storeId, userId]
    )

    if (!existingStore) {
      set.status = 404
      return {
        success: false,
        message: '店铺不存在',
        error: 'StoreNotFound'
      }
    }

    const updates: string[] = []
    const values: any[] = []

    if (store_name !== undefined) {
      updates.push('store_name = ?')
      values.push(store_name)
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(is_active)
    }
    if (sync_enabled !== undefined) {
      updates.push('sync_enabled = ?')
      values.push(sync_enabled)
    }

    if (updates.length === 0) {
      return {
        success: false,
        message: '没有要更新的内容',
        error: 'NoUpdates'
      }
    }

    updates.push('updated_at = NOW()')
    values.push(storeId)
    values.push(userId)

    await execute(
      `UPDATE amazon_stores SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    )

    const updatedStore = await queryOne<AmazonStore>(
      `SELECT id, store_name, marketplace_id, marketplace_name, seller_id,
              is_active, sync_enabled, last_sync_at, created_at, updated_at
       FROM amazon_stores WHERE id = ?`,
      [storeId]
    )

    return {
      success: true,
      message: '更新店铺成功',
      data: { store: updatedStore }
    }
  }, {
    body: t.Object({
      store_name: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean()),
      sync_enabled: t.Optional(t.Boolean())
    })
  })

  // 删除店铺
  .delete('/stores/:storeId', async ({ params, headers, set }): Promise<ApiResponse> => {
    const userId = await getUserIdFromToken(headers.authorization)
    const { storeId } = params

    const result = await execute(
      'DELETE FROM amazon_stores WHERE id = ? AND user_id = ?',
      [storeId, userId]
    )

    if (result.affectedRows === 0) {
      set.status = 404
      return {
        success: false,
        message: '店铺不存在',
        error: 'StoreNotFound'
      }
    }

    return {
      success: true,
      message: '删除店铺成功'
    }
  })

  // ==================== 商品相关API ====================

  // 获取商品列表
  .get('/products', async ({ query: queryParams, headers }): Promise<ApiResponse> => {
    const userId = await getUserIdFromToken(headers.authorization)
    const {
      store_id,
      category,
      brand,
      is_active,
      min_price,
      max_price,
      min_stock,
      search,
      sort_by = 'created_at',
      sort_order = 'desc',
      page = '1',
      limit = '20'
    } = queryParams as ProductQueryParams

    let sql = `
      SELECT p.*, s.store_name, s.marketplace_name
      FROM amazon_products p
      JOIN amazon_stores s ON p.store_id = s.id
      WHERE s.user_id = ?
    `
    const values: any[] = [userId]

    if (store_id) {
      sql += ' AND p.store_id = ?'
      values.push(store_id)
    }
    if (category) {
      sql += ' AND p.category = ?'
      values.push(category)
    }
    if (brand) {
      sql += ' AND p.brand = ?'
      values.push(brand)
    }
    if (is_active !== undefined) {
      sql += ' AND p.is_active = ?'
      values.push(is_active)
    }
    if (min_price) {
      sql += ' AND p.price >= ?'
      values.push(min_price)
    }
    if (max_price) {
      sql += ' AND p.price <= ?'
      values.push(max_price)
    }
    if (min_stock) {
      sql += ' AND p.stock_quantity >= ?'
      values.push(min_stock)
    }
    if (search) {
      sql += ' AND (p.title LIKE ? OR p.asin LIKE ? OR p.sku LIKE ?)'
      values.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    // 排序
    const validSortColumns = ['price', 'stock', 'sales_rank', 'review_count', 'created_at', 'title']
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at'
    const order = sort_order === 'asc' ? 'ASC' : 'DESC'
    sql += ` ORDER BY p.${sortColumn} ${order}`

    // 分页
    const pageNum = parseInt(page as string) || 1
    const limitNum = Math.min(parseInt(limit as string) || 20, 100)
    const offset = (pageNum - 1) * limitNum
    sql += ' LIMIT ? OFFSET ?'
    values.push(limitNum, offset)

    const products = await query<AmazonProduct>(sql, values)

    // 获取总数
    let countSql = `
      SELECT COUNT(*) as total
      FROM amazon_products p
      JOIN amazon_stores s ON p.store_id = s.id
      WHERE s.user_id = ?
    `
    const countValues: any[] = [userId]

    if (store_id) {
      countSql += ' AND p.store_id = ?'
      countValues.push(store_id)
    }
    if (category) {
      countSql += ' AND p.category = ?'
      countValues.push(category)
    }
    if (brand) {
      countSql += ' AND p.brand = ?'
      countValues.push(brand)
    }
    if (is_active !== undefined) {
      countSql += ' AND p.is_active = ?'
      countValues.push(is_active)
    }
    if (min_price) {
      countSql += ' AND p.price >= ?'
      countValues.push(min_price)
    }
    if (max_price) {
      countSql += ' AND p.price <= ?'
      countValues.push(max_price)
    }
    if (min_stock) {
      countSql += ' AND p.stock_quantity >= ?'
      countValues.push(min_stock)
    }
    if (search) {
      countSql += ' AND (p.title LIKE ? OR p.asin LIKE ? OR p.sku LIKE ?)'
      countValues.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    const countResult = await queryOne<{ total: number }>(countSql, countValues)
    const total = countResult?.total || 0

    return {
      success: true,
      message: '获取商品列表成功',
      data: {
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          total_pages: Math.ceil(total / limitNum)
        }
      }
    }
  })

  // 获取单个商品详情
  .get('/products/:productId', async ({ params, headers, set }): Promise<ApiResponse> => {
    const userId = await getUserIdFromToken(headers.authorization)
    const { productId } = params

    const product = await queryOne<AmazonProduct>(
      `SELECT p.*, s.store_name, s.marketplace_name
       FROM amazon_products p
       JOIN amazon_stores s ON p.store_id = s.id
       WHERE p.id = ? AND s.user_id = ?`,
      [productId, userId]
    )

    if (!product) {
      set.status = 404
      return {
        success: false,
        message: '商品不存在',
        error: 'ProductNotFound'
      }
    }

    return {
      success: true,
      message: '获取商品详情成功',
      data: { product }
    }
  })

  // ==================== 同步相关API ====================

  // 手动触发同步
  .post('/stores/:storeId/sync', async ({ params, body, headers, set }): Promise<ApiResponse> => {
    const userId = await getUserIdFromToken(headers.authorization)
    const { storeId } = params
    const { sync_type = 'products' } = body as { sync_type?: string }

    // 检查店铺是否存在且属于当前用户
    const store = await queryOne<AmazonStore>(
      'SELECT * FROM amazon_stores WHERE id = ? AND user_id = ? AND is_active = true',
      [storeId, userId]
    )

    if (!store) {
      set.status = 404
      return {
        success: false,
        message: '店铺不存在或未激活',
        error: 'StoreNotFound'
      }
    }

    // 创建同步日志
    const syncLogId = uuidv4()
    await execute(
      `INSERT INTO sync_logs (id, store_id, sync_type, status, items_count, started_at)
       VALUES (?, ?, ?, 'running', 0, NOW())`,
      [syncLogId, storeId, sync_type]
    )

    // TODO: 启动异步同步任务
    // 这里返回同步任务ID，实际同步在后台进行

    return {
      success: true,
      message: '同步任务已启动',
      data: {
        sync_id: syncLogId,
        store_id: storeId,
        sync_type: sync_type,
        status: 'running'
      }
    }
  }, {
    body: t.Object({
      sync_type: t.Optional(t.String())
    })
  })

  // 获取同步日志
  .get('/stores/:storeId/sync-logs', async ({ params, query: queryParams, headers }): Promise<ApiResponse> => {
    const userId = await getUserIdFromToken(headers.authorization)
    const { storeId } = params
    const { limit = '20' } = queryParams as { limit?: string }

    // 验证店铺归属
    const store = await queryOne<AmazonStore>(
      'SELECT * FROM amazon_stores WHERE id = ? AND user_id = ?',
      [storeId, userId]
    )

    if (!store) {
      return {
        success: false,
        message: '店铺不存在',
        error: 'StoreNotFound'
      }
    }

    const logs = await query<SyncLog>(
      `SELECT * FROM sync_logs
       WHERE store_id = ?
       ORDER BY started_at DESC
       LIMIT ?`,
      [storeId, parseInt(limit)]
    )

    return {
      success: true,
      message: '获取同步日志成功',
      data: { logs }
    }
  })

// 辅助函数：从Token获取用户ID
async function getUserIdFromToken(authHeader: string | undefined): Promise<string> {
  // 如果没有token，返回默认用户ID
  if (!authHeader?.startsWith('Bearer ')) {
    return 'default-user'
  }

  const token = authHeader.substring(7)
  try {
    const { verifyToken } = await import('../lib/jwt')
    const payload = verifyToken(token)
    return payload.userId
  } catch {
    // 验证失败返回默认用户
    return 'default-user'
  }
}
