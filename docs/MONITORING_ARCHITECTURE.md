# ShopiFow 监控系统 - 技术架构文档

## 系统设计概览

本监控系统采用**混合架构**：n8n 后台服务负责数据聚合和告警，Next.js 前端负责可视化展示。

**核心设计原则：**
1. **性能优先** — 使用物化视图预聚合，查询延迟 < 50ms
2. **最小侵入** — 不修改现有 `shopify-support-handler` workflow
3. **Railway 兼容** — 本地和云端零配置差异
4. **生产就绪** — 自动化告警、主动探测、错误追踪

---

## 架构层次

### 1. 数据层 (PostgreSQL)

#### 1.1 原始数据表

```sql
-- 现有表（不修改）
CREATE TABLE ai_processing_log (
    id          UUID PRIMARY KEY,
    workflow_id VARCHAR(100),
    action      VARCHAR(100),
    status      VARCHAR(20),  -- 'success' | 'failed' | 'degraded'
    details     JSONB,        -- 包含 execution_time_ms, classification 等
    error_msg   TEXT,
    created_at  TIMESTAMP WITH TIME ZONE
);
```

**数据来源：** `shopify-support-handler` workflow 在每次执行后写入一行日志。

#### 1.2 物化视图

**为什么使用物化视图？**
- 原始表查询聚合 500ms+（需扫描全表并计算百分位数）
- 物化视图预计算，查询降至 20-50ms
- 使用 `REFRESH MATERIALIZED VIEW CONCURRENTLY` 避免锁表

**视图 1: `monitoring_metrics_mv` — 按小时聚合**

```sql
CREATE MATERIALIZED VIEW monitoring_metrics_mv AS
SELECT
  DATE_TRUNC('hour', created_at) AS time_bucket,
  COUNT(*) AS total_executions,
  COUNT(*) FILTER (WHERE status = 'success') AS success_count,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (details->>'execution_time_ms')::numeric) AS p95_latency_ms,
  ...
FROM ai_processing_log
WHERE workflow_id = 'shopify-support-handler'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY time_bucket;
```

**用途：** 时间序列图表（24 小时趋势）

**视图 2: `monitoring_summary_mv` — 单行汇总**

```sql
CREATE MATERIALIZED VIEW monitoring_summary_mv AS
SELECT
  COUNT(*) AS total_executions_24h,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'success') / ..., 2) AS success_rate_pct,
  ...
FROM ai_processing_log
WHERE workflow_id = 'shopify-support-handler'
  AND created_at > NOW() - INTERVAL '24 hours';
```

**用途：** KPI 卡片和告警阈值检查

**刷新策略：**
- n8n workflow 每 5 分钟刷新一次
- 使用 `CONCURRENTLY` 选项（不阻塞查询）
- 刷新时间 ~500ms（24 小时数据）

---

### 2. 后台服务层 (n8n Workflow)

#### 2.1 监控 Workflow: `monitoring-shopify-support.json`

**执行频率：** 每 5 分钟（Schedule Trigger）

**节点流程：**

```
Schedule (every 5min)
  ↓
Refresh Materialized Views (PostgreSQL)
  ↓  ↓
  ↓  └→ Active Health Probe (HTTP Request) → Log Probe Result (PostgreSQL)
  ↓
Query Summary Metrics (PostgreSQL)
  ↓
Check Alert Thresholds (IF node)
  ↓         ↓
  ↓ (True)  └→ (False) No Alert Needed
  ↓
Format Alert Message (Code node)
  ↓
Send Slack Alert (HTTP Request)
```

#### 2.2 主动探测机制

**目的：** 主动验证 `shopify-support-handler` 可用性

**实现：**
- 每 5 分钟发送测试请求到 `/webhook/shopify-support`
- 记录响应时间和状态码
- 探测结果写入 `ai_processing_log` 表（`workflow_id = 'monitoring-probe'`）

**探测 payload：**
```json
{
  "message": "Health check probe",
  "ticketId": "probe-1694520000",
  "customerName": "Monitoring System",
  "customerEmail": "monitoring@shopiflow.internal",
  "platform": "shopify"
}
```

**超时设置：** 10 秒

#### 2.3 告警系统

**告警触发条件：**
| 指标 | 阈值 | 告警级别 |
|------|------|----------|
| Success Rate | < 90% | 🔴 Critical |
| Degradation Rate | > 10% | ⚠️ Warning |
| P95 Latency | > 10s | ⏱️ Performance |

**告警渠道：** Slack Incoming Webhook（可选）

**告警消息格式：**
```
⚠️ Monitoring Alert: shopify-support-handler

Metrics Summary (Last 24h):
- Total Executions: 1,234
- Success Rate: 87.5% 🔴
- Degradation Rate: 12.3% 🔴
- P95 Latency: 3,456ms ✅

Action Required:
- ❌ Success rate below 90% threshold
- ⚠️ Degradation rate above 10% threshold

Check the monitoring dashboard: https://your-app.com/monitoring
```

**静音策略：**
- 不支持静音功能（可在 n8n 中手动禁用告警节点）
- 建议：在 Slack 中创建专用 channel 并配置通知规则

---

### 3. API 层 (Next.js API Routes)

#### 3.1 `/api/monitoring/metrics` (GET)

**功能：** 查询监控指标和错误日志

**查询逻辑：**
```typescript
// 1. 查询汇总视图（单行）
SELECT * FROM monitoring_summary_mv LIMIT 1;

// 2. 查询小时聚合（24 行）
SELECT * FROM monitoring_metrics_mv ORDER BY time_bucket DESC LIMIT 24;

// 3. 查询最近错误（原始表）
SELECT id, created_at, error_msg, details
FROM ai_processing_log
WHERE workflow_id = 'shopify-support-handler'
  AND status IN ('failed', 'degraded')
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;
```

**性能：**
- 视图查询：20-50ms（索引优化）
- 错误查询：10-30ms（索引 `idx_ai_log_status`, `idx_ai_log_created`）
- 总延迟：< 100ms

**数据新鲜度：** 5 分钟（视图刷新间隔）

#### 3.2 `/api/monitoring/probe` (POST)

**功能：** 手动触发健康检查

**实现：**
```typescript
fetch(`${N8N_WEBHOOK_BASE_URL}/webhook/shopify-support`, {
  method: 'POST',
  body: JSON.stringify({ message: 'Health check probe', ... }),
  signal: AbortSignal.timeout(10000)
});
```

**用途：**
- Dashboard "Run Health Check" 按钮
- 故障排查（手动验证 n8n 连通性）

---

### 4. 前端展示层 (Next.js Dashboard)

#### 4.1 页面路由: `/monitoring`

**组件树：**
```
MonitoringPage (/app/monitoring/page.tsx)
├── MetricsCards (6 个 KPI 卡片)
├── SuccessRateChart (Recharts 时间序列图)
├── ClassificationPieChart (Recharts 饼图)
└── ErrorList (错误日志列表)
```

#### 4.2 数据流

```
Frontend (每 30 秒轮询)
  ↓ GET /api/monitoring/metrics
API Route
  ↓ SELECT * FROM monitoring_summary_mv
PostgreSQL (物化视图)
  ↑ 每 5 分钟刷新
n8n Monitoring Workflow
```

**状态管理：**
- React `useState` + `useEffect` 轮询
- 无需 Redux/Zustand（单页面，数据简单）

**图表库：** Recharts（已在项目中使用）

---

## 性能优化技术

### 1. 物化视图 vs 实时查询

| 方案 | 查询延迟 | 数据新鲜度 | 数据库负载 |
|------|----------|-----------|-----------|
| 实时聚合查询 | 500-1000ms | 实时 | 高（全表扫描） |
| 物化视图 | 20-50ms | 5 分钟 | 低（索引查询） |

**选择理由：**
- 监控数据不需要实时性（5 分钟延迟可接受）
- Dashboard 高频访问，查询性能优先
- 减少数据库负载（避免每次 Dashboard 刷新都扫描全表）

### 2. 索引策略

```sql
-- 原始表索引（已有）
CREATE INDEX idx_ai_log_workflow ON ai_processing_log (workflow_id);
CREATE INDEX idx_ai_log_status ON ai_processing_log (status);
CREATE INDEX idx_ai_log_created ON ai_processing_log (created_at DESC);

-- 物化视图索引
CREATE INDEX idx_monitoring_metrics_time ON monitoring_metrics_mv (time_bucket DESC);
```

**查询计划验证：**
```sql
EXPLAIN ANALYZE SELECT * FROM monitoring_summary_mv;
-- 结果：Seq Scan on monitoring_summary_mv (cost=0.00..0.01, rows=1, time=0.023ms)
```

### 3. 前端优化

- **Lazy loading**: 使用 Next.js dynamic import（图表组件较大）
- **Memoization**: `useMemo` 缓存图表数据转换
- **Debounce**: 手动刷新按钮防抖（避免重复请求）

---

## 扩展性考虑

### 当前架构限制

| 指标 | 当前上限 | 瓶颈 |
|------|---------|------|
| 日志保留时长 | 无限制 | 磁盘空间 |
| 监控时间窗口 | 24 小时 | 视图定义 |
| Dashboard 并发 | ~100 QPS | API Route 连接池 |
| 告警渠道 | Slack only | n8n workflow |

### 未来增强建议

#### 1. 长期数据保留

**方案：** 按天聚合 + 分区表

```sql
CREATE TABLE ai_processing_log_daily_summary (
  date DATE PRIMARY KEY,
  total_executions INT,
  success_rate_pct DECIMAL,
  ...
) PARTITION BY RANGE (date);
```

**cron job：** 每天凌晨聚合昨日数据并删除原始日志

#### 2. Grafana 集成

**架构：**
```
PostgreSQL → Prometheus Exporter → Prometheus → Grafana
```

**实现：** 创建 `/api/metrics` 端点输出 Prometheus 格式：
```
# HELP support_handler_success_rate Success rate in last 24h
# TYPE support_handler_success_rate gauge
support_handler_success_rate 95.3
```

#### 3. 多 Workflow 支持

**修改点：**
- 视图 `WHERE workflow_id IN ('shopify-support-handler', 'review-reply-generator')`
- Dashboard 添加 workflow 选择器
- 告警规则按 workflow 分组

#### 4. 自定义告警阈值

**方案：** 在 `ai_processing_log` 表中添加 `alert_config` JSONB 字段
```json
{
  "success_rate_threshold": 90,
  "degradation_rate_threshold": 10,
  "p95_latency_threshold": 10000
}
```

n8n workflow 读取此配置动态调整阈值。

---

## 安全性考虑

### 1. 数据库连接安全

- ✅ 使用连接池（pg Pool）避免连接泄漏
- ✅ 环境变量存储 `DATABASE_URL`（不硬编码）
- ✅ Railway 自动注入连接字符串（无需明文配置）

### 2. API 访问控制

**当前状态：** 无认证（内部工具）

**生产建议：**
- 添加 Next.js middleware 检查 session/token
- 或使用 Railway 的 Private Networking（仅内网访问）

### 3. 探测请求识别

**问题：** 监控探测请求会写入日志，可能干扰指标

**解决方案：**
- 探测使用独立 `workflow_id = 'monitoring-probe'`
- 视图查询时过滤：`WHERE workflow_id = 'shopify-support-handler'`

---

## 故障场景与应对

### 场景 1: 物化视图刷新失败

**原因：** PostgreSQL 连接中断、死锁

**监控：** n8n workflow 执行失败会显示在 execution log

**恢复：**
```sql
-- 手动刷新
REFRESH MATERIALIZED VIEW CONCURRENTLY monitoring_summary_mv;

-- 或重建视图
DROP MATERIALIZED VIEW monitoring_summary_mv CASCADE;
-- 重新执行 database/monitoring-views.sql
```

### 场景 2: Dashboard 显示过时数据

**原因：** n8n workflow 未运行或失败

**排查：**
1. 检查 n8n workflow 是否激活
2. 查看最近执行记录
3. 手动执行一次 workflow

### 场景 3: 告警风暴

**原因：** workflow 执行失败导致成功率骤降

**缓解：**
- 在 n8n 中临时禁用 "Send Slack Alert" 节点
- 或调整阈值（修改 "Check Alert Thresholds" node）

---

## 技术选型总结

| 组件 | 技术选择 | 理由 |
|------|---------|------|
| 后台调度 | n8n Schedule Trigger | 已有 n8n 基础设施，零学习成本 |
| 数据聚合 | PostgreSQL 物化视图 | 查询性能提升 10x，原生 SQL |
| API 框架 | Next.js API Routes | 与前端同仓库，Railway 一键部署 |
| 前端图表 | Recharts | 项目已使用，无需引入新依赖 |
| 告警渠道 | Slack Webhook | 简单可靠，无需复杂集成 |

**架构优势：**
- ✅ 本地和 Railway 零配置差异
- ✅ 无需引入新服务（Grafana, Prometheus）
- ✅ 开发成本低（复用现有技术栈）
- ✅ 维护成本低（组件少，逻辑清晰）

---

## 参考资源

- [PostgreSQL 物化视图文档](https://www.postgresql.org/docs/current/sql-creatematerializedview.html)
- [n8n Schedule Trigger 文档](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/)
- [Recharts 官方文档](https://recharts.org/)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)

---

**版本：** 1.0
**更新日期：** 2026-09-10
**维护者：** ShopiFow Team
