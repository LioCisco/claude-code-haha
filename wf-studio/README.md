# WF Studio - 可视化工作流编排平台

基于 claude-code 与 cc-wf-studio 深度耦合的可视化工作流编排平台。

## 特性

- 🎨 **可视化画布** - 基于 React Flow 的拖拽式工作流编辑器
- 🤖 **AI 节点** - LLM 调用、RAG 检索、Agent 编排
- 🔧 **MCP 支持** - 内置 MCP 服务集成
- 📝 **代码执行** - JavaScript/TypeScript 代码节点
- 🔄 **变量系统** - 支持工作流变量传递
- 📤 **导入导出** - JSON 格式工作流保存与加载

## 项目结构

```
wf-studio/
├── src/
│   ├── types/          # 核心类型定义
│   ├── engine/         # 工作流执行引擎
│   ├── nodes/          # 节点执行器实现
│   ├── editor/         # React Flow 画布编辑器
│   ├── utils/          # 工具函数
│   ├── App.tsx         # 主应用组件
│   ├── main.tsx        # 客户端入口
│   ├── server.tsx      # 服务端入口
│   └── index.css       # 全局样式
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 支持的节点类型

| 类型 | 说明 |
|------|------|
| `start` | 工作流开始节点 |
| `end` | 工作流结束节点 |
| `llm` | LLM 调用节点 (Claude) |
| `mcp_tool` | MCP 工具调用节点 |
| `condition` | 条件分支节点 |
| `rag_retrieve` | RAG 文档检索节点 |
| `variable_set` | 设置变量节点 |
| `variable_get` | 获取变量节点 |
| `code` | 代码执行节点 |
| `input` | 用户输入节点 |
| `output` | 输出结果节点 |

## 启动命令

```bash
# 安装依赖
bun install

# 开发模式（前端 + API）
bun run dev

# 仅启动服务端
bun run server

# 构建生产版本
bun run build

# 预览生产版本
bun run preview
```

## 环境变量

```bash
# Anthropic API (用于 LLM 节点)
ANTHROPIC_API_KEY=your_api_key
ANTHROPIC_BASE_URL=https://api.anthropic.com

# 可选：自定义模型
DEFAULT_MODEL=claude-3-sonnet-20240229
```

## 工作流执行流程

1. 用户在画布上拖拽节点并连接
2. 点击"运行"按钮发送工作流 JSON 到后端
3. `WorkflowEngine` 解析工作流图
4. 按拓扑顺序执行每个节点
5. 节点输出通过边传递到下游节点
6. 返回执行结果和日志

## 扩展节点

创建自定义节点执行器：

```typescript
import { NodeExecutor, NodeType, CanvasNode, ExecutionContext } from './types';

export const myExecutor: NodeExecutor = {
  type: NodeType.CUSTOM,
  
  async execute(node: CanvasNode, input: any, context: ExecutionContext) {
    // 实现节点逻辑
    return { result: 'success' };
  },
  
  validate(config) {
    return true;
  }
};

// 注册
registerExecutor(myExecutor);
```
