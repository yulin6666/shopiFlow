# ShopiFow 监控系统 - 安装配置指南

## 概述

本监控系统为 `shopify-support-handler` 工作流提供生产级别的健康监控和性能跟踪。

**核心功能：**
- 实时 KPI 仪表板（成功率、延迟、分类分布）
- 24 小时趋势图表和错误追踪
- 物化视图优化（查询延迟 < 50ms）
- 自动化监控 workflow（每 5 分钟刷新 + 主动探测）
- 告警系统（Slack 集成，可选）

---

## 系统架构

```
┌─────────────────────────────────────────┐
│  n8n Monitoring Workflow (Railway)      │
│  - Schedule Trigger: Every 5 minutes    │
│  - Refresh materialized views           │
│  - Active probe: Test request to API    │
│  - Threshold check → Slack alert        │
└──────────────┬──────────────────────────┘
               ↓
       PostgreSQL (Railway)
       ├─ ai_processing_log (existing)
       └─ monitoring_metrics_mv (new)
       └─ monitoring_summary_mv (new)
               ↓
┌──────────────┴──────────────────────────┐
│  Next.js API Route                       │
│  /api/monitoring/metrics                 │
│  - Query materialized view (fast)        │
└──────────────┬──────────────────────────┘
               ↓
       Frontend Dashboard
       /monitoring
       - KPI cards + charts + error list
```

---

## 前置要求

1. **PostgreSQL 数据库**
   - 本地：n8n starter kit 的 PostgreSQL (端口 5433)
   - Railway：已部署的 PostgreSQL 服务

2. **n8n 实例运行中**
   - 本地：`https://n8n-production-fee8.up.railway.app`
   - Railway：已部署的 n8n 服务

3. **环境变量已配置**
   - `DATABASE_URL` — PostgreSQL 连接字符串
   - `N8N_WEBHOOK_BASE_URL` — n8n webhook 基础 URL
   - `MONITORING_ENABLED=true` （可选，默认 true）

---

## 安装步骤

### 1. 创建数据库视图

连接到 PostgreSQL 数据库并执行 SQL 脚本：

```bash
# 本地开发
psql postgresql://root:password@localhost:5433/shopiflow_db -f database/monitoring-views.sql

# Railway 部署
psql $DATABASE_URL -f database/monitoring-views.sql
```

**验证视图已创建：**

```sql
-- 检查视图是否存在
\d monitoring_metrics_mv
\d monitoring_summary_mv

-- 查看汇总数据
SELECT * FROM monitoring_summary_mv;
```

预期输出：单行数据，包含 `total_executions_24h`, `success_rate_pct` 等字段。

---

### 2. 导入 n8n 监控 workflow

1. 打开 n8n Web UI（本地 `https://n8n-production-fee8.up.railway.app` 或 Railway URL）
2. 点击右上角 **+ Add workflow**
3. 点击右上角菜单 **⋮ → Import from File**
4. 选择 `n8n/workflows/monitoring-shopify-support.json`
5. 导入后配置 PostgreSQL credential：
   - Node: **Refresh Materialized Views**
   - Credential: 选择或创建 `PostgreSQL (ShopiFow)` credential
   - 填入 `DATABASE_URL`
6. 重复步骤 5 为其他 PostgreSQL nodes 配置 credential
7. 点击右上角 **Save** 保存 workflow
8. 点击右上角 **Active** 开关激活 workflow

**测试 workflow：**

点击左下角 **Execute Workflow** 手动执行一次，验证：
- ✅ Materialized views 刷新成功
- ✅ Summary metrics 查询成功
- ✅ Health probe 请求成功

---

### 3. 配置 Slack 告警（可选）

如需在监控指标异常时收到 Slack 通知：

1. 创建 Slack Incoming Webhook：
   - 访问 https://api.slack.com/messaging/webhooks
   - 选择 Slack workspace 和 channel
   - 复制 Webhook URL（格式：`https://hooks.slack.com/services/...`）

2. 在 Railway 或本地 `.env` 添加环境变量：
   ```bash
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```

3. 重启 n8n 服务使环境变量生效

**告警触发条件：**
- 成功率 < 90%
- 降级率 > 10%
- P95 延迟 > 10s

---

### 4. 访问监控 Dashboard

启动 Next.js 前端：

```bash
cd apps/frontend
npm run dev
```

访问 http://localhost:3000/monitoring

**仪表板功能：**
- **KPI Cards** — 总执行次数、成功率、降级率、平均延迟、P95 延迟、工作流状态
- **Success Rate Chart** — 24 小时趋势图（成功率、降级率、执行次数）
- **Classification Pie Chart** — Auto/Draft/Escalate 分布
- **Recent Errors** — 最近 10 条错误日志
- **Run Health Check** — 手动触发主动探测
- **Refresh** — 手动刷新数据

数据每 30 秒自动刷新。

---

## 配置告警阈值

默认告警阈值在 `n8n/workflows/monitoring-shopify-support.json` 中定义：

```json
{
  "name": "Check Alert Thresholds",
  "parameters": {
    "conditions": {
      "conditions": [
        { "leftValue": "={{ $json.success_rate_pct }}", "rightValue": 90, "operator": "lt" },
        { "leftValue": "={{ $json.degradation_rate_pct }}", "rightValue": 10, "operator": "gt" },
        { "leftValue": "={{ $json.p95_latency_ms }}", "rightValue": 10000, "operator": "gt" }
      ]
    }
  }
}
```

**修改阈值：**

1. 在 n8n UI 中打开 `monitoring-shopify-support` workflow
2. 编辑 **Check Alert Thresholds** node
3. 修改 `rightValue` 值：
   - `90` → 你的成功率阈值（百分比）
   - `10` → 你的降级率阈值（百分比）
   - `10000` → 你的 P95 延迟阈值（毫秒）
4. 保存 workflow

---

## 故障排查

### 问题 1: Dashboard 显示 "Failed to fetch metrics"

**原因：** API 无法连接数据库或视图不存在

**解决方案：**

```bash
# 检查数据库连接
psql $DATABASE_URL -c "SELECT 1;"

# 验证视图存在
psql $DATABASE_URL -c "\d monitoring_summary_mv"

# 手动刷新视图
psql $DATABASE_URL -c "REFRESH MATERIALIZED VIEW CONCURRENTLY monitoring_summary_mv;"
```

如果视图不存在，重新执行步骤 1。

---

### 问题 2: Dashboard 显示 0 数据

**原因：** `ai_processing_log` 表中没有数据

**解决方案：**

1. 确认 `shopify-support-handler` workflow 已运行至少一次
2. 访问 `/support` 页面发送测试消息
3. 等待 5 分钟让监控 workflow 刷新视图
4. 或手动刷新：
   ```sql
   REFRESH MATERIALIZED VIEW CONCURRENTLY monitoring_metrics_mv;
   REFRESH MATERIALIZED VIEW CONCURRENTLY monitoring_summary_mv;
   ```

---

### 问题 3: n8n 监控 workflow 执行失败

**原因：** PostgreSQL credential 未配置或连接失败

**解决方案：**

1. 在 n8n UI 中检查 workflow 中每个 PostgreSQL node 的 credential
2. 测试连接：
   ```bash
   psql $DATABASE_URL -c "SELECT NOW();"
   ```
3. 确认 `DATABASE_URL` 格式正确：
   ```
   postgresql://user:password@host:port/database
   ```

---

### 问题 4: Health probe 失败

**原因：** `N8N_WEBHOOK_BASE_URL` 配置错误或 webhook 未激活

**解决方案：**

1. 确认 `shopify-support-handler` workflow 已激活
2. 手动测试 webhook：
   ```bash
   curl -X POST https://n8n-production-fee8.up.railway.app/webhook/shopify-support \
     -H "Content-Type: application/json" \
     -d '{"message": "test", "ticketId": "test-123", "customerName": "Test", "customerEmail": "test@example.com", "platform": "shopify"}'
   ```
3. 检查 n8n logs：
   ```bash
   docker logs n8n -f
   ```

---

## 性能特性

- **Dashboard 查询延迟**: 20-50ms（物化视图）
- **数据新鲜度**: 5 分钟（n8n 刷新间隔）
- **Materialized view 刷新时间**: ~500ms（不阻塞查询）
- **内存开销**: ~10MB（缓存 24 小时数据）
- **前端渲染时间**: < 100ms

---

## 数据保留策略

- **ai_processing_log**: 无自动清理（手动维护或添加 cron job）
- **监控视图**: 仅保留最近 24 小时数据
- **建议**: 每月清理超过 30 天的日志：
  ```sql
  DELETE FROM ai_processing_log
  WHERE created_at < NOW() - INTERVAL '30 days';
  ```

---

## Railway 部署注意事项

1. **环境变量自动注入**
   - Railway 自动注入 `DATABASE_URL`，无需手动配置
   - 确认 `MONITORING_ENABLED=true` 已在 Variables 中设置

2. **n8n PostgreSQL credential**
   - 使用 Railway 提供的 `${{Postgres.DATABASE_URL}}` 变量引用

3. **首次部署**
   - 在 Railway Shell 中执行 `database/monitoring-views.sql`
   - 或使用 Railway CLI：
     ```bash
     railway run psql -f database/monitoring-views.sql
     ```

---

## 下一步

- ✅ 监控系统已运行
- 📊 访问 `/monitoring` 查看仪表板
- 🔔 配置 Slack 告警（可选）
- 📈 调整告警阈值以匹配你的 SLA

更多技术细节请参考 `docs/MONITORING_ARCHITECTURE.md`。
