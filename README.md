# ⚖️ 法治智能问答系统

AI 驱动的法律咨询与法条检索平台。用大白话问法律问题，AI 给你解答并告诉你引用了哪条法律。

---

## 技术栈

Next.js 14 + PostgreSQL/pgvector + Prisma + Redis + DeepSeek V4 Flash + doubao-embedding-vision + Tailwind CSS

---

## 🚀 启动方式一：你（本项目开发者）

你电脑上已经有全部环境和数据了，只需要：

```bash
# 1. 确保 Docker 在运行（PostgreSQL + Redis）
docker compose up -d

# 2. 启动开发服务器
npm run dev
```

打开 http://localhost:3000

> ⚠️ **第一次启动会很慢（10-30 秒）**，因为 Next.js 要编译所有文件。之后改代码再刷新就很快了。服务器开着别关，关了就没了。

---

## 🚀 启动方式二：别人从 GitHub 克隆你的项目

别人克隆下来后，按以下步骤操作：

### 第 1 步：克隆项目

```bash
git clone https://github.com/Hao-Bin-Wang/chineselaw-ai-consultant.git
cd chineselaw-ai-consultant
```

### 第 2 步：安装依赖

```bash
npm install
```

### 第 3 步：启动数据库和 Redis（需要先安装 Docker）

```bash
docker compose up -d
```

> 如果没有 Docker，需要自己装 PostgreSQL（要开 pgvector 插件）和 Redis，或者用云服务。

### 第 4 步：配置环境变量

```bash
cp .env.example .env
```

打开 `.env` 文件，填上你自己的 API Key：

- **DEEPSEEK_API_KEY** — 去 https://platform.deepseek.com 注册拿 key
- **VOLCENGINE_API_KEY** — 去 https://console.volcengine.com/ark 注册拿 key
- 其他项一般不用改

### 第 5 步：初始化数据库

```bash
npx prisma migrate dev --name init
```

### 第 6 步：导入法律数据

```bash
# 下载法规数据（从网络获取）
npx tsx scripts/download-laws.ts

# 导入到数据库
npx tsx scripts/import-laws.ts

# 向量化（这样才能让 AI 搜索法条，跑一次就行，大概几分钟）
npx tsx scripts/vectorize.ts
```

### 第 7 步：启动！

```bash
npm run dev
```

打开 http://localhost:3000

---

## 页面说明

| 页面 | 干嘛的 | 谁能用 |
|------|--------|--------|
| `/login` | 登录/注册 | 所有人 |
| `/chat` | 问法律问题 | 登录用户 |
| `/laws` | 搜法条 | 登录用户 |
| `/admin` | 管理员后台（导入法律文件） | 管理员 |

## 测试

```bash
# 单元测试
npm test

# 全链路测试（数据库和 API Key 都要有）
npx tsx scripts/e2e-test.ts
```

---

## 项目结构（大概看下就行）

```
src/                  # 主要代码
  app/                # 页面 + API 路由
  lib/                # 核心逻辑（AI、认证、验证码等）
  components/         # 页面组件
scripts/              # 工具脚本（下载数据、导入、测试等）
prisma/               # 数据库定义
```

## License

MIT
