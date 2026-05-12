import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HttpUtils, DianJuSignUtil, ConfigManager, Logger } from "../utils/index.js";
import * as fs from "fs";
import * as path from "path";
import { ConvertRequest, FileInfo, BaseData, MetaData } from "../types/convert.js";

const PdfToOfdSchema = z.object({
  filePath: z.string().describe("PDF 文件的本地路径"),
});

export function registerPdfToOfd(server: McpServer) {
  server.registerTool('pdf_to_ofd', {
    description: '将本地 PDF 文件转换为 OFD 格式',
    inputSchema: PdfToOfdSchema,
  }, async (args: unknown) => {
    try {
      const { filePath } = PdfToOfdSchema.parse(args);
      
      Logger.info(`开始转换 PDF 文件: ${filePath}`);
      
      // 1. 读取文件并转换为 Base64
      const fileBuffer = await fs.promises.readFile(path.resolve(filePath));
      const base64Str = fileBuffer.toString('base64');
      
      Logger.debug(`文件读取完成，大小: ${fileBuffer.length} 字节`);
      
      // 2. 构建请求参数
      const fileName = path.basename(filePath);
      const request = buildPdfToOfdRequest(base64Str, fileName);

        // 2. 计算签名头
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

        // 3. 发送请求
        Logger.debug(`发送转换请求到: ${config.API_URL}`);
        Logger.debug(`请求参数: ${jsonBody}`);
        
        const response = await HttpUtils.post(
          config.API_URL+"/convert/common" || '',
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
        
        Logger.debug(`转换请求响应状态: ${response.status}`);
        Logger.debug('响应结果:', response.data);
        
        // 4. 处理响应
        const result = response.data as any;
        
        // 根据根级别 RET_CODE 判断成功或失败
        const retCode = result.RET_CODE ?? 0;
        const retMsg = result.RET_MSG ?? '转换失败';
        
        if (retCode === 1) {
          const fileUrl = result.FILE_INFO?.FILE_URL;
          if (!fileUrl) {
            const errorMsg = '转换成功但未返回文件地址';
            Logger.warn(errorMsg);
            return {
              content: [{ type: 'text' as const, text: `文件处理失败：${errorMsg}` }],
            };
          }
          Logger.info(`PDF 转换成功，OFD 文件地址：${fileUrl}`);
          return {
            content: [
              {
                type: "text" as const,
                text: `转换成功！OFD 文件地址：${fileUrl}`,
              },
            ],
          };
        } else {
          Logger.warn(`PDF 转换失败 [${retCode}]：${retMsg}`);
          return {
            content: [
              { type: "text" as const, text: `文件处理失败 [${retCode}]：${retMsg}` },
            ],
          };
        }
      } catch (error: any) {
        Logger.error(`PDF 转换异常：${error.message}`, error);
        return {
          content: [
            { type: "text" as const, text: `转换失败：${error.message}` },
          ],
        };
      }
    },
  );
}



function buildPdfToOfdRequest(base64Str: string, fileName: string): ConvertRequest {
  const config = ConfigManager.getConfig();
  const APP_ID = config.APP_ID || '';
  
  const baseData: BaseData = {
    SYS_ID: APP_ID,
    SERIAL_NUMBER: Date.now().toString(),
  };
  
  const metaData: MetaData = {
    IS_ASYN: "false",
    IS_MERGER: "false",
  };
  
  const fileInfo: FileInfo = {
    FILE_NO: fileName,
    FILE_TYPE: 'pdf',
    FILE_INDEX: '0',
    FILE_ATTRIBUTE: '0',
    CONVERT_TYPE: 'ofd',
    REQUEST_TYPE: '4',
    FILE_PATH: base64Str,
  };
  
  return {
    BASE_DATA: baseData,
    META_DATA: metaData,
    FILE_LIST: [fileInfo],
  };
}
