/**
 * 节点面板 - 可拖拽的节点列表
 */

import React from 'react';
import { NodeType } from '../types';

const nodeCategories = [
  {
    name: '基础',
    nodes: [
      { type: NodeType.START, label: '开始', icon: '▶', color: '#22c55e' },
      { type: NodeType.END, label: '结束', icon: '■', color: '#ef4444' },
    ],
  },
  {
    name: 'AI',
    nodes: [
      { type: NodeType.LLM, label: 'LLM 调用', icon: '🤖', color: '#8b5cf6' },
      { type: NodeType.RAG_RETRIEVE, label: 'RAG 检索', icon: '📚', color: '#10b981' },
    ],
  },
  {
    name: '工具',
    nodes: [
      { type: NodeType.MCP_TOOL, label: 'MCP 工具', icon: '🔧', color: '#3b82f6' },
      { type: NodeType.CODE, label: '代码执行', icon: '💻', color: '#1f2937' },
    ],
  },
  {
    name: '控制流',
    nodes: [
      { type: NodeType.CONDITION, label: '条件判断', icon: '◈', color: '#f59e0b' },
    ],
  },
  {
    name: '变量',
    nodes: [
      { type: NodeType.VARIABLE_SET, label: '设置变量', icon: '📝', color: '#6366f1' },
      { type: NodeType.VARIABLE_GET, label: '获取变量', icon: '📖', color: '#6366f1' },
    ],
  },
  {
    name: 'I/O',
    nodes: [
      { type: NodeType.INPUT, label: '用户输入', icon: '📥', color: '#06b6d4' },
      { type: NodeType.OUTPUT, label: '输出结果', icon: '📤', color: '#ec4899' },
    ],
  },
];

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">节点面板</h2>
        <p className="text-xs text-gray-500 mt-1">拖拽节点到画布</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {nodeCategories.map((category) => (
          <div key={category.name}>
            <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
              {category.name}
            </h3>
            <div className="space-y-2">
              {category.nodes.map((node) => (
                <div
                  key={node.type}
                  className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 cursor-move hover:border-blue-500 hover:shadow-sm transition-all"
                  draggable
                  onDragStart={(e) => onDragStart(e, node.type)}
                >
                  <span
                    className="w-8 h-8 rounded flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${node.color}20` }}
                  >
                    {node.icon}
                  </span>
                  <span className="text-sm text-gray-700">{node.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
