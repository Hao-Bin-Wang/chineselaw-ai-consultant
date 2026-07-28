# 法治智能问答系统 · 设计文档

> 日期：2026-07-24
> 状态：设计阶段

---

## 1. 产品目标

构建一个法治智能问答平台，面向公众提供法律咨询（AI 即时回答 + 法条引用），面向工作人员提供法条检索和法律法规库管理能力。

---

## 2. 用户角色

| 角色 | 权限 |
|------|------|
| **普通用户** (user) | 智能问答、法条检索 |
| **管理员** (admin) | 上述全部 + 导入/管理法律法规库 |

认证方式：**账号 + 密码 + 图形验证码**注册/登录。

---

## 3. 核心页面

| 路由 | 页面 | 用户 | 功能 |
|------|------|------|------|
| `/login` | 登录/注册 | 所有用户 | 账号+密码+图形验证码登录 |
| `/chat` | 智能问答 | 所有用户 | 自然语言提问，AI 回答 + 法条引用 |
| `/laws` | 法条检索 | 所有用户 | 法规树导航、全文搜索、条款精准定位 |
| `/admin` | 知识库管理 | 管理员 | 上传 PDF/Word/JSON、查看导入进度、管理已入库法规 |

---

## 4. 技术栈

| 层 | 选型 | 说明 |
|----|------|------|
| 全栈框架 | Next.js 14 App Router | TypeScript，前后端一体 |
| 数据库 | PostgreSQL + pgvector | 结构化数据 + 向量检索同库 |
| ORM | Prisma | 类型安全，pgvector 原生支持 |
| 缓存/队列 | Redis + BullMQ | 异步导入任务、图形验证码缓存 |
| 认证 | 账号 + 密码 + 图形验证码 | 自建，密码 bcrypt 哈希，验证码存 Redis（5分钟过期） |
| AI 问答 | DeepSeek V4 Flash | `sk-***`（环境变量） |
| Embedding | Qwen3-VL-Embedding-8B | SiliconFlow API，`sk-***`（环境变量） |
| 文件解析 | pdf-parse + mammoth | PDF 和 Word 解析 |
| UI | Tailwind CSS + shadcn/ui | 组件化，可定制 |
| 部署 | 暂不涉及 | 后续再定 |

---

## 5. 数据模型

```typescript
// 法规
model Legislation {
  id          String    @id @default(uuid())
  title       String                    // 《中华人民共和国劳动合同法》
  type        String                    // law | regulation | judicial_interpretation | rule
  status      String                    // effective | amended | repealed
  issuedAt    DateTime
  effectiveAt DateTime
  publisher   String                    // 全国人大常委会 / 国务院
  articles    Article[]
  createdAt   DateTime  @default(now())
}

// 条文
model Article {
  id              String    @id @default(uuid())
  legislationId   String
  legislation     Legislation @relation(fields: [legislationId], references: [id])
  chapter         String?               // 章
  section         String?               // 节
  articleNumber   String                // "第37条"
  content         String                // 条文原文（含款、项）
  embedding       Unsupported("vector")? // pgvector 1024维
  createdAt       DateTime  @default(now())
}

// 用户
model User {
  id          String    @id @default(uuid())
  username    String    @unique
  password    String                    // bcrypt 哈希
  role        String                    // user | admin
  createdAt   DateTime  @default(now())
}

// 导入任务
model ImportTask {
  id          String    @id @default(uuid())
  fileName    String
  status      String                    // pending | parsing | chunking | embedding | done | failed
  progress    Int       @default(0)     // 0-100
  error       String?
  createdBy   String
  createdAt   DateTime  @default(now())
}

// 问答记录
model ChatHistory {
  id          String    @id @default(uuid())
  userId      String
  question    String
  answer      String
  citations   Json?                     // [{ articleId, legislationTitle, articleNumber, content }]
  createdAt   DateTime  @default(now())
}
```

---

## 6. RAG 检索流程

```
用户提问
  → 调用 SiliconFlow Embedding API 向量化问题
  → pgvector 余弦相似度检索 Top 10 相关法条
  → 结构化 Rerank（按法规层级 + 时效性 + 条文相关性）取 Top 3-5
  → 拼接 System Prompt：
      "你是一个专业法治智能助手。基于以下法律条文回答用户问题。
       用通俗易懂的语言解释，让普通群众能理解。
       引用时使用【法规名称】第X条 的格式。
       如果以下条文不足以回答问题，明确告知用户。
       【参考法条】
       1. 《劳动合同法》第37条：[原文]
       2. ..."
  → 调用 DeepSeek V4 Flash 生成回答
  → 解析引用 → 关联真实法条 ID → 存入 ChatHistory
  → 返回：{ answer, citations: [...] }
```

---

## 7. 文件导入流程

```
上传 PDF/Word/JSON
  → 原始文件存 /uploads
  → 创建 ImportTask（status: pending）
  → BullMQ 入队：
      1. parsing: pdf-parse / mammoth 提取文本
      2. chunking: 按"第X条"识别边界，拆分法条
      3. embedding: 逐条调 SiliconFlow API
      4. 批量写入 PostgreSQL
  → 前端 SSE / 轮询展示进度
  → 失败法条单独重试，支持断点续传
```

**权限控制**：仅 `role=admin` 可访问导入接口。

---

## 8. 账号密码 + 图形验证码登录流程

```
用户输入账号 + 密码 + 图形验证码
  → 后端校验图形验证码（Redis 中存储，5分钟过期）
  → 验证码错误 → 返回错误提示
  → 验证码正确 → 查 User 表匹配账号
  → 不存在 → 自动注册（bcrypt 哈希密码，role=user）
  → 存在 → bcrypt 校验密码
  → 签发 JWT Token（存 Cookie/Header）
```

图形验证码：使用 svg-captcha 生成 SVG 验证码，验证码文本存 Redis，key: `captcha:{sessionId}`，TTL: 5分钟。

**历史对话记录**：用户登录后可查看自己的历史问答记录，按时间倒序排列，点击可查看完整问答和引用。

---

## 9. 项目结构

```
chineselaw-ai-consultant/
├── .env.example              # 环境变量模板
├── next.config.js
├── tailwind.config.ts
├── prisma/
│   └── schema.prisma         # 数据库模型
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx          # 首页 → 重定向到 /chat
│   │   ├── login/
│   │   │   └── page.tsx      # 登录/注册
│   │   ├── chat/
│   │   │   └── page.tsx      # 智能问答
│   │   ├── laws/
│   │   │   └── page.tsx      # 法条检索
│   │   ├── admin/
│   │   │   └── page.tsx      # 知识库管理
│   │   └── api/
│   │       ├── auth/         # 登录/注册 API
│   │       ├── chat/         # 问答 API
│   │       ├── laws/         # 法条检索 API
│   │       └── admin/        # 管理 API
│   ├── lib/
│   │   ├── auth.ts           # 认证工具
│   │   ├── db.ts             # Prisma 客户端
│   │   ├── embedding.ts      # SiliconFlow Embedding 封装
│   │   ├── llm.ts            # DeepSeek API 封装
│   │   ├── rag.ts            # RAG 检索逻辑
│   │   ├── parser.ts         # 文件解析（PDF/Word/JSON）
│   │   ├── queue.ts          # BullMQ 队列
│   │   └── captcha.ts         # 图形验证码生成/校验
│   ├── components/
│   │   ├── ui/               # shadcn/ui 组件
│   │   ├── ChatBox.tsx       # 问答对话组件
│   │   ├── LawTree.tsx       # 法规树导航
│   │   ├── LawSearch.tsx     # 法条搜索
│   │   └── ImportPanel.tsx   # 导入管理面板
│   └── middleware.ts         # Next.js 中间件（认证+权限）
└── uploads/                  # 上传文件存储
```

---

## 10. 待确认事项

- [x] 认证方式：账号 + 密码 + 图形验证码
- [x] 对话历史记录功能：已确认需要
- [x] 后台审核 AI 回答质量：不需要
- [ ] 初始管理员账号