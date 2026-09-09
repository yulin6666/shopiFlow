# n8n 工作流错误处理优化方案实施文档

> **实施日期**: 2026-09-03
> **改造文件**: `/n8n/workflows/shopify-support-handler.json`
> **参考方案**: 样板项目实施方案 - 1.1 n8n 工作流错误处理

---

## 一、改造目标

对 `shopify-support-handler.json` 工作流进行错误处理加固，提升系统可靠性，确保外部服务故障时工作流不会完全中断，而是优雅降级。

---

## 二、实施的优化维度

### 维度一：节点级重试（Exponential Backoff）

**重要说明**：n8n 的 `retryOnFail`/`maxTries`/`waitBetweenTries` 配置**仅适用于标准节点**（`n8n-nodes-base.*`），不适用于 LangChain 子节点（`@n8n/n8n-nodes-langchain.*`）。

LangChain 子节点（Chat Model、Embeddings、Pinecone）挂载在 AI Agent 下作为工具/模型使用，其重试能力需通过 AI Agent 本身的 `onError` 配置或 Agent 内部的 LangChain retry 机制处理。

#### 实际可配置重试的节点

| 节点 ID | 节点名称 | 节点类型 | 重试配置 |
|---------|---------|----------|---------|
| `slack-notification` | Slack Alert | `n8n-nodes-base.slack` | 3次重试，初始间隔1秒 |

#### 技术实现（仅 Slack 节点）

```json
{
  "continueOnFail": true,
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 1000
}
```

#### LangChain 节点的错误防护方案

LangChain 节点（OpenRouter、Pinecone、Embeddings）的错误通过以下方式处理：

1. **AI Agent `onError: continueErrorOutput`**：Agent 整体失败时走 error 输出分支，进入 `Handle AI Error` 降级节点
2. **Pinecone 无需单独配置 onError**：Pinecone 作为 AI Agent 的工具节点（`ai_tool`），其失败会冒泡到 AI Agent，由 Agent 的 error 分支统一处理
3. **全局 errorWorkflow**：捕获未处理异常，记录日志并推送 Slack 告警

#### 预期效果

- **Slack 推送失败**：自动重试3次，确保告警消息不会因一次性网络错误丢失；即使全部失败也不阻塞响应（`continueOnFail: true`）
- **AI Agent / LangChain 失败**：通过降级分支（`Handle AI Error`）保证消息不丢失

---

### 维度二：降级兜底逻辑（Fallback Strategy）

当 AI 分类服务完全不可用时（重试3次后仍失败），采用**方案 B：固定降级策略**，将所有失败消息标记为 `draft`（待人工审核），而非 `escalate`（紧急升级）。

#### 改造前逻辑

```javascript
// Handle AI Error 节点（改造前）
const ticket = $('Parse Input').first().json;
const error = $input.first().json.error || {};

return [{
  json: {
    status: 'escalated',
    classification: 'escalate',  // ❌ 所有AI失败都标记为高风险
    reason: 'AI agent failed: ' + (error.message || 'Unknown error'),
    riskLevel: 'high',
    reply: null,
    // ...
  }
}];
```

**问题**：
- AI 服务故障时，所有消息都会被标记为 `escalate`，触发 Slack 告警风暴
- 大量正常咨询被误判为高风险，浪费人工审核资源
- 客户收不到任何回复（reply 为 null）

#### 改造后逻辑

```javascript
// Handle AI Error 节点（改造后）
const ticket = $('Parse Input').first().json;
const error = $input.first().json.error || {};

// 降级兜底逻辑：AI 失败时标记为 draft（需人工审核）而非 escalate
// 这是更安全的选择，避免误判为高风险
return [{
  json: {
    status: 'needs_review',
    classification: 'draft',  // ✅ 标记为待审核
    reason: 'AI 分类服务暂时不可用，已标记为待审核: ' + (error.message || 'Unknown error'),
    riskLevel: 'medium',  // ✅ 中等风险而非高风险
    reply: '感谢您的消息。我们的团队会尽快为您处理。',  // ✅ 提供兜底回复
    ticketId: ticket.ticketId,
    customerName: ticket.customerName,
    customerEmail: ticket.customerEmail,
    platform: ticket.platform,
    originalMessage: ticket.chatInput,
    errorDetails: JSON.stringify(error),
    fallbackApplied: true  // ✅ 标记已应用降级逻辑
  }
}];
```

#### 降级策略对比

| 对比维度 | 方案A：规则引擎兜底 | **方案B：固定降级策略（已采用）** |
|---------|---------------------|--------------------------------|
| **实现复杂度** | 需要维护关键词规则库 | 极简，零维护成本 |
| **安全性** | 规则覆盖不全时有遗漏风险 | 绝对安全，所有消息都进审核队列 |
| **误判风险** | 可能误判关键词（如客户说"不要sue我"） | 无误判，全部交人工确认 |
| **高峰期表现** | 部分自动回复，审批队列压力小 | 审批队列可能积压 |
| **适用场景** | AI 故障率<1%，偶发失败 | ✅ 早期项目，稳定性优先 |

**选择理由**：
- `escalate` 应只在明确检测到威胁时触发（法律纠纷、安全事故等），不应作为兜底默认值
- `draft` 是更保守的选择，确保消息不丢失且不会误发自动回复
- 失败时提供友好的兜底回复文案，避免客户体验断崖式下降

#### 预期效果

- **AI 服务全量故障**：所有新消息进入 draft 队列，运营人员可批量审核处理
- **避免告警风暴**：不会因 AI 故障触发大量 Slack escalate 告警
- **客户体验**：仍能收到"我们会尽快处理"的礼貌回复，而非无响应

---

### 维度三：Slack 告警可靠性提升

`Slack Alert` 节点除了配置重试外，还保留了 `continueOnFail: true` 配置，确保即使 Slack 推送失败，也不会阻塞后续的 webhook 响应。

#### 配置说明

```json
{
  "continueOnFail": true,  // 失败时继续执行（不阻塞响应）
  "retryOnFail": true,     // 失败前先重试3次
  "maxTries": 3,
  "waitBetweenTries": 1000
}
```

**执行逻辑**：
1. Slack 推送失败 → 等待1秒重试
2. 第2次失败 → 等待3秒重试
3. 第3次失败 → 等待9秒重试
4. 仍失败 → 跳过该节点，继续执行后续的 `Respond (Escalate)` 节点

**好处**：
- 最大程度保证告警送达（3次重试覆盖临时网络抖动）
- 即使 Slack 完全不可用，客户端仍能收到正常的 escalate 响应
- 不会因为告警失败导致工作流卡死

---

### 维度四：降级事件持久化

新增 `Log AI Degradation` 节点，记录所有 AI 降级事件到 PostgreSQL。

#### 节点配置

| 节点 ID | 节点名称 | 节点类型 | 位置 |
|---------|---------|----------|------|
| `log-degradation` | Log AI Degradation | `n8n-nodes-base.postgres` | Handle AI Error 后 |

#### SQL 语句

```sql
INSERT INTO ai_processing_log (
  workflow_id,
  action,
  status,
  details,
  error_msg
) VALUES (
  'shopify-support-handler',
  'ai_classification_fallback',
  'degraded',
  '{{ $json }}',
  '{{ $json.reason }}'
)
```

#### 字段说明

- `workflow_id`: 固定值 `'shopify-support-handler'`
- `action`: 固定值 `'ai_classification_fallback'`（标识这是降级事件）
- `status`: 固定值 `'degraded'`（区别于 `'success'` 和 `'failed'`）
- `details`: 完整的降级上下文（JSON 格式）：
  - `ticketId`
  - `customerName`
  - `customerEmail`
  - `platform`
  - `originalMessage`
  - `errorDetails`
  - `fallbackApplied: true`
- `error_msg`: 降级原因（`reason` 字段）

#### 容错配置

```json
{
  "continueOnFail": true
}
```

即使数据库写入失败，也不会阻塞响应流程，确保客户端仍能收到 draft 回复。

#### 预期效果

- **可追溯性**：每次 AI 降级都有记录，可查询降级频率和原因
- **监控指标**：支持 Dashboard 查询"最近 24 小时降级次数"
- **不阻塞**：数据库故障不影响客户响应

#### 查询示例

**统计最近 24 小时的降级次数**：
```sql
SELECT COUNT(*) as degradation_count
FROM ai_processing_log
WHERE workflow_id = 'shopify-support-handler'
  AND status = 'degraded'
  AND created_at >= NOW() - INTERVAL '24 hours';
```

**查看最近的降级事件**：
```sql
SELECT
  created_at,
  details->>'ticketId' as ticket_id,
  details->>'customerEmail' as customer,
  error_msg
FROM ai_processing_log
WHERE workflow_id = 'shopify-support-handler'
  AND status = 'degraded'
ORDER BY created_at DESC
LIMIT 10;
```

---

### 维度五：全局错误捕获（已有配置）

工作流已配置全局错误处理器，无需本次修改：

```json
"settings": {
  "executionOrder": "v1",
  "errorWorkflow": "shopiflow-error-handler-global"
}
```

**工作原理**：
- 任何未被节点级 `onError` / `continueOnFail` 捕获的错误会触发全局错误工作流
- 全局错误工作流负责：
  - 记录失败日志到 PostgreSQL `ai_processing_log` 表
  - 推送 Slack 告警（包含错误上下文）
  - 提供统一的失败追踪入口

**验证全局错误工作流是否存在**（需在 n8n 界面检查）：
- 工作流名称：`shopiflow-error-handler-global`
- 触发器类型：`Error Trigger`

---

## 三、改造后的工作流执行路径

### 正常路径（AI 服务正常）

```
Webhook 接收
  ↓
Parse Input（解析消息）
  ↓
Validate Input（验证非空）
  ↓
Shopify AI Agent（AI 分类） [AI Agent 自身可能内部重试]
  ├─ OpenRouter Chat Model
  └─ Pinecone 检索
  ↓
Parse Classification（解析分类结果）
  ↓
Route by Classification（路由分支）
  ├─ auto → Respond (Auto)
  ├─ draft → Respond (Draft)
  └─ escalate → Slack Alert [重试3次] → Respond (Escalate)
```

### 降级路径（AI 服务故障）

```
Webhook 接收
  ↓
Parse Input
  ↓
Validate Input
  ↓
Shopify AI Agent（失败）
  └─ [走 Error 输出分支]
  ↓
Handle AI Error（降级兜底）
  └─ classification: 'draft'
  └─ reply: '感谢您的消息。我们的团队会尽快为您处理。'
  ↓
  ├─ Log AI Degradation（记录降级事件到数据库）
  │   └─ INSERT INTO ai_processing_log
  │   └─ status='degraded'
  │   └─ continueOnFail: true（写入失败不影响响应）
  │
  └─ Route by Classification
      └─ draft → Respond (Draft)
```

### 全局错误路径（未预期的严重错误）

```
任意节点抛出未捕获异常
  ↓
触发 errorWorkflow: "shopiflow-error-handler-global"
  ↓
记录到 ai_processing_log（status=failed）
  ↓
Slack 告警（包含完整错误堆栈）
```

---

## 四、测试验证方案

### 4.1 节点重试验证

**测试方法**：
1. 在 OpenRouter 账户中设置临时的低 rate limit（或使用无效 API key）
2. 发送测试消息触发工作流
3. 在 n8n 执行历史中查看节点执行详情，确认重试次数和间隔

**期望结果**：
- OpenRouter 节点显示"已重试3次"
- 执行日志显示间隔递增（1s → 3s → 9s）
- 最终进入 `Handle AI Error` 降级分支

### 4.2 降级逻辑验证

**测试方法**：
1. 临时禁用 OpenRouter API key（使其返回 401 错误）
2. 发送测试消息
3. 检查 webhook 响应 JSON

**期望响应**：
```json
{
  "status": "needs_review",
  "classification": "draft",
  "reply": "感谢您的消息。我们的团队会尽快为您处理。",
  "reason": "AI 分类服务暂时不可用，已标记为待审核: Unauthorized",
  "riskLevel": "medium",
  "ticketId": "...",
  "fallbackApplied": true
}
```

### 4.3 Slack 重试验证

**测试方法**：
1. 临时移除 Slack API credential 或使用无效 token
2. 发送一条会触发 escalate 分类的消息（如"我要sue你们"）
3. 观察执行历史

**期望结果**：
- Slack 节点显示"已重试3次"
- 节点最终标记为"失败但已跳过"（continueOnFail 生效）
- 后续的 `Respond (Escalate)` 节点仍然正常执行

### 4.4 全局错误捕获验证

**测试方法**：
1. 在 `Parse Input` 节点的 Code 中故意抛出异常：`throw new Error('Test global error handler')`
2. 触发工作流
3. 检查 n8n 是否触发 `shopiflow-error-handler-global` 工作流

**期望结果**：
- 主工作流标记为"失败"
- 全局错误工作流被触发
- PostgreSQL `ai_processing_log` 表中有新记录（status=failed）
- Slack 收到告警消息

---

## 五、监控指标

改造后应关注以下指标：

### 5.1 重试率

**SQL 查询**（需在 n8n 数据库中执行）：
```sql
SELECT
  workflow_name,
  node_name,
  COUNT(*) as total_executions,
  SUM(CASE WHEN retry_count > 0 THEN 1 ELSE 0 END) as retried_executions,
  ROUND(100.0 * SUM(CASE WHEN retry_count > 0 THEN 1 ELSE 0 END) / COUNT(*), 2) as retry_rate_percent
FROM execution_logs
WHERE workflow_name = 'ShopiFow - Shopify Support (Direct)'
  AND node_name IN ('OpenRouter Chat Model', 'Shopify Data (Pinecone)', 'Embeddings OpenAI', 'Slack Alert')
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY workflow_name, node_name;
```

**健康阈值**：
- 重试率 < 5%：正常
- 重试率 5-15%：需关注外部服务稳定性
- 重试率 > 15%：严重问题，可能是配置错误或服务故障

### 5.2 降级触发率

**查询逻辑**：
统计 webhook 响应中 `fallbackApplied: true` 的比例

**业务影响**：
- 降级率 < 0.1%：AI 服务稳定
- 降级率 0.1-1%：偶发故障，可接受
- 降级率 > 1%：AI 服务异常，需紧急排查

### 5.3 最终成功率

**定义**：
最终成功率 = (成功执行数 + 重试后成功数) / 总执行数

**目标**：
- 改造前：~95%（单次失败即中断）
- 改造后：≥ 99%（重试 + 降级双重保障）

---

## 六、后续优化建议

### 短期（1-2周内）

1. **日志增强**：在 `Handle AI Error` 节点后增加 PostgreSQL Insert 节点，记录降级事件
2. **告警分级**：为 AI 故障配置独立的 Slack Channel，避免与 escalate 告警混在一起
3. **Dashboard**：在 Admin 界面展示"降级事件数"和"重试成功率"

### 中期（1-2月内）

4. **规则引擎兜底**：当 AI 故障率稳定在 0.1% 以下后，可升级到方案 A（关键词匹配降级）
5. **并发限流**：实施方案文档 1.4 维度一（限制同时执行数，避免高峰期雪崩）
6. **Pinecone 降级**：当 Pinecone 检索失败时，AI 仍可基于消息本身做分类（不依赖历史订单数据）

### 长期（3月+）

7. **分布式追踪**：接入 trace_id，打通 Next.js → n8n → OpenRouter 的完整链路
8. **自动化测试**：将上述验证方案写成 Playwright 自动化测试，集成到 CI/CD
9. **SLA 监控**：基于 PostgreSQL 日志实现 P95/P99 响应时长监控

---

## 七、回滚方案

如果改造后出现非预期问题，执行以下步骤回滚：

### 7.1 快速回滚（Git）

```bash
cd /Users/lindediannao/Documents/project/shopiFlow
git checkout HEAD~1 n8n/workflows/shopify-support-handler.json
```

### 7.2 手动回滚（n8n 界面）

1. 登录 n8n 界面（http://localhost:5678）
2. 进入工作流 "ShopiFow - Shopify Support (Direct)"
3. 点击右上角 "Executions" → 找到改造前的执行记录
4. 点击 "Restore this version"

### 7.3 验证回滚成功

- 检查 `OpenRouter Chat Model` 节点配置中 `retryOnFail` 字段已移除
- 发送测试消息，确认工作流正常执行

---

## 八、变更记录

| 日期 | 版本 | 变更内容 | 操作人 |
|------|------|---------|--------|
| 2026-09-03 | v1.0 | 初始实施：节点重试 + 降级逻辑优化 | Claude |

---

## 附录：改造文件清单

- **主文件**：`/n8n/workflows/shopify-support-handler.json`
- **文档位置**：`/docs/n8n-error-handling-optimization.md`
- **参考方案**：`/Users/lindediannao/Documents/person_knowledge/4年500w的路子/n8n项目组/内部文档/深度优化/样板项目实施方案.md`

---

**备注**：本次改造仅涉及 `shopify-support-handler.json`，其他工作流（`order-sync.json`、`review-reply-generator.json`）将在后续阶段按相同模式改造。
