/**
 * WF Studio - 主应用组件
 * 可独立运行的可视化工作流编排平台
 */

import React, { useEffect } from 'react';
import { WorkflowCanvas } from './editor';
import { registerAllExecutors } from './nodes/index';

// 注册所有节点执行器
registerAllExecutors();

export default function App() {
  useEffect(() => {
    console.log('🎨 WF Studio 已加载');
    console.log('📦 支持的节点类型: START, END, LLM, MCP_TOOL, CONDITION, RAG_RETRIEVE, VARIABLE_SET, VARIABLE_GET, CODE, INPUT, OUTPUT');
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50">
      <WorkflowCanvas />
    </div>
  );
}
