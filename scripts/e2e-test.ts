/**
 * 端到端验证脚本
 * 绕过 Next.js 路由，直接测试核心逻辑：
 * 1. Captcha 生成/验证
 * 2. 注册/登录
 * 3. AI 问答 (RAG)
 * 4. 法条检索
 *
 * 依赖 .env 中的 DATABASE_URL / REDIS_URL / ARK_API_KEY / ARK_BASE_URL / JWT_SECRET
 */

// 环境变量必须在所有 import 之前加载（ESM import 提升）
import "dotenv/config";

if (!process.env.ARK_API_KEY) {
  console.error("缺少环境变量 ARK_API_KEY，请检查 .env 文件");
  process.exit(1);
}

async function main() {
  // 动态导入确保环境变量已设置
  const { prisma } = await import("../src/lib/db");
  const { generateToken, verifyToken } = await import("../src/lib/auth");
  const { generateCaptcha, saveCaptcha, verifyCaptcha } = await import("../src/lib/captcha");
  const { ragQuery } = await import("../src/lib/rag");
  const { chat } = await import("../src/lib/llm");
  const { embed } = await import("../src/lib/embedding");
  const bcrypt = (await import("bcryptjs")).default;
  const results: string[] = [];

  // ===== 测试 1: 验证码生成存储验证 =====
  console.log("=".repeat(50));
  console.log("Test 1: Captcha 图形验证码");
  const captcha = await generateCaptcha();
  console.log(`  - 生成了 ${captcha.text.length} 位验证码`);
  const token = await saveCaptcha(captcha.text);
  console.log(`  - 存入 Redis, token: ${token.slice(0,8)}...`);
  const valid = await verifyCaptcha(token, captcha.text);
  console.log(`  - 正确验证: ${valid ? "✅" : "❌"}`);
  const invalid = await verifyCaptcha(token, "wrong");
  console.log(`  - 错误拒绝: ${!invalid ? "✅" : "❌"}`);
  results.push(`Captcha: ${valid && !invalid ? "PASS" : "FAIL"}`);

  // ===== 测试 2: 密码哈希与JWT =====
  console.log("\n" + "=".repeat(50));
  console.log("Test 2: 密码哈希 + JWT Token");
  const hashed = await bcrypt.hash("test123", 10);
  console.log(`  - bcrypt 哈希: ${hashed.slice(0, 20)}...`);
  const match = await bcrypt.compare("test123", hashed);
  console.log(`  - 密码验证: ${match ? "✅" : "❌"}`);
  const jwt = await generateToken("test-user-id", "user");
  console.log(`  - JWT 签名成功`);
  const decoded = await verifyToken(jwt);
  console.log(`  - JWT 验证: ${decoded?.userId === "test-user-id" ? "✅" : "❌"}`);
  results.push(`Auth: ${match && decoded?.userId === "test-user-id" ? "PASS" : "FAIL"}`);

  // ===== 测试 3: 法条检索 (关键词搜索) =====
  console.log("\n" + "=".repeat(50));
  console.log("Test 3: 法条检索 (PostgreSQL 关键词)");
  const laws = await prisma.legislation.findMany({
    take: 3,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { articles: true } } },
  });
  console.log(`  - 法条总数: ${await prisma.legislation.count()}`);
  console.log(`  - 条文总数: ${await prisma.article.count()}`);

  for (const law of laws) {
    console.log(`  - ${law.title}: ${law._count.articles} 条`);
  }

  // 关键词搜索测试
  const searchResult = await prisma.legislation.findMany({
    where: { title: { contains: "劳动法", mode: "insensitive" } },
    include: { _count: { select: { articles: true } } },
  });
  console.log(`  - 搜索"劳动法"结果: ${searchResult.length} 部`);
  results.push(laws.length > 0 ? "PASS" : "FAIL");

  // ===== 测试 4: Embedding API =====
  console.log("\n" + "=".repeat(50));
  console.log("Test 4: ARK Embedding API");
  try {
    const emb = await embed("劳动合同法规定了什么内容");
    console.log(`  - 向量维度: ${emb.length}`);
    console.log(`  - 前5维: ${emb.slice(0, 5).map(v => v.toFixed(4)).join(", ")}`);
    console.log(`  - ✅ Embedding API 正常`);
    results.push("PASS");
  } catch (err: any) {
    console.log(`  - ❌ Embedding API 失败: ${err.message}`);
    results.push("FAIL");
  }

  // ===== 测试 5: ARK Chat API =====
  console.log("\n" + "=".repeat(50));
  console.log("Test 5: ARK AI 问答");
  try {
    const answer = await chat([
      { role: "system", content: "你是法律助手，用一句话回答。" },
      { role: "user", content: "劳动合同法保护什么权益？" },
    ]);
    console.log(`  - 回答: ${answer.slice(0, 100)}...`);
    console.log(`  - ✅ ARK API 正常`);
    results.push("PASS");
  } catch (err: any) {
    console.log(`  - ❌ ARK API 失败: ${err.message}`);
    results.push("FAIL");
  }

  // ===== 测试 6: RAG 全链路 =====
  console.log("\n" + "=".repeat(50));
  console.log("Test 6: RAG 全链路 (关键词检索 + AI生成)");
  try {
    const { answer, citations } = await ragQuery("老板不给工资怎么办？");
    console.log(`  - 引用法条数: ${citations.length}`);
    for (const c of citations.slice(0, 3)) {
      console.log(`    · 《${c.legislationTitle}》${c.articleNumber}`);
    }
    console.log(`  - AI回答片段: ${answer.slice(0, 150)}...`);
    console.log(`  - ✅ RAG 全链路正常`);
    results.push("PASS");
  } catch (err: any) {
    console.log(`  - ❌ RAG 失败: ${err.message}`);
    results.push("FAIL");
  }

  // ===== 汇总 =====
  console.log("\n" + "=".repeat(50));
  console.log("结果汇总:");
  const labels = ["Captcha", "Auth", "Laws DB", "Embedding", "ARK Chat", "RAG"];
  for (let i = 0; i < results.length; i++) {
    console.log(`  ${results[i] === "PASS" ? "✅" : "❌"} ${labels[i]}: ${results[i]}`);
  }

  const allPassed = results.every(r => r === "PASS");
  console.log(`\n${allPassed ? "🎉 全部通过!" : "⚠️ 部分失败"}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
