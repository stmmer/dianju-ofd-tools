import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';

export function createServer() {
  const server = new McpServer({
    name: 'file-tools',
    version: '1.0.0',
  }, {
    capabilities: {
      tools: {},
    },
  });

  registerTools(server);

  return {
    start: async () => {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    },
  };
}