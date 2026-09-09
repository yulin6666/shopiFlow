# ShopiFow 错误处理升级总结

## 修改文件清单

### ✅ 新增文件
1. `n8n/workflows/error-handler-global.json` - 全局错误处理 workflow
2. `docs/ERROR_HANDLING_TESTING.md` - 完整测试指南

### ✅ 已修改文件（添加错误处理）
1. `n8n/workflows/gorgias-support-handler.json`
2. `n8n/workflows/shopify-support-handler.json`
3. `n8n/workflows/judgeme-review-handler.json`

### 📦 备份文件（可回滚）
1. `gorgias-support-handler.json.backup`
2. `shopify-support-handler.json.backup`
3. `judgeme-review-handler.json.backup`

---

## 每个 Workflow 新增的节点

### Gorgias Support Handler
**新增 4 个节点**：
1. `Validate Input` (IF 节点) - 验证 message 非空 + platform 合法
2. `Stop on Invalid Input` (stopAndError) - 输入验证失败时终止
3. `Handle AI Error` (Code) - 捕获 AI Agent 错误输出
4. `Stop on Invalid Route` (stopAndError) - Switch fallback 路由

**修改节点**：
- `Parse Input` - 添加输入验证逻辑（throw error）
- `Gorgias AI Agent` - 添加 `onError: "continueErrorOutput"`
- `Order Lookup (Pinecone)` - 添加 `onError: "continueErrorOutput"`
- `Parse Classification` - 添加 try-catch 容错
- `Route by Classification` - 添加 `fallbackOutput: "extra"`

**Settings 修改**：
- 添加 `errorWorkflow: "shopiflow-error-handler-global"`

### Shopify Support Handler
**新增 4 个节点**（同上）：
1. `Validate Input` (IF 节点)
2. `Stop on Invalid Input` (stopAndError)
3. `Handle AI Error` (Code)
4. `Stop on Invalid Route` (stopAndError)

**修改节点**：
- `Parse Input` - 添加输入验证
- `Shopify AI Agent` - 添加 `onError: "continueErrorOutput"`
- `Shopify Data (Pinecone)` - 添加 `onError: "continueErrorOutput"`
- `Parse Classification` - 添加 try-catch
- `Route by Classification` - 添加 `fallbackOutput: "extra"`

**Settings 修改**：
- 添加 `errorWorkflow: "shopiflow-error-handler-global"`

### Judge.me Review Handler
**新增 4 个节点**：
1. `Validate Input` (IF 节点) - 验证 body 非空 + rating 在 1-5
2. `Stop on Invalid Input` (stopAndError)
3. `Handle AI Error` (Code)
4. `Stop on Invalid Route` (stopAndError)

**修改节点**：
- `Parse Input` - 添加 rating 范围验证
- `Review AI Agent` - 添加 `onError: "continueErrorOutput"`
- `Product Knowledge (Pinecone)` - 添加 `onError: "continueErrorOutput"`
- `Parse Reply & Determine Status` - 添加 reply 长度验证
- `Route by Rating` - 添加 `fallbackOutput: "extra"`

**Settings 修改**：
- 添加 `errorWorkflow: "shopiflow-error-handler-global"`

---

## 错误处理机制对比

| 机制 | 原版 | 升级版 |
|------|------|--------|
| 全局错误捕获 | ❌ 无 | ✅ Error Trigger → Slack + DB |
| 输入验证 | ⚠️ 手动 throw | ✅ IF + stopAndError |
| AI 失败处理 | ❌ 直接中断 | ✅ 错误分支 → 自动升级 |
| JSON parse 失败 | ❌ workflow 崩溃 | ✅ try-catch 兜底 |
| 非法分类值 | ⚠️ 静默失败 | ✅ fallback + stopAndError |
| Pinecone 失败 | ❌ 整个中断 | ✅ 优雅降级 |
| 节点级 onError | ❌ 无 | ✅ AI/Pinecone 节点 |

---

## 导入步骤

### 1. 导入全局 Error Handler
```bash
# 在 n8n UI 中
1. 点击右上角 + → Import from File
2. 选择 n8n/workflows/error-handler-global.json
3. 配置 Slack 和 PostgreSQL credentials
4. 点击 Activate
```

### 2. 重新导入主 Workflows
```bash
# 对每个文件执行：
1. Deactivate 旧版 workflow
2. Import from File 导入更新版本（会覆盖）
3. 在 Settings 中确认 Error Workflow = "ShopiFow - Global Error Handler"
4. 检查所有 credentials 配置正确
5. Activate
```

---

## 测试清单

详细测试步骤见 `docs/ERROR_HANDLING_TESTING.md`

**必测场景**：
- [ ] 正常流程（确保没破坏功能）
- [ ] 空消息输入
- [ ] 非法 platform / rating
- [ ] AI Agent 失败（删除 OpenRouter credential）
- [ ] JSON parse 失败
- [ ] Slack 收到错误告警
- [ ] PostgreSQL 记录错误日志

---

## 如何回滚

```bash
cd /Users/lindediannao/Documents/project/shopiFlow/n8n/workflows

cp gorgias-support-handler.json.backup gorgias-support-handler.json
cp shopify-support-handler.json.backup shopify-support-handler.json
cp judgeme-review-handler.json.backup judgeme-review-handler.json

# 然后在 n8n 中重新导入
```

---

## 生产部署建议

1. **Slack 频道隔离**：用独立的 `#n8n-errors` 频道
2. **日志清理**：定期清理 `ai_processing_log` 表（保留 30 天）
3. **告警降噪**：同类错误 1 小时内只告警一次
4. **监控仪表盘**：统计错误类型和频率

---

## 面试可以说的点

**原来的问题**：
- AI 调用失败整个 workflow 红色，用户看到 500 错误
- 输入验证失败没有明确的错误消息
- JSON parse 失败直接崩溃
- 没有错误告警，只能事后查 n8n 执行历史

**优化后**：
- AI 失败自动走错误分支，升级给人工处理，用户仍收到有意义的响应
- 输入验证用 IF + stopAndError，错误消息清晰（"Invalid rating: 10. Must be between 1 and 5"）
- JSON parse 失败有 try-catch 兜底，自动升级而不是崩溃
- 全局 Error Trigger 捕获所有错误 → Slack 实时告警 + PostgreSQL 持久化
- 关键节点（AI、Pinecone）设置了 `onError: "continueErrorOutput"`，失败不阻塞流程

**体现的能力**：
- 生产环境思维（可观测性、容错、优雅降级）
- n8n 错误处理机制的深度理解
- 防御性编程（输入验证、JSON 容错、分类值校验）
