-- 删除旧的用户设置表（如果存在）
DROP TABLE IF EXISTS user_settings;

-- 删除平台集成和团队成员表（如果存在）
DROP TABLE IF EXISTS user_integrations;
DROP TABLE IF EXISTS team_members;

-- 重新创建用户设置表
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

-- 重新创建平台集成表
CREATE TABLE IF NOT EXISTS user_integrations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    platform VARCHAR(50) NOT NULL,
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

-- 重新创建团队成员表
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

-- 插入默认数据
INSERT IGNORE INTO user_settings (id, user_id, display_name, email, plan) VALUES
('default-settings', 'default-user', '商家用户', 'user@example.com', 'pro');

INSERT IGNORE INTO user_integrations (id, user_id, platform, platform_name, icon, is_connected) VALUES
('int-shopify', 'default-user', 'shopify', 'Shopify', '🛍️', TRUE),
('int-woocommerce', 'default-user', 'woocommerce', 'WooCommerce', '🔌', FALSE),
('int-amazon', 'default-user', 'amazon', 'Amazon Seller', '📦', FALSE);

INSERT IGNORE INTO team_members (id, owner_id, name, email, role, avatar, status) VALUES
('tm-owner', 'default-user', '商家用户', 'owner@example.com', 'owner', '商', 'active'),
('tm-admin', 'default-user', '运营专员', 'ops@example.com', 'admin', '运', 'active'),
('tm-member', 'default-user', '选品助理', 'buyer@example.com', 'member', '选', 'active');
