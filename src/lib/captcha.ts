import { Redis } from "ioredis";
import { randomUUID } from "crypto";

const redis = new Redis(process.env.REDIS_URL!);

/**
 * 自研 SVG 验证码生成器
 * 不依赖字体文件，纯 native SVG path 绘制数字和字母
 */
function randomChar(): string {
  // 数字+大写字母（排除容易混淆的 0/O、1/I/L）
  const pool = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  return pool[Math.floor(Math.random() * pool.length)];
}

function randomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 60%, 40%)`;
}

// 简化字体路径数据（4×5 网格）
const CHAR_PATHS: Record<string, number[][]> = {
  "2": [[0,0],[3,0],[3,2],[0,2],[0,4],[3,4]],
  "3": [[0,0],[3,0],[3,2],[1,2],[3,2],[3,4],[0,4]],
  "4": [[2,0],[2,2],[0,2],[0,4],[3,2],[3,4]],
  "5": [[3,0],[0,0],[0,2],[3,2],[3,4],[0,4]],
  "6": [[3,0],[0,0],[0,4],[3,4],[3,2],[0,2]],
  "7": [[0,0],[3,0],[1,4]],
  "8": [[0,0],[3,0],[3,4],[0,4],[0,0],[3,2],[3,2],[0,2]],
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
      const x = ox + px * 5 + (Math.random() - 0.5) * 2;
      const y = oy + py * 8 + (Math.random() - 0.5) * 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
    const color = randomColor();
    paths += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  });

  // 添加干扰线
  let noiseLines = "";
  for (let i = 0; i < 3; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    noiseLines += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(0,0,0,0.15)" stroke-width="1"/>`;
  }

  // 添加干扰点
  let noiseDots = "";
  for (let i = 0; i < 20; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    noiseDots += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1" fill="rgba(0,0,0,0.15)"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f4f4f4" rx="4"/>
  ${noiseLines}
  ${noiseDots}
  ${paths}
</svg>`;
}

export async function generateCaptcha(): Promise<{ text: string; data: string }> {
  const chars = [randomChar(), randomChar(), randomChar(), randomChar()];
  const text = chars.join("");
  const data = renderSvg(text);
  return { text, data };
}

export async function saveCaptcha(text: string): Promise<string> {
  const token = randomUUID();
  await redis.set(`captcha:${token}`, text.toLowerCase(), "EX", 300);
  return token;
}

export async function verifyCaptcha(token: string, code: string): Promise<boolean> {
  const stored = await redis.get(`captcha:${token}`);
  if (!stored) return false;
  await redis.del(`captcha:${token}`);
  return stored === code.toLowerCase();
}