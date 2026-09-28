# HubSpot 集成配置指南

## 概述

本次集成在现有客服 workflow（`shopify-support-handler`）中加入了异步的 HubSpot 同步分支。每次 AI 处理完客服消息后，会自动：

1. 在 HubSpot 中按邮箱查找客户（Contact），不存在则创建
2. 在该 Contact 的 Timeline 上创建一条 Note，记录完整的 AI 处理结果

主流程（客服响应）不受影响，HubSpot 同步为独立分支，失败不影响客服回复。

---

## 第一步：创建 HubSpot Private App

1. 登录 HubSpot 账号
2. 进入 **Settings → Integrations → Private Apps**
3. 点击 **Create a private app**
4. 填写名称：`ShopiFow n8n Integration`
5. 在 **Scopes** 标签页，勾选以下权限：
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.notes.write`
6. 点击 **Create app**，复制生成的 **Access Token**（只显示一次）

---

## 第二步：在 n8n 中配置 HubSpot 凭据

1. 打开 n8n，进入 **Credentials → New Credential**
2. 搜索并选择 **HubSpot API**
3. 填写：
   - **Credential Name**：`HubSpot API`（必须与 workflow 中一致）
   - **Access Token**：粘贴上一步复制的 token
4. 点击 **Save**，测试连通性

---

## 第三步：导入更新后的 Workflow

1. 在 n8n 中找到现有的 `ShopiFow - Shopify Support (Direct)` workflow
2. 删除它（或停用）
3. 点击 **Import from File**，选择：
   ```
   n8n/workflows/shopify-support-handler.json
   ```
4. 导入后，检查以下节点的凭据是否正确绑定：
   - **Search HubSpot Contact** → `HubSpot API`
   - **Create HubSpot Contact** → `HubSpot API`
   - **Create Note on Timeline** → `HubSpot API`
5. 激活 workflow

---

## 第四步：在 HubSpot 中创建自定义属性（可选）

`Create HubSpot Contact` 节点会写入一个 `support_platform` 属性，用于记录客户来源平台（shopify/amazon/tiktok）。

如果 HubSpot 中没有此属性，写入会静默失败（不影响主流程）。如需正确记录：

1. 进入 **Settings → Properties → Contact Properties**
2. 点击 **Create Property**
3. 填写：
   - **Label**：Support Platform
   - **Internal name**：`support_platform`
   - **Field type**：Single-line text
4. 保存

---

## 验证效果

配置完成后，发送一条测试消息（带 `customerEmail` 字段）：

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

然后在 HubSpot 中搜索 `test@example.com`，进入该 Contact 的 Timeline，应看到一条 Note：

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

| 节点 | 位置 | 作用 |
|------|------|------|
| Check Email Valid | 主流程之后并行触发 | 邮箱为空则跳过整个 HubSpot 分支 |
| Search HubSpot Contact | 搜索阶段 | 按邮箱查找 Contact，返回 contactId |
| Check Contact Exists | 判断阶段 | 解析搜索结果，决定创建还是复用 |
| Route Create or Update | 路由 | `needsCreate=true` 走创建，否则走复用 |
| Create HubSpot Contact | 创建路径 | 新 Contact，写入 email/name/platform |
| Extract Contact ID (Create/Existing) | 两条路径末尾 | 统一输出 `hubspotContactId` |
| Merge Contact Paths | 合并 | 汇合创建和复用两条路径 |
| Create Note on Timeline | 最终步骤 | 在 Contact 上创建 Note |

---

## 常见问题

**Q: HubSpot 节点失败会影响客服回复吗？**
所有 HubSpot 节点均设置了 `continueOnFail: true`，失败只影响 CRM 同步，不影响 AI 客服响应。

**Q: 同一个客户发多条消息，会创建多个 Contact 吗？**
不会。`Search HubSpot Contact` 按 email 查找，找到已有 Contact 则直接复用 contactId，不重复创建。

**Q: 没有 customerEmail 的消息怎么处理？**
`Check Email Valid` 节点会检测空邮箱，直接跳过 HubSpot 分支，不报错。

**Q: n8n 重试时会创建重复的 Note 吗？**
会，当前版本不做 Note 去重。作为 demo 项目这是可接受的。生产环境可在 PostgreSQL 中记录已同步的 ticketId 来防重。
