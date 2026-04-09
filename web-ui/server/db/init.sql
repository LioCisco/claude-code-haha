-- AI跨境电商智能体数据库表结构
-- 数据库: kane-work

-- 修复：删除旧的 settings 表结构（如果存在）
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS user_integrations;
DROP TABLE IF EXISTS team_members;

-- 本地用户表（简化版，本地单用户使用）
CREATE TABLE IF NOT EXISTS local_users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255), -- 可选，本地使用可不设密码
    display_name VARCHAR(100), -- 显示名称/姓名
    company_name VARCHAR(255), -- 公司名称
    is_default BOOLEAN DEFAULT FALSE, -- 是否为默认用户
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255),
    phone VARCHAR(20),
    code VARCHAR(10) NOT NULL,
    type ENUM('register', 'reset_password', 'phone_login') NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_type (email, type),
    INDEX idx_phone_type (phone, type),
    INDEX idx_expires (expires_at),
    INDEX idx_is_used (is_used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OAuth用户表
CREATE TABLE IF NOT EXISTS oauth_users (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES local_users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_provider_id (provider, provider_id),
    INDEX idx_user_id (user_id),
    INDEX idx_provider (provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 亚马逊店铺配置表
CREATE TABLE IF NOT EXISTS amazon_stores (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    marketplace_id VARCHAR(10) NOT NULL, -- A2EUQ1WTGCTBG2 (加拿大), A1AM78C64UM0Y8 (墨西哥), ATVPDKIKX0DER (美国), A1PA6795UKMFR9 (德国), etc.
    marketplace_name VARCHAR(50), -- US, UK, JP, DE, etc.
    seller_id VARCHAR(50), -- 卖家ID
    refresh_token TEXT NOT NULL, -- SP-API刷新令牌
    access_token TEXT, -- SP-API访问令牌（临时）
    token_expires_at TIMESTAMP NULL, -- 访问令牌过期时间
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP NULL,
    sync_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES local_users(id) ON DELETE CASCADE,
    INDEX idx_user_marketplace (user_id, marketplace_id),
    INDEX idx_active (is_active),
    INDEX idx_last_sync (last_sync_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 亚马逊商品数据表
CREATE TABLE IF NOT EXISTS amazon_products (
    id VARCHAR(36) PRIMARY KEY,
    store_id VARCHAR(36) NOT NULL,
    asin VARCHAR(20) NOT NULL, -- 亚马逊标准识别号
    sku VARCHAR(100), -- 卖家SKU
    title TEXT,
    description LONGTEXT,
    bullet_points JSON, -- 产品要点（JSON数组）
    price DECIMAL(10, 2),
    buy_box_price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    stock_quantity INT DEFAULT 0,
    fba_stock INT DEFAULT 0, -- FBA库存
    fbm_stock INT DEFAULT 0, -- 自发货库存
    category VARCHAR(255),
    sub_category VARCHAR(255),
    brand VARCHAR(100),
    images JSON, -- 图片URL数组
    ratings DECIMAL(2, 1), -- 评分（如4.5）
    review_count INT DEFAULT 0,
    sales_rank INT, -- 销售排名
    bsr_category VARCHAR(255), -- BSR类别
    dimensions JSON, -- 尺寸重量信息
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES amazon_stores(id) ON DELETE CASCADE,
    UNIQUE KEY unique_store_asin (store_id, asin),
    INDEX idx_asin (asin),
    INDEX idx_sku (sku),
    INDEX idx_category (category),
    INDEX idx_active (is_active),
    INDEX idx_last_sync (last_sync_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 亚马逊销售数据表（按天聚合）
CREATE TABLE IF NOT EXISTS amazon_sales (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    store_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    units_sold INT DEFAULT 0,
    revenue DECIMAL(12, 2) DEFAULT 0,
    orders_count INT DEFAULT 0,
    returns_count INT DEFAULT 0,
    refunds_amount DECIMAL(12, 2) DEFAULT 0,
    fba_fees DECIMAL(10, 2) DEFAULT 0,
    referral_fees DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES amazon_products(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES amazon_stores(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_date (product_id, date),
    INDEX idx_store_date (store_id, date),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 亚马逊订单数据表（原始订单）
CREATE TABLE IF NOT EXISTS amazon_orders (
    id VARCHAR(36) PRIMARY KEY,
    store_id VARCHAR(36) NOT NULL,
    amazon_order_id VARCHAR(50) NOT NULL UNIQUE,
    purchase_date TIMESTAMP NOT NULL,
    order_status VARCHAR(50),
    fulfillment_channel VARCHAR(20), -- AFN (FBA) 或 MFN (自发货)
    sales_channel VARCHAR(50),
    order_total DECIMAL(10, 2),
    currency VARCHAR(3),
    shipping_address JSON,
    items JSON, -- 订单商品详情
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES amazon_stores(id) ON DELETE CASCADE,
    INDEX idx_amazon_order_id (amazon_order_id),
    INDEX idx_purchase_date (purchase_date),
    INDEX idx_store_date (store_id, purchase_date),
    INDEX idx_status (order_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI分析会话表
CREATE TABLE IF NOT EXISTS ai_analysis_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    store_id VARCHAR(36),
    session_type ENUM('product_analysis', 'sales_trend', 'competitor_analysis', 'inventory_analysis', 'pricing_analysis', 'custom') NOT NULL,
    query TEXT NOT NULL,
    result LONGTEXT,
    context JSON, -- 分析上下文数据（如商品ID列表、时间范围等）
    model VARCHAR(50), -- 使用的AI模型
    tokens_used INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES local_users(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES amazon_stores(id) ON DELETE SET NULL,
    INDEX idx_user_type (user_id, session_type),
    INDEX idx_store_type (store_id, session_type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 数据同步日志表
CREATE TABLE IF NOT EXISTS sync_logs (
    id VARCHAR(36) PRIMARY KEY,
    store_id VARCHAR(36) NOT NULL,
    sync_type ENUM('products', 'orders', 'inventory', 'sales', 'full') NOT NULL,
    status ENUM('running', 'success', 'partial', 'failed') NOT NULL,
    items_count INT DEFAULT 0,
    items_processed INT DEFAULT 0,
    items_failed INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NULL,
    duration_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES amazon_stores(id) ON DELETE CASCADE,
    INDEX idx_store_type (store_id, sync_type),
    INDEX idx_status (status),
    INDEX idx_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 竞品监控表（可选功能）
CREATE TABLE IF NOT EXISTS competitor_tracking (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    store_id VARCHAR(36),
    competitor_asin VARCHAR(20) NOT NULL,
    marketplace_id VARCHAR(10) NOT NULL,
    product_title VARCHAR(500),
    tracked_price DECIMAL(10, 2),
    tracked_ratings DECIMAL(2, 1),
    tracked_review_count INT,
    is_active BOOLEAN DEFAULT TRUE,
    last_checked_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES local_users(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES amazon_stores(id) ON DELETE SET NULL,
    INDEX idx_user_marketplace (user_id, marketplace_id),
    INDEX idx_competitor_asin (competitor_asin),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 竞品价格历史表
CREATE TABLE IF NOT EXISTS competitor_price_history (
    id VARCHAR(36) PRIMARY KEY,
    tracking_id VARCHAR(36) NOT NULL,
    price DECIMAL(10, 2),
    ratings DECIMAL(2, 1),
    review_count INT,
    bsr INT,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tracking_id) REFERENCES competitor_tracking(id) ON DELETE CASCADE,
    INDEX idx_tracking_time (tracking_id, checked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 聊天会话表
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) DEFAULT NULL,
    title VARCHAR(255) DEFAULT NULL,
    agent_id VARCHAR(64) DEFAULT NULL,
    agent_name VARCHAR(100) DEFAULT NULL,
    agent_avatar VARCHAR(10) DEFAULT NULL,
    system_prompt TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSON DEFAULT NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 聊天消息表
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    role ENUM('user', 'assistant', 'system', 'agent') NOT NULL,
    content TEXT NOT NULL,
    agent_id VARCHAR(64) DEFAULT NULL,
    agent_name VARCHAR(100) DEFAULT NULL,
    agent_avatar VARCHAR(10) DEFAULT NULL,
    tool_name VARCHAR(64) DEFAULT NULL,
    tool_input JSON DEFAULT NULL,
    tool_result TEXT DEFAULT NULL,
    is_error BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session_id (session_id),
    INDEX idx_timestamp (timestamp),
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 技能执行日志表
CREATE TABLE IF NOT EXISTS skill_executions (
    id VARCHAR(36) PRIMARY KEY,
    skill_id VARCHAR(36) NOT NULL COMMENT '技能ID',
    agent_id VARCHAR(36) COMMENT '执行智能体ID',
    session_id VARCHAR(64) COMMENT '会话ID',
    params JSON COMMENT '执行参数',
    result JSON COMMENT '执行结果',
    status ENUM('success', 'error', 'timeout', 'cancelled') NOT NULL,
    error_message TEXT COMMENT '错误信息',
    duration_ms INT COMMENT '执行耗时',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_skill_id (skill_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI 智能体表
CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) DEFAULT NULL,
    name VARCHAR(100) NOT NULL COMMENT '智能体名称',
    role VARCHAR(100) NOT NULL COMMENT '角色描述',
    avatar VARCHAR(10) DEFAULT '🤖' COMMENT '头像表情',
    description TEXT COMMENT '详细描述',
    skills JSON COMMENT '技能列表',
    model VARCHAR(50) DEFAULT 'claude-sonnet-4-6' COMMENT '使用的AI模型',
    color VARCHAR(7) DEFAULT '#3b82f6' COMMENT '主题颜色',
    system_prompt TEXT COMMENT '系统提示词',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    is_default BOOLEAN DEFAULT FALSE COMMENT '是否为系统默认智能体',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_is_active (is_active),
    INDEX idx_is_default (is_default),
    FOREIGN KEY (user_id) REFERENCES local_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认用户（本地使用）
INSERT IGNORE INTO local_users (id, username, is_default)
VALUES ('default-user', 'default', TRUE);

-- AI 技能库表
CREATE TABLE IF NOT EXISTS skills (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '技能名称',
    description TEXT COMMENT '技能描述',
    icon VARCHAR(50) DEFAULT 'Wrench' COMMENT '图标名称',
    category VARCHAR(50) NOT NULL COMMENT '技能分类',
    status ENUM('active', 'inactive', 'beta') DEFAULT 'active' COMMENT '技能状态',
    is_built_in BOOLEAN DEFAULT TRUE COMMENT '是否为系统内置技能',
    
    -- 执行配置
    execution_type ENUM('builtin', 'http', 'mcp', 'code', 'proxy') DEFAULT 'builtin' COMMENT '执行类型',
    execution_config JSON COMMENT '执行配置（API端点、代码等）',
    
    -- 参数定义
    config_schema JSON COMMENT '输入参数 JSON Schema',
    
    -- 认证配置
    auth_type ENUM('none', 'api_key', 'oauth2', 'basic', 'bearer') DEFAULT 'none' COMMENT '认证类型',
    auth_config JSON COMMENT '认证配置（密钥、token等）',
    
    -- 高级设置
    timeout_ms INT DEFAULT 30000 COMMENT '超时时间（毫秒）',
    retry_policy JSON COMMENT '重试策略 {maxRetries, backoffType, initialDelay}',
    rate_limit_per_minute INT DEFAULT 60 COMMENT '每分钟调用限制',
    
    -- 使用统计
    usage_count INT DEFAULT 0 COMMENT '使用次数',
    success_count INT DEFAULT 0 COMMENT '成功次数',
    fail_count INT DEFAULT 0 COMMENT '失败次数',
    avg_execution_ms INT DEFAULT 0 COMMENT '平均执行时间',
    
    -- 文档
    documentation_url VARCHAR(500) COMMENT '文档链接',
    examples JSON COMMENT '使用示例',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_is_built_in (is_built_in),
    INDEX idx_execution_type (execution_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认技能
INSERT IGNORE INTO skills (id, name, description, icon, category, status, is_built_in) VALUES
('1688-search', '1688 智能搜货', '基于图片或文字描述在1688平台搜索优质货源', 'ShoppingCart', 'procurement', 'active', TRUE),
('product-description', '商品描述生成', '自动生成吸引人的商品标题和描述', 'FileText', 'content', 'active', TRUE),
('ai-model-image', 'AI 模特生成', '自动生成专业的产品展示图', 'Image', 'content', 'active', TRUE),
('shopify-builder', 'Shopify 店铺搭建', '自动创建和配置Shopify店铺', 'Globe', 'store', 'active', TRUE),
('seo-optimizer', 'SEO 优化器', '自动优化商品关键词和搜索排名', 'TrendingUp', 'store', 'active', TRUE),
('social-post', '社媒内容发布', '自动生成并发布小红书、微博、抖音、公众号、Twitter等平台内容', 'MessageSquare', 'marketing', 'active', TRUE),
('market-research', '市场趋势分析', '分析热门品类和市场趋势', 'TrendingUp', 'analytics', 'active', TRUE),
('product-sourcing', '选品分析', '竞品调研和选品建议', 'Search', 'procurement', 'active', TRUE),
('trend-analysis', '趋势预测', '预测产品流行趋势', 'BarChart', 'analytics', 'active', TRUE),
('copywriting', '文案创作', '撰写营销文案和广告语', 'FileText', 'content', 'active', TRUE),
('image-generation', 'AI图像生成', '生成商品图片和营销素材', 'Image', 'content', 'active', TRUE),
('seo-optimization', 'SEO优化', '搜索引擎优化建议', 'TrendingUp', 'store', 'active', TRUE),
('shopify', 'Shopify运营', 'Shopify店铺运营指导', 'Globe', 'store', 'active', TRUE),
('analytics', '数据分析', '销售数据和流量分析', 'BarChart', 'analytics', 'active', TRUE),
('listing-optimization', 'Listing优化', '商品列表优化建议', 'FileText', 'store', 'active', TRUE),
('rfq', 'RFQ管理', '询价单管理和报价分析', 'MessageSquare', 'procurement', 'active', TRUE),
('negotiation', '谈判技巧', '供应商谈判策略', 'Users', 'procurement', 'active', TRUE),
('supplier-management', '供应商管理', '供应商评估和管理', 'Building', 'procurement', 'active', TRUE),
('social-media', '社媒运营', '社交媒体内容运营', 'Share2', 'marketing', 'active', TRUE),
('ads', '广告投放', '广告策略和投放优化', 'Target', 'marketing', 'active', TRUE),
('content-marketing', '内容营销', '内容营销策略和执行', 'PenTool', 'marketing', 'active', TRUE);

-- 插入默认AI智能体
INSERT IGNORE INTO agents (id, name, role, avatar, description, skills, model, color, system_prompt, is_active, is_default) VALUES
('product-researcher', '选品专员', '爆款选品总监', '🔍', '擅长市场趋势分析、竞品调研、1688以图搜货', '["market-research", "product-sourcing", "trend-analysis"]', 'claude-sonnet-4-6', '#22c55e', '你是专业的电商选品专家，擅长分析市场趋势、挖掘爆款产品。你的主要职责包括：1. 市场趋势分析：识别热门品类和新兴趋势；2. 竞品调研：分析竞争对手的产品策略、定价和卖点；3. 供应链管理：协助寻找可靠的供应商，进行成本分析；4. 产品定位：帮助确定目标客户群和差异化卖点。请用数据驱动的建议帮助用户做出明智的选品决策。', TRUE, TRUE),
('content-creator', '内容专员', '内容生成专员', '✍️', '自动生成商品描述、AI模特图、营销文案', '["copywriting", "image-generation", "seo-optimization"]', 'claude-sonnet-4-6', '#f97316', '你是专业的电商内容创作专家，擅长撰写高转化率的商品文案和营销内容。你的技能包括：1. 商品标题优化：撰写包含关键词、吸引人的产品标题；2. 产品描述：创建详细、有说服力的产品详情页内容；3. 营销文案：编写促销文案、邮件营销内容、社交媒体帖子；4. SEO优化：确保内容符合搜索引擎优化标准；5. 多语言支持：能够创建面向不同市场的本地化内容。', TRUE, TRUE),
('store-manager', '运营专员', '店铺运营总监', '🏪', 'Shopify店铺搭建、SEO优化、数据分析', '["shopify", "seo", "analytics", "listing-optimization"]', 'claude-sonnet-4-6', '#3b82f6', '你是资深的电商运营专家，精通Shopify等平台的店铺管理和优化。你的专长包括：1. 店铺搭建：指导店铺设计、导航结构和用户体验优化；2. 商品上架：优化商品列表，提升搜索排名和转化率；3. 数据分析：解读销售数据、流量数据，提供运营洞察；4. SEO策略：实施站内和站外SEO优化；5. 运营策略：制定定价、促销和库存管理策略。', TRUE, TRUE),
('procurement', '采购专员', '采购谈判专员', '🤝', '自动发起RFQ、供应商谈判、订单跟进', '["rfq", "negotiation", "supplier-management"]', 'claude-sonnet-4-6', '#8b5cf6', '你是专业的采购和供应链专家，擅长供应商管理和谈判。你的能力包括：1. 供应商开发：寻找和评估潜在供应商；2. RFQ管理：起草询价单、分析报价、选择最优方案；3. 谈判策略：制定谈判策略，争取更好的价格和条款；4. 订单跟进：监控订单进度，确保按时交付；5. 质量控制：协助进行产品质量检验和供应商评估。', TRUE, TRUE),
('marketing', '营销专员', '社媒营销总监', '📢', 'Instagram/X/Reddit内容发布、广告投放', '["social-media", "ads", "content-marketing"]', 'claude-sonnet-4-6', '#ec4899', '你是专业的数字营销专家，专注于社交媒体营销和广告投放。你的专长包括：1. 社媒策略：制定Instagram、Facebook、TikTok等平台的内容策略；2. 内容创作：创建引人入胜的社交媒体内容；3. 广告投放：优化Facebook Ads、Google Ads等广告活动；4. KOL合作：识别和联系合适的网红进行合作；5. 效果分析：追踪营销指标，优化ROI。', TRUE, TRUE);

-- 定时任务表
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '任务名称',
    description TEXT COMMENT '任务描述',
    agent_id VARCHAR(36) NOT NULL COMMENT '关联智能体ID',
    agent_name VARCHAR(100) COMMENT '智能体名称（冗余）',
    session_id VARCHAR(36) COMMENT '会话ID（可选）',
    prompt TEXT NOT NULL COMMENT '执行提示词',
    
    -- 调度配置
    schedule_type ENUM('once', 'daily', 'interval', 'cron') NOT NULL COMMENT '调度类型',
    schedule_value VARCHAR(100) NOT NULL COMMENT '调度值（ISO时间/HH:mm/分钟/cron表达式）',
    
    -- 状态
    enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    last_run_at TIMESTAMP NULL COMMENT '上次执行时间',
    next_run_at TIMESTAMP NULL COMMENT '下次执行时间',
    
    -- 执行统计
    total_runs INT DEFAULT 0 COMMENT '总执行次数',
    success_runs INT DEFAULT 0 COMMENT '成功次数',
    fail_runs INT DEFAULT 0 COMMENT '失败次数',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_agent_id (agent_id),
    INDEX idx_enabled (enabled),
    INDEX idx_next_run_at (next_run_at),
    INDEX idx_schedule_type (schedule_type),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 定时任务执行结果表
CREATE TABLE IF NOT EXISTS scheduled_task_results (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL COMMENT '关联任务ID',
    status ENUM('running', 'success', 'error') NOT NULL COMMENT '执行状态',
    output TEXT COMMENT '执行输出',
    error_message TEXT COMMENT '错误信息',
    duration_ms INT COMMENT '执行耗时（毫秒）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_task_id (task_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认定时任务
INSERT IGNORE INTO scheduled_tasks (id, name, description, agent_id, agent_name, prompt, schedule_type, schedule_value, enabled) VALUES
('daily-market-report', '每日市场报告', '每天早上9点生成市场趋势分析报告', 'product-researcher', '选品专员', '请分析今天的市场趋势，包括：1. 热门品类变化；2. 竞品动态；3. 新兴机会。生成一份简洁的市场报告。', 'daily', '09:00', TRUE),
('hourly-inventory-check', '库存检查', '每小时检查一次库存状态', 'store-manager', '运营专员', '请检查当前所有商品的库存状态，标记库存不足的商品，并建议补货数量。', 'interval', '60', TRUE),
('daily-social-post', '每日社媒发布', '每天下午6点自动生成并发布社交媒体内容', 'marketing', '营销专员', '请根据今天的热门话题和产品信息，生成一条适合发布的社交媒体内容（小红书/微博/抖音风格）。', 'daily', '18:00', TRUE),
('weekly-supplier-review', '供应商周评', '每周一上午10点评估供应商表现', 'procurement', '采购专员', '请回顾本周的供应商表现，包括：1. 交货准时率；2. 产品质量反馈；3. 需要跟进的订单。', 'cron', '0 10 * * 1', TRUE),
('daily-competitor-analysis', '竞品分析', '每天早上8点分析竞品动态', 'product-researcher', '选品专员', '请分析主要竞争对手的最新动态，包括：1. 新品上架；2. 价格变动；3. 促销活动。', 'daily', '08:00', TRUE);

-- 用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    display_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    region VARCHAR(50) DEFAULT '中国大陆',
    avatar_url VARCHAR(500),

    -- 通知设置
    notify_email BOOLEAN DEFAULT TRUE,
    notify_push BOOLEAN DEFAULT TRUE,
    notify_sms BOOLEAN DEFAULT FALSE,
    notify_marketing BOOLEAN DEFAULT FALSE,

    -- 安全设置
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),

    -- 订阅信息
    plan VARCHAR(50) DEFAULT 'free',
    tokens_limit INT DEFAULT 50000,
    tokens_used INT DEFAULT 0,
    tokens_reset_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES local_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 平台集成表
CREATE TABLE IF NOT EXISTS user_integrations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- shopify, woocommerce, amazon
    platform_name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) DEFAULT '🛍️',
    is_connected BOOLEAN DEFAULT FALSE,
    access_token TEXT,
    refresh_token TEXT,
    store_url VARCHAR(500),
    store_name VARCHAR(255),
    metadata JSON,
    connected_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_user_platform (user_id, platform),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES local_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 团队成员表
CREATE TABLE IF NOT EXISTS team_members (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role ENUM('owner', 'admin', 'member') DEFAULT 'member',
    avatar VARCHAR(10),
    status ENUM('active', 'pending', 'inactive') DEFAULT 'pending',
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_owner_id (owner_id),
    INDEX idx_user_id (user_id),
    INDEX idx_email (email),
    FOREIGN KEY (owner_id) REFERENCES local_users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES local_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认用户设置
INSERT IGNORE INTO user_settings (id, user_id, display_name, email, plan) VALUES
('default-settings', 'default-user', '商家用户', 'user@example.com', 'pro');

-- 插入默认平台集成
INSERT IGNORE INTO user_integrations (id, user_id, platform, platform_name, icon, is_connected) VALUES
('int-shopify', 'default-user', 'shopify', 'Shopify', '🛍️', TRUE),
('int-woocommerce', 'default-user', 'woocommerce', 'WooCommerce', '🔌', FALSE),
('int-amazon', 'default-user', 'amazon', 'Amazon Seller', '📦', FALSE);

-- 插入默认团队成员
INSERT IGNORE INTO team_members (id, owner_id, name, email, role, avatar, status) VALUES
('tm-owner', 'default-user', '商家用户', 'owner@example.com', 'owner', '商', 'active'),
('tm-admin', 'default-user', '运营专员', 'ops@example.com', 'admin', '运', 'active'),
('tm-member', 'default-user', '选品助理', 'buyer@example.com', 'member', '选', 'active');
