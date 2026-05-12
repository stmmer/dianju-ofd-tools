import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';

// 创建MCP服务器
const server = new McpServer({
  name: 'file-tools',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// 注册工具
registerTools(server);

// 启动服务器
async function startServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log('SSE服务器启动成功！');
    console.log('使用标准输入/输出进行通信');
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();