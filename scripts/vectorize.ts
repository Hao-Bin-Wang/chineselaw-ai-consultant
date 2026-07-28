/**
 * 批量向量化所有法条
 * 将 Article.content 送入 doubao-embedding-vision API，写入 pgvector
 *
 * 用法: npx tsx scripts/vectorize.ts
 */

process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/chineselaw";
process.env.VOLCENGINE_API_KEY = "ark-your-volcengine-api-key";
process.env.VOLCENGINE_BASE_URL = "https://ark.cn-beijing.volces.com/api/plan/v3";

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const { embed } = await import("../src/lib/embedding");

  const prisma = new PrismaClient();
  const BATCH_SIZE = 50;

  const total = await prisma.article.count();
  console.log(`Total articles: ${total}`);

  let processed = 0;
  let errors = 0;

  const allArticles = await prisma.article.findMany({
    select: { id: true, content: true, articleNumber: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Starting vectorization of ${allArticles.length} articles...`);

  for (let i = 0; i < allArticles.length; i += BATCH_SIZE) {
    const batch = allArticles.slice(i, i + BATCH_SIZE);
    const texts = batch.map((a) => a.content.slice(0, 2000));

    for (let j = 0; j < batch.length; j++) {
      try {
        const embedding = await embed(texts[j]);
        const embeddingStr = `[${embedding.join(",")}]`;
        await prisma.$executeRawUnsafe(
          `UPDATE "Article" SET embedding = $1::vector WHERE id = $2`,
          embeddingStr,
          batch[j].id
        );
        processed++;
      } catch (err: any) {
        errors++;
        process.stderr.write(`\n  Error on article ${batch[j].id}: ${err.message}`);
      }
    }

    const pct = ((processed / allArticles.length) * 100).toFixed(1);
    process.stdout.write(`\r  Progress: ${processed}/${allArticles.length} (${pct}%) | Errors: ${errors}`);
  }

  console.log(`\n\nDone! Processed: ${processed}, Errors: ${errors}`);

  const embedCount = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*)::int as count FROM "Article" WHERE embedding IS NOT NULL`
  );
  console.log(`Articles with embeddings: ${embedCount[0].count}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
