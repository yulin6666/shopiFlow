# Airtable 集成配置指南

## 概述

本次集成在客服 workflow 中添加了 Airtable 数据记录功能。每次 AI 处理完客服消息后，会自动在 Airtable 表格中新增一条记录，包含：

- 工单 ID、平台、客户信息
- AI 分类结果、风险等级、升级原因
- AI 回复内容、客户原始消息
- 时间戳

团队成员可以直接在 Airtable 中查看、筛选、导出所有工单记录，无需任何技术背景。

---

## 为什么用 Airtable？

- **非技术人员友好**：像 Excel 一样简单，支持拖拽、筛选、排序
- **多视图支持**：表格视图、看板视图、日历视图、画廊视图
- **实时协作**：多人同时查看和编辑
- **数据导出**：一键导出 CSV/Excel
- **API 友好**：可以做成团队的数据中台

典型使用场景：
- 运营团队查看每天的工单量和分类分布
- 客服主管筛选所有 `escalate` 级别的工单
- 财务团队导出月度报表
- 产品经理分析高频问题类型

---

## 第一步：创建 Airtable Base 和 Table

1. 登录 Airtable，进入 https://airtable.com/
2. 点击 **Add a base → Start from scratch**
3. 命名 Base：`ShopiFow Support Tickets`
4. 创建一个表格，命名为：`Support Tickets`
5. 添加以下字段（列）：

| 字段名 | 字段类型 | 说明 |
|--------|----------|------|
| **Ticket ID** | Single line text | 工单唯一标识 |
| **Customer Email** | Email | 客户邮箱 |
| **Customer Name** | Single line text | 客户姓名 |
| **Platform** | Single select | 来源平台（选项：shopify, amazon, tiktok） |
| **Classification** | Single select | AI 分类（选项：auto, draft, escalate） |
| **Status** | Single select | 工单状态（选项：auto_replied, needs_review, escalated） |
| **Risk Level** | Single select | 风险等级（选项：low, medium, high） |
| **Escalation Reason** | Long text | 升级原因 |
| **AI Reply** | Long text | AI 回复内容 |
| **Original Message** | Long text | 客户原始消息 |
| **Timestamp** | Date | 创建时间（含时间） |

> **提示**：字段名称必须与上表完全一致（包括大小写和空格），否则 n8n 写入时会失败。

6. 完成后，点击右上角 **Share** 按钮，记录 Base 的 URL，格式为：
   ```
   https://airtable.com/app123456abcdef/...
   ```
   其中 `app123456abcdef` 就是你的 **Base ID**。

---

## 第二步：获取 Airtable Personal Access Token

1. 访问 https://airtable.com/create/tokens
2. 点击 **Create new token**
3. 填写：
   - **Token name**：`ShopiFow n8n Integration`
   - **Scopes**：勾选以下权限
     - `data.records:read`
     - `data.records:write`
     - `schema.bases:read`
4. 在 **Access** 部分，选择刚创建的 Base：`ShopiFow Support Tickets`
5. 点击 **Create token**，复制生成的 Token（格式：`pat...`）

> **注意**：Token 只显示一次，务必妥善保存！

---

## 第三步：在 n8n 中配置 Airtable 凭据

1. 打开 n8n，进入 **Credentials → New Credential**
2. 搜索并选择 **Airtable Token API**
3. 填写：
   - **Credential Name**：`Airtable API`（必须与 workflow 中一致）
   - **Access Token**：粘贴上面复制的 Personal Access Token
4. 点击 **Save**

---

## 第四步：导入子 Workflow 并配置

1. 在 n8n 中点击 **Workflows → Import from File**
2. 选择：
   ```
   n8n/workflows/hubspot-crm-sync.json（HubSpot）
   n8n/workflows/gohighlevel-crm-sync.json（GoHighLevel）
   n8n/workflows/slack-notification.json（Slack）
   n8n/workflows/airtable-log.json（Airtable）
   ```
   n8n 会自动导入文件中的全部 4 个 workflows（主流程 + GoHighLevel + Slack + Airtable）
3. 找到 `ShopiFow - Airtable Log`，配置 **Create Airtable Record** 节点：
   - **Credential**：选择 `Airtable API`
   - **Base**：点击下拉框，选择你的 Base（`ShopiFow Support Tickets`）
   - **Table**：输入 `Support Tickets`（或从列表选择）
   - **Columns**：确认字段映射正确（workflow 已预设）
5. （可选）如果你的 Base ID 不同，可以在 n8n 环境变量中设置：
   - **Settings → Variables**，添加：
     - `AIRTABLE_BASE_ID` = `app123456abcdef`
6. 激活 workflow

---

## 第五步：更新主 Workflow 中的触发 URL

1. 打开 `ShopiFow - Shopify Support (Direct)` workflow
2. 找到 **Trigger Airtable Log** 节点
3. 将 URL 更新为实际的 webhook URL：
   ```
   https://your-n8n-url/webhook/airtable-log
   ```
4. 保存并重新激活主 workflow

> **本地开发**：保持默认 `http://localhost:5678/webhook/airtable-log` 即可。

---

## 验证效果

发送一条测试消息：

```bash
curl -X POST https://your-n8n-url/webhook/shopify-support \
  -H "Content-Type: application/json" \
  -d '{
    "message": "我的订单什么时候发货？",
    "customerName": "张三",
    "customerEmail": "zhangsan@example.com",
    "platform": "shopify"
  }'
```

几秒后打开 Airtable 表格，应该看到新增了一条记录：

| Ticket ID | Customer Email | Platform | Classification | Status | Risk Level | ... |
|-----------|----------------|----------|----------------|--------|------------|-----|
| 1727... | zhangsan@example.com | shopify | auto | auto_replied | low | ... |

---

## 使用 Airtable 的常见操作

### 按平台筛选

点击 **Platform** 列的筛选图标 → 勾选 `shopify` → 只显示 Shopify 平台的工单。

### 查看升级工单

创建一个新视图：
1. 点击表格左上角的 **Grid view** 下拉菜单
2. 选择 **Duplicate view**，命名为 `Escalated Only`
3. 添加筛选条件：`Classification = escalate`
4. 保存后，切换到这个视图即可只看升级工单

### 导出 CSV

点击右上角 **...** → **Download CSV** → 选择当前视图或全部记录。

### 按日期统计

1. 点击 **+** 添加新视图，选择 **Calendar**
2. 选择 **Timestamp** 作为日期字段
3. 可以按天、周、月查看工单分布

---

## 节点说明

| 节点 | 作用 |
|------|------|
| Airtable Webhook Trigger | 接收主 workflow 的异步触发 |
| Parse Input | 提取工单字段，添加时间戳 |
| Create Airtable Record | 调用 Airtable API 创建新记录 |
| Respond | 返回成功响应（包含 recordId） |

---

## 自定义字段

如果你想添加更多字段，例如 `Order ID`、`Product Name` 等：

1. 在 Airtable 表格中添加对应的列
2. 在 n8n 的 `Parse Input` 节点中，添加对应的字段提取逻辑
3. 在 `Create Airtable Record` 节点的 `Columns` 映射中，添加新字段

---

## 常见问题

**Q：Airtable 节点失败会影响客服回复吗？**
不会。Airtable 为独立子 workflow，且所有节点设置了 `continueOnFail: true`。

**Q：字段名称不匹配会发生什么？**
n8n 会报错，但由于 `continueOnFail: true`，不会影响主流程。建议在 n8n 执行日志中查看具体错误信息。

**Q：可以更新已有记录吗？**
可以。把 `Create Airtable Record` 节点的 `operation` 改为 `update`，并传入 `recordId`。如果想实现"根据 Ticket ID 更新而非创建"，需要先用 `List` 操作查找记录。

**Q：Airtable 免费版有限制吗？**
免费版每个 Base 最多 1,200 条记录。如果超过，考虑升级到 Plus 计划（每月 $10/用户，50,000 条记录）。

**Q：记录太多了，怎么归档？**
可以创建一个 **Archive** 视图，添加筛选条件 `Timestamp is before 30 days ago`，定期手动删除或移到另一个 Base。

**Q：能否做自动化？例如 Airtable 记录被修改后触发某个操作？**
可以。Airtable 支持 Automations（内置），也可以用 Zapier 或 n8n 监听 Airtable Webhook。

---

## 进阶玩法：Airtable 作为可视化仪表盘

结合 Airtable 的 **Interface Designer**，可以给非技术团队创建一个无代码的工单管理面板：

1. 点击 Base 顶部的 **Interfaces**
2. 选择模板或从空白开始
3. 添加组件：
   - **Chart**：展示工单趋势、分类占比
   - **List**：显示最新升级工单
   - **Button**：触发 Webhook（例如标记为已处理）
4. 发布后，分享链接给团队成员

这样就把 Airtable 变成了一个轻量级的工单系统 UI！
