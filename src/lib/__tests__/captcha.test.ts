import { describe, it, expect } from "vitest";

// 纯 captcha 生成逻辑（不含 Redis 部分）
// 使用自定义 SVG 验证码生成器，不依赖外部字体文件
function randomChar(): string {
  const pool = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  return pool[Math.floor(Math.random() * pool.length)];
}

function randomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 60%, 40%)`;
}

const CHAR_PATHS: Record<string, number[][]> = {
  "2": [[0,0],[3,0],[3,2],[0,2],[0,4],[3,4]],
  "3": [[0,0],[3,0],[3,2],[1,2],[3,4],[0,4]],
  "4": [[2,0],[2,2],[0,2],[3,4]],
  "5": [[3,0],[0,0],[0,2],[3,2],[3,4],[0,4]],
  "6": [[3,0],[0,0],[0,4],[3,4],[3,2],[0,2]],
  "7": [[0,0],[3,0],[1,4]],
  "8": [[0,0],[3,0],[3,4],[0,4],[0,0],[1.5,2],[3,2]],
  "9": [[3,4],[3,0],[0,0],[0,2],[3,2]],
  "A": [[0,4],[1,0],[2,0],[3,4],[1,2],[2,2]],
  "B": [[0,0],[2,0],[3,1],[3,2],[2,3],[3,4],[2,5],[0,5],[0,0]],
  "C": [[3,0],[0,0],[0,4],[3,4]],
  "D": [[0,0],[2,0],[3,1],[3,3],[2,4],[0,4],[0,0]],
  "E": [[3,0],[0,0],[0,2],[2,2],[0,2],[0,4],[3,4]],
  "F": [[3,0],[0,0],[0,2],[2,2],[0,4]],
  "G": [[3,0],[0,0],[0,4],[3,4],[3,2],[2,2]],
  "H": [[0,0],[0,4],[0,2],[3,2],[3,0],[3,4]],
  "J": [[3,0],[3,4],[0,4],[0,3]],
  "K": [[0,0],[0,4],[0,2],[3,0],[0,2],[3,4]],
  "M": [[0,4],[0,0],[1.5,2],[3,0],[3,4]],
  "N": [[0,4],[0,0],[3,4],[3,0]],
  "P": [[0,0],[2,0],[3,1],[3,2],[2,3],[0,3],[0,4]],
  "Q": [[3,4],[3,0],[0,0],[0,4],[1.5,2.5],[2,4]],
  "R": [[0,0],[2,0],[3,1],[3,2],[2,3],[0,3],[1,4],[3,4]],
  "S": [[3,0],[0,0],[0,2],[3,2],[3,4],[0,4]],
  "T": [[0,0],[3,0],[1.5,0],[1.5,4]],
  "U": [[0,0],[0,4],[3,4],[3,0]],
  "V": [[0,0],[1.5,4],[3,0]],
  "W": [[0,0],[0,4],[1.5,2],[3,4],[3,0]],
  "X": [[0,0],[3,4],[1.5,2],[3,0],[0,4]],
  "Y": [[0,0],[1.5,2],[3,0],[1.5,4]],
  "Z": [[0,0],[3,0],[0,4],[3,4]],
};

function renderSvg(text: string): string {
  const chars = text.toUpperCase().split("");
  const charWidth = 30;
  const charHeight = 48;
  const width = chars.length * charWidth;
  const height = charHeight;

  let paths = "";
  chars.forEach((ch, idx) => {
    const pathData = CHAR_PATHS[ch];
    if (!pathData) return;
    const ox = idx * charWidth + 8;
    const oy = 8;
    const d = pathData.map(([px, py], i) => {
      const x = ox + px * 5;
      const y = oy + py * 8;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
    const color = randomColor();
    paths += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f4f4f4" rx="4"/>
  ${paths}
</svg>`;
}

async function generateCaptcha(): Promise<{ text: string; data: string }> {
  const chars = [randomChar(), randomChar(), randomChar(), randomChar()];
  const text = chars.join("");
  const data = renderSvg(text);
  return { text, data };
}

describe("generateCaptcha", () => {
  it("应该生成4位验证码", async () => {
    const result = await generateCaptcha();
    expect(result.text).toHaveLength(4);
  });

  it("SVG 应该包含合法的 svg 标签", async () => {
    const result = await generateCaptcha();
    expect(result.data).toContain("<svg");
    expect(result.data).toContain("</svg>");
  });

  it("每次应生成不同的验证码（概率性）", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => generateCaptcha().then(c => c.text))
    );
    const unique = new Set(results);
    // 4位大写字母数字混合，5次至少有2种不同结果
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it("SVG 不应包含 script 标签", async () => {
    const result = await generateCaptcha();
    expect(result.data).not.toContain("<script");
  });

  it("验证码只含大写字母数字，不含特殊字符", async () => {
    const result = await generateCaptcha();
    // Pool: 23456789ABCDEFGHJKMNPQRSTUVWXYZ
    expect(/^[2-9A-HJKMNP-Z]+$/.test(result.text)).toBe(true);
  });
});