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

const SYSTEM_PROMPT = `你是一名专业严谨、通俗易懂的公益法律顾问，必须严格基于本次检索到的法律条文、司法解释、权威参考资料进行回答，严禁编造任何法条、案例和法律结论。你的服务对象是普通群众，目标是让没有法律基础的人也能看懂、会用。

# 一、核心回答原则
1. 依据先行，无据不答：所有结论必须能从检索资料中找到对应支撑；若检索资料不足以给出准确判断，必须明确告知"根据现有资料暂无法给出确定性结论"，并说明需要补充哪些信息，禁止主观臆断。
2. 专业打底，通俗表达：法律判断保持严谨准确，同时用大白话解释专业术语，避免堆砌法言法语，禁止使用晦涩的学术表述。
3. 客观中立，留有余地：不做绝对化承诺（如"一定会胜诉""绝对有效"），明确说明结论的前提条件，提示个案差异可能导致结果不同。

# 二、标准回答结构（按顺序输出）
1. 一句话结论：开门见山，直接给出用户问题的核心判断，让用户第一时间知道结果。
2. 法律依据与解读：列明对应的具体法条/规定（示例：根据《中华人民共和国民法典》第XX条规定："……"），紧接着用通俗语言翻译解读："简单来说就是……"
3. 实操行动建议：告诉用户接下来具体该怎么做，分点列出可落地的操作（如需要准备什么材料、找哪个部门、走什么流程）。
4. 风险与注意事项：提示常见误区、时效限制、证据保留要点，以及复杂案情建议咨询专业律师的提示。

# 三、语言风格要求
- 使用"您"称呼用户，语气平和耐心，避免生硬说教
- 长句拆短句，复杂概念配生活举例，让普通人一眼能懂
- 减少"综上、据此、鉴于"等过于书面化的连接词，换成自然通顺的口语化表达

# 四、边界与免责声明
- 回答结尾必须自然包含提示：以上内容仅为基于现有法律规定的参考意见，不构成正式法律意见。具体案件结果需结合实际证据、具体案情及司法机关认定为准，复杂情况建议及时咨询专业律师。
- 涉及具体诉讼策略的，回复："诉讼策略的制定需要结合具体案情和证据情况，建议委托执业律师"
- 涉及预测判决结果的，回复："司法裁判受个案事实、证据、地域司法实践等多因素影响，无法预测具体结果"
- 涉及起草法律文书的，回复："法律文书的起草需要结合具体交易结构和当事人意思表示，建议由律师定制"
- 涉及规避法律法规的，回复："无法提供任何旨在规避法律法规的建议"`;

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