-- ShopiFow Monitoring System - Materialized Views
-- 用于快速查询 ai_processing_log 的预聚合指标
-- 运行方式：psql $DATABASE_URL -f database/monitoring-views.sql

-- 按小时聚合的指标视图 (24小时滚动窗口)
CREATE MATERIALIZED VIEW IF NOT EXISTS monitoring_metrics_mv AS
SELECT
  -- 时间桶（按小时聚合，保留 24 小时）
  DATE_TRUNC('hour', created_at) AS time_bucket,

  -- 总体指标
  COUNT(*) AS total_executions,
  COUNT(*) FILTER (WHERE status = 'success') AS success_count,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
  COUNT(*) FILTER (WHERE status = 'degraded') AS degraded_count,

  -- 性能指标 (从 details JSONB 提取 execution_time_ms)
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY (details->>'execution_time_ms')::numeric) AS p50_latency_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (details->>'execution_time_ms')::numeric) AS p95_latency_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY (details->>'execution_time_ms')::numeric) AS p99_latency_ms,
  AVG((details->>'execution_time_ms')::numeric) AS avg_latency_ms,

  -- 分类分布统计
  COUNT(*) FILTER (WHERE details->>'classification' = 'auto') AS auto_count,
  COUNT(*) FILTER (WHERE details->>'classification' = 'draft') AS draft_count,
  COUNT(*) FILTER (WHERE details->>'classification' = 'escalate') AS escalate_count,

  -- 错误追踪
  COUNT(DISTINCT error_msg) FILTER (WHERE error_msg IS NOT NULL) AS unique_errors

FROM ai_processing_log
WHERE workflow_id = 'shopify-support-handler'
  AND status IN ('success', 'degraded', 'failed')
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY time_bucket
ORDER BY time_bucket DESC;

-- 索引：加速基于时间的查询
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_time ON monitoring_metrics_mv (time_bucket DESC);

-- 汇总视图 (单行，最近 24 小时的总体指标)
CREATE MATERIALIZED VIEW IF NOT EXISTS monitoring_summary_mv AS
SELECT
  COUNT(*) AS total_executions_24h,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'success') / NULLIF(COUNT(*), 0), 2) AS success_rate_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'degraded') / NULLIF(COUNT(*), 0), 2) AS degradation_rate_pct,
  ROUND(AVG((details->>'execution_time_ms')::numeric), 0) AS avg_latency_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (details->>'execution_time_ms')::numeric)::numeric, 0) AS p95_latency_ms,
  MAX(created_at) AS last_execution_at,
  COUNT(*) FILTER (WHERE details->>'classification' = 'auto') AS auto_count,
  COUNT(*) FILTER (WHERE details->>'classification' = 'draft') AS draft_count,
  COUNT(*) FILTER (WHERE details->>'classification' = 'escalate') AS escalate_count
FROM ai_processing_log
WHERE workflow_id = 'shopify-support-handler'
  AND status IN ('success', 'degraded', 'failed')
  AND created_at > NOW() - INTERVAL '24 hours';

-- 注释：
-- 1. 物化视图每 5 分钟由 n8n 监控 workflow 刷新一次（REFRESH MATERIALIZED VIEW CONCURRENTLY）
-- 2. 查询延迟：物化视图 20-50ms vs 原始表聚合 500ms+
-- 3. 使用 CONCURRENTLY 避免锁表，但需要先创建唯一索引
