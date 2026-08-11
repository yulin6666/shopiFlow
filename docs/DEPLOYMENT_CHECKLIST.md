# Railway 部署检查清单

部署前快速检查，确保所有配置正确。

---

## ✅ 部署前检查

### 1. Railway 项目准备
- [ ] Railway 账号已登录
- [ ] 已有运行中的 n8n Docker 服务
- [ ] n8n 服务有 Public URL（用于 webhook）

### 2. API Keys 准备
- [ ] OpenRouter API Key（必填）
- [ ] Pinecone API Key（在 n8n credentials 中配置）
- [ ] Shopify Access Token（选填，有则填）
- [ ] Judge.me API Token（选填）
- [ ] Gorgias credentials（选填）

### 3. 代码仓库
- [ ] 代码已推送到 GitHub
- [ ] `.env` 文件未提交（在 `.gitignore` 中）
- [ ] `.claude/settings.local.json` 未提交
- [ ] `railway.json` 存在且配置正确

---

## 🚀 部署步骤速查

### Step 1: PostgreSQL（5 分钟）
```
1. Railway Project → + New → Database → PostgreSQL
2. 等待创建完成
3. PostgreSQL → Data → Query → 粘贴 database/init.sql 并执行
```

### Step 2: Next.js Frontend（10 分钟）
```
1. Railway Project → + New → GitHub Repo → 选择 shopiFlow
2. Next.js 服务 → Variables → 添加环境变量：

必填：
- OPENROUTER_API_KEY=sk-or-v1-xxx
- N8N_WEBHOOK_BASE_URL=https://your-n8n.up.railway.app
- NODE_ENV=production
- NEXT_PUBLIC_APP_URL=${{RAILWAY_PUBLIC_DOMAIN}}

可选（有真实数据才填）：
- SHOPIFY_STORE_DOMAIN=xxx.myshopify.com
- SHOPIFY_ACCESS_TOKEN=shpat_xxx
- JUDGE_ME_API_TOKEN=xxx
- GORGIAS_BASE_URL=https://xxx.gorgias.com/api
- GORGIAS_EMAIL=xxx
- GORGIAS_API_KEY=xxx

3. 保存后自动部署
```

### Step 3: n8n 配置（5 分钟）
```
1. 进入 n8n UI（Railway n8n 服务的 Public URL）
2. Credentials → 添加：
   - Pinecone API (必填)
   - PostgreSQL (连接 Railway PostgreSQL)
   - OpenRouter (使用 OpenAI-compatible 类型)

3. 导入 n8n/workflows/*.json
4. 每个 workflow 点击 Execute Workflow 激活 webhook
```

---

## ✅ 部署后验证

### 1. 服务状态检查
```
Railway Dashboard：
- Next.js 服务: Active ✅
- PostgreSQL: Active ✅
- n8n Docker: Active ✅
```

### 2. 功能测试
```
访问 Next.js Public URL：
1. 点击 Main → 查看介绍页
2. 点击 Support Chat → 右上角 ⚙️ Initialize KB → Load Demo Data
3. 等待加载完成（10-30秒）
4. 输入测试问题: "Where is my order #1001?"
5. 验证 AI 回复正常
```

### 3. n8n 日志检查
```
n8n UI → Executions:
- data-init workflow: Success ✅
- support-chat workflow: Success ✅
```

### 4. 数据库验证
```sql
-- Railway PostgreSQL → Query
SELECT * FROM ai_processing_log ORDER BY created_at DESC LIMIT 5;
-- 应该看到日志记录
```

---

## 🔧 常见问题快速修复

### 问题 1: Frontend 无法连接 n8n
```
检查：Next.js Variables 中的 N8N_WEBHOOK_BASE_URL
修复：确保指向 Railway n8n 的 Public URL（不是 localhost）
```

### 问题 2: Initialize KB 超时
```
检查：n8n data-init workflow 是否激活
修复：n8n UI → 打开 workflow → 点击 Execute Workflow
```

### 问题 3: Pinecone 连接失败
```
检查：n8n Credentials 中是否配置 Pinecone API
修复：添加 Pinecone credential 并在 workflow 节点中选择
```

### 问题 4: PostgreSQL 连接错误
```
检查：DATABASE_URL 是否正确
修复：Next.js Variables 中引用 ${{Postgres.DATABASE_URL}}
     n8n Credentials 使用 Railway PostgreSQL 的内部连接信息
```

---

## 📊 监控和维护

### 查看日志
```
Next.js: Railway 服务 → Deployments → View Logs
n8n: n8n UI → Executions
PostgreSQL: Railway 服务 → Data → Query
```

### 性能监控
```sql
-- 查看处理成功率
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

## 🎯 成本优化

Railway 免费额度用完后：
- Next.js: ~$5/月 (512MB RAM)
- PostgreSQL: ~$5/月 (512MB RAM)
- n8n: 已存在

**预计总成本**: $10-15/月

优化建议：
- 使用 Railway Hobby Plan ($5/月)
- 合理配置服务 RAM（512MB 足够 demo 使用）
- 监控流量，避免超额

---

## ✅ 完成确认

部署成功的标志：
- [ ] Next.js Public URL 可以访问
- [ ] Support Chat 可以加载数据
- [ ] AI 回复正常工作
- [ ] Review Replies 可以生成回复
- [ ] n8n Executions 显示成功记录
- [ ] PostgreSQL 有日志记录

**恭喜！部署完成！** 🎉

---

**下一步**: 参考 `RAILWAY_DEPLOYMENT.md` 进行自定义域名、监控告警等高级配置。
