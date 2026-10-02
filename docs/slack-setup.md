# Slack 集成配置指南

## 概述

本次集成在客服 workflow 中添加了 Slack 告警通知功能。当工单被 AI 分类为 **escalate**（需人工介入）时，会自动向指定的 Slack 频道发送告警消息，包含：

- 工单 ID、平台、客户信息
- 风险等级、升级原因
- 客户原始消息

团队成员能第一时间收到通知并跟进处理。

---

## 第一步：创建 Slack App

1. 访问 https://api.slack.com/apps
2. 点击 **Create New App → From scratch**
3. 填写：
   - **App Name**：`ShopiFow Escalation Bot`
   - **Workspace**：选择你的 Slack 工作区
4. 点击 **Create App**

---

## 第二步：配置 Bot Token Scopes

1. 在左侧菜单选择 **OAuth & Permissions**
2. 滚动到 **Scopes → Bot Token Scopes**
3. 添加以下权限：
   - `chat:write` - 发送消息到频道
   - `chat:write.public` - 发送消息到公开频道（无需先加入）
4. 保存后，滚动到页面顶部，点击 **Install to Workspace**
5. 授权后，复制 **Bot User OAuth Token**（格式：`xoxb-...`）

---

## 第三步：创建通知频道（可选）

如果你想专门用一个频道接收告警：

1. 在 Slack 中创建新频道：`#support-escalations`
2. 右键频道名称 → **View channel details → About**
3. 复制 **Channel ID**（格式：`C0123456789`）

> **提示**：也可以使用频道名称（如 `#support-escalations`），但使用 Channel ID 更稳定。

---

## 第四步：在 n8n 中配置 Slack 凭据

### 方式 A：使用 OAuth2（推荐）

1. 打开 n8n，进入 **Credentials → New Credential**
2. 搜索并选择 **Slack OAuth2 API**
3. 填写：
   - **Credential Name**：`Slack OAuth2`
   - **Access Token**：粘贴上面复制的 Bot User OAuth Token（`xoxb-...`）
4. 点击 **Save**

### 方式 B：使用简单 API Token（替代方案）

如果 OAuth2 配置有问题，可以用 Slack API 凭据：

1. 选择 **Slack API**
2. 填写：
   - **Credential Name**：`Slack API`
   - **Access Token**：Bot User OAuth Token
3. 对应修改 workflow 中 `Post to Slack` 节点的 `authentication` 字段为 `accessToken`

---

## 第五步：导入子 Workflow

1. 在 n8n 中点击 **Workflows → Import from File**
2. 选择：
   ```
   n8n/workflows/hubspot-crm-sync.json（HubSpot）
   n8n/workflows/gohighlevel-crm-sync.json（GoHighLevel）
   n8n/workflows/slack-notification.json（Slack）
   n8n/workflows/airtable-log.json（Airtable）
   ```
   n8n 会自动导入文件中的全部 4 个 workflows（主流程 + GoHighLevel + Slack + Airtable）
3. 找到 `ShopiFow - Slack Notification`，检查 **Post to Slack** 节点：
   - 确认凭据绑定到 `Slack OAuth2`
   - 修改 `channel` 参数为你的实际频道（默认为 `#support-escalations`）
4. 如果你复制了 Channel ID，可以用环境变量方式：
   - n8n → **Settings → Variables**，添加：
     - `SLACK_CHANNEL_ID` = `C0123456789`
   - workflow 中 channel 字段会自动读取该变量
5. 激活 workflow

---

## 第六步：更新主 Workflow 中的触发 URL

1. 打开 `ShopiFow - Shopify Support (Direct)` workflow
2. 找到 **Trigger Slack Notification** 节点
3. 将 URL 更新为实际的 webhook URL：
   ```
   https://your-n8n-url/webhook/slack-notification
   ```
4. 保存并重新激活主 workflow

> **本地开发**：保持默认 `http://localhost:5678/webhook/slack-notification` 即可。

---

## 验证效果

发送一条会被标记为 escalate 的测试消息（例如包含"律师""投诉"等关键词）：

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

几秒后在 Slack 频道应该看到一条告警消息：

```
🚨 工单升级通知

Ticket ID: `1234567890`
平台: shopify
客户: Angry Customer (angry@example.com)
风险等级: 🔴 高
升级原因: 法律威胁或法律语言

客户原始消息:
> 我要投诉你们，准备找律师！

_请尽快跟进处理_
```

---

## 节点说明

| 节点 | 作用 |
|------|------|
| Slack Webhook Trigger | 接收主 workflow 的异步触发 |
| Parse Input | 提取工单字段 |
| Is Escalated? | 判断 `classification === "escalate"` |
| Post to Slack | 调用 Slack API 发送消息（仅 escalated 时） |
| Respond (Sent / Skip) | 返回成功响应 |

---

## 自定义消息格式

如果想修改告警消息样式，编辑 `Post to Slack` 节点的 `text` 字段。支持 Slack 的 mrkdwn 格式：

- `*粗体*`
- `_斜体_`
- `` `代码` ``
- `> 引用`
- `:emoji_name:` 表情符号

你还可以使用 [Slack Block Kit Builder](https://app.slack.com/block-kit-builder) 设计更复杂的消息样式（图片、按钮、下拉框等）。

---

## 常见问题

**Q：Slack 节点失败会影响客服回复吗？**
不会。Slack 为独立子 workflow，且所有节点设置了 `continueOnFail: true`。

**Q：如果工单不是 escalate 级别，会发送消息吗？**
不会。`Is Escalated?` 节点会过滤掉 `auto` 和 `draft` 级别的工单。

**Q：可以 @ 提醒特定人员吗？**
可以。在消息文本中添加 `<@USER_ID>` 或 `<!channel>` / `<!here>`：
```
:rotating_light: *工单升级通知* <!channel>
```

**Q：Bot 提示 "not_in_channel" 错误？**
确保你的 Bot Token Scopes 中包含 `chat:write.public`，或者手动把 Bot 加入频道：在频道输入 `/invite @ShopiFow Escalation Bot`。

**Q：想把告警发到多个频道怎么办？**
复制 `Post to Slack` 节点，改成不同的 channel ID，然后把两个节点并联接到 `Is Escalated?` 的输出上。
