import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import {
  HttpUtils,
  DianJuSignUtil,
  ConfigManager,
  Logger,
} from "../utils/index.js";
import {  FileInfo, BaseData } from "../types/convert.js";

const OfdToImageSchema = z.object({
  filePath: z.string().describe("OFD 文件的本地路径"),
});

export function registerOfdToImage(server: McpServer) {
  server.registerTool(
    "ofd_to_image",
    {
      description: "将 OFD 文件转换为图片",
      inputSchema: OfdToImageSchema,
    },
    async (args: unknown) => {
      try {
        const { filePath } = OfdToImageSchema.parse(args);

        Logger.info(`开始转换 OFD 文件为图片: ${filePath}`);

        // 1. 读取文件并转换为 Base64
        const fileBuffer = await fs.promises.readFile(path.resolve(filePath));
        const base64Str = fileBuffer.toString("base64");

        // 2. 构建请求参数
        const fileName = filePath;
        const request = buildOfdToImageRequest(base64Str,fileName);

        // 3. 计算签名头
        const config = ConfigManager.getConfig();
        const dateStr = DianJuSignUtil.getDate();
        const jsonBody = JSON.stringify(request);
        const contentMd5 = DianJuSignUtil.md5(jsonBody);
        const authorization = DianJuSignUtil.getAuthorization(
          config.APP_ID || "",
          config.APP_KEY || "",
          contentMd5,
          "application/json",
          dateStr,
        );

        // 4. 发送请求
        Logger.debug(`发送转换请求到: ${config.API_URL}`);
        Logger.debug(`请求参数: ${jsonBody}`);

        const response = await HttpUtils.post(
          config.API_URL+"/convert/ofd/to/image",
          jsonBody,
          {
            headers: {
              "Content-Type": "application/json",
              Date: dateStr,
              "Content-Md5": contentMd5,
              Authorization: authorization,
            },
          },
        );

        Logger.debug(`转换请求响应状态: ${response.status}`);
        Logger.debug("响应结果:", response.data);

        // 5. 处理响应
        const result = response.data as any;

        // 根据根级别 RET_CODE 判断成功或失败
        const retCode = result.RET_CODE ?? 0;
        const retMsg = result.RET_MSG ?? "转换失败";

        if (retCode === 1) {
          const fileUrl = result.FILE_INFO?.FILE_URL;
          if (!fileUrl) {
            const errorMsg = "转换成功但未返回文件地址";
            Logger.warn(errorMsg);
            return {
              content: [
                { type: "text" as const, text: `文件处理失败：${errorMsg}` },
              ],
            };
          }
          Logger.info(`OFD 转换图片成功，文件地址：${fileUrl}`);
          return {
            content: [
              {
                type: "text" as const,
                text: `转换成功！文件地址：${fileUrl}`,
              },
            ],
          };
        } else {
          Logger.warn(`OFD 转换图片失败 [${retCode}]：${retMsg}`);
          return {
            content: [
              {
                type: "text" as const,
                text: `文件处理失败 [${retCode}]：${retMsg}`,
              },
            ],
          };
        }
      } catch (error: any) {
        Logger.error(`OFD 转换图片异常：${error.message}`, error);
        return {
          content: [
            { type: "text" as const, text: `转换失败：${error.message}` },
          ],
        };
      }
    },
  );
}

function buildOfdToImageRequest(base64Str: string, fileName: string): any {
  const config = ConfigManager.getConfig();
  const APP_ID = config.APP_ID || "";

  const baseData: BaseData = {
    SYS_ID: APP_ID,
    SERIAL_NUMBER: Date.now().toString(),
  };

  const fileInfo: FileInfo = {
    FILE_NO: fileName,
    FILE_TYPE: "ofd",
    CONVERT_TYPE: "pdf",
    FILE_PATH: base64Str,
  };

  return {
    BASE_DATA: baseData,
    FILE_INFO: fileInfo,
  };
}
