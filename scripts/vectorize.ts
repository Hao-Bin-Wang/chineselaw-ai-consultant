/**
 * MVP 批量向量化 — 仅处理 5 部核心法律
 * 将 Article.content 送入 doubao-embedding-vision API，写入 pgvector
 *
 * 选中的 5 部核心法律（覆盖日常法律咨询 80%+ 场景）：
 * 1. 民法典 — 民事纠纷、合同、婚姻、继承
 * 2. 劳动合同法 — 劳动纠纷、离职、工资
 * 3. 劳动法 — 劳动基准、工时、社保
 * 4. 刑法 — 刑事犯罪基础
 * 5. 民事诉讼法 — 诉讼流程、管辖
 *
 * 用法: npx tsx scripts/vectorize.ts
 * 依赖 .env 中的 DATABASE_URL / ARK_API_KEY / ARK_BASE_URL
 */

import "dotenv/config";

if (!process.env.ARK_API_KEY) {
  console.error("缺少环境变量 ARK_API_KEY，请检查 .env 文件");
  process.exit(1);
}

const MVP_LAWS = [
  "中华人民共和国民法典",
  "中华人民共和国劳动合同法",
  "中华人民共和国劳动法",
  "中华人民共和国刑法",
  "中华人民共和国民事诉讼法",
];

/** 带指数退避的重试调用 */
async function retryEmbed(text: string, maxRetries = 5): Promise<number[]> {
  const { embed } = await import("../src/lib/embedding");

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await embed(text);
    } catch (err: any) {
      const isRateLimit = err.message?.includes("429") || err.message?.includes("RateLimit");
      if (!isRateLimit || attempt === maxRetries - 1) throw err;

      const delay = Math.min(1000 * Math.pow(2, attempt), 15000); // 1s, 2s, 4s, 8s, 15s
      process.stderr.write(`\n    429 rate limited, retrying in ${delay/1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");

  const prisma = new PrismaClient();

  // 获取选中的法律及其条文
  const legislations = await prisma.legislation.findMany({
    where: { title: { in: MVP_LAWS } },
    select: { id: true, title: true },
  });

  console.log(`Found ${legislations.length}/${MVP_LAWS.length} target legislations\n`);

  for (const law of legislations) {
    console.log(`  [${law.title}]`);

    const articles = await prisma.$queryRawUnsafe<
      Array<{ id: string; content: string; articleNumber: string }>
    >(
      `SELECT id, content, "articleNumber" FROM "Article"
       WHERE "legislationId" = $1 AND embedding IS NULL
       ORDER BY "articleNumber" ASC`,
      law.id
    );

    if (articles.length === 0) {
      console.log(`    All articles already vectorized, skipping.\n`);
      continue;
    }

    console.log(`    Pending: ${articles.length}`);

    let processed = 0;
    let errors = 0;

    for (const article of articles) {
      try {
        const embedding = await retryEmbed(article.content.slice(0, 2000));
        const embeddingStr = `[${embedding.join(",")}]`;
        await prisma.$executeRawUnsafe(
          `UPDATE "Article" SET embedding = $1::vector WHERE id = $2`,
          embeddingStr,
          article.id
        );
        processed++;
      } catch (err: any) {
        errors++;
        process.stderr.write(`\n    Error on ${article.articleNumber}: ${err.message}`);
      }

      process.stdout.write(`\r    Progress: ${processed}/${articles.length} | Errors: ${errors}`);

      // 限速延迟 300ms，避免 429
      if (processed % 3 === 0) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    console.log(`\n    ✅ Done: ${processed} vectorized, ${errors} errors\n`);
  }

  // 汇总
  const embedCount = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*)::int as count FROM "Article" WHERE embedding IS NOT NULL`
  );
  console.log(`Total articles with embeddings: ${embedCount[0].count}`);
  console.log("\n✅ MVP vectorization complete!");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
