/**
 * WF Studio - 服务端入口
 * Bun + Elysia + React SSR
 */

import { Elysia } from 'elysia';
import { html } from '@elysiajs/html';
import { staticPlugin } from '@elysiajs/static';
import { cors } from '@elysiajs/cors';
import React from 'react';
import { renderToString } from 'react-dom/server';

import { workflowEngine, registerAllExecutors } from './engine';
import { WorkflowCanvas } from './editor';

// 注册所有节点执行器
registerAllExecutors();

// HTML 模板
const HtmlTemplate = ({ children }: { children: string }) => `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WF Studio - 工作流编排平台</title>
    <link rel="stylesheet" href="https://unpkg.com/reactflow@11.11.0/dist/style.css" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    </style>
  </head>
  <body>
    <div id="root">${children}</div>
    <script type="module" src="/client.js"></script>
  </body>
</html>
`;

// 创建 Elysia 应用
const app = new Elysia()
  .use(cors())
  .use(html())

  // 静态文件服务
  .use(staticPlugin({
    prefix: '/',
    assets: './public',
  }))

  // 健康检查
  .get('/api/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))

  // 运行工作流 API
  .post('/api/workflow/run', async ({ body }) => {
    try {
      const workflow = body as any;
      const result = await workflowEngine.runWorkflowFromCanvas(workflow);
      return result;
    } catch (error) {
      return {
        status: 'error',
        error: String(error),
      };
    }
  })

  // 获取工作流列表
  .get('/api/workflows', () => {
    const workflows: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('workflow_')) {
        workflows.push(key.replace('workflow_', ''));
      }
    }
    return { workflows };
  })

  // 加载工作流
  .get('/api/workflows/:id', ({ params }) =㸾 {
    const data = localStorage.getItem(`workflow_${params.id}`);
    if (!data) {
      return { error: '工作流不存在' };
    }
    return JSON.parse(data);
  })

  // 主页面 - SSR
  .get('/', () => {
    const appHtml = renderToString(
      <React.StrictMode>
        <WorkflowCanvas />
      </React.StrictMode>
    );
    return HtmlTemplate({ children: appHtml });
  })

  // 客户端 JS Bundle（开发模式下由 Vite 处理）
  .get('/client.js', () => {
    return new Response(
      `
import React from 'https://esm.sh/react@18.3.0';
import ReactDOM from 'https://esm.sh/react-dom@18.3.0/client';
import { WorkflowCanvas } from './src/editor/index.ts';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(WorkflowCanvas));
`,
      { headers: { 'Content-Type': 'application/javascript' } }
    );
  })

  .listen(3000);

console.log('🚀 WF Studio running at http://localhost:3000');
console.log('📚 API documentation available at /api/health');
