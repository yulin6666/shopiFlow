# ShopiFow — 部署文档

## 快速开始（本地，一键部署）

```bash
cd /Users/lindediannao/Documents/project/shopiFlow
chmod +x setup.sh
./setup.sh
# 按提示编辑 .env，填入 API keys
npm run dev
```

打开浏览器：
- 前端 → http://localhost:3000
- n8n  → http://localhost:5678

---

## 前置条件

| 依赖 | 版本 | 安装方式 |
|------|------|---------|
| Node.js | >= 18 | `brew install node` 或 [nodejs.org](https://nodejs.org) |
| Docker Desktop | 最新版 | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |
| n8n starter kit | 已启动 | 路径: `/Users/lindediannao/Documents/project/n8n/self-hosted-ai-starter-kit` |

> setup.sh 会自动检测并启动 Docker 服务，无需手动操作。

---

## 架构总览

```
真实生产流程（客服）:
  Shopify/TikTok/Amazon 客户消息 → Gorgias → Webhook → n8n AI 分类
                                                           ├─ 自动回复 (70-80%)
                                                           ├─ 起草+审核 (低风险)
                                                           └─ 人工接管 (高风险)

真实生产流程（评论）:
  Judge.me 评论 → Gorgias → Webhook → n8n AI 生成回复 → 返回

Demo 简化流程:
  前端模拟消息 → Next.js API → n8n webhook（或直连 OpenRouter）→ 前端显示
```

Browser (localhost:3000)
  └── Next.js 14 App Router
        ├── /              Dashboard — KPI + 趋势图 + 近期订单
        ├── /support       客服工单 — Demo Chat 或 Gorgias 真实 tickets
        ├── /reviews       评论回复 — Judge.me 真实数据或 mock
        └── /automation    n8n 工作流可视化 + 模拟触发

        API Routes (服务端，隐藏所有 API Keys)
        ├── POST /api/ai/support      → n8n webhook（降级: 直连 OpenRouter）
        ├── POST /api/ai/review       → n8n webhook（降级: 直连 OpenRouter）
        ├── GET  /api/reviews         → Judge.me API（降级: mock 数据）
        ├── GET  /api/gorgias/tickets → Gorgias open tickets
        ├── GET  /api/gorgias/reply   → 获取 ticket 消息
        ├── POST /api/gorgias/reply   → 通过 Gorgias 发送回复
        ├── GET  /api/shopify/orders
        └── GET  /api/shopify/products

n8n (localhost:5678) — 复用 self-hosted-ai-starter-kit Docker
  ├── support-ticket-handler.json  Gorgias webhook: AI 3级分类（auto/draft/escalate）
  └── review-reply-generator.json  Gorgias webhook: AI 生成评论回复

PostgreSQL (port 5433) — 复用 starter kit postgres 容器
  └── shopiflow_db.ai_processing_log（可选，n8n 执行日志）

外部服务
  ├── OpenRouter  Claude 模型调用
  ├── Judge.me    Shopify 评论数据（可选）
  └── Gorgias     多平台客服工单（可选）

**注意：**
- Demo 不需要 Pinecone（原设计的 RAG 查询订单功能已移除，订单信息直接来自 Gorgias ticket meta）
- 不需要同步 Shopify 订单到向量数据库
- Gorgias webhook 是真实生产架构，Demo 里前端直接调 n8n webhook 测试
```

---

## 第一步：获取 API Keys

### 1. OpenRouter（必填）

用于调用 Claude 模型。

1. 访问 [openrouter.ai](https://openrouter.ai) → **Sign up**（邮箱注册，免费）
2. 登录后进 **Keys** → **Create key**
3. 复制 key（格式：`sk-or-v1-xxx`）
4. 填入 `.env`：`OPENROUTER_API_KEY=sk-or-v1-xxx`

> 新账户有免费额度，Claude Sonnet 约 $3/1M tokens，Demo 用量极低。

---

### 2. Shopify Admin API（选填）

用于 Dashboard 显示真实订单数据。不填则显示 mock 数据。

1. 进 Shopify Admin（`your-store.myshopify.com/admin`）
2. **Settings → Apps and sales channels → Develop apps**
3. 点 **Create an app** → 输入名称（如 `ShopiFow`）
4. 进入 app → **Configuration → Admin API integration → Configure**
5. 勾选 scope：`read_orders`、`read_products` → **Save**
6. 回到 app 页 → **Install app** → **Install**
7. 复制 **Admin API access token**（只显示一次，注意保存）
8. 填入 `.env`：
   ```
   SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=shpat_xxx
   ```

---

### 3. Judge.me（选填）

用于评论页显示 Shopify 店铺的真实评论。不填则显示 8 条 mock 评论。

**前提：Shopify 店铺需要先安装 Judge.me App。**

1. 进 Shopify App Store 搜索 **Judge.me Product Reviews** → 安装（有永久免费套餐）
2. 安装完成后进 Judge.me 后台（`judge.me/admin`）
3. 左下角 **Settings → General → API token** → 复制 token
4. 填入 `.env`：
   ```
   JUDGE_ME_API_TOKEN=your-token
   JUDGE_ME_SHOP_DOMAIN=your-store.myshopify.com
   ```

> Judge.me 的 API token 是只读的，安全风险低。

---

### 4. Gorgias（选填）

用于客服页的 **Live Tickets** 标签，显示并处理真实工单。不填则只有 Demo Chat 模式。

**注册：**

1. 访问 [gorgias.com](https://www.gorgias.com) → **Start free trial**
   - 10 天免费，不需要信用卡
   - 注册时填写公司名（随意），选 Shopify 作为主平台
2. 注册完成后，进 **Integrations → Shopify** → 连接你的 Shopify 店铺（授权）
3. 可选：**Integrations → Amazon / TikTok** → 按提示连接其他平台

**获取 API Key：**

1. 进 Gorgias 后台 → 左侧 **Settings → REST API**
2. 点 **New API key** → 输入名称（如 `ShopiFow`）→ **Create**
3. 复制 API key（只显示一次）
4. 记下你的 Gorgias 子域名（注册时选择，格式：`your-account.gorgias.com`）
5. 填入 `.env`：
   ```
   GORGIAS_BASE_URL=https://your-account.gorgias.com/api
   GORGIAS_EMAIL=your@email.com
   GORGIAS_API_KEY=your-api-key
   ```

---

## 第二步：配置 .env

`setup.sh` 会自动从 `.env.example` 复制生成 `.env`，填入你的真实值：

```bash
# 必填
OPENROUTER_API_KEY=sk-or-v1-xxx

# 选填（Shopify 订单数据）
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxx

# 选填（真实评论数据）
JUDGE_ME_API_TOKEN=xxx
JUDGE_ME_SHOP_DOMAIN=your-store.myshopify.com

# 选填（真实客服工单）
GORGIAS_BASE_URL=https://your-account.gorgias.com/api
GORGIAS_EMAIL=your@email.com
GORGIAS_API_KEY=xxx

# n8n webhook（本地默认不用改）
N8N_WEBHOOK_BASE_URL=http://localhost:5678/webhook
```

---

## 第三步：n8n 工作流配置

### 3.1 导入工作流

1. 打开 http://localhost:5678（账号密码见 starter kit 的 `.env`）
2. 左侧 **Workflows** → 右上角 **⋮** → **Import from file**
3. 依次导入：
   - `n8n/workflows/support-ticket-handler.json`
   - `n8n/workflows/review-reply-generator.json`
4. 每个工作流导入后，右上角 **Toggle** 切换为 **Active**

### 3.2 配置 Credentials

进 n8n → **Settings → Credentials → New**，只需创建 1 个：

#### OpenRouter（用于 Claude 对话）

```
Type:            OpenAI API（选这个，兼容格式）
Name:            OpenRouter (OpenAI-compatible)
Base URL:        https://openrouter.ai/api/v1
API Key:         <你的 OPENROUTER_API_KEY>
```

然后在两个 workflow 的 AI 节点里选择这个 credential。

**可选：Gorgias HTTP Basic Auth**（如果要测试真实 Gorgias webhook 自动回复）

```
Type:            HTTP Basic Auth
Name:            Gorgias API
Username:        <你的 GORGIAS_EMAIL>
Password:        <你的 GORGIAS_API_KEY>
```

---

## Demo 演示脚本

### 页面 1：Dashboard

展示自动化处理效果：
- 今日已自动处理 42 个工单，节省 3.5 小时
- 14 天订单趋势图
- 近期订单列表（真实 Shopify 数据 或 mock）

### 页面 2：Support Chat

**Demo Chat 标签（无需配置即可演示）：**

| 点击哪条 demo | 来源 | 预期结果 |
|-------------|------|---------|
| "Where is my order #5678?" | Shopify | AI 查 Pinecone → 自动回复 |
| "I had a bad reaction..." | Amazon | 高风险 → Escalate，不回复 |
| "I'd like a refund..." | TikTok | AI 起草 → 等待人工确认 |

**Live Tickets 标签（需配置 Gorgias）：**
- 列出 Gorgias 所有 open tickets
- 点 "Classify with AI →" 触发分类
- AUTO/DRAFT 票据可直接编辑并通过 Gorgias 发送回复

### 页面 3：Reviews

- 配置 Judge.me 后显示真实评论，否则显示 8 条 mock 评论
- 支持 5 种语言回复（English / 中文 / Español / 日本語 / Deutsch）
- 单条生成或批量 "Generate All"

### 页面 4：Automation

- 3 个工作流可视化，点 "Simulate Run" 触发步骤动画
- 展示运行统计（总次数 / 成功率 / 平均耗时）

---

## Railway 部署

### 部署前端

1. 在 Railway 创建新 Project → **Deploy from GitHub repo**
2. 选择 `shopiFlow` 仓库
3. Railway 自动读取 `railway.json` 配置
4. 在 **Variables** 面板填入所有 `.env` 变量（替换 localhost 为 Railway 服务地址）：
   ```
   OPENROUTER_API_KEY     = sk-or-v1-xxx
   SHOPIFY_STORE_DOMAIN   = your-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN   = shpat_xxx
   JUDGE_ME_API_TOKEN     = xxx
   JUDGE_ME_SHOP_DOMAIN   = your-store.myshopify.com
   GORGIAS_BASE_URL       = https://your-account.gorgias.com/api
   GORGIAS_EMAIL          = your@email.com
   GORGIAS_API_KEY        = xxx
   N8N_WEBHOOK_BASE_URL   = https://your-n8n.up.railway.app/webhook
   NEXT_PUBLIC_APP_URL    = https://your-frontend.up.railway.app
   ```

### 部署 n8n

参考 `self-hosted-ai-starter-kit` 目录下的 Railway 配置，单独部署 n8n 服务。

---

## 故障排查

### n8n webhook 返回 404

- 工作流未激活：进 n8n，右上角 Toggle → Active
- Webhook path 错误：确认为 `support-chat` 和 `review-reply`
- 前端有 OpenRouter 降级，n8n 不可用时 Demo Chat 仍正常

### Shopify 401

- `SHOPIFY_STORE_DOMAIN` 不含 `https://`，格式：`your-store.myshopify.com`
- Custom App 需要先 Install 才能使用 token

### Judge.me 数据为空

- 确认 Shopify 店铺已安装 Judge.me App
- `JUDGE_ME_SHOP_DOMAIN` 与 Shopify 域名一致

### Gorgias 连接失败

- `GORGIAS_BASE_URL` 格式：`https://your-account.gorgias.com/api`（末尾无斜杠）
- API key 对应的邮箱必须是 Gorgias 账号登录邮箱

### n8n workflow 执行失败

- 确认 OpenRouter credential 已创建并在 AI 节点里选中
- 检查 n8n 环境变量（如需访问 Gorgias，需在 docker-compose 里配 `GORGIAS_DOMAIN`）
- Demo 模式不需要 Gorgias，前端直接调 n8n webhook 测试分类逻辑

