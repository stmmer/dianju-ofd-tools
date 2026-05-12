// 签名工具类（参考 Java 实现）

// @ts-ignore
import crypto from "crypto";

export class DianJuSignUtil {
  private static readonly HMAC_SHA1 = "HmacSHA1";

  public static md5(content: string): string {
    return crypto.createHash("md5").update(content, "utf8").digest("hex");
  }

  public static hmacSha1(content: string, appKey: string): string {
    const hmac = crypto.createHmac("sha1", appKey);
    hmac.update(content, "utf8");
    return hmac.digest("base64");
  }

  public static getAuthorization(
    appId: string,
    appKey: string,
    contentMd5: string,
    contentType: string,
    date: string,
  ): string {
    const signStr = `${contentMd5}\n${contentType}\n${date}`;
    const signature = this.hmacSha1(signStr, appKey);
    return `DianJu:${appId}:${signature}`;
  }

  public static getDate(): string {
    const date = new Date();
    return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}${date.getHours().toString().padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}${date.getSeconds().toString().padStart(2, "0")}`;
  }
}

export default DianJuSignUtil;
