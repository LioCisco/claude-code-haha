# Accio Work - AI电商智能工作台

基于阿里 Accio Work 界面风格打造的 AI 电商 Web UI。

## 功能特性

### 🤖 AI 团队协作
- 5个专业AI智能体：选品、内容、运营、采购、营销
- 支持多智能体群聊协作
- 自然语言交互，无需学习复杂操作

### 🏪 一键开店
- 30分钟完成从创意到上线
- 自动市场调研和选品分析
- Shopify/WooCommerce/Amazon 多平台支持

### 🛠️ 技能库
- 39+ 开箱即用的电商技能
- 1688智能搜货、AI模特生成、SEO优化
- 社媒自动发布、竞品分析

### 📊 数据分析
- 实时销售数据看板
- 产品表现分析
- 访客和转化追踪

## 技术栈

### 前端
- React 19 + TypeScript
- Vite 构建工具
- Tailwind CSS
- Zustand 状态管理
- Recharts 数据可视化
- Lucide React 图标

### 后端
- Bun 运行时
- Elysia.js Web框架
- WebSocket 实时通信

## 快速开始

### 安装依赖

```bash
cd web-ui
bun install
```

### 开发模式

```bash
# 启动前端开发服务器
bun run dev

# 启动后端API服务器
bun run server
```

### 构建生产版本

```bash
bun run build
```

### 启动生产服务器

```bash
bun run server
```

## 项目结构

```
web-ui/
├── src/
│   ├── components/      # React组件
│   │   ├── layout/      # 布局组件
│   │   ├── chat/        # 聊天相关组件
│   │   ├── dashboard/   # 仪表盘组件
│   │   └── common/      # 通用组件
│   ├── pages/           # 页面组件
│   │   ├── Dashboard.tsx
│   │   ├── Chat.tsx
│   │   ├── Agents.tsx
│   │   ├── Skills.tsx
│   │   ├── StoreBuilder.tsx
│   │   ├── Analytics.tsx
│   │   ├── Settings.tsx
│   │   └── Onboarding.tsx
│   ├── store/           # Zustand状态管理
│   ├── types/           # TypeScript类型定义
│   ├── lib/             # 工具函数
│   └── hooks/           # 自定义React Hooks
├── server/              # 后端API
│   ├── index.ts
│   └── routes/
├── public/              # 静态资源
└── package.json
```

## 界面预览

### 工作台首页
- 快速入口卡片
- AI团队状态
- 进行中的任务
- 店铺项目概览

### 智能对话
- 类聊天界面
- AI智能体侧边栏
- 实时消息推送
- 文件附件支持

### 一键开店向导
- 5步开店流程
- AI市场分析
- 产品选择
- 多平台发布

### 数据分析
- 销售趋势图
- 产品分布饼图
- 关键指标卡片
- 时间范围筛选

## API 端点

- `GET /api/health` - 健康检查
- `GET /api/agents` - 获取AI智能体列表
- `GET /api/skills` - 获取技能列表
- `GET /api/chat/messages` - 获取聊天记录
- `POST /api/chat/messages` - 发送消息
- `GET /api/stores` - 获取店铺列表
- `GET /api/analytics` - 获取分析数据
- `WS /ws/chat` - WebSocket实时聊天

## 配置

### 环境变量

创建 `.env` 文件：

```env
# API配置
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080

# AI模型配置（可选）
ANTHROPIC_API_KEY=your_api_key
```

## 路线图

- [ ] 集成真实AI API (Claude/OpenAI)
- [ ] 用户认证系统
- [ ] 数据持久化 (数据库)
- [ ] 文件上传功能
- [ ] 多语言支持
- [ ] 移动端适配优化
- [ ] 插件系统
- [ ] 工作流编排

## 许可证

MIT License
