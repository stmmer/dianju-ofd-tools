// 配置文件读取工具

import * as fs from "fs";
import * as path from "path";

export interface Config {
  APP_ID?: string;
  APP_KEY?: string;
  API_URL?: string;
}

export class ConfigManager {
  private static config: Config | null = null;

  public static getConfig(): Config {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config!;
  }

  private static loadConfig(): void {
    // 从环境变量中获取配置
    const envConfig: Config = {
      APP_ID: process.env.APP_ID,
      APP_KEY: process.env.APP_KEY,
      API_URL: process.env.API_URL,
    };

    // 检查是否存在.env文件
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, "utf8");
        const envLines = envContent.split("\n");
        envLines.forEach((line) => {
          const [key, value] = line.split("=");
          if (key && value) {
            process.env[key.trim()] = value.trim();
          }
        });
      } catch (error) {
        console.warn("读取.env文件失败:", error);
      }
    }

    // 从命令行参数中获取配置
    const argv = process.argv.slice(2);
    argv.forEach((arg) => {
      if (arg.startsWith("--")) {
        const [key, value] = arg.slice(2).split("=");
        if (key && value) {
          process.env[key.toUpperCase()] = value;
        }
      }
    });

    // 合并配置
    this.config = {
      APP_ID: process.env.APP_ID,
      APP_KEY: process.env.APP_KEY,
      API_URL: process.env.API_URL || "https://api.example.com",
    };
  }

  // 检查配置是否完整
  public static isConfigComplete(): boolean {
    const config = this.getConfig();
    return !!config.APP_ID && !!config.APP_KEY;
  }

  // 获取缺失的配置项
  public static getMissingConfigs(): string[] {
    const config = this.getConfig();
    const missing: string[] = [];
    if (!config.APP_ID) missing.push("APP_ID");
    if (!config.APP_KEY) missing.push("APP_KEY");
    return missing;
  }
}

export default ConfigManager;
