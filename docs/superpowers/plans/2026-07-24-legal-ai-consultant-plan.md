# 法治智能问答系统 · 实施计划

> **For agentic workers:** 使用 superpowers:subagent-driven-development 或 superpowers:executing-plans 按任务逐步实施。步骤使用 checkbox (`- [ ]`) 语法追踪。

**Goal:** 构建一个法治智能问答平台——公众端 AI 法律咨询（含法条引用），工作人员端法条检索 + 法律法规库管理。

**Architecture:** Next.js 14 App Router 全栈应用。PostgreSQL + pgvector 存储结构化法条和向量索引。DeepSeek V4 Flash 提供问答生成，SiliconFlow Qwen3-VL-Embedding-8B 提供向量化。BullMQ + Redis 处理异步文件导入。账号密码 + 图形验证码认证。

**Tech Stack:** Next.js 14, TypeScript, PostgreSQL + pgvector, Prisma, Redis + BullMQ, Tailwind CSS + shadcn/ui, bcryptjs, svg-captcha, pdf-parse, mammoth, jose (JWT)

## Global Constraints

- 所有 API Key 必须存储在 `.env.local`，不硬编码
- 密码使用 bcryptjs 哈希存储
- 仅 `role=admin` 可访问 `/admin` 和导入 API
- API 路由统一返回 JSON 格式 `{ success: boolean, data?: any, error?: string }`
- 前端使用 shadcn/ui 组件，不引入其他 UI 库
- 项目目录：`C:\Users\gaohu\Desktop\chineselaw-ai-consultant`

---

### Task 1: 项目脚手架

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.env.local`, `.env.example`, `.gitignore`

- [ ] **Step 1: 初始化 Next.js 项目**

```bash
cd "C:\Users\gaohu\Desktop\chineselaw-ai-consultant"
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

- [ ] **Step 2: 安装核心依赖**

```bash
npm install prisma @prisma/client bcryptjs jose svg-captcha pdf-parse mammoth bullmq ioredis
npm install -D @types/bcryptjs @types/pdf-parse
```

- [ ] **Step 3: 初始化 shadcn/ui**

```bash
npx shadcn-ui@latest init -d
```

- [ ] **Step 4: 安装 shadcn/ui 组件**

```bash
npx shadcn-ui@latest add button input card dialog toast separator textarea avatar scroll-area dropdown-menu
```

- [ ] **Step 5: 创建 .env.local**

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chineselaw"

# DeepSeek AI
DEEPSEEK_API_KEY="sk-your-deepseek-api-key"
DEEPSEEK_BASE_URL="https://api.deepseek.com"

# SiliconFlow Embedding
SILICONFLOW_API_KEY="sk-your-siliconflow-api-key"
SILICONFLOW_BASE_URL="https://api.siliconflow.cn/v1"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secret
JWT_SECRET="legal-ai-consultant-jwt-secret-change-in-production"
```

- [ ] **Step 6: 创建 .env.example（不含真实 Key）**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chineselaw"
DEEPSEEK_API_KEY="sk-your-deepseek-api-key"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
SILICONFLOW_API_KEY="sk-your-siliconflow-api-key"
SILICONFLOW_BASE_URL="https://api.siliconflow.cn/v1"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-jwt-secret"
```

- [ ] **Step 7: 创建 .gitignore**

```
node_modules/
.next/
.env.local
uploads/
```

- [ ] **Step 8: 验证项目可启动**

```bash
npm run dev
```
Expected: Next.js 开发服务器在 localhost:3000 启动成功。

---

### Task 2: 数据库 Schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`

- [ ] **Step 1: 确保 PostgreSQL 已安装并运行，创建数据库**

```bash
psql -U postgres -c "CREATE DATABASE chineselaw;"
psql -U postgres -d chineselaw -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

- [ ] **Step 2: 编写 Prisma Schema**

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector", schema: "public")]
}

model User {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String
  role      String   @default("user") // user | admin
  createdAt DateTime @default(now())
}

model Legislation {
  id          String    @id @default(uuid())
  title       String    // 《中华人民共和国劳动合同法》
  type        String    // law | regulation | judicial_interpretation | rule
  status      String    @default("effective") // effective | amended | repealed
  issuedAt    DateTime?
  effectiveAt DateTime?
  publisher   String?   // 全国人大常委会 / 国务院
  articles    Article[]
  createdAt   DateTime  @default(now())
}

model Article {
  id              String      @id @default(uuid())
  legislationId   String
  legislation     Legislation @relation(fields: [legislationId], references: [id], onDelete: Cascade)
  chapter         String?
  section         String?
  articleNumber   String      // "第37条"
  content         String      // 条文原文
  embedding       Unsupported("vector(1024)")?
  createdAt       DateTime    @default(now())
}

model ImportTask {
  id        String   @id @default(uuid())
  fileName  String
  status    String   @default("pending") // pending | parsing | chunking | embedding | done | failed
  progress  Int      @default(0)
  error     String?
  createdBy String
  createdAt DateTime @default(now())
}

model ChatHistory {
  id        String   @id @default(uuid())
  userId    String
  question  String
  answer    String
  citations Json?    // [{ articleId, legislationTitle, articleNumber, content }]
  createdAt DateTime @default(now())
}
```

- [ ] **Step 3: 创建 Prisma 客户端单例**

```typescript
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: 运行数据库迁移**

```bash
npx prisma migrate dev --name init
```
Expected: 迁移成功，所有表创建完毕。

- [ ] **Step 5: 创建种子脚本，写入初始管理员账号**

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password,
      role: "admin",
    },
  });
  console.log("Seed: admin user created (username: admin, password: admin123)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 6: 配置 package.json seed 命令并运行**

```bash
# 在 package.json 添加: "prisma": { "seed": "tsx prisma/seed.ts" }
npm install -D tsx
npx prisma db seed
```
Expected: "Seed: admin user created" 输出。

---

### Task 3: 认证系统

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/captcha.ts`, `src/app/api/auth/register/route.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/captcha/route.ts`, `src/middleware.ts`

**Interfaces:**
- Consumes: `prisma` from `src/lib/db.ts`
- Produces:
  - `generateToken(userId: string, role: string): Promise<string>` — JWT
  - `verifyToken(token: string): Promise<{userId: string, role: string} | null>`
  - `generateCaptcha(): { svg: string, token: string }` — 验证码 SVG + 会话 token
  - `verifyCaptcha(token: string, code: string): Promise<boolean>`
  - `POST /api/auth/register` — `{ username: string, password: string, captchaToken: string, captchaCode: string }` → `{ success: boolean, token?: string }`
  - `POST /api/auth/login` — `{ username: string, password: string, captchaToken: string, captchaCode: string }` → `{ success: boolean, token?: string }`
  - `GET /api/auth/captcha` — `{ svg: string, token: string }`

- [ ] **Step 1: 创建 JWT 认证工具**

```typescript
// src/lib/auth.ts
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "auth-token";

export async function generateToken(userId: string, role: string): Promise<string> {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { userId: payload.userId as string, role: payload.role as string };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function setAuthCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export function clearAuthCookie() {
  cookies().delete(COOKIE_NAME);
}
```

- [ ] **Step 2: 创建图形验证码工具**

```typescript
// src/lib/captcha.ts
import svgCaptcha from "svg-captcha";
import { Redis } from "ioredis";
import { randomUUID } from "crypto";

const redis = new Redis(process.env.REDIS_URL!);

export function generateCaptcha() {
  const captcha = svgCaptcha.create({
    size: 4,
    noise: 2,
    color: true,
    background: "#f4f4f4",
  });
  return captcha; // { text: string, data: string (SVG) }
}

export async function saveCaptcha(text: string): Promise<string> {
  const token = randomUUID();
  await redis.set(`captcha:${token}`, text.toLowerCase(), "EX", 300); // 5 min
  return token;
}

export async function verifyCaptcha(token: string, code: string): Promise<boolean> {
  const stored = await redis.get(`captcha:${token}`);
  if (!stored) return false;
  await redis.del(`captcha:${token}`); // 一次性使用
  return stored === code.toLowerCase();
}
```

- [ ] **Step 3: 获取图形验证码 API**

```typescript
// src/app/api/auth/captcha/route.ts
import { NextResponse } from "next/server";
import { generateCaptcha, saveCaptcha } from "@/lib/captcha";

export async function GET() {
  const captcha = generateCaptcha();
  const token = await saveCaptcha(captcha.text);
  return NextResponse.json({ svg: captcha.data, token });
}
```

- [ ] **Step 4: 注册 API**

```typescript
// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateToken, setAuthCookie } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";

export async function POST(req: NextRequest) {
  const { username, password, captchaToken, captchaCode } = await req.json();

  if (!username || !password || !captchaToken || !captchaCode) {
    return NextResponse.json({ success: false, error: "所有字段必填" }, { status: 400 });
  }

  if (username.length < 3 || username.length > 20) {
    return NextResponse.json({ success: false, error: "账号长度 3-20 个字符" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ success: false, error: "密码至少 6 位" }, { status: 400 });
  }

  const captchaValid = await verifyCaptcha(captchaToken, captchaCode);
  if (!captchaValid) {
    return NextResponse.json({ success: false, error: "验证码错误" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ success: false, error: "账号已存在" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, password: hashed, role: "user" },
  });

  const token = await generateToken(user.id, user.role);
  setAuthCookie(token);

  return NextResponse.json({ success: true, token, role: user.role });
}
```

- [ ] **Step 5: 登录 API**

```typescript
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateToken, setAuthCookie } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";

export async function POST(req: NextRequest) {
  const { username, password, captchaToken, captchaCode } = await req.json();

  if (!username || !password || !captchaToken || !captchaCode) {
    return NextResponse.json({ success: false, error: "所有字段必填" }, { status: 400 });
  }

  const captchaValid = await verifyCaptcha(captchaToken, captchaCode);
  if (!captchaValid) {
    return NextResponse.json({ success: false, error: "验证码错误" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json({ success: false, error: "账号或密码错误" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ success: false, error: "账号或密码错误" }, { status: 401 });
  }

  const token = await generateToken(user.id, user.role);
  setAuthCookie(token);

  return NextResponse.json({ success: true, token, role: user.role });
}
```

- [ ] **Step 6: 中间件（认证拦截）**

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

const publicPaths = ["/login", "/api/auth"];
const adminPaths = ["/admin", "/api/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 公开路径放行
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 静态资源放行
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("auth-token")?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    // 管理员路径检查
    if (adminPaths.some((p) => pathname.startsWith(p)) && role !== "admin") {
      return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "登录已过期" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).)*"],
};
```

- [ ] **Step 7: 验证认证流程**

```bash
# 测试图形验证码
curl http://localhost:3000/api/auth/captcha
# Expected: { svg: "<svg>...</svg>", token: "uuid-string" }

# 测试登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","captchaToken":"<token>","captchaCode":"<code>"}'
# Expected: { success: true, token: "...", role: "admin" }
```

---

### Task 4: AI 核心库

**Files:**
- Create: `src/lib/llm.ts`, `src/lib/embedding.ts`, `src/lib/rag.ts`

**Interfaces:**
- Consumes: `prisma` from `src/lib/db.ts`
- Produces:
  - `chat(messages: {role: string, content: string}[]): Promise<string>` — 调用 DeepSeek
  - `embed(text: string): Promise<number[]>` — 调用 SiliconFlow
  - `batchEmbed(texts: string[]): Promise<number[][]>` — 批量向量化
  - `searchSimilarArticles(embedding: number[], topK: number): Promise<Article[]>` — pgvector 检索
  - `ragQuery(question: string): Promise<{answer: string, citations: Citation[]}>` — 完整 RAG 流程

- [ ] **Step 1: DeepSeek LLM 封装**

```typescript
// src/lib/llm.ts
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

export async function chat(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages,
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}
```

- [ ] **Step 2: SiliconFlow Embedding 封装**

```typescript
// src/lib/embedding.ts
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY!;
const SILICONFLOW_BASE_URL = process.env.SILICONFLOW_BASE_URL || "https://api.siliconflow.cn/v1";

export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${SILICONFLOW_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
    },
    body: JSON.stringify({
      model: "Qwen/Qwen3-VL-Embedding-8B",
      input: text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SiliconFlow API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

export async function batchEmbed(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${SILICONFLOW_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
    },
    body: JSON.stringify({
      model: "Qwen/Qwen3-VL-Embedding-8B",
      input: texts,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SiliconFlow API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.data.map((d: any) => d.embedding);
}
```

- [ ] **Step 3: RAG 检索 + 回答**

```typescript
// src/lib/rag.ts
import { prisma } from "./db";
import { embed } from "./embedding";
import { chat } from "./llm";

interface Citation {
  articleId: string;
  legislationTitle: string;
  articleNumber: string;
  content: string;
}

export async function searchSimilarArticles(questionEmbedding: number[], topK: number = 10) {
  // pgvector 余弦相似度检索
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
      a.legislation_id,
      l.title as legislation_title,
      a.article_number,
      a.content,
      1 - (a.embedding <=> $1::vector) as similarity
    FROM "Article" a
    JOIN "Legislation" l ON a.legislation_id = l.id
    WHERE a.embedding IS NOT NULL AND l.status = 'effective'
    ORDER BY a.embedding <=> $1::vector
    LIMIT $2`,
    embeddingStr,
    topK
  );
  return articles;
}

const SYSTEM_PROMPT = `你是一个专业法治智能助手。基于以下参考法律条文回答用户问题。

要求：
1. 用通俗易懂的语言解释，让普通群众能理解
2. 引用法律条文时使用【法规名称】第X条 的格式
3. 如果参考条文不足以回答用户问题，请明确告知用户
4. 回答简洁有条理，必要时使用分点说明`;

export async function ragQuery(question: string): Promise<{ answer: string; citations: Citation[] }> {
  // 1. 向量化问题
  const questionEmbedding = await embed(question);

  // 2. 检索相关法条
  const similarArticles = await searchSimilarArticles(questionEmbedding, 10);

  if (similarArticles.length === 0) {
    return {
      answer: "抱歉，当前法律法规库中暂无相关内容可以回答您的问题。建议您咨询专业律师获取更准确的解答。",
      citations: [],
    };
  }

  // 3. 构建引用列表
  const citations: Citation[] = similarArticles.slice(0, 5).map((a) => ({
    articleId: a.id,
    legislationTitle: a.legislation_title,
    articleNumber: a.article_number,
    content: a.content,
  }));

  // 4. 拼接参考法条
  const context = citations
    .map((c, i) => `${i + 1}. 《${c.legislationTitle}》${c.articleNumber}：${c.content}`)
    .join("\n\n");

  // 5. 调用 LLM 生成回答
  const answer = await chat([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `【参考法条】\n${context}\n\n【用户问题】\n${question}` },
  ]);

  return { answer, citations };
}
```

- [ ] **Step 4: 验证 API 连通性（手动测试）**

在 `src/lib/` 下创建临时测试脚本，分别调用 `embed("测试文本")` 和 `chat([{role:"user",content:"你好"}])` 验证 API 可用。

---

### Task 5: 智能问答页面

**Files:**
- Create: `src/app/chat/page.tsx`, `src/components/ChatBox.tsx`, `src/app/api/chat/route.ts`, `src/app/api/chat/history/route.ts`

**Interfaces:**
- Consumes: `ragQuery` from `src/lib/rag.ts`, `getSession` from `src/lib/auth.ts`, `prisma` from `src/lib/db.ts`
- Produces:
  - `POST /api/chat` — `{ question: string }` → `{ answer: string, citations: Citation[] }`
  - `GET /api/chat/history` — `{ conversations: ChatHistory[] }`
  - ChatBox 组件：消息列表 + 输入框 + 引用展示

- [ ] **Step 1: 问答 API**

```typescript
// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ragQuery } from "@/lib/rag";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const { question } = await req.json();
  if (!question || question.trim().length === 0) {
    return NextResponse.json({ success: false, error: "问题不能为空" }, { status: 400 });
  }

  try {
    const { answer, citations } = await ragQuery(question.trim());

    // 保存到历史记录
    await prisma.chatHistory.create({
      data: {
        userId: session.userId,
        question: question.trim(),
        answer,
        citations: citations,
      },
    });

    return NextResponse.json({ success: true, data: { answer, citations } });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "AI 回答生成失败，请稍后重试" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 历史对话 API**

```typescript
// src/app/api/chat/history/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const conversations = await prisma.chatHistory.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      question: true,
      answer: true,
      citations: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, data: conversations });
}
```

- [ ] **Step 3: ChatBox 组件**

```typescript
// src/components/ChatBox.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Citation {
  articleId: string;
  legislationTitle: string;
  articleNumber: string;
  content: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.data.answer, citations: json.data.citations },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `错误：${json.error}` },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "网络错误，请稍后重试" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      <ScrollArea className="flex-1 p-4">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 ${msg.role === "user" ? "text-right" : ""}`}>
            <Card className={`inline-block max-w-[80%] p-4 ${
              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs font-medium mb-1 opacity-70">参考法条：</p>
                  {msg.citations.map((c, j) => (
                    <p key={j} className="text-xs opacity-70 mb-1">
                      · 《{c.legislationTitle}》{c.articleNumber}
                    </p>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ))}
        {loading && (
          <div className="mb-4">
            <Card className="inline-block max-w-[80%] p-4 bg-muted">
              <p className="text-sm animate-pulse">正在思考...</p>
            </Card>
          </div>
        )}
        <div ref={scrollRef} />
      </ScrollArea>
      <div className="p-4 border-t flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="输入您的法律问题，按 Enter 发送..."
          className="min-h-[60px]"
          disabled={loading}
        />
        <Button onClick={send} disabled={loading || !input.trim()}>发送</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 问答页面**

```typescript
// src/app/chat/page.tsx
import { ChatBox } from "@/components/ChatBox";
import { HistoryPanel } from "@/components/HistoryPanel";

export default function ChatPage() {
  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className="w-72 border-r hidden lg:block">
        <HistoryPanel />
      </div>
      <div className="flex-1">
        <ChatBox />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 验证问答流程**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=<token>" \
  -d '{"question":"劳动合同解除需要提前多久通知？"}'
```
Expected: 返回 AI 回答 + citations 数组。

---

### Task 6: 历史对话面板

**Files:**
- Create: `src/components/HistoryPanel.tsx`

**Interfaces:**
- Consumes: `GET /api/chat/history`
- Produces: 侧边栏历史对话列表，点击可查看详情

- [ ] **Step 1: HistoryPanel 组件**

```typescript
// src/components/HistoryPanel.tsx
"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

interface Conversation {
  id: string;
  question: string;
  answer: string;
  citations: any;
  createdAt: string;
}

export function HistoryPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);

  useEffect(() => {
    fetch("/api/chat/history")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setConversations(json.data);
      });
  }, []);

  if (selected) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b flex items-center gap-2">
          <button onClick={() => setSelected(null)} className="text-sm text-primary hover:underline">
            ← 返回
          </button>
        </div>
        <ScrollArea className="flex-1 p-4">
          <p className="text-sm font-medium mb-2">问题：</p>
          <p className="text-sm mb-4">{selected.question}</p>
          <p className="text-sm font-medium mb-2">回答：</p>
          <p className="text-sm whitespace-pre-wrap">{selected.answer}</p>
          {selected.citations && (selected.citations as any[]).length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">参考法条：</p>
              {(selected.citations as any[]).map((c: any, i: number) => (
                <Card key={i} className="p-2 mb-2">
                  <p className="text-xs font-medium">《{c.legislationTitle}》{c.articleNumber}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.content}</p>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <h3 className="font-medium text-sm">历史对话</h3>
      </div>
      <ScrollArea className="flex-1">
        {conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4">暂无对话记录</p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="w-full text-left p-3 hover:bg-muted border-b transition-colors"
            >
              <p className="text-sm truncate">{c.question}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(c.createdAt).toLocaleDateString("zh-CN")}
              </p>
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
```

---

### Task 7: 法条检索页面

**Files:**
- Create: `src/app/laws/page.tsx`, `src/components/LawTree.tsx`, `src/components/LawSearch.tsx`, `src/app/api/laws/route.ts`, `src/app/api/laws/[id]/route.ts`

**Interfaces:**
- Consumes: `prisma` from `src/lib/db.ts`
- Produces:
  - `GET /api/laws?search=&type=&page=` → `{ legislations: Legislation[], total: number }`
  - `GET /api/laws/:id` → `{ legislation: Legislation & { articles: Article[] } }`
  - LawTree 组件：法规类型筛选 + 法规列表
  - LawSearch 组件：全文搜索

- [ ] **Step 1: 法条检索 API**

```typescript
// src/app/api/laws/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 20;

  const where: any = {};
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      {
        articles: {
          some: { content: { contains: search, mode: "insensitive" } },
        },
      },
    ];
  }

  const [legislations, total] = await Promise.all([
    prisma.legislation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { articles: true } } },
    }),
    prisma.legislation.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { legislations, total, page, pageSize },
  });
}
```

- [ ] **Step 2: 法条详情 API**

```typescript
// src/app/api/laws/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const legislation = await prisma.legislation.findUnique({
    where: { id: params.id },
    include: {
      articles: {
        orderBy: { articleNumber: "asc" },
        select: {
          id: true,
          chapter: true,
          section: true,
          articleNumber: true,
          content: true,
        },
      },
    },
  });

  if (!legislation) {
    return NextResponse.json({ success: false, error: "法规不存在" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: legislation });
}
```

- [ ] **Step 3: 法条检索页面**

```typescript
// src/app/laws/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Legislation {
  id: string;
  title: string;
  type: string;
  status: string;
  publisher: string;
  _count: { articles: number };
}

const typeLabels: Record<string, string> = {
  law: "法律",
  regulation: "行政法规",
  judicial_interpretation: "司法解释",
  rule: "部门规章",
};

export default function LawsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [legislations, setLegislations] = useState<Legislation[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function fetchLaws() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    const res = await fetch(`/api/laws?${params}`);
    const json = await res.json();
    if (json.success) setLegislations(json.data.legislations);
    setLoading(false);
  }

  useEffect(() => { fetchLaws(); }, [type]);

  async function viewLaw(id: string) {
    const res = await fetch(`/api/laws/${id}`);
    const json = await res.json();
    if (json.success) setSelected(json.data);
  }

  if (selected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button onClick={() => setSelected(null)} className="text-primary hover:underline mb-4">
          ← 返回列表
        </button>
        <h1 className="text-xl font-bold mb-2">{selected.title}</h1>
        <p className="text-sm text-muted-foreground mb-4">
          {typeLabels[selected.type] || selected.type} · {selected.publisher} · 共 {selected.articles.length} 条
        </p>
        <ScrollArea className="h-[calc(100vh-200px)]">
          {selected.articles.map((a: any) => (
            <Card key={a.id} className="p-4 mb-3">
              <p className="text-sm font-medium text-primary mb-1">{a.articleNumber}</p>
              {a.chapter && <p className="text-xs text-muted-foreground mb-1">{a.chapter}{a.section ? ` / ${a.section}` : ""}</p>}
              <p className="text-sm whitespace-pre-wrap">{a.content}</p>
            </Card>
          ))}
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">法律法规检索</h1>
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="搜索法规名称或条文内容..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") fetchLaws(); }}
        />
        <Button onClick={fetchLaws} disabled={loading}>搜索</Button>
      </div>
      <div className="flex gap-2 mb-4">
        {["", "law", "regulation", "judicial_interpretation", "rule"].map((t) => (
          <Button
            key={t}
            variant={type === t ? "default" : "outline"}
            size="sm"
            onClick={() => setType(t)}
          >
            {t === "" ? "全部" : typeLabels[t]}
          </Button>
        ))}
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">加载中...</p>
      ) : legislations.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无数据</p>
      ) : (
        legislations.map((l) => (
          <Card
            key={l.id}
            className="p-4 mb-2 cursor-pointer hover:bg-muted transition-colors"
            onClick={() => viewLaw(l.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{l.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {typeLabels[l.type] || l.type} · {l.publisher} · {l._count.articles} 条
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{l.status === "effective" ? "✅ 现行有效" : l.status}</span>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
```

---

### Task 8: 管理页面（文件导入）

**Files:**
- Create: `src/app/admin/page.tsx`, `src/components/ImportPanel.tsx`, `src/app/api/admin/import/route.ts`, `src/app/api/admin/import/status/route.ts`, `src/lib/parser.ts`, `src/lib/queue.ts`

**Interfaces:**
- Consumes: `prisma`, `embed`, `batchEmbed`
- Produces:
  - `POST /api/admin/import` — multipart/form-data 上传文件 → 创建 ImportTask + 入队
  - `GET /api/admin/import/status?id=` — 查询导入进度
  - `parseFile(buffer: Buffer, fileName: string): Promise<string>` — 解析 PDF/Word/JSON
  - `processImportTask(taskId: string): Promise<void>` — BullMQ worker

- [ ] **Step 1: 文件解析器**

```typescript
// src/lib/parser.ts
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export async function parseFile(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === "docx" || ext === "doc") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === "json") {
    return buffer.toString("utf-8");
  }

  throw new Error(`不支持的文件格式: .${ext}`);
}
```

- [ ] **Step 2: 导入队列**

```typescript
// src/lib/queue.ts
import { Queue, Worker } from "bullmq";
import { prisma } from "./db";
import { parseFile } from "./parser";
import { batchEmbed } from "./embedding";
import { readFile } from "fs/promises";
import { join } from "path";

const connection = { url: process.env.REDIS_URL! };

export const importQueue = new Queue("law-import", { connection });

// 按"第X条"分割文本
function chunkArticles(text: string): { number: string; content: string }[] {
  const articles: { number: string; content: string }[] = [];
  const regex = /第[零一二三四五六七八九十百千]+条/g;
  const matches = [...text.matchAll(regex)];

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

new Worker(
  "law-import",
  async (job) => {
    const { taskId, filePath, fileName, legislationTitle, legislationType } = job.data;

    await prisma.importTask.update({
      where: { id: taskId },
      data: { status: "parsing", progress: 10 },
    });

    // 1. 解析文件
    const buffer = await readFile(filePath);
    const text = await parseFile(buffer, fileName);

    await prisma.importTask.update({
      where: { id: taskId },
      data: { status: "chunking", progress: 30 },
    });

    // 2. 拆分法条
    const articles = chunkArticles(text);
    if (articles.length === 0) {
      throw new Error("未能识别到任何法条（请确保文件包含"第X条"格式的条文）");
    }

    // 3. 创建法规
    const legislation = await prisma.legislation.create({
      data: {
        title: legislationTitle,
        type: legislationType || "law",
        status: "effective",
        publisher: "待补充",
      },
    });

    // 4. 批量创建条文（先不写 embedding）
    for (const article of articles) {
      await prisma.article.create({
        data: {
          legislationId: legislation.id,
          articleNumber: article.number,
          content: article.content,
        },
      });
    }

    await prisma.importTask.update({
      where: { id: taskId },
      data: { status: "embedding", progress: 50 },
    });

    // 5. 批量向量化（每批 10 条）
    const allArticles = await prisma.article.findMany({
      where: { legislationId: legislation.id },
    });

    const batchSize = 10;
    for (let i = 0; i < allArticles.length; i += batchSize) {
      const batch = allArticles.slice(i, i + batchSize);
      const texts = batch.map((a) => `${legislationTitle} ${a.articleNumber} ${a.content}`);
      const embeddings = await batchEmbed(texts);

      for (let j = 0; j < batch.length; j++) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Article" SET embedding = $1::vector WHERE id = $2`,
          `[${embeddings[j].join(",")}]`,
          batch[j].id
        );
      }

      const progress = 50 + Math.floor(((i + batch.length) / allArticles.length) * 50);
      await prisma.importTask.update({
        where: { id: taskId },
        data: { progress },
      });
    }

    await prisma.importTask.update({
      where: { id: taskId },
      data: { status: "done", progress: 100 },
    });
  },
  { connection }
);
```

- [ ] **Step 3: 导入 API**

```typescript
// src/app/api/admin/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { importQueue } from "@/lib/queue";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const title = formData.get("title") as string;
  const type = formData.get("type") as string;

  if (!file || !title) {
    return NextResponse.json({ success: false, error: "文件和法律名称必填" }, { status: 400 });
  }

  const allowedTypes = ["application/pdf", "application/json", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ success: false, error: "仅支持 PDF、Word、JSON 格式" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop();
  const fileName = `${randomUUID()}.${ext}`;
  const filePath = join(process.cwd(), "uploads", fileName);
  await writeFile(filePath, buffer);

  const task = await prisma.importTask.create({
    data: {
      fileName: file.name,
      status: "pending",
      createdBy: session.userId,
    },
  });

  await importQueue.add("import", {
    taskId: task.id,
    filePath,
    fileName: file.name,
    legislationTitle: title,
    legislationType: type,
  });

  return NextResponse.json({ success: true, data: { taskId: task.id } });
}
```

- [ ] **Step 4: 导入状态查询 API**

```typescript
// src/app/api/admin/import/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const tasks = await prisma.importTask.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ success: true, data: tasks });
}
```

- [ ] **Step 5: 管理页面**

```typescript
// src/app/admin/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface ImportTask {
  id: string;
  fileName: string;
  status: string;
  progress: number;
  error: string | null;
  createdAt: string;
}

const statusLabels: Record<string, string> = {
  pending: "等待中",
  parsing: "解析中",
  chunking: "拆分中",
  embedding: "向量化中",
  done: "完成",
  failed: "失败",
};

export default function AdminPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("law");
  const [uploading, setUploading] = useState(false);
  const [tasks, setTasks] = useState<ImportTask[]>([]);

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/admin/import/status");
    const json = await res.json();
    if (json.success) setTasks(json.data);
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  async function upload() {
    if (!file || !title.trim()) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("type", type);

    try {
      const res = await fetch("/api/admin/import", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        setFile(null);
        setTitle("");
        fetchTasks();
      } else {
        alert(json.error);
      }
    } catch {
      alert("上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-6">知识库管理</h1>

      {/* 上传区域 */}
      <Card className="p-6 mb-6">
        <h2 className="font-medium mb-4">导入法律法规</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">法规名称</label>
            <Input
              placeholder="如：中华人民共和国劳动合同法"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">法规类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="law">法律</option>
              <option value="regulation">行政法规</option>
              <option value="judicial_interpretation">司法解释</option>
              <option value="rule">部门规章</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">选择文件（PDF / Word / JSON）</label>
            <Input
              type="file"
              accept=".pdf,.docx,.doc,.json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <Button onClick={upload} disabled={!file || !title.trim() || uploading}>
            {uploading ? "上传中..." : "开始导入"}
          </Button>
        </div>
      </Card>

      {/* 导入任务列表 */}
      <Card className="p-6">
        <h2 className="font-medium mb-4">导入任务</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无导入任务</p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{task.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {statusLabels[task.status] || task.status}
                  {task.error && <span className="text-red-500 ml-2">错误：{task.error}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {task.status !== "done" && task.status !== "failed" && (
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {task.status === "done" ? "✅" : task.status === "failed" ? "❌" : `${task.progress}%`}
                </span>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
```

---

### Task 9: 登录页面

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: 登录页面（含注册）**

```typescript
// src/app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchCaptcha() {
    const res = await fetch("/api/auth/captcha");
    const json = await res.json();
    setCaptchaSvg(json.svg);
    setCaptchaToken(json.token);
    setCaptchaCode("");
  }

  useEffect(() => { fetchCaptcha(); }, []);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, captchaToken, captchaCode }),
      });
      const json = await res.json();
      if (json.success) {
        router.push("/chat");
      } else {
        setError(json.error);
        fetchCaptcha();
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">法治智能问答系统</h1>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">账号</label>
            <Input
              placeholder="请输入账号"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">密码</label>
            <Input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            />
          </div>
          <div>
            <label className="text-sm font-medium">验证码</label>
            <div className="flex gap-2">
              <Input
                placeholder="输入验证码"
                value={captchaCode}
                onChange={(e) => setCaptchaCode(e.target.value)}
                className="flex-1"
              />
              <div
                dangerouslySetInnerHTML={{ __html: captchaSvg }}
                onClick={fetchCaptcha}
                className="cursor-pointer border rounded-md p-1 hover:bg-muted"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button onClick={submit} disabled={loading} className="w-full">
            {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            {mode === "login" ? "没有账号？" : "已有账号？"}
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); fetchCaptcha(); }}
              className="text-primary hover:underline ml-1"
            >
              {mode === "login" ? "注册" : "登录"}
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}
```

---

### Task 10: 布局与导航

**Files:**
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/Navbar.tsx`

- [ ] **Step 1: 导航栏组件**

```typescript
// src/components/Navbar.tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    // 从 cookie 中读取角色
    const token = document.cookie.split("; ").find((row) => row.startsWith("auth-token="));
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setRole(payload.role);
      } catch {}
    }
  }, [pathname]);

  if (pathname === "/login") return null;

  const links = [
    { href: "/chat", label: "智能问答" },
    { href: "/laws", label: "法条检索" },
  ];
  if (role === "admin") {
    links.push({ href: "/admin", label: "知识库管理" });
  }

  async function logout() {
    document.cookie = "auth-token=; path=/; max-age=0";
    router.push("/login");
  }

  return (
    <nav className="border-b h-16 flex items-center px-6 gap-4 bg-background">
      <h1 className="font-bold text-lg mr-4">⚖️ 法治智能问答</h1>
      {links.map((link) => (
        <Button
          key={link.href}
          variant={pathname === link.href ? "default" : "ghost"}
          onClick={() => router.push(link.href)}
        >
          {link.label}
        </Button>
      ))}
      <div className="flex-1" />
      <Button variant="outline" onClick={logout}>退出</Button>
    </nav>
  );
}
```

- [ ] **Step 2: 根布局**

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "法治智能问答系统",
  description: "AI 驱动的法律咨询与法条检索平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: 首页重定向**

```typescript
// src/app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/chat");
}
```

---

### Task 11: 集成验证

- [ ] **Step 1: 启动所有服务**

```bash
# 确保 PostgreSQL 和 Redis 已运行
# 启动开发服务器
npm run dev
```

- [ ] **Step 2: 端到端测试**

1. 访问 http://localhost:3000 → 应重定向到 /login
2. 获取验证码，用 admin/admin123 登录 → 应进入 /chat
3. 输入法律问题（如"劳动合同试用期最长多久"）→ 应返回 AI 回答
4. 访问 /laws → 应看到法规列表（如有数据）
5. 访问 /admin → 上传测试文件 → 应看到导入进度
6. 查看 /chat 左侧历史对话面板 → 应有记录

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: 法治智能问答系统初始版本"
```

---

## 验证清单

- [ ] 登录/注册（账号密码+图形验证码）
- [ ] 智能问答（AI 回答 + 法条引用）
- [ ] 历史对话记录
- [ ] 法条检索（法规列表 + 类型筛选 + 全文搜索）
- [ ] 法条详情查看（按条款序号展示）
- [ ] 管理员导入法律法规（PDF/Word/JSON）
- [ ] 导入进度异步追踪
- [ ] 权限控制（管理员 vs 普通用户）
- [ ] 未登录重定向到 /login