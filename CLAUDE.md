# 法治智能问答系统（chineselaw-ai-consultant）

> 项目根级 CLAUDE.md。在此项目目录内启动 Claude Code 时自动加载，固化项目进度，避免换对话丢失上下文。
> 全局行为准则见 `~/.claude/CLAUDE.md`，本文件只放项目专属信息。

## 技术栈
- Next.js 14.2 (App Router) + React 18 + TypeScript
- Prisma 5 + PostgreSQL/pgvector（`Article.embedding = vector(2048)`）
- Redis + BullMQ（法条导入异步队列）
- DeepSeek V4 Flash（对话）+ 豆包 embedding 2048 维（向量化）— 统一经由 ARK 中转站
- Tailwind 3.4（CSS 变量主题，见 `src/app/globals.css`）+ Vitest 4

## 常用命令
```bash
docker compose up -d          # 启动 PostgreSQL + Redis
npm run dev                   # 开发服务器 http://localhost:3000
npm test                      # vitest 单元测试
npx prisma migrate dev        # 数据库迁移
npx prisma studio             # 可视化数据库
npx tsx scripts/import-laws.ts   # 导入 law-data/ 法条
npx tsx scripts/vectorize.ts     # 向量化（跑一次，几分钟）
npx tsx scripts/e2e-test.ts      # 全链路测试（需 DB + API Key）
```

## 架构约定
- **数据模型**：`Legislation` 1->N `Article`；Article 含 chapter/section/articleNumber/content/embedding。按"条"切片，勿改 embedding 维度（2048 与豆包模型绑定）。
- **RAG 链路**：`parser.ts`(PDF/Word解析) -> `embedding.ts`(向量化) -> `rag.ts`(检索) -> `llm.ts`(对话)
- **异步导入**：BullMQ(`queue.ts`) + `ImportTask` 状态机 pending/parsing/chunking/embedding/done/failed
- **认证**：`jose`(JWT) + `bcryptjs`，`middleware.ts` 守卫路由
- **前端组件**：基础 UI 组件位于 `src/components/ui/`（Button/Card/Skeleton），基于 Tailwind + CSS 变量，新增组件遵循同风格
- **主题**：暗色为默认（`:root`），亮色随系统（`prefers-color-scheme: light`）；颜色一律用 `var(--xxx)`，勿硬编码

## 页面与 API
| 路径 | 用途 |
|------|------|
| `/login` | 登录/注册 |
| `/chat` | AI 法律问答（登录） |
| `/laws` `/laws/[id]` | 法条检索与条文详情 |
| `/admin` | 管理员导入法律文件 |
| `/api/chat` `/api/chat/history` | 对话接口 |
| `/api/laws` `/api/laws/[id]` | 法条接口 |
| `/api/admin/import` | 导入任务 |
| `/api/auth/*` | 登录/注册/验证码/me |

## 当前进度
- 进行中：前端多巴胺风格大改造（动画/渐变/视觉冲击）
- 已完成：API 统一迁移（DeepSeek + Volcengine → 单一 ARK 中转站），认证系统，智能问答（RAG），法条检索，管理员导入，11 部法律文本已入库
- 下一步：跑通向量化（npx tsx scripts/vectorize.ts），启动开发服务器验证全链路

## 禁忌
- 不要把 `.env` 提交进 git（已在 .gitignore）
- 不要改 `prisma/schema.prisma` 的 embedding 维度
- 前端颜色不要硬编码，统一用 `globals.css` 的 CSS 变量
- `JWT_SECRET` 生产前必须换成长随机串
