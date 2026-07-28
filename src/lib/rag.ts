import { prisma } from "./db";
import { embed } from "./embedding";
import { chat } from "./llm";

export interface Citation {
  articleId: string;
  legislationTitle: string;
  articleNumber: string;
  content: string;
}

// 关键词匹配兜底（向量化未启用时）
async function searchByKeyword(question: string, topK: number = 10) {
  const keywords = question.replace(/[？?！!。，,、]/g, " ").split(" ").filter((k) => k.length > 1);
  if (keywords.length === 0) keywords.push(question.slice(0, 5));

  const articles = await prisma.article.findMany({
    where: {
      legislation: { status: "effective" },
      OR: keywords.map((kw) => ({ content: { contains: kw, mode: "insensitive" as const } })),
    },
    include: { legislation: { select: { title: true } } },
    take: topK,
    orderBy: { createdAt: "desc" },
  });

  return articles.map((a: any) => ({
    id: a.id,
    legislation_id: a.legislationId,
    legislation_title: a.legislation.title,
    article_number: a.articleNumber,
    content: a.content,
    similarity: 0,
  }));
}

export async function searchSimilarArticles(
  questionEmbedding?: number[],
  topK: number = 10
) {
  // 如果提供了向量，走 pgvector
  if (questionEmbedding && questionEmbedding.length > 0) {
    const embeddingStr = `[${questionEmbedding.join(",")}]`;
    const articles = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        legislation_id: string;
        legislation_title: string;
        article_number: string;
        content: string;
        similarity: number;
      }>
    >(
      `SELECT
        a.id,
        a."legislationId" as legislation_id,
        l.title as legislation_title,
        a."articleNumber" as article_number,
        a.content,
        1 - (a.embedding <=> $1::vector) as similarity
      FROM "Article" a
      JOIN "Legislation" l ON a."legislationId" = l.id
      WHERE a.embedding IS NOT NULL AND l.status = 'effective'
      ORDER BY a.embedding <=> $1::vector
      LIMIT $2`,
      embeddingStr,
      topK
    );
    return articles;
  }

  // 无向量时返回空，由调用方处理回退
  return [];
}

const SYSTEM_PROMPT = `你是一个专业法治智能助手。基于以下参考法律条文回答用户问题。

要求：
1. 用通俗易懂的语言解释，让普通群众能理解
2. 引用法律条文时使用【法规名称】第X条 的格式
3. 如果参考条文不足以回答用户问题，请明确告知用户
4. 回答简洁有条理，必要时使用分点说明`;

// RAG 查询（当前未启用向量化，使用关键词匹配）
export async function ragQuery(question: string): Promise<{ answer: string; citations: Citation[] }> {
  let similarArticles;

  // 尝试向量化检索（如果 Embedding API 可用）
  try {
    const questionEmbedding = await embed(question);
    if (questionEmbedding && questionEmbedding.length > 0) {
      similarArticles = await searchSimilarArticles(questionEmbedding, 10);
    } else {
      similarArticles = await searchByKeyword(question, 10);
    }
  } catch {
    // 向量化不可用时，使用关键词匹配
    similarArticles = await searchByKeyword(question, 10);
  }

  if (similarArticles.length === 0) {
    return {
      answer: "抱歉，当前法律法规库中暂无相关内容可以回答您的问题。建议您咨询专业律师获取更准确的解答。",
      citations: [],
    };
  }

  const citations: Citation[] = similarArticles.slice(0, 5).map((a: any) => ({
    articleId: a.id,
    legislationTitle: a.legislation_title,
    articleNumber: a.article_number,
    content: a.content,
  }));

  const context = citations
    .map((c, i) => `${i + 1}. 《${c.legislationTitle}》${c.articleNumber}：${c.content}`)
    .join("\n\n");

  // 尝试调用 LLM，失败时返回关键词匹配的兜底回答
  try {
    const answer = await chat([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `【参考法条】\n${context}\n\n【用户问题】\n${question}` },
    ]);
    return { answer, citations };
  } catch {
    return {
      answer: `基于关键词匹配，以下是与"${question}"相关的参考法条：\n\n${context}\n\n（AI 模型暂未启用，以上为关键词检索结果）`,
      citations,
    };
  }
}