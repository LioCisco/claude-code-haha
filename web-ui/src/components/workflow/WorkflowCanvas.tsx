/**
 * 工作流画布编辑器
 * 基于 React Flow 的可视化工作流编辑器
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Connection,
  Edge,
  Node,
  NodeTypes,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { NodePalette } from './NodePalette';
import { NodePropertyPanel } from './NodePropertyPanel';
import { WorkflowToolbar } from './WorkflowToolbar';
import { useWorkflowStore } from './workflowStore';
import { createNodeComponent } from './nodeComponents';

// 节点类型映射
const nodeTypes: NodeTypes = {
  start: createNodeComponent('start', { color: '#22c55e', icon: '▶' }),
  end: createNodeComponent('end', { color: '#ef4444', icon: '■' }),
  llm: createNodeComponent('llm', { color: '#8b5cf6', icon: '🤖' }),
  mcp_tool: createNodeComponent('mcp_tool', { color: '#3b82f6', icon: '🔧' }),
  condition: createNodeComponent('condition', { color: '#f59e0b', icon: '◈' }),
  rag_retrieve: createNodeComponent('rag_retrieve', { color: '#10b981', icon: '📚' }),
  variable_set: createNodeComponent('variable_set', { color: '#6366f1', icon: '📝' }),
  variable_get: createNodeComponent('variable_get', { color: '#6366f1', icon: '📖' }),
  code: createNodeComponent('code', { color: '#1f2937', icon: '💻' }),
  skill: createNodeComponent('skill', { color: '#f97316', icon: '🎯' }),
  input: createNodeComponent('input', { color: '#06b6d4', icon: '📥' }),
  output: createNodeComponent('output', { color: '#ec4899', icon: '📤' }),
};

interface CanvasInnerProps {
  workflowId?: string;
}

function CanvasInner({ workflowId }: CanvasInnerProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { project } = useReactFlow();
  const store = useWorkflowStore();

  // 加载工作流
  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    }
  }, [workflowId]);

  const loadWorkflow = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/workflows/${id}`);
      const data = await response.json();
      if (data.success) {
        const wf = data.workflow;
        store.setWorkflowId(wf.id);
        store.setWorkflowName(wf.name);
        store.setVariables(wf.variables || []);
        setNodes(wf.nodes || []);
        setEdges(wf.edges || []);
      }
    } catch (error) {
      console.error('加载工作流失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = project({
        x: event.clientX - (reactFlowWrapper.current?.getBoundingClientRect().left || 0),
        y: event.clientY - (reactFlowWrapper.current?.getBoundingClientRect().top || 0),
      });

      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: {
          label: getDefaultLabel(type),
          description: '',
          config: getDefaultConfig(type),
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [project, setNodes]
  );

  const onNodeDataChange = useCallback(
    (nodeId: string, newData: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return { ...node, data: { ...node.data, ...newData } };
          }
          return node;
        })
      );
      if (selectedNode?.id === nodeId) {
        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...newData } });
      }
    },
    [setNodes, selectedNode]
  );

  const handleRunWorkflow = useCallback(async () => {
    if (!workflowId) {
      alert('请先保存工作流');
      return;
    }

    store.setRunning(true);
    try {
      const result = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).then((r) => r.json());

      store.setLastResult(result);
      if (result.success) {
        alert('执行成功');
      } else {
        alert(result.error || '执行失败');
      }
    } catch (error) {
      console.error('执行失败:', error);
      alert('执行失败');
    } finally {
      store.setRunning(false);
    }
  }, [workflowId, store]);

  const handleSaveWorkflow = useCallback(async () => {
    const workflow = {
      name: store.workflowName,
      nodes,
      edges,
      variables: store.variables,
    };

    try {
      const url = workflowId ? `/api/workflows/${workflowId}` : '/api/workflows';
      const method = workflowId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow),
      });

      const data = await response.json();
      if (data.success) {
        alert('工作流已保存');
        if (!workflowId && data.workflowId) {
          window.location.href = `/workflow/${data.workflowId}`;
        }
      } else {
        alert(data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存工作流失败:', error);
      alert('保存失败');
    }
  }, [nodes, edges, store, workflowId]);

  const handleExportWorkflow = useCallback(() => {
    const workflow = {
      id: store.workflowId,
      name: store.workflowName,
      nodes,
      edges,
      variables: store.variables,
    };
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${store.workflowName || 'workflow'}.json`;
    a.click();
  }, [nodes, edges, store]);

  const handleImportWorkflow = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workflow = JSON.parse(e.target?.result as string);
          setNodes(workflow.nodes || []);
          setEdges(workflow.edges || []);
          store.setWorkflowId(workflow.id);
          store.setWorkflowName(workflow.name);
          store.setVariables(workflow.variables || []);
        } catch {
          alert('导入失败：无效的 JSON 文件');
        }
      };
      reader.readAsText(file);
    },
    [setNodes, setEdges, store]
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧节点面板 */}
      <NodePalette />

      {/* 中间画布区域 */}
      <div className="flex-1 flex flex-col relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-50">
            <div className="text-slate-500">加载中...</div>
          </div>
        )}
        <WorkflowToolbar
          onRun={handleRunWorkflow}
          onSave={handleSaveWorkflow}
          onExport={handleExportWorkflow}
          onImport={handleImportWorkflow}
          isRunning={store.isRunning}
          workflowName={store.workflowName}
          onWorkflowNameChange={store.setWorkflowName}
        />

        <div ref={reactFlowWrapper} className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
          >
            <Background color="#f3f4f6" gap={16} />
            <Controls />
            <MiniMap
              nodeStrokeWidth={3}
              nodeColor={(n) => {
                const colors: Record<string, string> = {
                  start: '#22c55e',
                  end: '#ef4444',
                  llm: '#8b5cf6',
                  mcp_tool: '#3b82f6',
                  condition: '#f59e0b',
                };
                return colors[n.type || ''] || '#94a3b8';
              }}
            />
          </ReactFlow>
        </div>
      </div>

      {/* 右侧属性面板 */}
      <NodePropertyPanel
        selectedNode={selectedNode}
        onNodeDataChange={onNodeDataChange}
      />
    </div>
  );
}

// 获取默认标签
function getDefaultLabel(type: string): string {
  const labels: Record<string, string> = {
    start: '开始',
    end: '结束',
    llm: 'LLM 调用',
    mcp_tool: 'MCP 工具',
    condition: '条件判断',
    rag_retrieve: 'RAG 检索',
    variable_set: '设置变量',
    variable_get: '获取变量',
    code: '代码执行',
    skill: '调用技能',
    input: '用户输入',
    output: '输出结果',
  };
  return labels[type] || type;
}

// 获取默认配置
function getDefaultConfig(type: string): any {
  const configs: Record<string, any> = {
    llm: {
      model: 'claude-3-sonnet-20240229',
      temperature: 0.7,
      maxTokens: 4096,
      systemPrompt: '',
    },
    mcp_tool: {
      serverName: '',
      toolName: '',
      parameters: {},
    },
    condition: {
      conditions: [
        { id: 'true', label: '是', expression: 'true' },
        { id: 'false', label: '否', expression: 'false' },
      ],
    },
    rag_retrieve: {
      knowledgeBaseId: '',
      query: '',
      topK: 5,
      threshold: 0.5,
    },
    variable_set: {
      variableName: '',
      valueType: 'string',
      variableValue: '',
    },
    code: {
      language: 'javascript',
      code: '// 输入可通过 input 变量访问\n// 上下文变量通过 vars 访问\n\nreturn input;',
    },
    skill: {
      skillSource: 'platform', // 'platform' | 'builtin'
      skillId: '',
      skillName: '',
      parameters: {},
    },
  };
  return configs[type] || {};
}

interface WorkflowCanvasProps {
  workflowId?: string;
}

export function WorkflowCanvas({ workflowId }: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner workflowId={workflowId} />
    </ReactFlowProvider>
  );
}
