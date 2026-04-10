import { execute, queryOne } from './index'

// 示例系统插件
const systemPlugins = [
  {
    id: 'plugin-superpowers',
    name: 'Superpowers 增强套件',
    description: '为 AI 助手提供高级能力：计划制定、代码审查、调试、TDD、Git 工作流等',
    version: '1.0.0',
    author: 'Kane Work',
    icon: 'Zap',
    category: 'ai',
    type: 'builtin',
    status: 'active',
    is_system: true,
    is_enabled: true,
    manifest: {
      tools: [
        {
          name: 'brainstorm',
          description: '在开始任何创造性工作前调用，探索用户需求、设计选项和实施策略。输入：{ task: string, context?: string }',
          input_schema: {
            type: 'object',
            properties: {
              task: { type: 'string', description: '用户请求的任务描述' },
              context: { type: 'string', description: '额外的上下文信息' }
            },
            required: ['task']
          }
        },
        {
          name: 'write_plan',
          description: '为复杂任务制定实施计划。输入：{ task: string, requirements: string[], constraints?: string[] }',
          input_schema: {
            type: 'object',
            properties: {
              task: { type: 'string', description: '任务描述' },
              requirements: { type: 'array', items: { type: 'string' }, description: '需求列表' },
              constraints: { type: 'array', items: { type: 'string' }, description: '约束条件' }
            },
            required: ['task', 'requirements']
          }
        },
        {
          name: 'debug_systematically',
          description: '系统性调试问题。输入：{ problem: string, symptoms: string[], attempted_fixes?: string[] }',
          input_schema: {
            type: 'object',
            properties: {
              problem: { type: 'string', description: '问题描述' },
              symptoms: { type: 'array', items: { type: 'string' }, description: '症状列表' },
              attempted_fixes: { type: 'array', items: { type: 'string' }, description: '已尝试的修复方法' }
            },
            required: ['problem', 'symptoms']
          }
        },
        {
          name: 'code_review',
          description: '审查代码并提供反馈。输入：{ code: string, file_path: string, review_focus?: string[] }',
          input_schema: {
            type: 'object',
            properties: {
              code: { type: 'string', description: '代码内容' },
              file_path: { type: 'string', description: '文件路径' },
              review_focus: { type: 'array', items: { type: 'string' }, description: '审查重点：security, performance, readability, maintainability' }
            },
            required: ['code', 'file_path']
          }
        },
        {
          name: 'tdd_cycle',
          description: '执行测试驱动开发周期。输入：{ feature: string, test_cases: string[] }',
          input_schema: {
            type: 'object',
            properties: {
              feature: { type: 'string', description: '功能描述' },
              test_cases: { type: 'array', items: { type: 'string' }, description: '测试用例列表' }
            },
            required: ['feature', 'test_cases']
          }
        },
        {
          name: 'git_worktree',
          description: '为功能开发创建 Git 工作流隔离环境。输入：{ feature_name: string, base_branch?: string }',
          input_schema: {
            type: 'object',
            properties: {
              feature_name: { type: 'string', description: '功能名称' },
              base_branch: { type: 'string', description: '基于的分支，默认为 main' }
            },
            required: ['feature_name']
          }
        },
        {
          name: 'verify_before_complete',
          description: '在完成前验证工作。输入：{ task: string, verification_steps: string[] }',
          input_schema: {
            type: 'object',
            properties: {
              task: { type: 'string', description: '完成的任务描述' },
              verification_steps: { type: 'array', items: { type: 'string' }, description: '验证步骤列表' }
            },
            required: ['task', 'verification_steps']
          }
        }
      ],
      permissions: ['bash', 'read_file', 'write_file']
    },
    code: `// Superpowers 插件 - 提供高级 AI 辅助能力

async function brainstorm({ task, context = '' }) {
  // 返回思考框架和建议
  return {
    approach: '建议采用以下步骤：\\n1. 分析需求\\n2. 探索可行方案\\n3. 评估利弊\\n4. 制定实施计划',
    considerations: [
      '考虑用户需求的核心痛点',
      '评估技术可行性和复杂度',
      '权衡短期和长期维护成本'
    ],
    next_steps: ['澄清需求细节', '研究现有方案', '设计原型']
  };
}

async function write_plan({ task, requirements, constraints = [] }) {
  return {
    plan: {
      phases: [
        { name: '调研分析', tasks: ['需求澄清', '技术调研'] },
        { name: '设计阶段', tasks: ['架构设计', '接口定义'] },
        { name: '实施阶段', tasks: ['核心功能', '边界处理'] },
        { name: '验证阶段', tasks: ['测试验证', '代码审查'] }
      ]
    },
    estimated_effort: '根据复杂度评估',
    risks: constraints.map(c => ({ risk: c, mitigation: '待定' }))
  };
}

async function debug_systematically({ problem, symptoms, attempted_fixes = [] }) {
  return {
    diagnostic_steps: [
      '1. 复现问题',
      '2. 收集日志和错误信息',
      '3. 隔离可能的原因',
      '4. 提出假设并验证',
      '5. 实施修复并验证'
    ],
    hypotheses: symptoms.map(s => ({ symptom: s, possible_causes: ['原因A', '原因B'] })),
    tools_needed: ['日志分析', '调试器', '监控工具']
  };
}

async function code_review({ code, file_path, review_focus = ['readability', 'maintainability'] }) {
  const issues = [];

  // 基础检查
  if (code.length > 500 && !code.includes('\\n\\n')) {
    issues.push({ type: 'style', message: '建议添加空行分隔逻辑块' });
  }
  if (!code.includes('//') && code.length > 200) {
    issues.push({ type: 'documentation', message: '考虑添加注释说明复杂逻辑' });
  }

  return {
    file: file_path,
    summary: '代码审查完成',
    issues,
    suggestions: review_focus.map(focus => ({ focus, suggestion: '具体建议...' })),
    approval: issues.length === 0 ? 'approved' : 'needs_revision'
  };
}

async function tdd_cycle({ feature, test_cases }) {
  return {
    cycle: {
      red: '编写失败的测试：' + test_cases[0],
      green: '实现最小代码使测试通过',
      refactor: '重构代码，保持测试通过'
    },
    test_plan: test_cases.map(tc => ({ test: tc, status: 'pending' })),
    guidelines: [
      '先写测试，后写实现',
      '每个测试只验证一个概念',
      '保持测试简单可读'
    ]
  };
}

async function git_worktree({ feature_name, base_branch = 'main' }) {
  const worktree_name = feature_name.toLowerCase().replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return {
    commands: [
      \`git worktree add .claude/worktrees/\${worktree_name} \${base_branch}\`,
      \`cd .claude/worktrees/\${worktree_name}\`,
      \`git checkout -b feature/\${worktree_name}\`
    ],
    path: \`.claude/worktrees/\${worktree_name}\`,
    cleanup: \`git worktree remove .claude/worktrees/\${worktree_name}\`
  };
}

async function verify_before_complete({ task, verification_steps }) {
  return {
    verification_checklist: verification_steps.map((step, i) => ({
      step: i + 1,
      description: step,
      status: 'pending',
      command: '运行验证命令...'
    })),
    completion_criteria: [
      '所有验证步骤通过',
      '代码审查完成',
      '文档已更新'
    ]
  };
}`
  },

  {
    id: 'plugin-web-search',
    name: '网页搜索增强',
    description: '增强版网页搜索，支持多搜索引擎和结果过滤',
    version: '1.0.0',
    author: 'Kane Work',
    icon: 'Search',
    category: 'utility',
    type: 'builtin',
    status: 'active',
    is_system: true,
    is_enabled: true,
    manifest: {
      tools: [{
        name: 'enhanced_web_search',
        description: '增强版网页搜索',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            engine: { type: 'string', enum: ['google', 'bing', 'duckduckgo'] },
            limit: { type: 'number' }
          },
          required: ['query']
        }
      }],
      permissions: ['web_fetch']
    },
    code: `async function enhanced_web_search({ query, engine = "duckduckgo", limit = 10 }) {
  // 这里是插件代码示例
  return { results: [{ title: "Example", url: "https://example.com", snippet: "Search result" }] };
}`
  },
  {
    id: 'plugin-code-analyzer',
    name: '代码分析器',
    description: '分析代码质量、复杂度和潜在问题',
    version: '1.0.0',
    author: 'Kane Work',
    icon: 'Code',
    category: 'ai',
    type: 'builtin',
    status: 'active',
    is_system: true,
    is_enabled: true,
    manifest: {
      tools: [{
        name: 'analyze_code',
        description: '分析代码质量和复杂度',
        input_schema: {
          type: 'object',
          properties: {
            file_path: { type: 'string' },
            metrics: { type: 'array', items: { type: 'string' } }
          },
          required: ['file_path']
        }
      }]
    },
    code: `async function analyze_code({ file_path, metrics = ["complexity", "maintainability"] }) {
  return { complexity: "low", issues: [], score: 95 };
}`
  },
  {
    id: 'plugin-git-helper',
    name: 'Git 助手',
    description: '增强 Git 操作，支持智能提交和分支管理',
    version: '1.0.0',
    author: 'Kane Work',
    icon: 'GitBranch',
    category: 'automation',
    type: 'builtin',
    status: 'active',
    is_system: true,
    is_enabled: true,
    manifest: {
      tools: [{
        name: 'smart_commit',
        description: '智能生成提交信息',
        input_schema: {
          type: 'object',
          properties: {
            files: { type: 'array', items: { type: 'string' } },
            style: { type: 'string' }
          },
          required: ['files']
        }
      }]
    },
    code: `async function smart_commit({ files, style = "conventional" }) {
  return { message: "feat: update files", suggestions: [] };
}`
  }
]

// 示例市场插件
const marketplacePlugins = [
  {
    id: 'market-web-search',
    name: '网页搜索增强',
    description: '支持多搜索引擎的高级搜索插件，可以同时在 Google、Bing、DuckDuckGo 上搜索并聚合结果',
    short_description: '多引擎聚合搜索插件',
    version: '1.0.0',
    author_id: 'default-user',
    author_name: 'Kane Work',
    icon: 'Search',
    category: 'utility',
    type: 'builtin',
    status: 'approved',
    visibility: 'public',
    manifest: {
      tools: [{
        name: 'enhanced_web_search',
        description: '在多个搜索引擎上搜索并聚合结果',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '搜索关键词' },
            engines: { type: 'array', items: { type: 'string', enum: ['google', 'bing', 'duckduckgo'] }, description: '要使用的搜索引擎' },
            limit: { type: 'number', default: 10 }
          },
          required: ['query']
        }
      }]
    },
    code: `async function enhanced_web_search({ query, engines = ["duckduckgo"], limit = 10 }) {
  const results = [];
  for (const engine of engines) {
    results.push({ engine, title: \`Result from \${engine}\`, url: \`https://\${engine}.com/search?q=\${encodeURIComponent(query)}\`, snippet: \`Search results for "\${query}"\` });
  }
  return { results, total: results.length };
}`,
    tags: ['search', 'web', 'productivity'],
    readme: `# 网页搜索增强

## 功能
- 支持多搜索引擎：Google、Bing、DuckDuckGo
- 结果聚合和去重
- 支持自定义搜索数量

## 使用示例
搜索 "AI 最新进展" 使用 Google 和 Bing
`,
    download_count: 128,
    rating_avg: 4.5,
    rating_count: 12,
    install_count: 45
  },
  {
    id: 'market-code-analyzer',
    name: '代码分析器 Pro',
    description: '基于 AST 的代码分析工具，可以检测代码复杂度、潜在问题和安全漏洞',
    short_description: '智能代码质量和安全分析',
    version: '2.0.0',
    author_id: 'default-user',
    author_name: 'Kane Work',
    icon: 'Code',
    category: 'dev',
    type: 'builtin',
    status: 'approved',
    visibility: 'public',
    manifest: {
      tools: [{
        name: 'analyze_code_quality',
        description: '分析代码质量和复杂度',
        input_schema: {
          type: 'object',
          properties: {
            file_path: { type: 'string', description: '文件路径' },
            checks: { type: 'array', items: { type: 'string', enum: ['complexity', 'security', 'performance', 'maintainability'] }, description: '要执行的检查类型' }
          },
          required: ['file_path']
        }
      }]
    },
    code: `async function analyze_code_quality({ file_path, checks = ["complexity", "maintainability"] }) {
  const fs = require("fs");
  const content = fs.readFileSync(file_path, "utf-8");
  const issues = [];
  const metrics = {};
  if (checks.includes("complexity")) {
    const lines = content.split("\\n");
    const functions = content.match(/function\\s+\\w+\\s*\\(/g) || [];
    metrics.function_count = functions.length;
    metrics.lines_of_code = lines.length;
    if (functions.length > 20) {
      issues.push({ type: "warning", message: "函数数量过多，考虑拆分模块" });
    }
  }
  return { metrics, issues, score: issues.length === 0 ? 95 : 85 };
}`,
    tags: ['code-quality', 'analysis', 'developer-tools', 'security'],
    readme: `# 代码分析器 Pro

## 功能
- 代码复杂度分析
- 安全漏洞检测
- 性能问题识别
- 可维护性评分

## 支持的检查类型
- complexity: 圈复杂度和函数数量
- security: 常见安全漏洞
- performance: 性能反模式
- maintainability: 代码可维护性
`,
    download_count: 256,
    rating_avg: 4.8,
    rating_count: 24,
    install_count: 89
  },
  {
    id: 'market-json-crud',
    name: 'JSON 数据库',
    description: '为 Claude Code 提供简单的 JSON 文件数据库功能，支持 CRUD 操作',
    short_description: '轻量级 JSON 文件数据库',
    version: '1.0.0',
    author_id: 'default-user',
    author_name: 'Kane Work',
    icon: 'Database',
    category: 'utility',
    type: 'builtin',
    status: 'approved',
    visibility: 'public',
    manifest: {
      tools: [
        { name: 'json_db_create', description: '创建新记录', input_schema: { type: 'object', properties: { db_name: { type: 'string' }, data: { type: 'object' } }, required: ['db_name', 'data'] } },
        { name: 'json_db_read', description: '读取记录', input_schema: { type: 'object', properties: { db_name: { type: 'string' }, query: { type: 'object' } }, required: ['db_name'] } },
        { name: 'json_db_update', description: '更新记录', input_schema: { type: 'object', properties: { db_name: { type: 'string' }, id: { type: 'string' }, data: { type: 'object' } }, required: ['db_name', 'id', 'data'] } },
        { name: 'json_db_delete', description: '删除记录', input_schema: { type: 'object', properties: { db_name: { type: 'string' }, id: { type: 'string' } }, required: ['db_name', 'id'] } }
      ]
    },
    code: `const databases = new Map();

async function json_db_create({ db_name, data }) {
  if (!databases.has(db_name)) databases.set(db_name, new Map());
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
  const record = { id, ...data, created_at: new Date().toISOString() };
  databases.get(db_name).set(id, record);
  return { success: true, id, record };
}

async function json_db_read({ db_name, query = {} }) {
  if (!databases.has(db_name)) return { success: true, records: [] };
  let records = Array.from(databases.get(db_name).values());
  if (query.filter) {
    records = records.filter(r => Object.entries(query.filter).every(([k, v]) => r[k] === v));
  }
  return { success: true, records };
}

async function json_db_update({ db_name, id, data }) {
  if (!databases.has(db_name)) return { success: false, error: "Database not found" };
  const record = databases.get(db_name).get(id);
  if (!record) return { success: false, error: "Record not found" };
  const updated = { ...record, ...data, updated_at: new Date().toISOString() };
  databases.get(db_name).set(id, updated);
  return { success: true, record: updated };
}

async function json_db_delete({ db_name, id }) {
  if (!databases.has(db_name)) return { success: false, error: "Database not found" };
  const deleted = databases.get(db_name).delete(id);
  return { success: deleted };
}`,
    tags: ['database', 'json', 'storage', 'crud'],
    readme: `# JSON 数据库

## 功能
轻量级的内存 JSON 数据库，支持：
- 创建记录
- 查询记录（支持简单过滤）
- 更新记录
- 删除记录

## 使用示例
json_db_create({ db_name: "users", data: { name: "Alice", age: 30 } })
json_db_read({ db_name: "users", query: { filter: { age: 30 } } })
`,
    download_count: 512,
    rating_avg: 4.9,
    rating_count: 48,
    install_count: 156
  }
]

export async function seedDatabase(): Promise<void> {
  console.log('[Seed] Starting database seeding...')

  try {
    // Seed system plugins
    for (const plugin of systemPlugins) {
      const existing = await queryOne('SELECT id FROM plugins WHERE id = ?', [plugin.id])
      if (!existing) {
        await execute(
          `INSERT INTO plugins (id, name, description, version, author, icon, category, type, status, is_system, is_enabled, manifest, code)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            plugin.id,
            plugin.name,
            plugin.description,
            plugin.version,
            plugin.author,
            plugin.icon,
            plugin.category,
            plugin.type,
            plugin.status,
            plugin.is_system,
            plugin.is_enabled,
            JSON.stringify(plugin.manifest),
            plugin.code
          ]
        )
        console.log(`[Seed] Created system plugin: ${plugin.name}`)
      } else {
        // Update code for existing plugins to ensure fixes are applied
        await execute(
          `UPDATE plugins SET code = ? WHERE id = ?`,
          [plugin.code, plugin.id]
        )
        console.log(`[Seed] Updated system plugin: ${plugin.name}`)
      }
    }

    // Seed marketplace plugins
    for (const plugin of marketplacePlugins) {
      const existing = await queryOne('SELECT id FROM marketplace_plugins WHERE id = ?', [plugin.id])
      if (!existing) {
        await execute(
          `INSERT INTO marketplace_plugins (id, name, description, short_description, version, author_id, author_name, icon, category, type, status, visibility, manifest, code, tags, readme, download_count, rating_avg, rating_count, install_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            plugin.id,
            plugin.name,
            plugin.description,
            plugin.short_description,
            plugin.version,
            plugin.author_id,
            plugin.author_name,
            plugin.icon,
            plugin.category,
            plugin.type,
            plugin.status,
            plugin.visibility,
            JSON.stringify(plugin.manifest),
            plugin.code,
            JSON.stringify(plugin.tags),
            plugin.readme,
            plugin.download_count,
            plugin.rating_avg,
            plugin.rating_count,
            plugin.install_count
          ]
        )
        console.log(`[Seed] Created marketplace plugin: ${plugin.name}`)
      }
    }

    console.log('[Seed] Database seeding completed')
  } catch (error) {
    console.error('[Seed] Seeding failed:', error)
    // Don't throw - allow app to start even if seeding fails
  }
}
