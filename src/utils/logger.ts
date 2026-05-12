// 日志工具类
import fs from 'fs';
import path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  private static enabled = process.env.ENABLE_LOGGING === 'true';
  private static logToFile = process.env.LOG_TO_FILE === 'true';
  private static logFilePath = process.env.LOG_FILE_PATH || 'logs/app.log';

  static {
    // 确保日志目录存在
    if (this.logToFile) {
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  public static debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, args);
  }

  public static info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, args);
  }

  public static warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, args);
  }

  public static error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, args);
  }

  private static log(level: LogLevel, message: string, args: any[]): void {
    if (!this.enabled) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (args.length > 0) {
      console.log(logMessage, ...args);
    } else {
      console.log(logMessage);
    }

    // 输出到文件
    if (this.logToFile) {
      const fileMessage = args.length > 0 
        ? `${logMessage} ${JSON.stringify(args)}\n` 
        : `${logMessage}\n`;
      
      fs.appendFileSync(this.logFilePath, fileMessage);
    }
  }
}

export default Logger;