import { Queue, Worker } from "bullmq";
import { prisma } from "./db";
import { parseFile } from "./parser";
import { readFile } from "fs/promises";
import { join } from "path";

const connection = { url: process.env.REDIS_URL! };

export const importQueue = new Queue("law-import", { connection });

// 按"第X条"分割文本
function chunkArticles(text: string): { number: string; content: string }[] {
  const articles: { number: string; content: string }[] = [];
  const regex = /第[零一二三四五六七八九十百千]+条/g;
  const matches = Array.from(text.matchAll(regex));

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i < matches.length - 1 ? matches[i + 1].index! : text.length;
    articles.push({
      number: matches[i][0],
      content: text.slice(start + matches[i][0].length, end).trim(),
    });
  }

  return articles;
}

new Worker(
  "law-import",
  async (job) => {
    const { taskId, filePath, fileName, legislationTitle, legislationType } = job.data;

    await prisma.importTask.update({
      where: { id: taskId },
      data: { status: "parsing", progress: 10 },
    });

    // 1. 解析文件
    const buffer = await readFile(filePath);
    const text = await parseFile(buffer, fileName);

    await prisma.importTask.update({
      where: { id: taskId },
      data: { status: "chunking", progress: 30 },
    });

    // 2. 拆分法条
    const articles = chunkArticles(text);
    if (articles.length === 0) {
      throw new Error('未能识别到任何法条（请确保文件包含"第X条"格式的条文）');
    }

    // 3. 创建法规
    const legislation = await prisma.legislation.create({
      data: {
        title: legislationTitle,
        type: legislationType || "law",
        status: "effective",
        publisher: "待补充",
      },
    });

    // 4. 批量创建条文（暂不写 embedding，等待用户确认）
    for (const article of articles) {
      await prisma.article.create({
        data: {
          legislationId: legislation.id,
          articleNumber: article.number,
          content: article.content,
        },
      });
    }

    // 跳过向量化步骤
    await prisma.importTask.update({
      where: { id: taskId },
      data: { status: "done", progress: 100 },
    });
  },
  { connection }
);