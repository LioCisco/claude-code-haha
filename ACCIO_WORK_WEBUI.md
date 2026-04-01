# Accio Work Web UI - 改造说明

## 项目概述

基于原有的 Claude Code CLI 项目，按照阿里 Accio Work 的界面风格和功能特点，打造了一个完整的 Web UI 版本。

## 核心功能实现

### 1. AI 团队协作 (Chat)
- 多AI智能体群聊界面
- 5个预设角色：选品专员、内容专员、运营专员、采购专员、营销专员
- 支持智能体单独对话或团队协作模式
- 实时消息流和打字效果

### 2. 一键开店 (Store Builder)
- 5步向导式开店流程：
  1. 商业创意输入
  2. 市场调研与选品分析
  3. 产品选择
  4. 店铺搭建
  5. 发布上线
- AI自动市场分析（模拟数据）
- 多平台支持：Shopify、WooCommerce、Amazon

### 3. 技能库 (Skills)
- 39+ 开箱即用的电商技能
- 分类管理：市场调研、内容创作、店铺运营、采购管理、营销推广、数据分析
- 技能状态管理（激活/未激活/配置中）
- 使用统计

### 4. 数据分析 (Analytics)
- 关键指标看板：销售额、订单数、访客数、转化率
- 销售趋势图（Area Chart）
- 产品分布饼图
- 订单与访客趋势（Line Chart）
- 时间范围筛选

### 5. AI 团队管理 (Agents)
- 智能体列表展示
- 角色配置与管理
- 激活状态切换
- 技能和模型配置
- 创建自定义智能体

### 6. 设置中心 (Settings)
- 账户信息管理
- 通知偏好设置
- 安全与隐私（2FA、API密钥）
- 平台集成（Shopify、WooCommerce、Amazon）
- 计费与订阅管理
- 团队成员管理

### 7. 新手引导 (Onboarding)
- 4步引导流程
- 功能介绍
- 用户偏好设置
- 配置总结

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (Frontend)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  React 19   │  │  Tailwind   │  │  Recharts          │  │
│  │  Vite       │  │  CSS        │  │  Zustand           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      后端 (Backend)                           │
│              ┌─────────────────────────┐                     │
│              │    Bun + Elysia.js      │                     │
│              │  REST API + WebSocket   │                     │
│              └─────────────────────────┘                     │
├─────────────────────────────────────────────────────────────┤
│                      AI Engine (可集成)                       │
│              ┌─────────────────────────┐                     │
│              │  Claude API / OpenAI    │                     │
│              │  (当前为模拟响应)        │                     │
│              └─────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

## 目录结构

```
web-ui/
├── src/
│   ├── components/
│   │   └── layout/
│   │       ├── Layout.tsx      # 主布局组件
│   │       ├── Sidebar.tsx     # 侧边栏导航
│   │       └── Header.tsx      # 顶部导航栏
│   ├── pages/
│   │   ├── Dashboard.tsx       # 工作台首页
│   │   ├── Chat.tsx            # AI对话界面
│   │   ├── Agents.tsx          # AI团队管理
│   │   ├── Skills.tsx          # 技能库
│   │   ├── StoreBuilder.tsx    # 一键开店
│   │   ├── Analytics.tsx       # 数据分析
│   │   ├── Settings.tsx        # 设置中心
│   │   └── Onboarding.tsx      # 新手引导
│   ├── store/
│   │   ├── useChatStore.ts     # 聊天状态管理
│   │   └── useStoreBuilderStore.ts  # 店铺构建状态
│   ├── types/
│   │   └── index.ts            # TypeScript类型定义
│   ├── lib/
│   │   └── utils.ts            # 工具函数
│   ├── App.tsx                 # 路由配置
│   ├── main.tsx                # 应用入口
│   └── index.css               # 全局样式
├── server/
│   ├── index.ts                # 服务器入口
│   └── routes/
│       ├── chat.ts             # 聊天API
│       ├── agents.ts           # 智能体API
│       ├── skills.ts           # 技能API
│       ├── store.ts            # 店铺API
│       └── analytics.ts        # 分析API
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── index.html
└── README.md
```

## 启动方式

### 方法1：一键启动
```bash
cd web-ui
./start.sh
```

### 方法2：分别启动
```bash
# 终端1：启动后端API
cd web-ui
bun run server

# 终端2：启动前端开发服务器
cd web-ui
bun run dev
```

### 访问地址
- 前端界面：http://localhost:3000
- API服务：http://localhost:8080
- API文档：http://localhost:8080/swagger

## 下一步集成建议

### 1. AI 能力集成
将现有的 CLI 工具系统与 Web UI 集成：

```typescript
// server/routes/chat.ts
import { queryEngine } from '../../src/query'  // 原有CLI的QueryEngine

// 在WebSocket消息处理中调用
ws.on('message', async (data) => {
  const result = await queryEngine.process(data.content)
  ws.send(JSON.stringify(result))
})
```

### 2. 工具系统集成
将原有的 Tool 系统集成到后端：

```typescript
// server/tools/
├── BashTool.ts
├── FileReadTool.ts
├── FileWriteTool.ts
├── GlobTool.ts
├── GrepTool.ts
└── ...
```

### 3. 真实AI API接入
替换模拟响应，接入真实的Claude API：

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// 在消息处理中使用
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  messages: [{ role: 'user', content: message }],
})
```

### 4. 数据持久化
当前使用内存存储，建议集成数据库：

```typescript
// 可选方案：
- SQLite (轻量级，本地优先)
- PostgreSQL (生产环境)
- Redis (缓存和会话)
```

### 5. 用户认证
添加JWT认证：

```typescript
import { jwt } from '@elysiajs/jwt'

app.use(jwt({
  secret: process.env.JWT_SECRET,
}))
```

## 界面特点对比

| 功能 | Accio Work 原版 | 本实现 |
|------|----------------|--------|
| AI团队 | 多智能体协作 | ✅ 已实现 |
| 一键开店 | 30分钟闭环 | ✅ 已实现 |
| 技能库 | 39+技能 | ✅ 已实现 |
| 数据分析 | 实时看板 | ✅ 已实现 |
| 社媒集成 | Instagram/X/Reddit | ⚠️ 界面已预留 |
| 供应商对接 | 1688/阿里国际站 | ⚠️ 界面已预留 |
| 多平台 | Shopify/WooCommerce/Amazon | ✅ 已实现 |

## 特色设计

1. **绿色主题**：使用 Accio 品牌绿色 (#22c55e) 作为主色调
2. **圆角设计**：大量使用圆角 (rounded-xl) 营造现代感
3. **渐变背景**：头部和重要卡片使用渐变背景
4. **微交互动画**：悬停效果、过渡动画、脉冲指示器
5. **玻璃效果**：部分组件使用 backdrop-blur 效果
6. **响应式布局**：适配不同屏幕尺寸

## 注意事项

1. 当前AI响应为模拟数据，需要接入真实AI API
2. 数据存储在内存中，重启后丢失，建议添加数据库
3. WebSocket用于实时通信，生产环境建议使用Redis适配器
4. 文件上传功能尚未实现
5. 移动端适配需要进一步优化

## 贡献指南

欢迎提交PR来完善功能：
1. 集成真实AI API
2. 添加更多电商技能
3. 实现文件上传
4. 添加测试用例
5. 优化移动端体验
