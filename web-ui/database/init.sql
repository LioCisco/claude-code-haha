-- Initialize kane-work database
CREATE DATABASE IF NOT EXISTS `kane-work`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `kane-work`;

-- Chat sessions table
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
  metadata JSON DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat messages table
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

-- Verify tables
SHOW TABLES;
