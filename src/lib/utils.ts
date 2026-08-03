/**
 * className 合并工具（零依赖版，等价 cn）
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * 关键词高亮 — 将文本中的匹配关键词用 <mark> 包裹
 * @param text 原始文本
 * @param keywords 要高亮的关键词数组
 * @returns 包含 <mark> 标签的 HTML 字符串
 */
export function highlightKeywords(text: string, keywords: string[]): string {
  if (!keywords || keywords.length === 0) return escapeHtml(text);

  // 过滤掉太短的关键词
  const validKeywords = keywords
    .filter((k) => k.trim().length >= 2)
    .map((k) => k.trim())
    .sort((a, b) => b.length - a.length); // 长词优先匹配

  if (validKeywords.length === 0) return escapeHtml(text);

  // 构建正则（转义特殊字符）
  const pattern = validKeywords.map((k) => escapeRegex(k)).join("|");
  const regex = new RegExp(`(${pattern})`, "gi");

  return escapeHtml(text).replace(
    regex,
    (match) => `<mark class="kw">${match}</mark>`
  );
}

/** HTML 转义 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** 正则特殊字符转义 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
