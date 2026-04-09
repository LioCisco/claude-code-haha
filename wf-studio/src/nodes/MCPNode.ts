/**
 * MCP 工具节点执行器
 * 调用 MCP 服务提供的工具
 */

import { CanvasNode, NodeExecutor, NodeType, ExecutionContext, MCPNodeConfig } from '../types';
import { interpolateObject } from '../utils/template';

// MCP 客户端管理
const mcpClients = new Map<string, any>();

export const mcpExecutor: NodeExecutor = {
  type: NodeType.MCP_TOOL,

  async execute(node: CanvasNode, input: any, context: ExecutionContext): Promise<any> {
    const config = node.data.config as MCPNodeConfig;
    const variables = Object.fromEntries(context.variables);

    // 参数插值
    const parameters = interpolateObject(config.parameters, { ...variables, input });

    // 获取 MCP 客户端
    const client = mcpClients.get(config.serverName);
    if (!client) {
      throw new Error(`MCP 服务 ${config.serverName} 未连接`);
    }

    // 调用工具
    const result = await client.callTool({
      name: config.toolName,
      arguments: parameters,
    });

    return {
      toolName: config.toolName,
      serverName: config.serverName,
      result,
      parameters,
    };
  },

  validate(config: MCPNodeConfig): boolean {
    return !!config.serverName && !!config.toolName;
  },
};

// 连接 MCP 服务
export async function connectMCPService(name: string, config: any): Promise<void> {
  // 这里实现实际的 MCP 连接逻辑
  // 支持 stdio、SSE、HTTP 等传输方式
  console.log(`连接 MCP 服务: ${name}`, config);
}
