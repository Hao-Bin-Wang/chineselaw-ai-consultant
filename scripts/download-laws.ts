/**
 * 从 GitHub 开源仓库下载中国法律文本
 * 数据来源: risshun/Chinese_Laws, cn/constitution, LeeBA4IHW/LawsOfChina
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "law-data");

interface LawSource {
  title: string;
  type: string;
  url: string;
  encoding?: BufferEncoding;
}

const LAWS: LawSource[] = [
  // === 宪法 ===
  {
    title: "中华人民共和国宪法",
    type: "law",
    url: "https://api.github.com/repos/cn/constitution/contents/README.md?ref=master",
  },
  // === 基本法律 ===
  {
    title: "中华人民共和国民法典",
    type: "law",
    url: "https://api.github.com/repos/risshun/Chinese_Laws/contents/%E5%9F%BA%E6%9C%AC%E6%B3%95%E5%BE%8B/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E6%B0%91%E6%B3%95%E5%85%B8.md",
  },
  {
    title: "中华人民共和国民事诉讼法",
    type: "law",
    url: "https://api.github.com/repos/risshun/Chinese_Laws/contents/%E5%9F%BA%E6%9C%AC%E6%B3%95%E5%BE%8B/%E6%B0%91%E4%BA%8B%E8%AF%89%E8%AE%BC%E6%B3%952021.md",
  },
  {
    title: "中华人民共和国国籍法",
    type: "law",
    url: "https://api.github.com/repos/risshun/Chinese_Laws/contents/%E5%9F%BA%E6%9C%AC%E6%B3%95%E5%BE%8B/%E5%9B%BD%E7%B1%8D%E6%B3%95.md",
  },
  // === 非基本法律 ===
  {
    title: "中华人民共和国劳动法",
    type: "law",
    url: "https://api.github.com/repos/risshun/Chinese_Laws/contents/%E9%9D%9E%E5%9F%BA%E6%9C%AC%E6%B3%95%E5%BE%8B/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E5%8A%B3%E5%8A%A8%E6%B3%95.md",
  },
  {
    title: "中华人民共和国劳动合同法",
    type: "law",
    url: "https://api.github.com/repos/risshun/Chinese_Laws/contents/%E9%9D%9E%E5%9F%BA%E6%9C%AC%E6%B3%95%E5%BE%8B/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E5%8A%B3%E5%8A%A8%E5%90%88%E5%90%8C%E6%B3%95.md",
  },
  {
    title: "中华人民共和国企业破产法",
    type: "law",
    url: "https://api.github.com/repos/risshun/Chinese_Laws/contents/%E9%9D%9E%E5%9F%BA%E6%9C%AC%E6%B3%95%E5%BE%8B/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E4%BC%81%E4%B8%9A%E7%A0%B4%E4%BA%A7%E6%B3%95.md",
  },
  {
    title: "中华人民共和国反垄断法",
    type: "law",
    url: "https://api.github.com/repos/risshun/Chinese_Laws/contents/%E9%9D%9E%E5%9F%BA%E6%9C%AC%E6%B3%95%E5%BE%8B/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E5%8F%8D%E5%9E%84%E6%96%AD%E6%B3%95.md",
  },
  {
    title: "中华人民共和国出境入境管理法",
    type: "law",
    url: "https://api.github.com/repos/risshun/Chinese_Laws/contents/%E9%9D%9E%E5%9F%BA%E6%9C%AC%E6%B3%95%E5%BE%8B/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E5%87%BA%E5%A2%83%E5%85%A5%E5%A2%83%E7%AE%A1%E7%90%86%E6%B3%95.md",
  },
  {
    title: "中华人民共和国涉外民事关系法律适用法",
    type: "law",
    url: "https://api.github.com/repos/risshun/Chinese_Laws/contents/%E9%9D%9E%E5%9F%BA%E6%9C%AC%E6%B3%95%E5%BE%8B/%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E6%B6%89%E5%A4%96%E6%B0%91%E4%BA%8B%E5%85%B3%E7%B3%BB%E6%B3%95%E5%BE%8B%E9%80%82%E7%94%A8%E6%B3%95.md",
  },
  // === 刑法 ===
  {
    title: "中华人民共和国刑法",
    type: "law",
    url: "https://api.github.com/repos/LeeBA4IHW/LawsOfChina/contents/README.md",
  },
];

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  console.log(`Downloading ${LAWS.length} law texts...\n`);

  for (const law of LAWS) {
    const fileName = law.title.replace(/[\/\\:*?"<>|]/g, "") + ".txt";
    const filePath = join(DATA_DIR, fileName);

    console.log(`Fetching: ${law.title}...`);

    try {
      const res = await fetch(law.url, {
        headers: { Accept: "application/vnd.github.v3+json" },
      });

      if (!res.ok) {
        console.log(`  ⚠️ HTTP ${res.status} — skipping`);
        continue;
      }

      const json = await res.json();
      if (!json.content) {
        console.log(`  ⚠️ No content field — skipping`);
        continue;
      }

      const text = Buffer.from(json.content, "base64").toString("utf-8");
      await writeFile(filePath, text, "utf-8");

      // Count articles (第X条)
      const articleMatches = text.match(/第[零一二三四五六七八九十百千]+条/g) || [];
      console.log(`  ✅ Saved (${(text.length / 1024).toFixed(1)}KB, ${articleMatches.length} articles)`);
    } catch (err: any) {
      console.log(`  ❌ Error: ${err.message}`);
    }
  }

  console.log(`\nDone. Files saved to ${DATA_DIR}/`);
}

main();