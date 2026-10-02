# GoHighLevel 集成配置指南

## 概述

本次集成在客服 workflow 中添加了异步的 GoHighLevel CRM 同步分支。每次 AI 处理完客服消息后，会自动：

1. 在 GoHighLevel 中按邮箱查找客户（Contact），不存在则创建
2. 在该 Contact 上创建一条 Note，记录 AI 分类结果

主流程（客服响应）不受影响，GoHighLevel 同步为独立的子 workflow，失败不影响客服回复。

---

## 第一步：获取 GoHighLevel API Key

### 方式 A：Agency API Key（推荐）

1. 登录 GoHighLevel，进入 **Agency 视图**
2. 点击左下角 **Settings**
3. 进入 **API Keys** 页面
4. 点击 **Create API Key**，填写名称：`ShopiFow n8n`
5. 复制生成的 API Key

### 方式 B：Sub-Account API Key

1. 进入具体 Sub-Account
2. **Settings → Integrations → API Keys**
3. 生成并复制 API Key

> **注意**：GoHighLevel v2 API 需要在请求头中传入 `Version: 2021-07-28`，workflow 已自动处理。

---

## 第二步：在 n8n 中配置凭据

1. 打开 n8n，进入 **Credentials → New Credential**
2. 搜索并选择 **HTTP Header Auth**
3. 填写：
   - **Credential Name**：`GoHighLevel API`（必须与 workflow 中一致）
   - **Name**：`Authorization`
   - **Value**：`Bearer 你的API_KEY`（注意加上 `Bearer ` 前缀）
4. 点击 **Save**

---

## 第三步：导入子 Workflow

1. 在 n8n 中点击 **Workflows → Import from File**
2. 选择：
   ```
   n8n/workflows/hubspot-crm-sync.json（HubSpot）
   n8n/workflows/gohighlevel-crm-sync.json（GoHighLevel）
   n8n/workflows/slack-notification.json（Slack）
   n8n/workflows/airtable-log.json（Airtable）
   ```
   n8n 会自动导入文件中的全部 4 个 workflows（主流程 + GoHighLevel + Slack + Airtable）
3. 找到 `ShopiFow - GoHighLevel CRM Sync`，检查以下节点的凭据是否绑定正确：
   - **Search GHL Contact** → `GoHighLevel API`
   - **Create GHL Contact** → `GoHighLevel API`
   - **Create GHL Note** → `GoHighLevel API`
4. 记录该 workflow 的 **Webhook URL**，格式为：
   ```
   https://your-n8n-url/webhook/gohighlevel-sync
   ```
5. 激活 workflow

---

## 第四步：更新主 Workflow 中的触发 URL

1. 打开 `ShopiFow - Shopify Support (Direct)` workflow
2. 找到 **Trigger GoHighLevel Sync** 节点
3. 将 URL 更新为上一步获取的实际 webhook URL：
   ```
   https://your-n8n-url/webhook/gohighlevel-sync
   ```
4. 保存并重新激活主 workflow

> **本地开发**：如果 n8n 运行在本地，保持默认 `http://localhost:5678/webhook/gohighlevel-sync` 即可。

---

## 验证效果

发送一条带邮箱的测试消息：

```bash
curl -X POST https://your-n8n-url/webhook/shopify-support \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Where is my order?",
    "customerName": "Test User",
    "customerEmail": "test@example.com",
    "platform": "shopify"
  }'
```

然后在 GoHighLevel 中搜索 `test@example.com`，进入该 Contact，应看到一条 Note：

```
【AI客服记录】
Ticket ID: ...
平台: shopify
分类: auto
风险等级: low
原因: ...
AI回复: ...

--- 由 n8n 自动同步 ---
```

---

## 节点说明

| 节点 | 作用 |
|------|------|
| Check Email Valid | 邮箱为空则跳过整个分支 |
| Parse Input | 提取主 workflow 传入的字段 |
| Search GHL Contact | POST /contacts/search，按邮箱查找 |
| Check Contact Exists | 判断是否已有 Contact |
| Route Create or Existing | 路由到创建或复用路径 |
| Create GHL Contact | POST /contacts/，创建新 Contact |
| Extract Contact ID | 从创建/查找结果中提取 Contact ID |
| Merge Contact Paths | 合并两条路径，统一输出 contactId |
| Create GHL Note | POST /contacts/{id}/notes，写入 Note |

---

## 常见问题

**Q：GoHighLevel 节点失败会影响客服回复吗？**
不会。所有 GoHighLevel 节点均设置了 `continueOnFail: true`，且为独立子 workflow，失败不影响主流程。

**Q：同一客户多次发消息，会创建多个 Contact 吗？**
不会。`Search GHL Contact` 按 email 查找，找到已有 Contact 则直接复用 ID。

**Q：没有 customerEmail 的消息怎么处理？**
`Check Email Valid` 节点检测到空邮箱后直接跳过，子 workflow 不执行。

**Q：API Key 和 Location ID 有什么区别？**
Agency Key 可访问所有 Sub-Account。如果只想同步到特定 Sub-Account，在 API 请求时需要带上 `locationId` 参数——`Create GHL Contact` 节点的 `jsonBody` 中添加 `"locationId": "你的Location_ID"` 即可。
