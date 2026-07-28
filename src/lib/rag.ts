import { prisma } from "./db";
import { embed } from "./embedding";
import { chat } from "./llm";

export interface Citation {
  articleId: string;
  legislationId: string;
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

const SYSTEM_PROMPT = `你是中国法律领域的资深专家，精通宪法、民法典、刑法、劳动法、合同法、公司法、知识产权法等全部现行法律法规及司法解释。你的回答必须严格以现行法律条文为依据，不得掺杂个人观点或推测。

# 回答原则
- 精准：每条结论必须有对应法条支撑，不得模糊概括
- 简洁：用最精炼的语言给出答案，不铺垫、不赘述
- 结构化：按「结论 → 法条依据 → 注意事项」三段式组织
- 克制冷峻：用陈述句，不道歉、不寒暄、不表态度

# 回答格式
**结论**
[一句话给出明确法律判断]

**依据**
[引用具体法律名称、条款号及原文摘要，法条编号需精确到条、款、项]

**注意事项**
[列出该问题的例外情形、时效要求、地域差异或实务风险，每条一句话]

# 法条引用规范
- 通用格式：《法律全称》第 X 条[第 X 款][第 X 项]
- 首次引用使用全称，后续可使用简称（民法典、劳动合同法、刑法等）
- 上位法优先于下位法，特别法优先于普通法，新法优先于旧法

# 边界
- 超出中国法律体系的问题，回复：「该问题超出中国法律范畴，无法提供法律意见」
- 涉及未决立法或政策草案，标注「(尚未正式生效)」
- 涉及具体诉讼策略的，回复：「诉讼策略的制定需要结合具体案情和证据情况，建议委托执业律师」
- 涉及预测判决结果的，回复：「司法裁判受个案事实、证据、地域司法实践等多因素影响，无法预测具体结果」
- 涉及起草法律文书的，回复：「法律文书的起草需要结合具体交易结构和当事人意思表示，建议由律师定制」
- 涉及规避法律法规的，回复：「无法提供任何旨在规避法律法规的建议」
- 始终在回答末尾添加：「*本回答仅供参考，不构成正式法律意见。建议就具体情况咨询执业律师。*」`;

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
    legislationId: a.legislation_id,
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