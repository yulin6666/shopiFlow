-- ShopiFow 数据库 Schema
-- PostgreSQL (使用 n8n starter kit 中的 postgres 容器)
-- 运行方式：setup.sh 自动创建 shopiflow_db 并执行此脚本

CREATE TABLE IF NOT EXISTS ai_processing_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id VARCHAR(100) NOT NULL,          -- 'order-sync' | 'support-chat' | 'review-reply'
    action      VARCHAR(100) NOT NULL,          -- 'order_upsert' | 'support_reply' | 'review_reply'
    status      VARCHAR(20) NOT NULL DEFAULT 'success',  -- 'success' | 'failed' | 'pending'
    details     JSONB NOT NULL DEFAULT '{}',    -- 额外数据：订单数量、escalation level 等
    error_msg   TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_log_workflow  ON ai_processing_log (workflow_id);
CREATE INDEX IF NOT EXISTS idx_ai_log_status    ON ai_processing_log (status);
CREATE INDEX IF NOT EXISTS idx_ai_log_created   ON ai_processing_log (created_at DESC);

-- 注释：
-- 1. 不使用 pgvector — 向量存储全部在 Pinecone 里
-- 2. 此表仅用于 n8n 工作流执行日志，方便排查问题
-- 3. Railway 部署时同样使用此 schema
