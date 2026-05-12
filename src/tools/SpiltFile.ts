import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import {
    HttpUtils,
    DianJuSignUtil,
    ConfigManager,
    Logger,
} from "../utils/index.js";
import {
    ConvertRequest,
    FileInfo,
    BaseData,
    MetaData,
} from "../types/convert.js";

const SpiltFileSchema = z.object({
    filePath: z.string().describe("OFD 文件的本地路径"),
    splitPages: z.string().describe("拆分页面，格式为 '3-9;7,9,8'"),
});

export function registerSpiltFile(server: McpServer) {
    server.registerTool(
        "spilt_file",
        {
            description: "将 OFD 文件拆分为多个页面",
            inputSchema: SpiltFileSchema,
        },
        async (args: unknown) => {
            try {
                const { filePath, splitPages } = SpiltFileSchema.parse(args);

                Logger.info(`开始拆分 OFD 文件: ${filePath}`);
                Logger.debug(`拆分页面: ${splitPages}`);

                // 1. 读取文件并转换为 Base64
                const fileBuffer = await fs.promises.readFile(path.resolve(filePath));
                const base64Str = fileBuffer.toString("base64");

                Logger.debug(`文件读取完成，大小: ${fileBuffer.length} 字节`);

                // 1. 构建请求参数
                const fileName = filePath;
                const request = buildSpiltFileRequest(base64Str, fileName, splitPages);

                // 2. 计算签名头
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

                // 3. 发送请求
                Logger.debug(`发送拆分请求到: ${config.API_URL}`);
                Logger.debug(`请求参数: ${jsonBody}`);

                const response = await HttpUtils.post(
                    config.API_URL + "/spiltFile/common",
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

                Logger.debug(`拆分请求响应状态: ${response.status}`);
                Logger.debug("响应结果:", response.data);

                // 4. 处理响应
                const result = response.data as any;

                // 根据根级别 RET_CODE 判断成功或失败
                const retCode = result.RET_CODE ?? 0;
                const retMsg = result.RET_MSG ?? "拆分失败";

                if (retCode === 1) {
                    const fileUrl = result.FILE_INFO?.FILE_URL;
                    if (!fileUrl) {
                        const errorMsg = "拆分成功但未返回文件地址";
                        Logger.warn(errorMsg);
                        return {
                            content: [
                                { type: "text" as const, text: `文件处理失败：${errorMsg}` },
                            ],
                        };
                    }
                    Logger.info(`PDF 拆分成功，文件地址：${fileUrl}`);
                    return {
                        content: [
                            {
                                type: "text" as const,
                                text: `拆分成功！文件地址：${fileUrl}`,
                            },
                        ],
                    };
                } else {
                    Logger.warn(`PDF 拆分失败 [${retCode}]：${retMsg}`);
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
                Logger.error(`PDF 拆分异常：${error.message}`, error);
                return {
                    content: [
                        { type: "text" as const, text: `拆分失败：${error.message}` },
                    ],
                };
            }
        },
    );
}

function buildSpiltFileRequest(
    base64Str: string,
    fileName: string,
    splitPages: string,
): ConvertRequest {
    const config = ConfigManager.getConfig();
    const APP_ID = config.APP_ID || "";

    const baseData: BaseData = {
        SYS_ID: APP_ID,
        SERIAL_NUMBER: Date.now().toString(),
    };

    const metaData: MetaData = {
        IS_ASYN: "false",
        SPLIT_PAGES: splitPages,
    };

    const fileInfo: FileInfo = {
        FILE_NO: fileName,
        FILE_TYPE: "ofd",
        CONVERT_TYPE: "zip",
        REQUEST_TYPE: "1",
        FILE_PATH: base64Str,
    };

    return {
        BASE_DATA: baseData,
        META_DATA: metaData,
        FILE_LIST: [fileInfo],
    };
}
