const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY!;
const VOLCENGINE_BASE_URL =
  process.env.VOLCENGINE_BASE_URL || "https://ark.cn-beijing.volces.com/api/plan/v3";

/**
 * doubao-embedding-vision 多模态向量化
 * 纯文本输入：直接传字符串
 * 图片输入（备用）：content 数组格式 [{type: "text", text: "..."}, {type: "image", image: "base64"}]
 */
export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${VOLCENGINE_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VOLCENGINE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "doubao-embedding-vision",
      input: text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Volcengine API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

export async function batchEmbed(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${VOLCENGINE_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VOLCENGINE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "doubao-embedding-vision",
      input: texts,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Volcengine API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.data.map((d: any) => d.embedding);
}
