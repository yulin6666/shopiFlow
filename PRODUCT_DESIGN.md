# ShopiFow — AI E-Commerce Automation Demo
> 产品设计文档 v1.1 | 面向 Upwork 应聘 Demo

---

## 一、目标与定位

这是一个面向 Upwork 客户的作品集 Demo，需要在 10 分钟内让客户看懂：
- 你能构建 AI 驱动的 e-commerce 自动化系统
- 你熟悉 Shopify 生态和真实业务场景
- 你能交付可部署的内部工具（React + Vercel）
- 你的代码质量和文档习惯靠谱

**Demo 名称：ShopiFow**（Shopify + Flow）

**部署目标：** Railway，可直接发链接给客户

---

## 二、JD 需求对齐分析

| 需求方向 | JD1 Pet Printed | JD2 零售/婚礼品牌 | JD3 FAO 补剂品牌 | Demo 决策 |
|---------|----------------|-----------------|----------------|---------|
| AI 客服自动回复 | ✓ support routing | ✓ customer-facing | ✓ 核心功能 | **做** |
| Review 回复自动化 | ✓ review handling | - | - | **做** |
| 内部 Dashboard | ✓ internal dashboards | ✓ automated reports | - | **做** |
| 产品内容多语言生成 | ✓ 9 markets | - | - | 砍掉（小众） |
| Influencer/UGC 管理 | - | ✓ | ✓ | 砍掉（无真实数据）|
| 广告数据报表 | ✓ | ✓ | - | 砍掉（无广告账号）|
| 多市场数据汇总 | ✓ 9 markets | - | - | 砍掉（单店够用）|
| TikTok 创意策略 | - | - | ✓ | 砍掉（小众）|

---

## 三、最终模块设计（3 个核心模块）

### 整体架构

```
┌─────────────────────────────────────────────────────┐
│  ShopiFow              [Store: My Dev Store ▼]       │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ Dashboard│         主内容区                         │
│          │                                          │
│ AI 客服  │                                          │
│          │                                          │
│ Review   │                                          │
│ 管理     │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

---

### 模块 1：Dashboard 总览

**目的：** 展示能构建内部运营仪表盘，数据来自真实 Shopify API

**内容：**
- 顶部 KPI 卡片（4 个）：
  - 今日订单数（Shopify 真实）
  - 总订单金额（Shopify 真实）
  - 待处理客服 Ticket 数（基于真实订单构造）
  - AI 自动处理率（固定 mock 比例，如 78%）
- 过去 7 天订单趋势折线图（Shopify 真实数据）
- 最近 10 条订单列表（订单号、客户、金额、状态，Shopify 真实）

**数据来源：** Shopify Admin API，Next.js API Route 中转，不暴露 token

---

### 模块 2：AI 客服中心

**目的：** 三个 JD 共同的核心痛点，必须做到最好

**交互流程：**

左侧 Ticket 列表：
- 基于真实 Shopify 订单动态构造 Ticket（取最近 20 条订单，每条生成一个模拟 ticket）
- Ticket 类型按订单状态分配：
  - `unfulfilled` → "订单未发货催促"
  - `fulfilled` → "物流追踪查询"
  - 随机混入几个固定 mock ticket：退货申请、产品投诉
- 每个 ticket 显示：渠道 badge（Shopify / Amazon / TikTok Shop）、优先级、时间

右侧 Ticket 详情：
- 显示客户消息原文
- 显示关联订单信息（订单号、产品、金额，来自 Shopify）
- 「AI 生成回复」按钮 → 调用 Claude API，流式输出回复草稿
- AI 同时输出：处理类型标签（退款 / 物流 / 咨询 / 需人工）+ 置信度
- 置信度 < 70% 时，显示红色「需要人工处理」提示
- 「工作原理」按钮 → 弹窗展示 System Prompt 内容和 n8n 触发逻辑

**体现的能力：** Claude API 集成、支持路由逻辑、真实订单数据上下文注入

---

### 模块 3：Review 管理

**目的：** 展示 AI 回复自动化，品牌语气一致性

**数据：** 全部 mock（Shopify 无原生 Review 功能），但结合真实产品名称

**内容：**
- 左侧 Review 列表：预设 8-10 条 review，涵盖：
  - 5 星好评（2 条）
  - 4 星带建议（2 条）
  - 3 星提到物流慢（2 条）
  - 1-2 星差评（2 条）
  - 每条带情感分析标签（正面 / 中性 / 负面）和平台 badge
- 右侧详情：
  - Review 原文
  - 「AI 生成回复」→ Claude 流式输出
  - 差评自动显示「高优先级」标记，AI 回复更注重解决方案而非防御
  - 「重新生成」「复制」按钮
  - 「工作原理」弹窗

**体现的能力：** 情感感知、品牌语气保持、批量处理暗示

---

## 四、技术栈

| 层次 | 选择 | 原因 |
|------|------|------|
| 前端框架 | Next.js 14 (App Router) | JD1 提到 React，Next 原生支持 Vercel 部署 |
| UI 组件库 | shadcn/ui + Tailwind CSS | 现代感、开发快 |
| 图表 | Recharts | 轻量够用 |
| AI 集成 | Anthropic SDK (`claude-sonnet-4-6`) | 流式输出，直接对应 JD 需求 |
| Shopify 数据 | Shopify Admin REST API | Development Store 真实数据 |
| 部署 | Railway | 支持 Next.js，环境变量管理方便 |

---

## 五、关键设计决策

### 5.1 数据层策略

| 数据类型 | 来源 | 说明 |
|---------|------|------|
| 订单、产品 | Shopify Admin API（真实） | `orders.json`、`products.json` |
| 客服 Tickets | 基于真实订单动态构造 | 用真实订单号/产品名，增加可信度 |
| Reviews | Mock（固定 JSON） | 结合真实产品名，Shopify 无原生 Review |

Shopify 鉴权：Development Store 创建 Custom App，生成 Admin API Access Token，存环境变量，仅在 API Route 使用，不暴露前端。

### 5.2 AI 功能必须真实调用
不能 hardcode 回复。客户会输入不同内容测试。客服和 Review 两个模块都要真实调用 Claude API，使用流式输出（`streamText`）。

### 5.3「工作原理」弹窗
每个 AI 功能旁边放「ℹ 工作原理」按钮，展示：
- System Prompt 完整内容
- 工作流触发逻辑（对应哪个 n8n workflow）
- 真实项目中如何扩展

这是证明你懂实现、不只是套壳的最直接方式。

### 5.4 错误处理要可见
AI 生成失败时，展示 fallback 提示（"AI 处理失败，已标记为人工处理"），体现 JD 强调的 reliability。

---

## 六、Demo 演示路径（8-10 分钟）

1. 打开首页 → Dashboard，看到真实订单数据，感受业务规模
2. 进入 AI 客服 → 点一个退货 ticket → 看到关联的真实订单信息 → 点「AI 生成回复」→ 流式输出 → 看分类结果和置信度
3. 点「工作原理」→ 看 Prompt 策略，解释 n8n 触发方式
4. 进入 Review 管理 → 点一条 1 星差评 → AI 生成回复 → 对比和 5 星好评回复的语气差异

---

## 七、环境变量

```
ANTHROPIC_API_KEY=        # Claude API
SHOPIFY_STORE_DOMAIN=     # your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=     # Custom App Admin API token
```

Shopify Custom App 创建路径：Development Store 后台 → Settings → Apps and sales channels → Develop apps → Create an app → Admin API scopes：`read_orders`、`read_products`

---

## 八、不做什么

- 不做真实 Shopify OAuth 登录
- 不做真实数据库
- 不做产品内容多语言生成
- 不做 Influencer/UGC 管理
- 不做广告数据报表
- 不做 TikTok 趋势模块
- 不做移动端适配

---

## 九、交付物

- [ ] Vercel 可访问 URL
- [ ] GitHub 仓库（public）
- [ ] README：架构说明、本地运行步骤
- [ ] 可选：Loom 录屏（对应 JD2/JD3 申请要求）

---

## 十、开发顺序

```
Sprint 1：
  - Next.js 项目初始化 + shadcn/ui
  - Shopify API Route（orders、products）
  - Dashboard 页面

Sprint 2：
  - AI 客服模块（Claude 流式 API）
  - Ticket 从真实订单构造逻辑

Sprint 3：
  - Review 管理模块
  - 「工作原理」弹窗
  - 错误处理
  - Vercel 部署 + README
```
