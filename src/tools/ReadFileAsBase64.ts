import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
// @ts-ignore
import * as fs from 'fs';
// @ts-ignore
import * as path from 'path';

const ReadFileAsBase64Schema = z.object({
  filePath: z.string().describe('文件路径'),
});

export function registerReadFileAsBase64(server: McpServer) {
  server.registerTool('read_file_as_base64', {
    description: '读取文件并返回 Base64 编码内容',
    inputSchema: ReadFileAsBase64Schema,
  }, async (args: unknown) => {
    const { filePath } = ReadFileAsBase64Schema.parse(args);
    const content = await fs.promises.readFile(path.resolve(filePath));
    return {
      content: [{ type: 'text' as const, text: content.toString('base64') }],
    };
  });
}