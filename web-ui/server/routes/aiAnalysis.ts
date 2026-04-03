import { Elysia, t } from 'elysia'
import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, execute } from '../db'
import { chatWithAI } from '../lib/ai'
import type {
  AIAnalysisSession,
  AIAnalysisRequest,
  AmazonProduct,
  AmazonSales,
  ApiResponse
} from '../types'

// 数据分析师的系统提示词
const DATA_ANALYST_PROMPT = `你是一位专业的亚马逊电商数据分析师，擅长：
1. 销售数据分析和趋势预测
2. 产品表现评估和优化建议
3. 库存管理和补货建议
4. 竞品分析和定价策略
5. 市场机会识别

请基于提供的数据，给出专业、具体的分析和建议。使用中文回复，保持条理清晰。`

export const aiAnalysisRoutes = new Elysia({ prefix: '/api/ai-analysis' })
  // 执行AI分析
  .post('/', async ({ body, headers }): Promise<ApiResponse> => {
    const userId = await getUserIdFromToken(headers.authorization)
    const { store_id, session_type, query: userQuery, context } = body as AIAnalysisRequest

    // 获取相关数据
    let contextData: any = {}
    let products: AmazonProduct[] = []

    try {
      if (store_id) {
        // 验证店铺归属
        const store = await queryOne(
          'SELECT * FROM amazon_stores WHERE id = ? AND user_id = ?',
          [store_id, userId]
        )

        if (!store) {
          return {
            success: false,
            message: '店铺不存在',
            error: 'StoreNotFound'
          }
        }

        // 根据分析类型获取数据
        if (session_type === 'product_analysis' && context?.productIds) {
          // 获取指定产品数据
          const placeholders = context.productIds.map(() => '?').join(',')
          products = await query<AmazonProduct>(
            `SELECT p.*, s.marketplace_name
             FROM amazon_products p
             JOIN amazon_stores s ON p.store_id = s.id
             WHERE p.id IN (${placeholders}) AND s.user_id = ?`,
            [...context.productIds, userId]
          )
        } else if (session_type === 'sales_trend') {
          // 获取销售数据
          const dateRange = context?.dateRange || {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
          }

          const sales = await query<AmazonSales>(
            `SELECT s.*, p.title, p.asin, p.sku
             FROM amazon_sales s
             JOIN amazon_products p ON s.product_id = p.id
             WHERE s.store_id = ? AND s.date BETWEEN ? AND ?
             ORDER BY s.date DESC`,
            [store_id, dateRange.start, dateRange.end]
          )
          contextData.sales = sales
        } else if (session_type === 'inventory_analysis') {
          // 获取库存预警产品
          products = await query<AmazonProduct>(
            `SELECT p.*, s.marketplace_name
             FROM amazon_products p
             JOIN amazon_stores s ON p.store_id = s.id
             WHERE p.store_id = ? AND s.user_id = ?
               AND (p.stock_quantity < 10 OR p.fba_stock < 10)
             ORDER BY p.stock_quantity ASC`,
            [store_id, userId]
          )
        } else {
          // 默认获取店铺热销产品
          products = await query<AmazonProduct>(
            `SELECT p.*, s.marketplace_name
             FROM amazon_products p
             JOIN amazon_stores s ON p.store_id = s.id
             WHERE p.store_id = ? AND s.user_id = ? AND p.is_active = true
             ORDER BY p.sales_rank ASC
             LIMIT 20`,
            [store_id, userId]
          )
        }
      }

      contextData.products = products

    } catch (error) {
      console.error('获取数据失败:', error)
    }

    // 构建AI提示词
    const systemPrompt = buildSystemPrompt(session_type, contextData)
    const fullPrompt = `${systemPrompt}\n\n用户问题：${userQuery}`

    // 调用AI
    const aiResponse = await chatWithAI({
      messages: [{ role: 'user', content: fullPrompt }],
      system: DATA_ANALYST_PROMPT,
      maxTokens: 4096
    })

    // 保存分析会话
    const sessionId = uuidv4()
    await execute(
      `INSERT INTO ai_analysis_sessions
       (id, user_id, store_id, session_type, query, result, context, model, tokens_used, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        sessionId,
        userId,
        store_id || null,
        session_type,
        userQuery,
        aiResponse,
        JSON.stringify(context),
        process.env.ANTHROPIC_MODEL || 'claude-3-sonnet',
        null // tokens_used 暂不提供
      ]
    )

    return {
      success: true,
      message: '分析完成',
      data: {
        session_id: sessionId,
        result: aiResponse,
        context_data: contextData
      }
    }
  }, {
    body: t.Object({
      store_id: t.Optional(t.String()),
      session_type: t.String(),
      query: t.String(),
      context: t.Optional(t.Record(t.String(), t.Any()))
    })
  })

  // 获取历史分析会话
  .get('/sessions', async ({ query: queryParams, headers }): Promise<ApiResponse> => {
    const userId = await getUserIdFromToken(headers.authorization)
    const { store_id, session_type, limit = '20' } = queryParams as {
      store_id?: string
      session_type?: string
      limit?: string
    }

    let sql = `
      SELECT a.*, s.store_name, s.marketplace_name
      FROM ai_analysis_sessions a
      LEFT JOIN amazon_stores s ON a.store_id = s.id
      WHERE a.user_id = ?
    `
    const values: any[] = [userId]

    if (store_id) {
      sql += ' AND a.store_id = ?'
      values.push(store_id)
    }
    if (session_type) {
      sql += ' AND a.session_type = ?'
      values.push(session_type)
    }

    sql += ' ORDER BY a.created_at DESC LIMIT ?'
    values.push(parseInt(limit))

    const sessions = await query(sql, values)

    return {
      success: true,
      message: '获取分析历史成功',
      data: { sessions }
    }
  })

  // 获取单个分析会话详情
  .get('/sessions/:sessionId', async ({ params, headers, set }): Promise<ApiResponse> => {
    const userId = await getUserIdFromToken(headers.authorization)
    const { sessionId } = params

    const session = await queryOne(
      `SELECT a.*, s.store_name, s.marketplace_name
       FROM ai_analysis_sessions a
       LEFT JOIN amazon_stores s ON a.store_id = s.id
       WHERE a.id = ? AND a.user_id = ?`,
      [sessionId, userId]
    )

    if (!session) {
      set.status = 404
      return {
        success: false,
        message: '分析会话不存在',
        error: 'SessionNotFound'
      }
    }

    return {
      success: true,
      message: '获取分析会话成功',
      data: { session }
    }
  })

  // 删除分析会话
  .delete('/sessions/:sessionId', async ({ params, headers, set }): Promise<ApiResponse> => {
    const userId = await getUserIdFromToken(headers.authorization)
    const { sessionId } = params

    const result = await execute(
      'DELETE FROM ai_analysis_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    )

    if (result.affectedRows === 0) {
      set.status = 404
      return {
        success: false,
        message: '分析会话不存在',
        error: 'SessionNotFound'
      }
    }

    return {
      success: true,
      message: '删除成功'
    }
  })

// 辅助函数：构建系统提示词
function buildSystemPrompt(sessionType: string, contextData: any): string {
  let prompt = ''

  switch (sessionType) {
    case 'product_analysis':
      prompt = '请分析以下产品的表现数据，包括销量、评分、排名等，并给出优化建议。\n\n'
      break
    case 'sales_trend':
      prompt = '请分析以下销售数据的趋势，包括增长/下降情况、季节性特征，并给出预测和建议。\n\n'
      break
    case 'inventory_analysis':
      prompt = '请分析以下库存数据，识别需要补货的产品，并给出补货建议。\n\n'
      break
    case 'pricing_analysis':
      prompt = '请分析以下产品的定价情况，并与市场价格对比，给出定价优化建议。\n\n'
      break
    case 'competitor_analysis':
      prompt = '请分析以下竞品数据，识别竞争优势和劣势，并给出竞争策略建议。\n\n'
      break
    default:
      prompt = '请基于以下数据进行分析，并给出专业的电商运营建议。\n\n'
  }

  // 添加数据上下文
  if (contextData.products && contextData.products.length > 0) {
    prompt += '产品数据：\n'
    contextData.products.forEach((p: AmazonProduct, index: number) => {
      prompt += `${index + 1}. ${p.title || p.asin}\n`
      prompt += `   - ASIN: ${p.asin}\n`
      prompt += `   - SKU: ${p.sku || 'N/A'}\n`
      prompt += `   - 价格: ${p.price ? `$${p.price}` : 'N/A'}\n`
      prompt += `   - 库存: ${p.stock_quantity} (FBA: ${p.fba_stock})\n`
      prompt += `   - 评分: ${p.ratings || 'N/A'} (${p.review_count} 评价)\n`
      prompt += `   - 排名: ${p.sales_rank || 'N/A'}\n`
      prompt += `   - 站点: ${p.marketplace_name}\n\n`
    })
  }

  if (contextData.sales && contextData.sales.length > 0) {
    prompt += `\n销售数据（共${contextData.sales.length}条记录）：\n`
    // 聚合数据
    const totalRevenue = contextData.sales.reduce((sum: number, s: AmazonSales) => sum + parseFloat(s.revenue?.toString() || '0'), 0)
    const totalUnits = contextData.sales.reduce((sum: number, s: AmazonSales) => sum + s.units_sold, 0)
    prompt += `总销售额: $${totalRevenue.toFixed(2)}\n`
    prompt += `总销量: ${totalUnits} 件\n`
  }

  return prompt
}

// 辅助函数：从Token获取用户ID
async function getUserIdFromToken(authHeader: string | undefined): Promise<string> {
  if (!authHeader?.startsWith('Bearer ')) {
    return 'default-user'
  }

  const token = authHeader.substring(7)
  try {
    const { verifyToken } = await import('../lib/jwt')
    const payload = verifyToken(token)
    return payload.userId
  } catch {
    return 'default-user'
  }
}
