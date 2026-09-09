# ShopiFlow 测试指南

本文档说明如何运行 ShopiFlow 项目的测试套件。

## 测试架构概览

项目采用 **Vitest** 作为测试框架，覆盖三个层次：

1. **单元测试** - 测试独立的工具函数和业务逻辑
2. **集成测试** - 测试 n8n workflow 的端到端执行
3. **CI/CD 自动化** - GitHub Actions 自动运行所有测试

### 技术栈

- **Vitest** - 测试框架（比 Jest 更快，原生 ESM 支持）
- **PostgreSQL (测试数据库)** - 隔离的测试数据库实例
- **Docker Compose** - 测试环境编排（n8n + PostgreSQL）
- **GitHub Actions** - 持续集成

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

这会自动安装：
- `vitest` - 测试框架
- `@vitest/ui` - 可视化测试界面
- `pg` - PostgreSQL 客户端
- `@types/pg` - TypeScript 类型定义
- `dotenv` - 环境变量管理

### 2. 配置环境变量

复制 `.env.test` 文件（已包含默认配置），无需修改即可本地测试：

```bash
# .env.test 已配置好默认值
N8N_TEST_URL=http://localhost:5678
TEST_DB_HOST=localhost
TEST_DB_PORT=5433
TEST_DB_NAME=shopiflow_test
TEST_DB_USER=test_user
TEST_DB_PASSWORD=test_password
```

### 3. 启动测试环境

使用 Docker Compose 启动测试服务：

```bash
docker-compose -f docker-compose.test.yml up -d
```

这会启动：
- `n8n-test` - n8n 测试实例（端口 5678）
- `postgres-test` - PostgreSQL 测试数据库（端口 5433）

**等待服务就绪**（约 30 秒）：

```bash
# 检查 n8n
curl http://localhost:5678/healthz

# 检查 PostgreSQL
psql -h localhost -p 5433 -U test_user -d shopiflow_test -c "SELECT 1"
```

### 4. 初始化测试数据库

```bash
PGPASSWORD=test_password psql -h localhost -p 5433 -U test_user -d shopiflow_test -f database/init.sql
```

### 5. 导入 n8n Workflows（可选）

```bash
chmod +x scripts/import-workflows-test.sh
./scripts/import-workflows-test.sh
```

> **注意**：n8n workflow 需要在 n8n UI 中手动导入。测试脚本会检查文件是否存在，但实际执行依赖于你在 n8n 界面导入的 workflow。

---

## 运行测试

### 运行所有测试

```bash
npm run test
```

### 仅运行单元测试

```bash
npm run test:run -- tests/unit
```

### 仅运行集成测试

```bash
npm run test:run -- tests/integration
```

### 使用可视化 UI

```bash
npm run test:ui
```

然后打开浏览器访问 `http://localhost:51204`（Vitest 会显示具体端口）。

### 生成覆盖率报告

```bash
npm run test:coverage
```

覆盖率报告会生成在 `apps/frontend/coverage/` 目录。

---

## 测试文件结构

```
tests/
├── setup.ts                          # 全局测试配置
├── helpers/
│   ├── n8n-client.ts                 # n8n webhook 调用封装
│   ├── db-client.ts                  # PostgreSQL 数据库操作封装
│   └── fixtures.ts                   # 测试数据固定集 + workflow 逻辑提取
├── unit/
│   ├── lib/
│   │   ├── utils.test.ts             # 工具函数测试
│   │   └── prompts.test.ts           # Prompt 构建测试
│   └── n8n-workflow-logic.test.ts    # n8n Code 节点逻辑测试
└── integration/
    └── n8n-workflows/
        ├── support-handler.test.ts   # Support Handler workflow 集成测试
        └── review-handler.test.ts    # Review Reply workflow 集成测试
```

---

## 单元测试说明

### `tests/unit/lib/utils.test.ts`

测试 `lib/utils.ts` 中的工具函数：
- `cn()` - className 合并
- `formatCurrency()` - 货币格式化
- `formatDate()` - 日期格式化
- `formatRelativeTime()` - 相对时间（"5m ago"）
- `truncate()` - 字符串截断
- `getPlatformColor()` / `getEscalationColor()` - 颜色映射
- `getRatingStars()` - 评分星星生成
- `generateId()` - 唯一 ID 生成

**运行**：
```bash
npm run test:run tests/unit/lib/utils.test.ts
```

### `tests/unit/lib/prompts.test.ts`

测试 `lib/prompts.ts` 中的 AI prompt 构建逻辑：
- `SUPPORT_SYSTEM_PROMPT` - 包含正确的分类规则
- `buildReviewReplyPrompt()` - 根据评分动态生成 prompt
- `WORKFLOW_DESCRIPTIONS` - workflow 描述数据完整性

**运行**：
```bash
npm run test:run tests/unit/lib/prompts.test.ts
```

### `tests/unit/n8n-workflow-logic.test.ts`

测试从 n8n workflow 的 Code 节点中提取出来的业务逻辑：
- `parseInputLogic()` - 解析 webhook 输入
- `parseClassificationLogic()` - 解析 AI 分类结果
- `handleAiErrorLogic()` - AI 失败时的降级逻辑

这些函数在 `tests/helpers/fixtures.ts` 中定义，便于独立测试。

**运行**：
```bash
npm run test:run tests/unit/n8n-workflow-logic.test.ts
```

---

## 集成测试说明

### `tests/integration/n8n-workflows/support-handler.test.ts`

测试 `shopify-support-handler.json` workflow 的端到端执行：

**测试场景**：
1. **正常分类** - 订单查询、产品查询应分类为 `auto`
2. **Draft 分类** - 退款、取消订单应分类为 `draft`
3. **Escalate 分类** - 法律威胁、欺诈索赔应分类为 `escalate`
4. **边界条件** - 空消息、超长消息、特殊字符（XSS）
5. **错误降级** - AI 失败时降级为 `draft`，并记录日志到数据库
6. **并发请求** - 多个请求同时发送，验证 ticketId 唯一性

**运行**：
```bash
npm run test:run tests/integration/n8n-workflows/support-handler.test.ts
```

### `tests/integration/n8n-workflows/review-handler.test.ts`

测试 `judgeme-review-handler.json` workflow：

**测试场景**：
1. **正面评论（5星）** - 回复应包含感谢
2. **负面评论（1-2星）** - 回复应包含道歉或解决方案
3. **中立评论（3星）** - 回复正常生成
4. **回复质量** - 字数限制（<80 words）、不包含 JSON 格式

**运行**：
```bash
npm run test:run tests/integration/n8n-workflows/review-handler.test.ts
```

---

## 测试辅助工具

### `N8nClient` (`tests/helpers/n8n-client.ts`)

封装 n8n webhook 调用：

```typescript
import { N8nClient } from '../helpers/n8n-client';

const n8n = new N8nClient('http://localhost:5678');

// 触发 Support Handler
const response = await n8n.triggerSupportWebhook({
  message: 'Where is my order?',
  ticketId: 'test-001',
  customerName: 'Test User',
  customerEmail: 'test@example.com',
});

// 检查健康状态
const isReady = await n8n.healthCheck();

// 等待服务就绪
await n8n.waitForReady();
```

### `DbClient` (`tests/helpers/db-client.ts`)

封装 PostgreSQL 数据库操作：

```typescript
import { DbClient } from '../helpers/db-client';

const db = new DbClient();

// 查询降级日志
const logs = await db.getDegradationLogs('test-001');

// 清理测试数据
await db.cleanupTestData();

// 健康检查
const isReady = await db.healthCheck();
```

### 测试数据 (`tests/helpers/fixtures.ts`)

预定义的测试数据集，覆盖正常路径和边界条件：

```typescript
import { SUPPORT_FIXTURES, REVIEW_FIXTURES } from '../helpers/fixtures';

// Support 场景
SUPPORT_FIXTURES.orderQuery      // 订单查询
SUPPORT_FIXTURES.refundRequest   // 退款请求
SUPPORT_FIXTURES.legalThreat     // 法律威胁
SUPPORT_FIXTURES.emptyMessage    // 空消息（边界）

// Review 场景
REVIEW_FIXTURES.positiveReview   // 5星好评
REVIEW_FIXTURES.negativeReview   // 1星差评
REVIEW_FIXTURES.neutralReview    // 3星中立
```

---

## 持续集成（CI/CD）

### GitHub Actions 配置

`.github/workflows/test.yml` 定义了完整的 CI 流水线：

**触发条件**：
- Push 到 `main`, `feature_v2`, `develop` 分支
- Pull Request 到 `main`, `feature_v2` 分支

**流水线阶段**：

1. **unit-tests** - 运行 lint + 单元测试（~2 分钟）
2. **integration-tests** - 启动 n8n + PostgreSQL，运行集成测试（~5 分钟）
3. **build-check** - 验证 TypeScript 编译和 Next.js 构建（~3 分钟）
4. **test-summary** - 汇总测试结果

**环境变量（Secrets）**：

需要在 GitHub 仓库的 Settings → Secrets 中配置：
- `OPENROUTER_API_KEY` - OpenRouter API 密钥（用于集成测试）

**查看测试结果**：

每次 Push/PR 后，在 GitHub Actions 页面可以看到：
- 绿色勾号 ✅ - 所有测试通过
- 红色叉号 ❌ - 部分测试失败，点击查看详细日志

---

## 常见问题

### 1. 集成测试失败：n8n 连接超时

**原因**：n8n 启动需要时间，测试过早开始。

**解决**：
```bash
# 手动检查 n8n 是否就绪
curl http://localhost:5678/healthz

# 如果失败，查看 n8n 日志
docker logs shopiflow-n8n-test
```

### 2. 集成测试失败：workflow 未找到

**原因**：n8n 中没有导入 workflow。

**解决**：
1. 打开 n8n UI：http://localhost:5678
2. 手动导入 `n8n/workflows/*.json` 文件
3. 确保 workflow 处于 Active 状态

### 3. 数据库连接失败

**原因**：PostgreSQL 端口冲突或未启动。

**解决**：
```bash
# 检查端口占用
lsof -i :5433

# 重启测试数据库
docker-compose -f docker-compose.test.yml restart postgres-test
```

### 4. 单元测试通过，集成测试失败

**原因**：集成测试依赖真实的 AI API（OpenRouter），可能因网络、配额问题失败。

**解决**：
- 检查 `OPENROUTER_API_KEY` 是否有效
- 检查 API 配额是否用尽
- 查看 n8n 执行历史（http://localhost:5678 → Executions）

### 5. 测试运行缓慢

**原因**：集成测试需要等待 AI API 响应（可能 5-10 秒/请求）。

**优化**：
- 仅运行单元测试：`npm run test:run tests/unit`
- 使用 `--reporter=dot` 减少输出：`npm run test:run -- --reporter=dot`

### 6. 测试数据未清理

**原因**：测试中途失败，`afterEach` 未执行。

**解决**：
```bash
# 手动清理测试数据
PGPASSWORD=test_password psql -h localhost -p 5433 -U test_user -d shopiflow_test \
  -c "DELETE FROM ai_processing_log WHERE details::text LIKE '%test-%'"
```

---

## 最佳实践

### 编写新测试

1. **单元测试优先** - 先测试独立函数，再测试集成
2. **使用 Fixtures** - 复用 `tests/helpers/fixtures.ts` 中的测试数据
3. **测试边界条件** - 空输入、超长输入、特殊字符
4. **测试错误场景** - AI 失败、网络超时、数据库错误
5. **清理测试数据** - 在 `afterEach` 中清理，避免污染后续测试

### 示例：添加新的单元测试

```typescript
// tests/unit/lib/my-utils.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/my-utils';

describe('lib/my-utils', () => {
  describe('myFunction', () => {
    it('should handle normal input', () => {
      expect(myFunction('input')).toBe('expected');
    });

    it('should handle empty input', () => {
      expect(myFunction('')).toBe('');
    });

    it('should throw on invalid input', () => {
      expect(() => myFunction(null)).toThrow();
    });
  });
});
```

### 示例：添加新的集成测试

```typescript
// tests/integration/n8n-workflows/my-workflow.test.ts
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { N8nClient } from '../../helpers/n8n-client';
import { DbClient } from '../../helpers/db-client';

describe('My Workflow Integration', () => {
  const n8n = new N8nClient();
  const db = new DbClient();

  beforeAll(async () => {
    await Promise.all([n8n.waitForReady(), db.waitForReady()]);
  }, 60000);

  afterEach(async () => {
    await db.cleanupTestData();
  });

  it('should handle normal case', async () => {
    const response = await n8n.triggerWebhook('/webhook/my-endpoint', {
      data: 'test',
    });

    expect(response.status).toBe('success');
  }, 30000);
});
```

---

## 性能指标

### 本地测试运行时间

- **单元测试**：< 5 秒
- **集成测试**：2-5 分钟（取决于 AI API 响应速度）
- **全部测试 + 构建**：5-8 分钟

### CI 运行时间（GitHub Actions）

- **unit-tests 作业**：~2 分钟
- **integration-tests 作业**：~5 分钟
- **build-check 作业**：~3 分钟
- **总计**：~10 分钟

---

## 进一步阅读

- [Vitest 官方文档](https://vitest.dev/)
- [n8n Workflow Testing](https://docs.n8n.io/workflows/testing/)
- [PostgreSQL Testing Best Practices](https://wiki.postgresql.org/wiki/Testing)
- [GitHub Actions 文档](https://docs.github.com/actions)

---

## 贡献指南

在提交 PR 前，请确保：

1. ✅ 所有测试通过：`npm run test:run`
2. ✅ 代码通过 lint：`npm run lint`
3. ✅ TypeScript 无错误：`npx tsc --noEmit`
4. ✅ 构建成功：`npm run build`
5. ✅ 为新功能添加相应测试

---

## 联系与支持

如遇到测试相关问题，请：
1. 查看本文档的"常见问题"章节
2. 查看 GitHub Actions 的详细日志
3. 在项目 Issues 中提问
