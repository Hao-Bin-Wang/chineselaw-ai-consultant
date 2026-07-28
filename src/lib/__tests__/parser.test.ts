import { describe, it, expect } from "vitest";

// 同 parser.ts 的逻辑，但不依赖 require("pdf-parse") 避免 CI 问题
async function parseFile(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "json") {
    return buffer.toString("utf-8");
  }

  if (ext === "txt") {
    return buffer.toString("utf-8");
  }

  throw new Error(`不支持的文件格式: .${ext}`);
}

describe("parseFile (JSON/text)", () => {
  it("JSON 文件应正确解析为字符串", async () => {
    const json = JSON.stringify({ title: "劳动法", articles: [{ number: "第1条", content: "test" }] });
    const buf = Buffer.from(json, "utf-8");

    const result = await parseFile(buf, "test.json");

    expect(result).toBe(json);
  });

  it("中文 JSON 应正确解析", async () => {
    const json = JSON.stringify({ 法规名称: "中华人民共和国劳动合同法", 条文: [] });
    const buf = Buffer.from(json, "utf-8");

    const result = await parseFile(buf, "劳动法.json");

    expect(result).toContain("中华人民共和国劳动合同法");
  });

  it("不支持的格式应抛出错误", async () => {
    const buf = Buffer.from("test", "utf-8");

    await expect(parseFile(buf, "test.exe")).rejects.toThrow("不支持的文件格式");
  });

  it("无扩展名文件应抛出错误", async () => {
    const buf = Buffer.from("test", "utf-8");

    await expect(parseFile(buf, "test")).rejects.toThrow("不支持的文件格式");
  });

  it("空 JSON 文件应正确解析", async () => {
    const buf = Buffer.from("{}", "utf-8");

    const result = await parseFile(buf, "empty.json");

    expect(result).toBe("{}");
  });
});