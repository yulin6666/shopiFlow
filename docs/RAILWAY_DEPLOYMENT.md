# ShopiFow Railway 部署指南

本指南帮助你将 ShopiFow Demo 部署到 Railway，同时保持本地开发环境正常运行。

---

## 架构概述

### 本地环境
```
Next.js (localhost:3000) → n8n (localhost:5678) → PostgreSQL (localhost:5433)
                         → Pinecone (云端)
```

### Railway 生产环境
```
Next.js (Railway) → n8n (Railway Docker 已存在) → PostgreSQL (Railway 新建)
                  → Pinecone (云端)
```

---

## 前置准备

### 1. Railway 账号和项目
- 已有 Railway 账号并登录
- 已有运行中的 n8n Docker 服务（不需要重新创建）

### 2. 必需的 API Keys
- **OpenRouter API Key** (必填)：https://openrouter.ai/keys
- **Pinecone API Key** (必填)：在 n8n credentials 中配置
- Shopify Access Token (选填)
- Judge.me API Token (选填)
- Gorgias credentials (选填)

---

## 部署步骤

### Step 1: 在 Railway 创建 PostgreSQL 数据库

1. 进入你的 Railway Project
2. 点击 **+ New** → **Database** → **Add PostgreSQL**
3. 等待数据库创建完成，Railway 会自动生成 `DATABASE_URL`
4. 点击 PostgreSQL 服务 → **Data** 标签 → **Query**
5. 复制 `/database/init.sql` 的内容并执行，创建 `ai_processing_log` 表

### Step 2: 部署 Next.js 前端

#### 2.1 连接 GitHub 仓库

1. Railway Project → **+ New** → **GitHub Repo**
2. 选择 `shopiFlow` 仓库
3. Railway 会自动检测到 `railway.json` 并使用配置

#### 2.2 配置环境变量

进入 Next.js 服务 → **Variables** 标签，添加以下变量：

```bash
# ---- 必填 ----
OPENROUTER_API_KEY=sk-or-v1-xxx...

# ---- n8n Webhook（必填）----
# 填入你 Railway 上已运行的 n8n 服务地址
N8N_WEBHOOK_BASE_URL=https://your-n8n-service.up.railway.app

# ---- 数据库（自动注入）----
# Railway 会自动注入 DATABASE_URL，无需手动填
# 格式：postgresql://postgres:password@host:port/railway

# ---- App ----
NODE_ENV=production
NEXT_PUBLIC_APP_URL=${{RAILWAY_PUBLIC_DOMAIN}}

# ---- 选填（如果有真实数据源）----
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxx...
JUDGE_ME_API_TOKEN=xxx...
JUDGE_ME_SHOP_DOMAIN=your-store.myshopify.com
GORGIAS_BASE_URL=https://your-subdomain.gorgias.com/api
GORGIAS_EMAIL=your@email.com
GORGIAS_API_KEY=xxx...
```

**重要提示：**
- `N8N_WEBHOOK_BASE_URL` 必须指向你 Railway 上的 n8n 服务
- `DATABASE_URL` 会自动引用 PostgreSQL 服务，无需手动填
- `NEXT_PUBLIC_APP_URL` 使用 Railway 的内置变量自动填充

#### 2.3 触发部署

1. 保存环境变量
2. Railway 会自动触发构建和部署
3. 等待部署完成（约 3-5 分钟）

### Step 3: 配置 n8n Webhooks

进入你的 n8n 服务（Railway Docker），更新以下 workflow 中的环境变量：

#### 3.1 Pinecone 配置
所有 workflow 中的 Pinecone 节点：
- **API Key**: 在 n8n Credentials 中添加 `Pinecone API`
- **Index Name**: `shopiflow-orders`

#### 3.2 PostgreSQL 配置
在 n8n Credentials 中添加 `PostgreSQL`：
- **Host**: Railway PostgreSQL 内部 hostname（在 PostgreSQL 服务的 Variables 中找 `PGHOST`）
- **Database**: `railway`
- **User**: `postgres`
- **Password**: 从 Railway PostgreSQL 的 `PGPASSWORD` 复制
- **Port**: `5432`

#### 3.3 OpenRouter 配置
在 n8n Credentials 中添加 `OpenRouter (OpenAI-compatible)`：
- **API Key**: 你的 OpenRouter API Key
- **Base URL**: `https://openrouter.ai/api/v1`

---

## 验证部署

### 1. 检查服务状态

Railway Dashboard 中确认：
- ✅ Next.js 服务状态为 **Active**
- ✅ PostgreSQL 服务状态为 **Active**
- ✅ n8n Docker 服务状态为 **Active**

### 2. 测试前端

访问 Next.js 的 Public URL（Railway 自动生成）：
1. 点击 **Main** 查看介绍页
2. 点击 **Support Chat** → 点击右上角 **⚙️ Initialize KB** → **Load Demo Data**
3. 等待数据加载完成（约 10-30 秒）
4. 在聊天框输入测试问题，如 "Where is my order #1001?"

### 3. 检查 n8n 日志

在 n8n 服务中：
1. 打开 **Executions** 查看工作流执行记录
2. 确认 `data-init` 和 `support-chat` workflow 成功运行

### 4. 检查数据库日志

在 Railway PostgreSQL 服务 → **Query**：
```sql
SELECT * FROM ai_processing_log ORDER BY created_at DESC LIMIT 10;
```

应该能看到最近的日志记录。

---

## 本地开发环境保持不变

本地 `.env` 文件保持原样：
```bash
N8N_WEBHOOK_BASE_URL=http://localhost:5678
DATABASE_URL=postgresql://root:password@localhost:5433/shopiflow_db
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

本地运行：
```bash
npm run dev
```

本地 n8n 保持独立运行（端口 5678），不受 Railway 部署影响。

---

## 常见问题

### Q1: Frontend 无法连接 n8n
**原因**: `N8N_WEBHOOK_BASE_URL` 配置错误

**解决**:
1. 检查 Railway 上 n8n 服务的 Public URL
2. 确保 Next.js 的 `N8N_WEBHOOK_BASE_URL` 变量正确指向 n8n
3. 确保 n8n 的 webhook 路由已激活（在 n8n workflow 中点击 **Execute Workflow** 激活）

### Q2: Pinecone 连接失败
**原因**: n8n credentials 中未配置 Pinecone API Key

**解决**:
1. 进入 n8n → **Credentials** → **Add Credential** → **Pinecone API**
2. 填入 API Key 并测试连接
3. 在所有 workflow 的 Pinecone 节点中选择该 credential

### Q3: 数据库连接失败
**原因**: Railway PostgreSQL 的内部连接信息不正确

**解决**:
1. Railway PostgreSQL 服务 → **Variables**
2. 复制 `DATABASE_URL` 的完整值
3. 在 Next.js 服务的 Variables 中引用：`${{Postgres.DATABASE_URL}}`（Railway 会自动注入）

### Q4: 本地环境影响 Railway 部署
**回答**: 不会。本地和 Railway 使用完全独立的环境变量和服务。

---

## 成本估算

Railway 免费额度：
- **Developer Plan**: $5/月 起步额度
- **PostgreSQL**: 约 $5/月（512MB RAM）
- **Next.js**: 约 $5/月（512MB RAM）
- **n8n**: 已存在，不计入

**预计总成本**: $10-15/月

---

## 回滚和清理

### 回滚到上一个版本
Railway Next.js 服务 → **Deployments** → 选择历史版本 → **Redeploy**

### 清理测试数据
```sql
-- 清空日志表
TRUNCATE TABLE ai_processing_log;
```

Pinecone 清空：
```bash
# 在 n8n 或本地执行 Pinecone delete API
curl -X POST "https://api.pinecone.io/indexes/shopiflow-orders/delete" \
  -H "Api-Key: YOUR_PINECONE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"deleteAll": true}'
```

---

## 监控和日志

### Railway 日志
Next.js 服务 → **Deployments** → 点击最新部署 → **View Logs**

### n8n 执行日志
n8n UI → **Executions** → 查看每个 workflow 的执行详情

### 数据库查询
```sql
-- 查看最近 100 条日志
SELECT workflow_id, action, status, created_at, details
FROM ai_processing_log
ORDER BY created_at DESC
LIMIT 100;

-- 统计成功率
SELECT
  workflow_id,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success
FROM ai_processing_log
GROUP BY workflow_id;
```

---

## 安全建议

1. **不要在 `.env` 中提交真实 API Key** — 已在 `.gitignore` 中排除
2. **定期轮换 API Keys** — 尤其是 Shopify 和 OpenRouter
3. **限制 Shopify Custom App 权限** — 只授予 `read_orders`, `read_products`
4. **Pinecone Index 设置为 private** — 不公开向量数据
5. **Railway Variables 使用 secret** — 标记敏感变量为 Secret（自动隐藏）

---

## 下一步

- [ ] 配置自定义域名（Railway → Settings → Domains）
- [ ] 添加 Railway 监控告警（Railway → Observability）
- [ ] 接入真实 Shopify 店铺数据
- [ ] 配置 Gorgias webhook 实时同步客服工单
- [ ] 扩展 n8n workflow 处理更多场景

---

**部署完成！** 🎉

如有问题，检查 Railway 日志或参考 [Railway 官方文档](https://docs.railway.app/)。
