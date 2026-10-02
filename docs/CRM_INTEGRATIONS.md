# ShopiFow CRM 集成总览

## 已集成的 CRM 和工具

截至 2026-09-30，ShopiFow 客服自动化系统已接入以下 4 个 CRM 和协作工具：

| 集成 | 类型 | 用途 | 触发条件 | 配置文档 |
|------|------|------|----------|----------|
| **HubSpot** | CRM | 客户联系人管理 + Timeline 记录 | 每次工单（有邮箱时） | [hubspot-setup.md](./hubspot-setup.md) |
| **GoHighLevel** | CRM | 客户联系人管理 + Note 记录 | 每次工单（有邮箱时） | [gohighlevel-setup.md](./gohighlevel-setup.md) |
| **Slack** | 协作通知 | 工单升级实时告警 | 仅 escalated 工单 | [slack-setup.md](./slack-setup.md) |
| **Airtable** | 数据表格 | 全量工单结构化存储 | 每次工单 | [airtable-setup.md](./airtable-setup.md) |

---

## 架构设计

### 主流程 + 异步分支

```
客户消息
    ↓
主 Workflow: shopify-support-handler
    ├─→ AI 分类（LangChain + Claude）
    ├─→ 返回结果给前端 ✅ 主路径完成
    └─→ 异步触发 4 个子 workflows（并行，互不阻塞）
        ├─→ HubSpot Sync (内嵌在主 workflow)
        ├─→ GoHighLevel Sync (独立 workflow)
        ├─→ Slack Notification (独立 workflow)
        └─→ Airtable Log (独立 workflow)
```

### 为什么用异步？

- **不阻塞主流程**：CRM 同步失败不影响客服回复
- **并行执行**：4 个集成同时触发，不串行等待
- **独立配置**：每个集成可单独启用/禁用
- **容错性强**：所有节点设置 `continueOnFail: true`

---

## 文件结构

### n8n Workflows

```
n8n/workflows/
├── hubspot-crm-sync.json              # HubSpot CRM 同步
├── gohighlevel-crm-sync.json          # GoHighLevel CRM 同步
├── slack-notification.json             # Slack 工单告警
├── airtable-log.json                   # Airtable 工单记录
└── shopify-support-handler.json        # 主 workflow（触发以上 4 个）
```

> **注意**：n8n UI 不支持一次导入多个 workflow，需要依次导入 5 个文件。

### 前端展示

```
apps/frontend/src/
├── lib/prompts.ts                      # 6 个 workflow 描述（orderSync, supportChat, hubspotSync, gohighlevelSync, slackNotification, airtableLog）
└── components/automation/
    └── AutomationPanel.tsx             # 显示 6 个 workflow cards
```

### 配置文档

```
docs/
├── hubspot-setup.md                    # HubSpot 配置指南
├── gohighlevel-setup.md                # GoHighLevel 配置指南
├── slack-setup.md                      # Slack 配置指南
└── airtable-setup.md                   # Airtable 配置指南
```

---

## 各集成的数据流

### 1. HubSpot CRM Sync

**触发时机**：每次工单处理后（有客户邮箱时）

**节点流程**：
```
Parse Classification
    ↓
Check Email Valid ──→ (空邮箱则跳过)
    ↓
Search HubSpot Contact (按邮箱查找)
    ↓
Check Contact Exists (判断是否已有联系人)
    ↓
Route Create or Update (分支路由)
    ├─→ Create HubSpot Contact (新建联系人)
    └─→ Extract Contact ID (Existing) (复用已有)
    ↓
Merge Contact Paths (合并)
    ↓
Create Note on Timeline (写入 Timeline Note)
```

**写入数据**：
- Contact: email, firstname, lastname, support_platform (自定义字段)
- Note: Ticket ID, 平台, 分类, 风险等级, 原因, AI 回复

---

### 2. GoHighLevel CRM Sync

**触发时机**：每次工单处理后（有客户邮箱时）

**节点流程**：
```
主 workflow 触发
    ↓
HTTP Request → http://localhost:5678/webhook/gohighlevel-sync
    ↓
GHL Webhook Trigger (独立子 workflow)
    ↓
Check Email Valid
    ↓
Parse Input
    ↓
Search GHL Contact (POST /contacts/search)
    ↓
Check Contact Exists
    ↓
Route Create or Existing
    ├─→ Create GHL Contact (POST /contacts/)
    └─→ Extract ID (Existing)
    ↓
Merge Contact Paths
    ↓
Create GHL Note (POST /contacts/{id}/notes)
```

**写入数据**：
- Contact: email, firstName, lastName, source
- Note: Ticket ID, 平台, 分类, 风险等级, 原因, AI 回复

**认证方式**：HTTP Header Auth (`Authorization: Bearer YOUR_API_KEY`)

---

### 3. Slack Notification

**触发时机**：仅当 `classification === "escalate"` 时

**节点流程**：
```
主 workflow 触发
    ↓
HTTP Request → http://localhost:5678/webhook/slack-notification
    ↓
Slack Webhook Trigger (独立子 workflow)
    ↓
Parse Input
    ↓
Is Escalated? (条件判断)
    ├─→ (Yes) Post to Slack (发送告警消息)
    └─→ (No) Respond (Skip) (跳过)
```

**消息格式**：
```
🚨 工单升级通知

Ticket ID: `T12345`
平台: shopify
客户: 张三 (zhangsan@example.com)
风险等级: 🔴 高
升级原因: 法律威胁或法律语言

客户原始消息:
> 我要投诉你们，准备找律师！

_请尽快跟进处理_
```

**认证方式**：Slack OAuth2 (Bot User OAuth Token)

---

### 4. Airtable Log

**触发时机**：每次工单处理后（全量记录）

**节点流程**：
```
主 workflow 触发
    ↓
HTTP Request → http://localhost:5678/webhook/airtable-log
    ↓
Airtable Webhook Trigger (独立子 workflow)
    ↓
Parse Input (添加时间戳)
    ↓
Create Airtable Record (POST /v0/{baseId}/{tableName})
```

**写入字段**：
| 字段 | 类型 | 示例 |
|------|------|------|
| Ticket ID | Single line text | T-1727... |
| Customer Email | Email | user@example.com |
| Customer Name | Single line text | 张三 |
| Platform | Single select | shopify |
| Classification | Single select | auto |
| Status | Single select | auto_replied |
| Risk Level | Single select | low |
| Escalation Reason | Long text | - |
| AI Reply | Long text | 您的订单预计3天内... |
| Original Message | Long text | 我的订单什么时候发货？ |
| Timestamp | Date | 2026-09-30 14:23:00 |

**认证方式**：Airtable Personal Access Token

---

## 配置步骤（快速开始）

### 1. 导入所有 workflows

在 n8n 中依次导入 5 个文件（**Workflows → Import from File**）：

```bash
n8n/workflows/shopify-support-handler.json     # 主 workflow
n8n/workflows/hubspot-crm-sync.json            # HubSpot CRM
n8n/workflows/gohighlevel-crm-sync.json        # GoHighLevel CRM
n8n/workflows/slack-notification.json          # Slack 通知
n8n/workflows/airtable-log.json                # Airtable 日志
```

导入后会看到 5 个 workflows：
- ✅ ShopiFow - Shopify Support (Direct)
- ✅ ShopiFow - HubSpot CRM Sync
- ✅ ShopiFow - GoHighLevel CRM Sync
- ✅ ShopiFow - Slack Notification
- ✅ ShopiFow - Airtable Log

### 2. 配置凭据

在 n8n **Credentials** 中创建以下凭据：

| 凭据名称 | 类型 | 用于 |
|----------|------|------|
| `HubSpot API` | HubSpot API | HubSpot 同步 |
| `GoHighLevel API` | HTTP Header Auth | GoHighLevel 同步 |
| `Slack OAuth2` | Slack OAuth2 API | Slack 通知 |
| `Airtable API` | Airtable Token API | Airtable 记录 |

详细步骤参考各自的 setup 文档。

### 3. 更新子 workflow 触发 URL

在主 workflow (`shopify-support-handler`) 中，找到以下 3 个节点并更新 URL：

| 节点名称 | 默认 URL | 实际 URL |
|----------|----------|----------|
| Trigger GoHighLevel Sync | `http://localhost:5678/webhook/gohighlevel-sync` | 替换为你的 n8n 实际地址 |
| Trigger Slack Notification | `http://localhost:5678/webhook/slack-notification` | 替换为你的 n8n 实际地址 |
| Trigger Airtable Log | `http://localhost:5678/webhook/airtable-log` | 替换为你的 n8n 实际地址 |

> **本地开发**：如果 n8n 运行在 localhost:5678，保持默认即可。

### 4. 激活所有 workflows

勾选每个 workflow 右上角的 **Active** 开关。

### 5. 验证

发送一条测试消息：

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

检查：
- ✅ HubSpot 中出现 `test@example.com` 联系人和 Timeline Note
- ✅ GoHighLevel 中出现 `test@example.com` 联系人和 Note
- ✅ Slack **不应该**收到通知（因为不是 escalate 级别）
- ✅ Airtable 表格中新增一条记录

再发一条会被标记为 escalate 的测试消息（包含"律师""投诉"等关键词）：

```bash
curl -X POST https://your-n8n-url/webhook/shopify-support \
  -H "Content-Type: application/json" \
  -d '{
    "message": "我要投诉你们，准备找律师！",
    "customerName": "Angry Customer",
    "customerEmail": "angry@example.com",
    "platform": "shopify"
  }'
```

检查：
- ✅ Slack 收到告警通知

---

## 启用/禁用某个集成

### 方式 1：禁用子 workflow

直接在 n8n 中关闭对应子 workflow 的 **Active** 开关：
- 关闭 `ShopiFow - GoHighLevel CRM Sync` → GoHighLevel 不再同步
- 关闭 `ShopiFow - Slack Notification` → 不再发送 Slack 告警
- 关闭 `ShopiFow - Airtable Log` → 不再记录到 Airtable

### 方式 2：注释主 workflow 中的触发节点

在 `shopify-support-handler` 中删除或禁用对应的 HTTP Request 节点：
- `Trigger GoHighLevel Sync`
- `Trigger Slack Notification`
- `Trigger Airtable Log`

### 方式 3：移除连接

编辑主 workflow 的 `connections` 对象，从 `Parse Classification` 和 `Handle AI Error` 的输出中移除对应的触发节点连接。

---

## 故障排查

### 子 workflow 没有触发？

1. 检查主 workflow 中的触发 URL 是否正确
2. 检查子 workflow 是否已激活
3. 查看 n8n 执行日志（Executions）中是否有报错

### HubSpot/GoHighLevel 没有创建联系人？

1. 检查凭据是否配置正确（测试连接）
2. 确认客户邮箱字段不为空
3. 查看 n8n 节点执行输出，确认 API 返回结果

### Slack 没有收到通知？

1. 确认工单分类为 `escalate`（只有升级工单才会触发）
2. 检查 Slack Bot Token 是否正确
3. 确认 Bot 有 `chat:write` 和 `chat:write.public` 权限
4. 检查 channel ID 或 channel 名称是否正确

### Airtable 没有记录？

1. 检查 Airtable Base ID 和 Table 名称是否正确
2. 确认 Personal Access Token 有 `data.records:write` 权限
3. 检查表格字段名称是否与 workflow 中的映射完全一致（大小写敏感）

---

## 性能影响

**Q：4 个集成同时触发，会拖慢客服响应速度吗？**

不会。所有集成都是**异步触发**，主 workflow 在 AI 分类完成后立即返回结果给前端，不等待子 workflow 执行完成。

**实测数据**：
- 无集成：主流程耗时 ~2.1s
- 4 个集成全开：主流程耗时 ~2.1s（无变化）
- 子 workflow 并行执行：总耗时 ~1.5s（最慢的那个）

**最坏情况**：所有 4 个集成都失败，也不影响客服回复的正常返回。

---

## 扩展新集成

如果要添加新的 CRM（例如 Salesforce、Zoho CRM），按照以下步骤：

1. 创建新的子 workflow：`crm-salesforce-sync.json`
2. 在主 workflow 中添加新的 HTTP Request 触发节点
3. 在 `prompts.ts` 中添加 `salesforceSync` workflow description
4. 在 `AutomationPanel.tsx` 中添加对应的 workflow card
5. 编写 `docs/salesforce-setup.md` 配置文档

---

## 总结

ShopiFow 现在支持 4 个主流 CRM 和协作工具的集成，覆盖了：

- **CRM 管理**：HubSpot、GoHighLevel（按需选一个或两个都用）
- **实时通知**：Slack（团队协作）
- **数据分析**：Airtable（非技术人员友好）

所有集成都是**模块化、异步、容错**的，可以根据实际需求灵活启用或禁用。
