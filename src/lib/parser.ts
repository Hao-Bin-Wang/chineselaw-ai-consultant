const pdfParse = require("pdf-parse");
import mammoth from "mammoth";

export async function parseFile(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === "docx" || ext === "doc") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === "json") {
    return buffer.toString("utf-8");
  }

  throw new Error(`不支持的文件格式: .${ext}`);
}