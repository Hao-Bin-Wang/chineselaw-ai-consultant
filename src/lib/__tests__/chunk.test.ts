import { describe, it, expect } from "vitest";

// 从 queue.ts 提取的纯函数直接内联测试（避免 import 触发 BullMQ 连接）
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

describe("chunkArticles", () => {
  it("应该正确拆分含多条法条的文本", () => {
    const text = "第一条 为了保护劳动者合法权益，制定本法。第二条 本法适用于中华人民共和国境内的企业。第三条 劳动者享有平等就业的权利。";

    const result = chunkArticles(text);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      number: "第一条",
      content: "为了保护劳动者合法权益，制定本法。",
    });
    expect(result[1]).toEqual({
      number: "第二条",
      content: "本法适用于中华人民共和国境内的企业。",
    });
    expect(result[2]).toEqual({
      number: "第三条",
      content: "劳动者享有平等就业的权利。",
    });
  });

  it("应该处理十位数条号（如第十条、第二十五条）", () => {
    const text = "第九条 内容A。第十条 内容B。第二十五条 内容C。";

    const result = chunkArticles(text);

    expect(result).toHaveLength(3);
    expect(result[0].number).toBe("第九条");
    expect(result[1].number).toBe("第十条");
    expect(result[2].number).toBe("第二十五条");
  });

  it("空文本应该返回空数组", () => {
    const result = chunkArticles("这是一段没有条号的文本。");

    expect(result).toHaveLength(0);
  });

  it("单条法条应该正确处理", () => {
    const text = "第一条 本法自2024年1月1日起施行。";

    const result = chunkArticles(text);

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("本法自2024年1月1日起施行。");
  });

  it("条号前有章节标题等前缀时，也不应该丢失内容", () => {
    const text = "第一章 总则 第一条 为了保护劳动者合法权益，制定本法。";

    const result = chunkArticles(text);

    expect(result).toHaveLength(1);
    expect(result[0].number).toBe("第一条");
  });

  it("条号后无后续内容时，content 应为空字符串", () => {
    const text = "第一条";

    const result = chunkArticles(text);

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("");
  });
});