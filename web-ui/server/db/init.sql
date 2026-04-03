-- AI跨境电商智能体数据库表结构
-- 数据库: kane-work

-- 本地用户表（简化版，本地单用户使用）
CREATE TABLE IF NOT EXISTS local_users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255), -- 可选，本地使用可不设密码
    is_default BOOLEAN DEFAULT FALSE, -- 是否为默认用户
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    type ENUM('register', 'reset_password') NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_type (email, type),
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

-- 用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES local_users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_setting (user_id, setting_key),
    INDEX idx_user_id (user_id)
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

-- 插入默认用户（本地使用）
INSERT IGNORE INTO local_users (id, username, is_default)
VALUES ('default-user', 'default', TRUE);
