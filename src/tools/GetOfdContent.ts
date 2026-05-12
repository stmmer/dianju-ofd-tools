import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { HttpUtils, DianJuSignUtil, ConfigManager, Logger } from "../utils/index.js";
import { FileInfo, BaseData, MetaData } from "../types/convert.js";

const GetOfdContentSchema = z.object({
  filePath: z.string().describe("OFD 文件的本地路径"),
});

export function registerGetOfdContent(server: McpServer) {
  server.registerTool('get_ofd_content', {
    description: '获取 OFD 文件的内容',
    inputSchema: GetOfdContentSchema,
  }, async (args: unknown) => {
    try {
      const { filePath } = GetOfdContentSchema.parse(args);
      
      Logger.info(`开始获取 OFD 文件内容: ${filePath}`);
      
      // 1. 读取文件并转换为 Base64
      const fileBuffer = await fs.promises.readFile(path.resolve(filePath));
      const base64Str = fileBuffer.toString("base64");
      
      Logger.debug(`文件读取完成，大小: ${fileBuffer.length} 字节`);
      
      // 2. 构建请求参数
      const fileName = path.basename(filePath);
      const request = buildGetOfdContentRequest(base64Str, fileName);
      
      // 3. 计算签名头
      const config = ConfigManager.getConfig();
      const dateStr = DianJuSignUtil.getDate();
      const jsonBody = JSON.stringify(request);
      const contentMd5 = DianJuSignUtil.md5(jsonBody);
      const authorization = DianJuSignUtil.getAuthorization(
        config.APP_ID || '',
        config.APP_KEY || '',
        contentMd5,
        'application/json',
        dateStr,
      );
      
      // 4. 发送请求
      Logger.debug(`发送获取内容请求到: ${config.API_URL}/handleFile/getFileText`);
      Logger.debug(`请求参数: ${jsonBody}`);
      
      const response = await HttpUtils.post(
        config.API_URL+"/handleFile/getFileText",
        jsonBody,
        {
          headers: {
            'Content-Type': 'application/json',
            Date: dateStr,
            'Content-Md5': contentMd5,
            Authorization: authorization,
          },
        },
      );
      
      Logger.debug(`获取内容请求响应状态: ${response.status}`);
      Logger.debug('响应结果:', response.data);
      
      // 5. 处理响应
      const result = response.data as any;
      
      // 根据根级别 RET_CODE 判断成功或失败
      const retCode = result.RET_CODE ?? 0;
      const retMsg = result.RET_MSG ?? '获取内容失败';
      
      if (retCode === 1) {
        const txtList = result.FILE_INFO?.TXT_LIST;
        if (!txtList || !txtList.length) {
          const errorMsg = '获取内容成功但未返回内容';
          Logger.warn(errorMsg);
          return {
            content: [{ type: 'text' as const, text: `文件处理失败：${errorMsg}` }],
          };
        }
        Logger.info(`OFD 获取内容成功`);
        return {
          content: [
            {
              type: "text" as const,
              text: `获取内容成功！内容：${JSON.stringify(txtList)}`,
            },
          ],
        };
      } else {
        Logger.warn(`OFD 获取内容失败 [${retCode}]：${retMsg}`);
        return {
          content: [
            { type: "text" as const, text: `文件处理失败 [${retCode}]：${retMsg}` },
          ],
        };
      }
    } catch (error: any) {
      Logger.error(`OFD 获取内容异常：${error.message}`, error);
      return {
        content: [
          { type: 'text' as const, text: `获取内容失败：${error.message}` },
        ],
      };
    }
  });
}

function buildGetOfdContentRequest(base64Str: string, fileName: string): any {
  const config = ConfigManager.getConfig();
  const APP_ID = config.APP_ID || '';
  
  const baseData: BaseData = {
    SYS_ID: APP_ID,
    SERIAL_NUMBER: Date.now().toString(),
  };
  
  const fileInfo: FileInfo = {
    FILE_NO: fileName,
    FILE_TYPE: 'ofd',
    REQUEST_TYPE: '4',
    FILE_PATH: base64Str,
  };
  
  const metaData: MetaData = {
    PARAGRAPH_FLAG: "true",
  };
  
  return {
    BASE_DATA: baseData,
    FILE_INFO: fileInfo,
    META_DATA: metaData,
  };
}
