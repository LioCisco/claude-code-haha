# Skill 系统实现文档

## 概述

已实现与 Claude Code 相同的 Skill Tool 机制，让 LLM 可以主动调用 Skill，而不是简单的 prompt injection。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Tool Definition (skillTool.ts)                    │
│  - SkillDefinition 类型                                      │
│  - SkillRegistry 注册表                                       │
│  - SKILL_TOOL_DEFINITION (Anthropic Function Calling)       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Skill Registry (builtinSkills.ts)                 │
│  - 内置 Skill 注册 (inventory-check, social-post 等)        │
│  - 从数据库加载 Skill                                         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Prompt Integration (ai.ts)                        │
│  - buildSystemPromptWithSkills()                            │
│  - 在系统提示词中列出可用 Skill                               │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Execution (claudeSession.ts)                      │
│  - 处理 skill tool 调用                                       │
│  - executeSkill() 执行逻辑                                   │
│  - inline / fork 两种模式                                   │
└─────────────────────────────────────────────────────────────┘
```

## 已注册的内置 Skill

1. **inventory-check** - 检查库存状态
   - 别名: `库存检查`, `stock-check`
   - 触发: "帮我检查库存", "库存状态"

2. **social-post** - 生成社媒内容
   - 别名: `social`, `社媒发布`
   - 参数: `<平台> <主题> [--style <风格>] [--image] [--video]`
   - 触发: "生成小红书文案", "发一条微博"

3. **simplify** - 代码审查和清理
   - 触发: "simplify", "review code", "refactor", "clean up"

4. **commit** - 生成提交信息并执行 git commit
   - 别名: `git-commit`
   - 触发: "提交代码", "commit"

## 测试方法

### 1. 启动服务器

```bash
cd web-ui
bun run server
```

### 2. 打开浏览器测试

1. 访问 http://localhost:8080
2. 登录（如需要）
3. 进入 Chat 页面
4. 发送消息测试 Skill 调用：

**测试 inventory-check:**
```
帮我检查库存
```
预期结果：显示 "🔧 使用 Skill: /inventory-check"

**测试 social-post:**
```
生成一条小红书文案关于夏季护肤
```
预期结果：显示 "🔧 使用 Skill: /social-post"

**测试 commit:**
```
提交代码
```
预期结果：显示 "🔧 使用 Skill: /commit"

### 3. 验证系统提示词

查看服务器日志，确认系统提示词中包含 Skill 列表：
```
## 可用 Skill 工具

你可以使用以下 Skill 来扩展能力...
```

## 技术细节

### Skill Tool Schema

```typescript
{
  name: 'skill',
  input_schema: {
    type: 'object',
    properties: {
      skill: { type: 'string' },  // Skill 名称
      args: { type: 'string' },   // 可选参数
    },
    required: ['skill'],
  },
}
```

### Skill 执行流程

1. LLM 收到系统提示词，包含可用 Skill 列表
2. 用户发送消息匹配某个 Skill
3. LLM 调用 `skill` tool，传入 skill 名称和参数
4. 后端查找 Skill 定义，获取 prompt
5. 将 Skill prompt 加入对话上下文
6. LLM 根据 Skill 指令继续执行

### 前端事件

- `skill_invoke` - Skill 开始/完成/失败
- `skill_progress` - Skill 执行进度
- `skill_result` - Skill 执行结果

## 与 Claude Code 的差异

| 特性 | Claude Code | Web-UI |
|------|-------------|--------|
| 通信方式 | 直接调用 | WebSocket |
| 权限系统 | 完整权限控制 | 简化版 |
| Fork 模式 | 子 Agent | 简化实现（同 inline） |
| Skill 来源 | Bundled + 本地文件 | Bundled + 数据库 |

## 后续优化

1. 实现真正的 Fork 模式（子 Agent）
2. 添加 Skill 权限控制
3. 支持 Skill 参数自动补全
4. 添加 Skill 执行历史
