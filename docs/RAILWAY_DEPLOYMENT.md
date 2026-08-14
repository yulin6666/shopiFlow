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

**注意：这是一个 Frontend-only 项目。** Next.js 包含全部前端页面和后端 API routes，不需要单独部署 backend 服务。

---

## 变量分工

| 变量 | 配置位置 | 说明 |
|------|---------|------|
| `OPENROUTER_API_KEY` | n8n Credentials | Frontend 不直接调用 OpenRouter，全部通过 n8n |
| `PINECONE_API_KEY` | n8n Credentials | 同上 |
| `SLACK_WEBHOOK_URL` | Railway n8n Variables | 错误告警用，获取方式见下方说明 |
| `N8N_WEBHOOK_BASE_URL` | Railway Next.js Variables | 必填 |
| `DATABASE_URL` | Railway 自动注入 | 引用 PostgreSQL 服务，无需手动填 |
| `NODE_ENV` | Railway Next.js Variables | 设为 `production` |
| `NEXT_PUBLIC_APP_URL` | Railway Next.js Variables | 用 `${{RAILWAY_PUBLIC_DOMAIN}}` |
| `JUDGE_ME_*` | Railway Next.js Variables | 选填，不填则用 mock 数据 |
| `GORGIAS_*` | Railway Next.js Variables | 选填，不填则 Import 按钮不可用 |
| `SHOPIFY_*` | **不需要** | 已从代码中删除，数据由 n8n 提供 |

---

## 部署步骤

### Step 1: 在 Railway 创建 PostgreSQL 数据库

1. 进入你的 Railway Project
2. 点击 **+ New** → **Database** → **Add PostgreSQL**
3. 等待数据库创建完成
4. 点击 PostgreSQL 服务 → **Data** 标签 → **Query**
5. 复制 `database/init.sql` 的内容并执行，创建 `ai_processing_log` 表

### Step 2: 部署 Next.js

#### 2.1 连接 GitHub 仓库

1. Railway Project → **+ New** → **GitHub Repo**
2. 选择 `shopiFlow` 仓库
3. Railway 会自动检测到 `railway.json` 并使用配置

#### 2.2 配置环境变量

进入 Next.js 服务 → **Variables** 标签，添加以下变量：

```bash
# ---- 必填 ----
N8N_WEBHOOK_BASE_URL=https://your-n8n-service.up.railway.app

# ---- App ----
NODE_ENV=production
NEXT_PUBLIC_APP_URL=${{RAILWAY_PUBLIC_DOMAIN}}
NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL=https://your-n8n-service.up.railway.app

# ---- DATABASE_URL 自动注入，无需手动填 ----
# Railway 引用同 project 的 PostgreSQL 服务时会自动注入

# ---- 选填（不填则用 mock 数据）----
JUDGE_ME_API_TOKEN=
JUDGE_ME_SHOP_DOMAIN=
GORGIAS_BASE_URL=
GORGIAS_EMAIL=
GORGIAS_API_KEY=
```

**重要：**
- `OPENROUTER_API_KEY` 和 `PINECONE_API_KEY` 只在 n8n Credentials 里配，前端不需要
- `SHOPIFY_*` 已从代码删除，不需要配置
- `DATABASE_URL` Railway 会自动从 PostgreSQL 服务注入，无需手动填

#### 2.3 触发部署

保存环境变量后 Railway 会自动触发构建，等待约 3-5 分钟。

### Step 3: 配置 n8n Credentials

进入你的 n8n 服务（Railway Docker），在 **Credentials** 中添加：

#### 3.1 OpenRouter（AI 模型）
- **类型**: OpenAI-compatible
- **Credential Name**: `OpenRouter (OpenAI-compatible)`
- **API Key**: 你的 OpenRouter API Key
- **Base URL**: `https://openrouter.ai/api/v1`

#### 3.2 Pinecone（向量数据库）
- **类型**: Pinecone API
- **Credential Name**: `Pinecone API`
- **API Key**: 你的 Pinecone API Key

#### 3.3 PostgreSQL（日志数据库）
- **类型**: Postgres
- **Host**: Railway PostgreSQL 内部 hostname（PostgreSQL 服务 Variables → `PGHOST`）
- **Database**: `railway`
- **User**: `postgres`
- **Password**: 从 `PGPASSWORD` 复制
- **Port**: `5432`

#### 3.4 导入 Workflows（含错误处理）

将 `n8n/workflows/` 下的 JSON 文件按顺序导入 n8n：

**重要：必须先导入全局错误处理 workflow，再导入主 workflows**

1. `error-handler-global.json` - 全局错误捕获
2. `gorgias-support-handler.json` - Gorgias 客服处理
3. `shopify-support-handler.json` - Shopify 客服处理
4. `judgeme-review-handler.json` - Judge.me 评论回复
5. `data-init.json` - 数据初始化

**配置错误处理关联**：
- 对每个主 workflow（步骤 2-4），打开 Settings → **Error Workflow** → 选择 `ShopiFow - Global Error Handler`
- 激活所有 workflows

**配置 Slack Webhook（可选，用于错误告警）**：

1. 访问 https://api.slack.com/apps → Create New App → From scratch
2. App Name: `ShopiFow Alerts`，选择 Workspace
3. 左侧 **Incoming Webhooks** → 激活 → **Add New Webhook to Workspace**
4. 选择频道（如 `#shopiflow-alerts`）
5. 复制 Webhook URL
6. Railway n8n 服务 → **Variables** → 添加：
   ```
   SLACK_WEBHOOK_URL=<your_slack_webhook_url>
   ```
7. 重启 n8n 服务（Variables → 右上角三点 → Restart）

每个 workflow 激活后会自动注册 webhook 路由。

---

## 验证部署

### 1. 检查服务状态

Railway Dashboard 中确认：
- ✅ Next.js 服务状态为 **Active**
- ✅ PostgreSQL 服务状态为 **Active**
- ✅ n8n Docker 服务状态为 **Active**

### 2. 测试前端

访问 Next.js 的 Public URL：
1. 点击左侧 **Main** 查看介绍页
2. 点击 **Support Chat** → 右上角 **⚙️ Initialize KB** → **Load Demo Data**
3. 等待加载完成（约 10-30 秒）
4. 输入测试问题，如 `"Where is my order #1001?"`，验证 AI 回复正常
5. 点击 **Reviews** → 点击任意评论的 **Generate Reply**，验证 AI 生成回复

### 3. 检查 n8n 执行记录

n8n UI → **Executions**：
- `data-init` workflow: Success ✅
- `shopify-support-handler` workflow: Success ✅
- `judgeme-review-handler` workflow: Success ✅

### 4. 检查数据库

Railway PostgreSQL 服务 → **Data** → **Query**：
```sql
SELECT * FROM ai_processing_log ORDER BY created_at DESC LIMIT 10;
```

---

## 本地开发环境保持不变

本地 `.env` 文件无需修改：
```bash
N8N_WEBHOOK_BASE_URL=http://localhost:5678
DATABASE_URL=postgresql://root:password@localhost:5433/shopiflow_db
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL=http://localhost:5678
```

本地运行：
```bash
npm run dev
```

---

## 常见问题

### Q1: Frontend 无法连接 n8n
**原因**: `N8N_WEBHOOK_BASE_URL` 配置错误

**解决**:
1. 检查 Railway n8n 服务的 Public URL
2. 确保 Next.js 的 `N8N_WEBHOOK_BASE_URL` 和 `NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL` 都指向该 URL
3. 确保 n8n workflows 已激活（webhook 路由才会生效）

### Q2: Initialize KB 超时或失败
**原因**: n8n `data-init` workflow 未激活，或 Pinecone credentials 未配置

**解决**:
1. n8n UI → 打开 `order-sync` workflow → 确认已激活
2. 检查 n8n Credentials 中 Pinecone API Key 是否正确
3. 检查 Pinecone index 名称是否为 `shopiflow-orders`

### Q3: AI 回复超时
**原因**: n8n workflow 处理时间超过前端 timeout（默认 120s）

**解决**:
1. 检查 n8n 的 OpenRouter credential 是否配置正确
2. 检查 n8n Executions 中是否有报错
3. 确认 OpenRouter API Key 有足够余额

### Q4: DATABASE_URL 连接失败（n8n 侧）
**原因**: n8n PostgreSQL credential 使用了错误的连接信息

**解决**:
Railway PostgreSQL 服务 → **Variables**，找到以下值填入 n8n credential：
- `PGHOST` → Host
- `PGDATABASE` → Database
- `PGUSER` → User
- `PGPASSWORD` → Password
- `PGPORT` → Port（通常是 `5432`）

### Q5: Review Reply 显示 "Missing required fields"
**已修复**。如仍出现，检查 n8n `judgeme-review-handler` workflow 是否已激活。

### Q6: 错误告警没有发送到 Slack
**原因**: n8n 服务没有配置 `SLACK_WEBHOOK_URL` 环境变量，或 webhook URL 错误

**解决**:
1. Railway n8n 服务 → **Variables** → 确认 `SLACK_WEBHOOK_URL` 存在且正确
2. 在 n8n 中手动触发 `ShopiFow - Global Error Handler` workflow 测试
3. 检查 Slack App 的 Incoming Webhooks 是否激活
4. 确认 webhook URL 格式正确（以 `https://hooks.slack.com/services/` 开头）

### Q7: 主 workflow 报错但 Error Handler 没有触发
**原因**: 主 workflow 的 Settings 里没有关联 Error Workflow

**解决**:
1. 打开主 workflow → 右上角三点 → **Settings**
2. 找到 **Error Workflow** 下拉框
3. 选择 `ShopiFow - Global Error Handler`
4. 保存并重新激活 workflow

---

## 监控和维护

### 查看日志
- **Next.js**: Railway 服务 → **Deployments** → **View Logs**
- **n8n**: n8n UI → **Executions**
- **PostgreSQL**: Railway 服务 → **Data** → **Query**

### 成功率统计
```sql
SELECT
  workflow_id,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
  ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM ai_processing_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY workflow_id;
```

---

## 成本估算

| 服务 | 月费 |
|------|------|
| Next.js (512MB RAM) | ~$5 |
| PostgreSQL (512MB RAM) | ~$5 |
| n8n（已存在） | 不计 |
| **合计** | **~$10/月** |

---

## 安全建议

1. **不要提交 `.env`** — 已在 `.gitignore` 中排除
2. **Railway Variables 标记为 Secret** — 敏感变量勾选 Secret 选项
3. **定期轮换 API Keys** — 尤其是 OpenRouter
4. **Pinecone Index 设置为 private** — 不公开向量数据
5. **n8n 设置登录密码** — 避免 n8n UI 被公开访问

---

## 下一步

- [ ] 配置自定义域名（Railway → Settings → Domains）
- [ ] 接入真实 Gorgias webhook 实时同步客服工单
- [ ] 接入真实 Judge.me 获取真实评论数据
- [ ] 添加 Railway 监控告警（Railway → Observability）

---

**部署完成！** 🎉

如有问题，检查 Railway 日志或参考 [Railway 官方文档](https://docs.railway.app/)。
