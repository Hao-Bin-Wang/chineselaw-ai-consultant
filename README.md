# ⚖️ 法治智能问答系统

> **AI 驱动的法律咨询与法条检索平台** — 用大白话问法律问题，AI 即时解答并精准引用法条。

![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+pgvector-4169E1?logo=postgresql)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 目录

- [产品概述](#-产品概述)
- [系统架构](#-系统架构)
- [核心功能](#-核心功能)
- [技术栈详解](#-技术栈详解)
- [快速启动](#-快速启动)
- [API 文档](#-api-文档)
- [项目结构](#-项目结构)
- [开发指南](#-开发指南)
- [测试](#-测试)
- [部署](#-部署)
- [License](#-license)

---

## 🎯 产品概述

法治智能问答系统是一个面向普通群众的 AI 法律咨询平台。用户可以用自然语言提问法律问题（如"老板拖欠工资怎么办？"），系统通过 RAG（检索增强生成）技术，从内置的法律法规库中检索相关法条，再由大语言模型生成通俗易懂的回答，并附上精确的法条引用。

**目标用户**：需要法律帮助但缺乏专业法律知识的普通群众。

**核心价值**：
- 🕐 **即时响应** — 7×24 小时在线，秒级回答
- 📖 **有据可依** — 每一条回答都引用具体法条
- 🗣️ **通俗易懂** — 用大白话解释法律条款
- 🔒 **隐私安全** — 对话数据加密存储

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │   Chat   │  │   Laws   │  │  Admin   │  │  Login  │ │
│  │  页面     │  │  检索页   │  │  管理页   │  │  登录页  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │              │              │              │      │
├───────┴──────────────┴──────────────┴──────────────┴──────┤
│                  API Layer (Next.js Route Handlers)        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ /api/chat│  │/api/laws │  │/api/admin│  │/api/auth │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
├───────┴──────────────┴──────────────┴──────────────┴──────┤
│                    Service Layer                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ RAG Engine│  │Embedding │  │  LLM     │  │  Auth    │  │
│  │ (检索+生成)│  │ (向量化)  │  │ (对话)   │  │ (认证)   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
├───────┴──────────────┴──────────────┴──────────────┴──────┤
│                    Data Layer                              │
│  ┌──────────────────┐  ┌────────────┐  ┌───────────────┐  │
│  │  PostgreSQL +    │  │   Redis    │  │   ARK API     │  │
│  │  pgvector (2048d)│  │ (缓存/队列) │  │ (LLM+Embed)   │  │
│  └──────────────────┘  └────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### RAG 检索流程

```
用户提问
  → 调用 Embedding API 向量化问题文本 (doubao-embedding-vision, 2048维)
  → pgvector 余弦相似度检索 Top 10 相关法条
  → 取 Top 5 拼接 System Prompt
  → 调用 DeepSeek V4 Flash 生成回答
  → 解析引用 → 存入 ChatHistory
  → 返回 { answer, citations: [...] }
```

---

## ✨ 核心功能

### 💬 智能问答（`/chat`）
- 自然语言法律问题输入
- **流式输出** — 逐 token 实时显示，用户可见 AI"思考"过程
- 法条引用卡片 — 每条回答附精确法条引用，可点击跳转原文
- 历史对话持久化 — 刷新页面不丢失，支持浏览/删除历史
- 快捷问题模板

### 📚 法条检索（`/laws`）
- **双模式检索**：法规检索 + 条文检索
- **多维筛选**：类型（法律/行政法规/司法解释/部门规章）+ 效力状态 + 发布机构 + 日期范围
- **关键词高亮** — 匹配关键词自动高亮显示
- **收藏系统** — 自定义收藏夹，收藏/管理重要法条

### ⚙️ 知识库管理（`/admin`，仅管理员）
- 上传 PDF/Word/JSON 法律文件
- 异步导入队列（BullMQ）
- 导入进度实时追踪
- 自动条文拆分 + 向量化

### 🔐 认证系统
- 账号 + 密码 + 图形验证码
- JWT（7天过期，httpOnly Cookie）
- 角色权限控制（user / admin）

---

## 🛠️ 技术栈详解

| 层 | 技术 | 版本 | 说明 |
|----|------|:----:|------|
| **全栈框架** | Next.js | 14.2.35 | App Router, TypeScript |
| **UI 框架** | React | 18 | 客户端组件 + 服务端组件 |
| **样式** | Tailwind CSS | 3.4 | CSS 变量主题系统 |
| **字体** | JetBrains Mono + Noto Serif SC | - | 等宽终端风格 + 中文衬线 |
| **数据库** | PostgreSQL + pgvector | 16 | 结构化数据 + 2048维向量检索 |
| **ORM** | Prisma | 5.22 | 类型安全，pgvector 原生支持 |
| **缓存** | Redis | 7 | 验证码存储、BullMQ 队列 |
| **任务队列** | BullMQ | - | 异步法条导入 |
| **LLM** | DeepSeek V4 Flash | - | 对话生成（经由 ARK 中转站） |
| **Embedding** | doubao-embedding-vision | - | 2048维向量化（经由 ARK 中转站） |
| **认证** | jose + bcryptjs | - | JWT + 密码哈希 |
| **验证码** | 自研 SVG 路径绘制 | - | 不依赖外部字体 |
| **测试** | Vitest | 4 | 单元测试 |

---

## 🚀 快速启动

### 前置条件

- **Docker Desktop**（用于运行 PostgreSQL + Redis）
- **Node.js** >= 18
- **npm** >= 9

### 第 1 步：克隆并安装

```bash
git clone https://github.com/Hao-Bin-Wang/chineselaw-ai-consultant.git
cd chineselaw-ai-consultant
npm install
```

### 第 2 步：启动数据库

```bash
docker compose up -d
```

> 启动 PostgreSQL（含 pgvector 插件）+ Redis。

### 第 3 步：配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API Key：

| 变量 | 说明 | 获取方式 |
|------|------|----------|
| `DATABASE_URL` | PostgreSQL 连接串 | 用 docker compose 时保持默认即可 |
| `REDIS_URL` | Redis 连接串 | 用 docker compose 时保持默认即可 |
| `ARK_API_KEY` | ARK 中转站统一 API Key | 联系管理员 |
| `ARK_BASE_URL` | ARK 中转站地址 | 默认 `https://ark.cn-beijing.volces.com/api/plan` |
| `JWT_SECRET` | JWT 签名密钥 | 生产环境请换成长随机串 |

> ⚠️ `.env` 已被 `.gitignore` 忽略，切勿提交。所有脚本（`vectorize.ts`、`e2e-test.ts`）均通过 `dotenv` 从 `.env` 读取配置，不含任何硬编码密钥。

### 第 4 步：初始化数据库

```bash
npx prisma migrate dev
npx prisma db seed
```

> 默认创建两个账号：`admin / admin123`（管理员）、`user / user123`（普通用户）

### 第 5 步：导入法律数据

```bash
# 从 law-data/ 导入文本法条到数据库
npx tsx scripts/import-laws.ts

# 向量化（为 RAG 检索提供语义搜索能力，约需 5-10 分钟）
npx tsx scripts/vectorize.ts
```

> `vectorize.ts` 默认只处理 5 部核心法律（民法典、劳动合同法、劳动法、刑法、民事诉讼法），覆盖日常法律咨询 80%+ 场景。如需全量向量化，可修改脚本。

### 第 6 步：启动开发服务器

```bash
npm run dev
```

打开 **http://localhost:3000** 🎉

---

## 📖 API 文档

所有 API 统一返回 `{ success: boolean, data?: any, error?: string }` 格式。

### 认证

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/auth/captcha` | 获取图形验证码（返回 SVG + token） |
| POST | `/api/auth/register` | 注册 `{ username, password, captchaToken, captchaCode }` |
| POST | `/api/auth/login` | 登录 `{ username, password, captchaToken, captchaCode }` |
| GET | `/api/auth/me` | 获取当前用户信息 |

### 对话

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/chat` | 发送问题 `{ question, stream? }`，支持流式 SSE 响应 |
| GET | `/api/chat/history` | 获取历史对话列表 |
| DELETE | `/api/chat/history` | 清空所有历史对话 |
| DELETE | `/api/chat/history/[id]` | 删除单条对话记录 |

### 法条

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/laws?search=&type=&status=&publisher=&dateFrom=&dateTo=&mode=` | 检索法条/法规 |
| GET | `/api/laws/[id]` | 获取法规详情（含所有条文） |

### 收藏

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/collections` | 获取用户收藏夹列表 |
| POST | `/api/collections` | 创建收藏夹 `{ name }` |
| GET | `/api/collections/[id]` | 获取收藏夹详情 |
| DELETE | `/api/collections/[id]` | 删除收藏夹 |
| POST | `/api/collections/[id]/items` | 添加条文 `{ articleId }` |
| DELETE | `/api/collections/[id]/items?itemId=` | 移除条文 |

### 管理（仅 admin）

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/admin/import` | 上传法律文件（multipart/form-data） |
| GET | `/api/admin/import/status` | 查看导入任务列表 |

---

## 📁 项目结构

```
chineselaw-ai-consultant/
├── .env.example              # 环境变量模板
├── docker-compose.yml        # PostgreSQL + Redis
├── prisma/
│   ├── schema.prisma         # 数据库模型（5 个表）
│   └── seed.ts               # 初始账号种子
├── law-data/                 # 11 部法律文本（.txt）
│   ├── 中华人民共和国民法典.txt
│   ├── 中华人民共和国劳动合同法.txt
│   ├── 中华人民共和国刑法.txt
│   └── ...
├── scripts/
│   ├── import-laws.ts        # 法条导入
│   ├── vectorize.ts          # MVP 向量化（5 部核心法律）
│   ├── download-laws.ts      # 在线下载法律数据
│   └── e2e-test.ts           # 全链路测试
├── src/
│   ├── app/
│   │   ├── layout.tsx        # 根布局（字体 + 导航）
│   │   ├── page.tsx          # 首页 → /chat 重定向
│   │   ├── globals.css       # 全局主题（CRT 终端风格）
│   │   ├── login/            # 登录/注册
│   │   ├── chat/             # 智能问答
│   │   ├── laws/             # 法条检索
│   │   ├── admin/            # 知识库管理
│   │   └── api/              # API 路由
│   │       ├── auth/         # 认证
│   │       ├── chat/         # 对话
│   │       ├── laws/         # 法条
│   │       └── collections/  # 收藏
│   ├── lib/
│   │   ├── auth.ts           # JWT 认证工具
│   │   ├── db.ts             # Prisma 单例
│   │   ├── llm.ts            # DeepSeek LLM 封装（流式 + 非流式）
│   │   ├── embedding.ts      # 向量化封装
│   │   ├── rag.ts            # RAG 检索 + 生成（非流式 + 流式）
│   │   ├── parser.ts         # PDF/Word/JSON 文件解析
│   │   ├── queue.ts          # BullMQ 导入队列
│   │   ├── captcha.ts        # 图形验证码
│   │   ├── constants.ts      # 常量
│   │   └── utils.ts          # 工具函数（cn, highlightKeywords）
│   └── components/
│       ├── ui/               # 原子组件（Button/Card/Skeleton）
│       ├── Navbar.tsx        # 导航栏
│       ├── ChatBox.tsx       # 对话组件
│       ├── HistoryPanel.tsx  # 历史面板
│       └── AnimatedBackground.tsx  # CRT 扫描线背景
└── uploads/                  # 上传文件临时存储
```

---

## 🧪 测试

```bash
# 单元测试
npm test

# 全链路测试（需要数据库 + API Key）
npx tsx scripts/e2e-test.ts
```

---

## 📦 部署

### Docker 部署（推荐）

```bash
# 构建生产镜像
npm run build

# 启动
docker compose -f docker-compose.prod.yml up -d
```

### Vercel 部署

本项目可部署到 Vercel，但需要注意：

1. PostgreSQL + Redis 需要使用云服务（如 Supabase、Upstash）
2. 文件上传功能需要额外配置（Vercel 无本地文件系统）
3. BullMQ 队列需要独立的 Node.js Worker 进程

---

## 📄 License

MIT

---

## 👨‍💻 开发团队

- **Wang Haobin** — 全栈开发

---

*法治智能问答系统 — 让法律咨询触手可及。*
