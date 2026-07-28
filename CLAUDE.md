# 法治智能问答系统 — 项目 CLAUDE.md

## 技术栈

- **框架**: Next.js 14 (App Router, TypeScript)
- **数据库**: PostgreSQL + pgvector + Prisma 5
- **缓存**: Redis (ioredis)
- **AI**: DeepSeek V4 Flash (对话) + doubao-embedding-vision (向量化, Volcengine Ark)
- **认证**: JWT (jose) + bcryptjs + 自研 SVG 验证码
- **UI**: Tailwind CSS
- **测试**: Vitest

## 关键命令

```bash
npm run dev        # 启动开发服务器
npm test           # 运行单元测试
npm run build      # 构建
npx prisma migrate dev --name <name>  # 数据库迁移
npx tsx scripts/e2e-test.ts           # 端到端测试
```

## 架构约束

### 数据库
- Prisma 列名使用 **camelCase**（如 `legislationId`, `articleNumber`）
- 原生 SQL 中必须双引号引用：`a."articleNumber"`
- pgvector 类型声明为 `Unsupported("vector(2048)")`
- 向量维度：**2048**（doubao-embedding-vision）

### 认证
- 中间件白名单：`/login`, `/api/auth` 前缀
- 管理员路径：`/admin`, `/api/admin` 仅 `role=admin`
- JWT 7天过期，存储在 httpOnly Cookie
- 验证码字符池：`23456789ABCDEFGHJKMNPQRSTUVWXYZ`（排除 0/O/1/I/L）

### 核心模块
- `generateCaptcha()` 是 **async** 函数，调用处必须 `await`
- `src/lib/captcha.ts` 使用自研 SVG 路径绘制，不依赖外部字体
- `src/lib/rag.ts` 走向量检索 → 关键词兜底 → LLM 生成
- `src/lib/embedding.ts` 使用 Volcengine Ark API
- `src/lib/llm.ts` 使用 DeepSeek API

### 环境变量
- 必须的 API Key：`DEEPSEEK_API_KEY`, `VOLCENGINE_API_KEY`
- `DEEPSEEK_BASE_URL` 默认 `https://api.deepseek.com`
- `VOLCENGINE_BASE_URL` 默认 `https://ark.cn-beijing.volces.com/api/plan/v3`

## 已排除的不可行方案
- `svg-captcha` npm 包（opentype.js 字体路径在 Next.js webpack 中 ENOENT）
- SiliconFlow Qwen3-VL-Embedding-8B（已切换为 doubao-embedding-vision）
- 原始 bge-large-zh-v1.5 1024 维向量（已迁移到 2048 维）
