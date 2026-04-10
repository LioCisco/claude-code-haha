import { execute, queryOne } from './index'

// 示例系统插件
const systemPlugins = [
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
