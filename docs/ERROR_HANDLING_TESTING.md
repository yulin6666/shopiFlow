# ShopiFow 错误处理测试指南

## 已修改的文件

### 1. 全局错误处理 Workflow（新增）
- **文件**: `n8n/workflows/error-handler-global.json`
- **功能**: 捕获所有 workflow 的错误，发送 Slack 告警 + 写入 PostgreSQL 日志

### 2. 主 Workflows（已添加错误处理）
- `gorgias-support-handler.json` ✅ 已更新
- `shopify-support-handler.json` ✅ 已更新
- `judgeme-review-handler.json` ✅ 已更新

### 3. 备份文件（可回滚）
- `gorgias-support-handler.json.backup`
- `shopify-support-handler.json.backup`
- `judgeme-review-handler.json.backup`

---

## 新增的错误处理机制

### ✅ 1. 全局 Error Trigger
- 任何 workflow 节点报错都会触发独立的错误处理 workflow
- 自动发送 Slack 告警（包含 workflow 名、节点名、错误消息、执行 ID）
- 写入 PostgreSQL `ai_processing_log` 表（action_type = 'workflow_error'）

### ✅ 2. 输入验证（IF 节点 + stopAndError）
- **Gorgias**: 验证 message 非空 + platform 合法值
- **Shopify**: 验证 message 非空
- **Judge.me**: 验证 reviewBody 非空 + rating 在 1-5 范围内
- 验证失败 → `stopAndError` 节点抛出明确错误消息

### ✅ 3. AI Agent 节点级 onError
- **设置**: `onError: "continueErrorOutput"`
- **效果**: AI 调用失败不会中断 workflow，而是走错误分支
- **错误分支**: `Handle AI Error` 节点捕获错误，自动升级为 `escalate` 并发送 Slack

### ✅ 4. Pinecone 节点级 onError
- **设置**: `onError: "continueErrorOutput"`
- **效果**: 向量检索失败不会中断 AI Agent 调用，优雅降级

### ✅ 5. Switch 节点 fallback 输出
- **原来**: Switch 只有 3 个分支（auto/draft/escalate），如果 classification 值非法会静默失败
- **现在**: 添加 `fallbackOutput: "extra"` → 第 4 个输出口接 `stopAndError`
- **效果**: 非法分类值会触发明确的错误消息

### ✅ 6. Parse Classification 容错
- **原来**: JSON parse 失败会抛异常中断流程
- **现在**: try-catch 包裹，parse 失败自动设为 `classification: 'escalate'`
- **效果**: LLM 输出格式错误不会导致 500，而是安全升级给人工

---

## 导入步骤

### 1. 导入全局错误处理 Workflow

1. 打开 n8n（http://localhost:5678）
2. 点击右上角 **+** → **Import from File**
3. 选择 `n8n/workflows/error-handler-global.json`
4. **检查配置**：
   - Slack 节点：确认 credential `slack-api` 已配置
   - PostgreSQL 节点：确认 credential `postgres-credentials` 已配置
   - 如果没有，先配置这两个 credential
5. 点击 **Activate** 激活 workflow

### 2. 重新导入主 Workflows

三个主 workflow 文件已直接修改，需要重新导入：
- `gorgias-support-handler.json`
- `shopify-support-handler.json`
- `judgeme-review-handler.json`

**步骤**：
1. 先 **Deactivate** n8n 中的旧版 workflows
2. 点击 **Import from File** 导入更新后的文件（会覆盖）
2. **检查 Settings**：
   - 点击 workflow 右上角 **⋮** → **Settings**
   - 滚动到 **Error Workflow**
   - 选择 `ShopiFow - Global Error Handler`
   - 点击 **Save**
3. **检查 Credentials**：
   - OpenRouter Chat Model → `openrouter-openai-api`
   - Pinecone → `pinecone-api`
   - OpenAI Embeddings → `openai-api`
   - Slack → `slack-api`
4. 点击 **Activate** 激活 workflow

---

## 测试场景

### 测试 1：正常流程（确保没破坏原功能）

**Gorgias - 自动回复**
```bash
curl -X POST http://localhost:5678/webhook/gorgias-support \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Where is my order?",
    "ticketId": "test-001",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "platform": "amazon"
  }'
```

**期望**: 返回 `classification: "auto"` + AI 回复

---

### 测试 2：输入验证失败

**空消息**
```bash
curl -X POST http://localhost:5678/webhook/gorgias-support \
  -H "Content-Type: application/json" \
  -d '{
    "message": "",
    "ticketId": "test-002",
    "platform": "amazon"
  }'
```

**期望**:
- Workflow 在 `Stop on Invalid Input` 节点终止
- n8n Executions 页面显示红色失败状态
- Slack 收到错误告警："Failed Node: Stop on Invalid Input"
- PostgreSQL `ai_processing_log` 表插入一条 `success=false` 记录

---

**非法 platform**
```bash
curl -X POST http://localhost:5678/webhook/gorgias-support \
  -H "Content-Type: application/json" \
  -d '{
    "message": "test",
    "platform": "invalid_platform"
  }'
```

**期望**:
- Parse Input 节点 throw error
- 触发全局 Error Trigger
- Slack 告警："Invalid platform: invalid_platform"

---

### 测试 3：AI Agent 失败（模拟 OpenRouter API 挂掉）

**方法一：临时删除 OpenRouter credential**
1. 打开 Gorgias Enhanced workflow
2. 编辑 `OpenRouter Chat Model` 节点
3. 临时删除 credential
4. 发送测试请求：
```bash
curl -X POST http://localhost:5678/webhook/gorgias-support \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need help with my order",
    "platform": "amazon"
  }'
```

**期望**:
- AI Agent 节点走错误输出（红色线）
- `Handle AI Error` 节点捕获错误
- 返回 `classification: "escalate"`, `reason: "AI agent failed: ..."`
- Slack 收到升级告警（包含错误详情）
- **不会触发全局 Error Trigger**（因为 onError 已处理）

---

### 测试 4：Pinecone 失败（模拟向量检索挂掉）

1. 临时删除 Pinecone credential
2. 发送包含订单查询的请求：
```bash
curl -X POST http://localhost:5678/webhook/shopify-support \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the status of order #1234?",
    "orderId": "1234"
  }'
```

**期望**:
- Pinecone 节点失败但 AI Agent 继续执行（没有订单上下文）
- AI 返回"无法查询订单信息"之类的回复
- 不会中断整个流程

---

### 测试 5：LLM 返回非法 JSON

**方法**：修改 system prompt 让 LLM 输出纯文本而非 JSON

1. 编辑 Gorgias Enhanced workflow
2. 修改 `Gorgias AI Agent` 节点的 system prompt，删除"Respond in JSON only"这句
3. 发送请求

**期望**:
- `Parse Classification` 节点的 try-catch 捕获 JSON parse 错误
- 自动设为 `classification: 'escalate'`, `reason: 'AI output parse error'`
- 发送 Slack 告警
- 不会抛 500 错误

---

### 测试 6：Switch 路由失败（模拟非法分类值）

**方法**：手动修改 Parse Classification 返回值

1. 编辑 Gorgias Enhanced workflow
2. 在 `Parse Classification` 节点的代码里，强制设置：
   ```javascript
   parsed.classification = 'unknown_category';
   ```
3. 发送请求

**期望**:
- Switch 节点走 fallback 输出（第 4 个输出口）
- `Stop on Invalid Route` 节点终止流程
- 错误消息："Classification route failed: unknown_category"
- 触发全局 Error Trigger

---

### 测试 7：Judge.me Review - 非法 rating

```bash
curl -X POST http://localhost:5678/webhook/judgeme-review \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 10,
    "body": "Great product!",
    "productTitle": "Test Product"
  }'
```

**期望**:
- `Parse Input` 节点 throw error："Invalid rating: 10. Must be between 1 and 5"
- 触发全局 Error Trigger
- Slack 告警

---

### 测试 8：Review - AI 生成回复失败

1. 临时删除 OpenRouter credential（Judge.me workflow）
2. 发送请求：
```bash
curl -X POST http://localhost:5678/webhook/judgeme-review \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "body": "Excellent!",
    "productTitle": "Test Product"
  }'
```

**期望**:
- `Handle AI Error` 节点生成 fallback 回复：`"[AI failed to generate reply - requires manual response]"`
- 自动设为 `status: 'needs_approval'`
- Slack 告警包含错误详情

---

## 验证清单

### n8n UI 检查
- [ ] Executions 页面显示失败的执行为红色
- [ ] 点击失败的执行，查看具体哪个节点报错
- [ ] Error Trigger workflow 有对应的成功执行记录

### Slack 检查
- [ ] 收到错误告警消息
- [ ] 消息包含：workflow 名、节点名、错误消息、执行 ID
- [ ] 格式清晰可读

### PostgreSQL 检查
```sql
SELECT * FROM ai_processing_log
WHERE action_type = 'workflow_error'
ORDER BY created_at DESC
LIMIT 10;
```
- [ ] 有错误日志记录
- [ ] `success = false`
- [ ] `error_msg` 包含错误信息
- [ ] `details` 包含完整错误 JSON

---

## 对比原版 vs 增强版

| 方面 | 原版 | 增强版 |
|------|------|--------|
| 输入验证 | Parse Input 节点手动 throw | IF 节点 + stopAndError（明确错误消息） |
| AI 失败处理 | 直接抛异常，workflow 红色失败 | 走错误分支，自动升级给人工，返回 200 |
| JSON parse 失败 | workflow 崩溃 | try-catch 兜底，自动升级 |
| 非法分类值 | Switch 无匹配，静默失败 | fallback 输出 + stopAndError |
| 全局错误 | 无告警 | Slack + DB 双写 |
| Pinecone 失败 | 整个流程中断 | 优雅降级，AI 不使用向量检索继续工作 |

---

## 回滚方案

如果更新后的 workflows 有问题，可以快速回滚：

```bash
cd /Users/lindediannao/Documents/project/shopiFlow/n8n/workflows

# 回滚到备份版本
cp gorgias-support-handler.json.backup gorgias-support-handler.json
cp shopify-support-handler.json.backup shopify-support-handler.json
cp judgeme-review-handler.json.backup judgeme-review-handler.json
```

然后在 n8n 中重新导入这些文件。

---

## 生产部署建议

1. **Slack Webhook**：用独立的 `#n8n-errors` 频道，避免刷屏主频道
2. **PostgreSQL 清理**：定期清理 `ai_processing_log` 表（保留 30 天）
3. **告警降噪**：高频错误（如 credential 未配置）触发一次后 1 小时内不再重复告警
4. **监控**：定期检查 `ai_processing_log` 表，统计错误类型和频率

---

## 常见问题

**Q: 为什么 AI Agent 错误不会触发全局 Error Trigger？**
A: 因为设置了 `onError: "continueErrorOutput"`，错误被节点自己捕获了，不会向上传播。

**Q: stopAndError 和直接 throw 有什么区别？**
A: stopAndError 是专用节点，错误消息更清晰，n8n UI 显示更友好。

**Q: 如果 Slack 发送失败会怎样？**
A: Slack 节点设置了 `continueOnFail: true`，发送失败不会阻塞 workflow，会继续写 DB。

**Q: 错误处理会影响性能吗？**
A: IF 节点和 try-catch 开销极小（<10ms），可以忽略。
