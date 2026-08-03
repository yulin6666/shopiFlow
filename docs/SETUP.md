# ShopiFow — 搭建文档

> AI 驱动的 Shopify 电商自动化 Demo | n8n + OpenRouter + Next.js

---

## 项目结构

```
shopiFlow/
├── apps/
│   └── frontend/          # Next.js 14 前端（主应用）
│       ├── src/
│       │   ├── app/        # App Router 页面 + API Routes
│       │   │   ├── page.tsx              # Dashboard
│       │   │   ├── support/page.tsx      # AI 客服中心
│       │   │   ├── reviews/page.tsx      # Review 管理
│       │   │   └── api/
│       │   │       ├── shopify/orders/   # Shopify 订单 API
│       │   │       ├── shopify/products/ # Shopify 产品 API
│       │   │       ├── ai/support/       # AI 客服流式接口
│       │   │       └── ai/review/        # AI Review 回复流式接口
│       │   ├── components/ # UI 组件
│       │   ├── lib/        # 工具函数、Shopify client、prompts
│       │   └── types/      # TypeScript 类型定义
├── n8n/
│   └── workflows/          # n8n workflow JSON（可直接导入）
│       ├── support-ticket-handler.json
│       └── review-reply-generator.json
├── docker-compose.yml      # n8n + PostgreSQL Docker 配置
├── setup.sh                # 一键部署脚本
├── railway.json            # Railway 部署配置
└── .env.example            # 环境变量模板
```

---

## 快速开始（本地）

### 前置条件

| 工具 | 版本要求 | 安装 |
|------|---------|------|
| Node.js | >= 18 | https://nodejs.org |
| Docker Desktop | 最新版 | https://www.docker.com |

### 一键启动

```bash
# 克隆项目
cd /path/to/shopiFlow

# 给脚本加执行权限
chmod +x setup.sh

# 一键启动（会自动检查依赖、配置环境、启动 Docker、安装依赖）
./setup.sh
```

脚本完成后：

```bash
# 启动前端开发服务器
cd apps/frontend && npm run dev
```

访问 http://localhost:3000

---

## 环境变量配置

`.env` 文件（`setup.sh` 会自动从 `.env.example` 创建）：

```bash
# OpenRouter API（支持 Claude 等模型）
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx

# Shopify Development Store
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxx

# n8n（可选，用于 webhook 触发）
N8N_WEBHOOK_BASE_URL=http://localhost:5678

# PostgreSQL（Docker 内部使用，默认值即可）
POSTGRES_USER=shopiflow
POSTGRES_PASSWORD=shopiflow123
POSTGRES_DB=shopiflow
```

### 如何获取 Shopify Access Token

1. 进入 Shopify Development Store 后台
2. **Settings → Apps and sales channels → Develop apps**
3. **Create an app** → 填写名称（如 ShopiFow Demo）
4. **Configure Admin API scopes** → 勾选：
   - `read_orders`
   - `read_products`
5. **Install app** → 复制 Admin API Access Token

### 如何获取 OpenRouter API Key

1. 注册 https://openrouter.ai
2. 进入 **Keys** → **Create Key**
3. 复制填入 `OPENROUTER_API_KEY`
4. 默认使用 `anthropic/claude-sonnet-4-6` 模型

---

## Docker 服务

`docker-compose.yml` 启动两个服务：

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5433 | n8n 的数据库（pgvector 镜像） |
| n8n | 5678 | Workflow 自动化平台 |

常用命令：

```bash
# 启动
docker compose up -d

# 查看状态
docker compose ps

# 查看日志
docker compose logs n8n -f

# 停止
docker compose down

# 停止并删除数据
docker compose down -v
```

---

## n8n Workflows 导入

1. 打开 http://localhost:5678
2. 首次进入需要创建账号（本地 demo 填任意邮箱/密码即可）
3. 进入 **Workflows → Import from File**
4. 分别导入：
   - `n8n/workflows/support-ticket-handler.json`
   - `n8n/workflows/review-reply-generator.json`
5. 在每个 workflow 中配置 **OpenRouter HTTP Header Credential**：
   - Header Name: `Authorization`
   - Header Value: `Bearer YOUR_OPENROUTER_API_KEY`

### Workflow 说明

**support-ticket-handler**
```
Webhook (POST /shopiflow-support)
  → 拉取 Shopify 订单详情
  → 调用 OpenRouter AI 生成回复
  → 解析回复 + 分类（退款/物流/咨询/需人工）
  → 置信度 < 70% → 标记人工处理
  → 返回 JSON 响应
```

**review-reply-generator**
```
Webhook (POST /shopiflow-review)
  → 分类 Review 情感和优先级
  → 调用 OpenRouter AI 生成品牌回复
  → 差评 → 高优先级标记 + 特殊处理
  → 返回 JSON 响应
```

---

## Railway 部署

1. 在 Railway 创建新项目，连接 GitHub 仓库
2. 添加环境变量（Settings → Variables）：
   - `OPENROUTER_API_KEY`
   - `SHOPIFY_STORE_DOMAIN`
   - `SHOPIFY_ACCESS_TOKEN`
3. Railway 会自动识别 `railway.json` 并使用正确的 build/start 命令
4. n8n 和 PostgreSQL 在本地 Docker 运行，Railway 只部署 Next.js 前端

> **注意**：Railway 部署后 n8n webhook 需要换成公网地址。可在 Railway 上单独部署 n8n 服务。

---

## 技术架构

```
用户浏览器
    │
    ▼
Next.js 14 (App Router)           ← Railway / localhost:3000
    │
    ├── /api/shopify/orders        ← 服务端：调用 Shopify Admin API
    ├── /api/shopify/products      ← 服务端：调用 Shopify Admin API
    ├── /api/ai/support            ← 服务端：流式调用 OpenRouter API
    └── /api/ai/review             ← 服务端：流式调用 OpenRouter API

Shopify Admin API                  ← 真实订单/产品数据
OpenRouter API (Claude)            ← AI 回复生成
n8n (Docker)                       ← Workflow 自动化（可选触发器）
PostgreSQL (Docker)                ← n8n 数据存储
```

---

## Demo 演示路径（8 分钟）

1. **Dashboard**：展示真实 Shopify 订单数据、KPI 指标、7 天趋势图
2. **AI 客服**：
   - 点击一个"未发货"类 ticket → 看到关联真实订单
   - 点击「Generate AI Reply」→ 流式输出回复
   - 查看分类标签（退款/物流/咨询）+ 置信度
   - 点击「How it works」→ 展示 System Prompt 和 n8n 触发逻辑
3. **Review 管理**：
   - 点击 1 星差评 → AI 生成高优先级道歉回复
   - 对比 5 星好评回复 → 展示语气差异
   - 点击「How it works」→ 展示 Review 处理流程

---

## 常见问题

**Q: Shopify 数据为空**
检查 `.env` 中 `SHOPIFY_STORE_DOMAIN` 和 `SHOPIFY_ACCESS_TOKEN` 是否正确，且 Development Store 有真实订单。

**Q: AI 回复失败**
检查 `OPENROUTER_API_KEY` 是否有效，以及 OpenRouter 账户余额。

**Q: Docker 启动失败**
确保 Docker Desktop 已启动，端口 5678 和 5433 未被占用：
```bash
lsof -i :5678
lsof -i :5433
```

**Q: n8n workflow 导入后 HTTP credentials 报错**
在 n8n → Credentials → New → HTTP Header Auth 中创建：
- Name: `OpenRouter`
- Header Name: `Authorization`
- Header Value: `Bearer sk-or-v1-xxxxx`
