// ==================== 用户认证相关类型 ====================

export interface LocalUser {
  id: string
  username: string
  email?: string
  phone?: string
  password_hash?: string
  display_name?: string
  company_name?: string
  is_default: boolean
  created_at: Date
  updated_at: Date
  last_login_at?: Date
}

export interface UserSettings {
  id: string
  user_id: string
  setting_key: string
  setting_value: any
  created_at: Date
  updated_at: Date
}

// JWT Payload
export interface JWTPayload {
  userId: string
  username: string
  iat: number
  exp: number
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
}

// ==================== 亚马逊店铺相关类型 ====================

// 亚马逊市场站点
export type MarketplaceId =
  | 'ATVPDKIKX0DER'  // 美国
  | 'A2EUQ1WTGCTBG2' // 加拿大
  | 'A1AM78C64UM0Y8' // 墨西哥
  | 'A1PA6795UKMFR9' // 德国
  | 'A1RKKUPIH5469F' // 西班牙
  | 'A13V1IB3VIYZZH' // 法国
  | 'A1F83G8C2ARO7P' // 英国
  | 'APJ6JRA9NG5V4'  // 意大利
  | 'A1VC38T7YXB528' // 日本
  | 'A39IBJ37TRP1C6' // 澳大利亚
  | 'A2VIGQ35RCS4UG' // 阿联酋
  | 'A2Q3Y263D00KWC' // 巴西
  | 'A33AVAJ2PDY3EV' // 土耳其
  | 'A19VAU5U5O7RUS' // 新加坡
  | 'A1805IZSGTT6HS' // 荷兰
  | 'A2NODRKZP88ZB9' // 瑞典
  | 'A1C3SOZRARQ6R3' // 波兰

export interface AmazonStore {
  id: string
  user_id: string
  store_name: string
  marketplace_id: MarketplaceId | string
  marketplace_name: string
  seller_id?: string
  refresh_token: string
  access_token?: string
  token_expires_at?: Date
  is_active: boolean
  last_sync_at?: Date
  sync_enabled: boolean
  created_at: Date
  updated_at: Date
}

// ==================== 亚马逊商品相关类型 ====================

export interface AmazonProduct {
  id: string
  store_id: string
  asin: string
  sku?: string
  title?: string
  description?: string
  bullet_points?: string[]
  price?: number
  buy_box_price?: number
  currency: string
  stock_quantity: number
  fba_stock: number
  fbm_stock: number
  category?: string
  sub_category?: string
  brand?: string
  images?: string[]
  ratings?: number
  review_count: number
  sales_rank?: number
  bsr_category?: string
  dimensions?: ProductDimensions
  is_active: boolean
  last_sync_at: Date
  created_at: Date
  updated_at: Date
}

export interface ProductDimensions {
  length?: number
  width?: number
  height?: number
  weight?: number
  length_unit?: string
  weight_unit?: string
}

// ==================== 亚马逊销售相关类型 ====================

export interface AmazonSales {
  id: string
  product_id: string
  store_id: string
  date: string // YYYY-MM-DD
  units_sold: number
  revenue: number
  orders_count: number
  returns_count: number
  refunds_amount: number
  fba_fees: number
  referral_fees: number
  created_at: Date
  updated_at: Date
}

// ==================== 亚马逊订单相关类型 ====================

export interface AmazonOrder {
  id: string
  store_id: string
  amazon_order_id: string
  purchase_date: Date
  order_status: string
  fulfillment_channel: 'AFN' | 'MFN' | string
  sales_channel?: string
  order_total?: number
  currency?: string
  shipping_address?: OrderAddress
  items?: OrderItem[]
  created_at: Date
  updated_at: Date
}

export interface OrderAddress {
  name?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  phone?: string
}

export interface OrderItem {
  order_item_id: string
  asin: string
  sku?: string
  title?: string
  quantity: number
  item_price?: number
  shipping_price?: number
  tax?: number
  shipping_tax?: number
  gift_wrap_price?: number
  gift_wrap_tax?: number
  shipping_discount?: number
  promotion_discount?: number
}

// ==================== AI分析相关类型 ====================

export type AnalysisSessionType =
  | 'product_analysis'
  | 'sales_trend'
  | 'competitor_analysis'
  | 'inventory_analysis'
  | 'pricing_analysis'
  | 'custom'

export interface AIAnalysisSession {
  id: string
  user_id: string
  store_id?: string
  session_type: AnalysisSessionType
  query: string
  result?: string
  context?: AnalysisContext
  model?: string
  tokens_used?: number
  created_at: Date
}

export interface AnalysisContext {
  productIds?: string[]
  dateRange?: {
    start: string
    end: string
  }
  marketplaceId?: string
  category?: string
  [key: string]: any
}

// ==================== 同步日志相关类型 ====================

export type SyncType = 'products' | 'orders' | 'inventory' | 'sales' | 'full'
export type SyncStatus = 'running' | 'success' | 'partial' | 'failed'

export interface SyncLog {
  id: string
  store_id: string
  sync_type: SyncType
  status: SyncStatus
  items_count: number
  items_processed: number
  items_failed: number
  error_message?: string
  started_at: Date
  completed_at?: Date
  duration_ms?: number
  created_at: Date
}

// ==================== 竞品监控相关类型 ====================

export interface CompetitorTracking {
  id: string
  user_id: string
  store_id?: string
  competitor_asin: string
  marketplace_id: string
  product_title?: string
  tracked_price?: number
  tracked_ratings?: number
  tracked_review_count?: number
  is_active: boolean
  last_checked_at?: Date
  created_at: Date
}

export interface CompetitorPriceHistory {
  id: string
  tracking_id: string
  price?: number
  ratings?: number
  review_count?: number
  bsr?: number
  checked_at: Date
}

// ==================== API请求/响应类型 ====================

// 创建本地用户
export interface CreateLocalUserRequest {
  username: string
  password?: string
}

// 登录请求
export interface LoginRequest {
  username: string
  password?: string
}

// 添加亚马逊店铺
export interface AddAmazonStoreRequest {
  store_name: string
  marketplace_id: string
  auth_code: string // OAuth授权码
}

// 更新店铺
export interface UpdateAmazonStoreRequest {
  store_name?: string
  is_active?: boolean
  sync_enabled?: boolean
}

// AI分析请求
export interface AIAnalysisRequest {
  store_id?: string
  session_type: AnalysisSessionType
  query: string
  context?: AnalysisContext
}

// 商品查询参数
export interface ProductQueryParams {
  store_id?: string
  category?: string
  brand?: string
  is_active?: boolean
  min_price?: number
  max_price?: number
  min_stock?: number
  search?: string
  sort_by?: 'price' | 'stock' | 'sales_rank' | 'review_count' | 'created_at'
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

// 销售查询参数
export interface SalesQueryParams {
  store_id?: string
  product_id?: string
  start_date?: string
  end_date?: string
  group_by?: 'day' | 'week' | 'month'
}

// ==================== 工作流相关类型 ====================
export * from './workflow';

// ==================== 记忆系统类型 ====================

export type MemoryType = 'user' | 'feedback' | 'project' | 'reference';

export interface Memory {
  id: string;
  user_id: string;
  project_id?: string;
  name: string;
  description: string;
  type: MemoryType;
  content: string;
  tags?: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MemoryInput {
  name: string;
  description: string;
  type: MemoryType;
  content: string;
  tags?: string[];
}

export interface MemoryUpdateInput {
  name?: string;
  description?: string;
  content?: string;
  tags?: string[];
  is_active?: boolean;
}
