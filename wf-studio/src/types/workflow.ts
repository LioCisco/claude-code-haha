/**
 * 工作流核心类型定义
 * 画布节点结构 ↔ claude-code 执行结构 的桥梁
 */

// 节点类型枚举
export enum NodeType {
  // 基础节点
  START = 'start',
  END = 'end',

  // AI 节点
  LLM = 'llm',
  AGENT = 'agent',

  // 工具节点
  MCP_TOOL = 'mcp_tool',
  CODE = 'code',

  // 控制流
  CONDITION = 'condition',
  LOOP = 'loop',
  PARALLEL = 'parallel',

  // 数据节点
  RAG_RETRIEVE = 'rag_retrieve',
  VARIABLE_SET = 'variable_set',
  VARIABLE_GET = 'variable_get',

  // I/O 节点
  INPUT = 'input',
  OUTPUT = 'output',
  HTTP_REQUEST = 'http_request',
}

// 节点状态
export enum NodeStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  SKIPPED = 'skipped',
}

// 工作流变量
export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  value: any;
  scope: 'global' | 'local' | 'input' | 'output';
}

// 画布节点数据（React Flow 兼容）
export interface CanvasNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

// 画布边数据
export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  condition?: string; // 条件边的表达式
}

// 节点数据基类
export interface NodeData {
  label: string;
  description?: string;
  config: NodeConfig;
  inputs?: PortDefinition[];
  outputs?: PortDefinition[];
}

// 端口定义
export interface PortDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required?: boolean;
  defaultValue?: any;
  description?: string;
}

// 节点配置联合类型
export type NodeConfig =
  | LLMNodeConfig
  | MCPNodeConfig
  | ConditionNodeConfig
  | RAGNodeConfig
  | VariableNodeConfig
  | CodeNodeConfig
  | InputOutputConfig
  | {};

// LLM 节点配置
export interface LLMNodeConfig {
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  messages?: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  tools?: string[]; // 允许调用的工具名列表
}

// MCP 工具节点配置
export interface MCPNodeConfig {
  serverName: string;
  toolName: string;
  parameters: Record<string, any>;
  timeout?: number;
}

// 条件节点配置
export interface ConditionNodeConfig {
  conditions: Array<{
    id: string;
    label: string;
    expression: string; // JavaScript 表达式，如: `input.age > 18`
  }>;
  defaultBranch?: string;
}

// RAG 节点配置
export interface RAGNodeConfig {
  knowledgeBaseId: string;
  query: string;
  topK?: number;
  threshold?: number;
  metadata?: Record<string, any>;
}

// 变量节点配置
export interface VariableNodeConfig {
  variableName: string;
  variableValue?: any;
  valueType: 'string' | 'number' | 'boolean' | 'object' | 'expression';
  expression?: string; // 表达式，如: `{{input.name}} + "!"`
}

// 代码节点配置
export interface CodeNodeConfig {
  language: 'javascript' | 'typescript' | 'python';
  code: string;
  timeout?: number;
}

// 输入输出配置
export interface InputOutputConfig {
  format: 'text' | 'json' | 'markdown';
  schema?: Record<string, any>;
}

// 工作流定义
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  variables: WorkflowVariable[];
  metadata?: {
    createdAt: string;
    updatedAt: string;
    author?: string;
    tags?: string[];
  };
}

// 执行上下文
export interface ExecutionContext {
  workflowId: string;
  runId: string;
  variables: Map<string, any>;
  nodeOutputs: Map<string, any>;
  executionHistory: ExecutionStep[];
  parentContext?: ExecutionContext;
}

// 执行步骤
export interface ExecutionStep {
  nodeId: string;
  nodeType: NodeType;
  status: NodeStatus;
  input: any;
  output: any;
  startedAt: Date;
  endedAt?: Date;
  error?: Error;
  logs: string[];
}

// 执行结果
export interface ExecutionResult {
  runId: string;
  workflowId: string;
  status: 'success' | 'error' | 'cancelled';
  output?: any;
  steps: ExecutionStep[];
  duration: number;
  variables: Record<string, any>;
}

// 节点执行器接口
export interface NodeExecutor {
  type: NodeType;
  execute(
    node: CanvasNode,
    input: any,
    context: ExecutionContext
  ): Promise<any>;
  validate?(config: NodeConfig): boolean;
}

// MCP 服务定义
export interface MCPService {
  name: string;
  transport: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  tools: MCPToolDefinition[];
}

// MCP 工具定义
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// RAG 文档
export interface RAGDocument {
  id: string;
  content: string;
  metadata: {
    source?: string;
    title?: string;
    timestamp?: string;
    [key: string]: any;
  };
  embedding?: number[];
}

// 知识库
export interface KnowledgeBase {
  id: string;
  name: string;
  documents: RAGDocument[];
  embeddingModel?: string;
}
