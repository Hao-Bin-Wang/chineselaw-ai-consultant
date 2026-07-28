/**
 * 批量导入下载的法律文本到 PostgreSQL
 * 解析 Markdown 格式，按 "第X条" 拆分，写入 Legislation + Article
 *
 * 用法: npx tsx scripts/import-laws.ts
 */

import { PrismaClient } from "@prisma/client";
import { readFile, readdir } from "fs/promises";
import { join } from "path";

const prisma = new PrismaClient();
const DATA_DIR = join(process.cwd(), "law-data");

// 法律类型映射
const TYPE_MAP: Record<string, string> = {
  "中华人民共和国宪法": "law",
  "中华人民共和国刑法": "law",
  "中华人民共和国民法典": "law",
  "中华人民共和国民事诉讼法": "law",
  "中华人民共和国劳动法": "law",
  "中华人民共和国劳动合同法": "law",
  "中华人民共和国企业破产法": "law",
  "中华人民共和国反垄断法": "law",
  "中华人民共和国出境入境管理法": "law",
  "中华人民共和国国籍法": "law",
  "中华人民共和国涉外民事关系法律适用法": "law",
};

// 从 "第X条" 格式文本中拆分法条
function chunkArticles(text: string): Array<{
  articleNumber: string;
  content: string;
  chapter?: string;
  section?: string;
}> {
  const articles: Array<{ articleNumber: string; content: string; chapter?: string; section?: string }> = [];

  // 先清理 markdown 标记和其他非正文内容
  // 保留 # 标题作为章/节信息

  // 匹配所有 第X条 / 第X条之Y / **第X条** 等格式
  const articleRegex = /\*?\*?第[零一二三四五六七八九十百千]+条(?:之[一二三四五六七八九十])?\*?\*?/g;
  const matches = Array.from(text.matchAll(articleRegex));

  // 提取章节信息
  const chapterRegex = /^#{1,3}\s*(第[^条]+章[^\n]*|第[^条]+节[^\n]*|[^#\n]+)$/gm;
  const chapters = Array.from(text.matchAll(chapterRegex));

  let currentChapter = "";
  let currentSection = "";

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const articleStart = match.index!;

    // 找本条之前的最近章节标题
    for (const ch of chapters) {
      if (ch.index! < articleStart) {
        const chText = ch[0].replace(/^#+\s*/, "").trim();
        if (chText.includes("章")) {
          currentChapter = chText;
        } else if (chText.includes("节")) {
          currentSection = chText;
        }
      }
    }

    const cleanArticleNum = match[0].replace(/\*/g, "");
    const contentStart = articleStart + match[0].length;
    const nextArticleStart = i < matches.length - 1 ? matches[i + 1].index! : text.length;

    let content = text.slice(contentStart, nextArticleStart).trim();

    // 清理 markdown 残留格式
    content = content
      .replace(/\*\*/g, "")
      .replace(/\* /g, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/<[^>]+>/g, "")
      .trim();

    // 跳过太短的内容 (< 10 chars, 可能是误匹配)
    if (content.length < 10) continue;

    articles.push({
      articleNumber: cleanArticleNum,
      content: content.slice(0, 8000), // 限制单条长度
      chapter: currentChapter || undefined,
      section: currentSection || undefined,
    });
  }

  return articles;
}

// 清理文本中的 markdown 标记
function cleanLawText(text: string): string {
  return text
    .replace(/^#{1,3}\s*/gm, "") // 移除 markdown 标题符号
    .replace(/\*\*/g, "") // 移除加粗
    .replace(/<br\s*\/?>/g, "") // 移除 br 标签
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // 移除链接
    .trim();
}

async function main() {
  console.log("Importing laws into database...\n");

  // 获取所有 .txt 文件
  const files = (await readdir(DATA_DIR)).filter((f) => f.endsWith(".txt"));

  for (const file of files) {
    const title = file.replace(".txt", "");
    const filePath = join(DATA_DIR, file);

    console.log(`Processing: ${title}...`);

    const rawText = await readFile(filePath, "utf-8");
    const text = cleanLawText(rawText);

    // 拆分法条
    const articles = chunkArticles(text);
    console.log(`  Found ${articles.length} articles`);

    if (articles.length === 0) {
      console.log("  ⚠️ No articles found, skipping");
      continue;
    }

    const lawType = TYPE_MAP[title] || "law";

    // 删除已存在的同名法律（幂等重跑）
    const existing = await prisma.legislation.findFirst({ where: { title } });
    if (existing) {
      await prisma.article.deleteMany({ where: { legislationId: existing.id } });
      await prisma.legislation.delete({ where: { id: existing.id } });
      console.log("  Cleaned up existing records");
    }

    // 创建法规
    const legislation = await prisma.legislation.create({
      data: {
        title,
        type: lawType,
        status: "effective",
        publisher: "全国人民代表大会",
        issuedAt: new Date(),
        effectiveAt: new Date(),
      },
    });

    // 批量创建条文 (每批 100 条)
    let inserted = 0;
    for (let i = 0; i < articles.length; i += 100) {
      const batch = articles.slice(i, i + 100);
      await prisma.article.createMany({
        data: batch.map((a) => ({
          legislationId: legislation.id,
          articleNumber: a.articleNumber,
          content: a.content,
          chapter: a.chapter,
          section: a.section,
        })),
      });
      inserted += batch.length;
    }

    console.log(`  ✅ Imported: ${inserted} articles\n`);
  }

  console.log("Done! All laws imported.\n");

  // 打印统计
  const total = await prisma.legislation.count();
  const totalArticles = await prisma.article.count();
  console.log(`Database now has ${total} laws, ${totalArticles} articles`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Import failed:", err);
  prisma.$disconnect();
  process.exit(1);
});