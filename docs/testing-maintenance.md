# ShopiFlow 测试维护手册

本文档面向开发者和维护者，说明如何维护和扩展测试套件。

---

## 测试架构决策

### 为什么选择 Vitest 而非 Jest？

1. **更快的启动速度** - Vitest 基于 Vite，启动时间 < 1 秒
2. **原生 ESM 支持** - 无需复杂的 transform 配置
3. **与 Next.js 14 兼容** - 对 App Router 的支持更好
4. **更好的 TypeScript 支持** - 无需 ts-jest
5. **内置 UI** - `vitest --ui` 提供可视化测试界面

### 为什么不使用 Playwright 测试 n8n？

- **速度** - Playwright 启动浏览器需要 30-60 秒，API 测试只需 2-3 秒
- **稳定性** - n8n UI 可能随版本变化，API 更稳定
- **CI 友好** - GitHub Actions 中运行 headless browser 需要额外配置
- **测试目标** - 我们测试的是 workflow 逻辑，不是 n8n UI

### 为什么集成测试依赖真实 API？

**优点**：
- 发现真实的 API 兼容性问题
- 测试 AI 输出质量
- 验证完整的请求/响应流程

**缺点**：
- 测试速度慢（5-10 秒/请求）
- 依赖外部服务（OpenRouter、Pinecone）
- API 配额成本

**权衡**：单元测试用 mock，集成测试用真实 API，关键路径两者都测。

---

## 添加新的测试

### 添加单元测试

**步骤**：
1. 在 `tests/unit/` 下创建对应的 `.test.ts` 文件
2. 导入被测试的函数
3. 使用 `describe` 和 `it` 组织测试用例
4. 覆盖正常路径 + 边界条件 + 错误场景

**示例**：

```typescript
// tests/unit/lib/my-module.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/my-module';

describe('lib/my-module', () => {
  describe('myFunction', () => {
    it('should return correct result for valid input', () => {
      expect(myFunction('valid')).toBe('expected');
    });

    it('should handle edge case: empty string', () => {
      expect(myFunction('')).toBe('');
    });

    it('should throw error for invalid input', () => {
      expect(() => myFunction(null)).toThrow('Invalid input');
    });
  });
});
```

### 添加集成测试

**步骤**：
1. 在 `tests/integration/n8n-workflows/` 下创建测试文件
2. 使用 `N8nClient` 和 `DbClient` 辅助类
3. 在 `beforeAll` 中等待服务就绪
4. 在 `afterEach` 中清理测试数据
5. 设置合理的 timeout（30 秒）

**示例**：

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

  it('should process webhook correctly', async () => {
    const response = await n8n.triggerWebhook('/webhook/my-endpoint', {
      data: 'test-data',
      id: 'test-001',
    });

    expect(response.status).toBe('success');
    expect(response.result).toBeDefined();

    // 验证数据库写入
    const logs = await db.query(
      'SELECT * FROM my_table WHERE id = $1',
      ['test-001']
    );
    expect(logs.rows).toHaveLength(1);
  }, 30000);
});
```

### 添加测试数据 Fixture

在 `tests/helpers/fixtures.ts` 中添加新的测试数据：

```typescript
export const MY_FIXTURES = {
  validCase: {
    input: 'test',
    expectedOutput: 'result',
  },
  edgeCase: {
    input: '',
    expectedOutput: null,
  },
};
```

---

## 测试数据管理

### 清理策略

**原则**：每个测试后清理自己的数据，不影响其他测试。

**实现**：
```typescript
afterEach(async () => {
  // 方式 1：使用 DbClient 的通用清理方法
  await db.cleanupTestData(); // 删除所有 ticketId 包含 "test-" 的记录

  // 方式 2：针对特定表的清理
  await db.query('DELETE FROM my_table WHERE id LIKE $1', ['test-%']);
});
```

### 测试隔离

**问题**：并发测试可能写入相同的 ticketId，导致冲突。

**解决**：使用唯一的 ticketId：
```typescript
it('should handle concurrent requests', async () => {
  const uniqueId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const response = await n8n.triggerSupportWebhook({
    ...SUPPORT_FIXTURES.orderQuery,
    ticketId: uniqueId,
  });

  expect(response.ticketId).toBe(uniqueId);
});
```

---

## Mock 和 Stub

### 何时使用 Mock？

- **单元测试** - 始终 mock 外部依赖
- **集成测试** - 仅在测试特定错误场景时 mock（如 AI 失败）

### 如何 Mock n8n API 响应？

使用 Vitest 的 `vi.mock()`：

```typescript
import { vi } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');

it('should handle n8n timeout', async () => {
  // Mock n8n 返回超时错误
  (axios.post as any).mockRejectedValueOnce(new Error('Timeout'));

  // 你的测试逻辑
  await expect(myFunction()).rejects.toThrow('Timeout');
});
```

### 如何 Mock 数据库？

在单元测试中，mock `DbClient`：

```typescript
import { vi } from 'vitest';
import { DbClient } from '../../helpers/db-client';

vi.mock('../../helpers/db-client');

it('should handle database error', async () => {
  const mockDb = new DbClient();
  (mockDb.query as any).mockRejectedValueOnce(new Error('Connection failed'));

  // 你的测试逻辑
});
```

---

## 性能优化

### 减少集成测试运行时间

1. **并行运行不相关的测试**
   ```typescript
   // Vitest 默认并行运行 describe 块
   describe('Group A', () => { /* ... */ });
   describe('Group B', () => { /* ... */ }); // 与 Group A 并行
   ```

2. **复用服务连接**
   ```typescript
   // ❌ 不好：每个测试都创建新连接
   it('test 1', async () => {
     const n8n = new N8nClient();
     await n8n.triggerWebhook(...);
   });

   // ✅ 好：复用连接
   const n8n = new N8nClient();
   it('test 1', async () => {
     await n8n.triggerWebhook(...);
   });
   ```

3. **跳过慢速测试（本地开发）**
   ```typescript
   it.skip('slow integration test', async () => {
     // 只在 CI 中运行
   });
   ```

### 减少 AI API 调用成本

1. **缓存常见响应**（仅开发环境）
2. **使用更便宜的模型**（如 `gpt-3.5-turbo`）作为测试替代
3. **限制集成测试数量** - 只测试关键路径

---

## CI/CD 维护

### 更新 GitHub Actions Workflow

**文件位置**：`.github/workflows/test.yml`

**常见修改**：

1. **添加新的测试作业**
   ```yaml
   e2e-tests:
     runs-on: ubuntu-latest
     needs: integration-tests
     steps:
       - name: Run E2E tests
         run: npm run test:e2e
   ```

2. **添加新的环境变量**
   ```yaml
   env:
     MY_NEW_ENV_VAR: ${{ secrets.MY_SECRET }}
   ```

3. **调整超时时间**
   ```yaml
   jobs:
     integration-tests:
       timeout-minutes: 20  # 默认 15，可根据需要调整
   ```

### 调试 CI 失败

1. **查看完整日志**
   - GitHub Actions → 失败的 workflow → 点击失败的步骤

2. **复现 CI 环境（本地）**
   ```bash
   # 使用与 CI 相同的 Node 版本
   nvm use 20

   # 使用 CI 相同的命令
   npm ci
   npm run test:run
   ```

3. **查看 n8n 日志**
   ```yaml
   - name: Print n8n logs on failure
     if: failure()
     run: docker logs n8n-test
   ```

---

## 测试覆盖率目标

### 当前覆盖率

运行 `npm run test:coverage` 查看：

```
File                     | % Stmts | % Branch | % Funcs | % Lines
-------------------------|---------|----------|---------|--------
lib/utils.ts            | 100     | 100      | 100     | 100
lib/prompts.ts          | 85      | 75       | 100     | 85
app/api/support/route.ts| 70      | 60       | 100     | 70
```

### 目标

- **核心工具函数** (`lib/`) - ≥ 90%
- **API Routes** - ≥ 70%
- **组件** - ≥ 60%（UI 组件测试成本高，优先级低）

### 提高覆盖率

1. **识别未覆盖的分支**
   ```bash
   npm run test:coverage
   open coverage/index.html  # 查看详细报告
   ```

2. **添加测试用例覆盖缺失的逻辑**
   ```typescript
   // 发现 error handling 分支未覆盖
   it('should handle error case', () => {
     expect(() => myFunction(invalidInput)).toThrow();
   });
   ```

---

## 常见维护任务

### 1. 升级测试依赖

```bash
npm update vitest @vitest/ui pg @types/pg
```

检查是否有 breaking changes：
```bash
npm run test:run
```

### 2. 更新测试数据

当业务逻辑变化时，更新 `tests/helpers/fixtures.ts`：

```typescript
export const SUPPORT_FIXTURES = {
  // 添加新场景
  newScenario: {
    message: 'New test case',
    ticketId: 'test-new-001',
    // ...
  },
};
```

### 3. 修复 Flaky Tests（不稳定测试）

**症状**：测试有时通过，有时失败。

**原因**：
- 时间依赖（`Date.now()`）
- 竞态条件
- 外部 API 不稳定

**解决**：
```typescript
// ❌ 不稳定：依赖精确时间
expect(result.timestamp).toBe(Date.now());

// ✅ 稳定：使用时间范围
expect(result.timestamp).toBeGreaterThan(Date.now() - 1000);
expect(result.timestamp).toBeLessThan(Date.now() + 1000);

// ✅ 稳定：Mock 时间
vi.setSystemTime(new Date('2026-01-01'));
```

### 4. 清理过时的测试

定期检查并删除不再需要的测试：

```bash
# 查找引用已删除代码的测试
grep -r "DeletedFunction" tests/
```

---

## 测试最佳实践 Checklist

### 编写测试前

- [ ] 明确测试目标（测什么？为什么测？）
- [ ] 选择合适的测试类型（单元 vs 集成）
- [ ] 检查是否有可复用的 fixture

### 编写测试时

- [ ] 使用描述性的测试名称（`it('should...')`）
- [ ] 测试正常路径 + 边界条件 + 错误场景
- [ ] 每个测试只验证一件事
- [ ] 避免测试实现细节（测行为，不测内部状态）
- [ ] 使用 `beforeEach` / `afterEach` 清理状态

### 编写测试后

- [ ] 运行测试确保通过
- [ ] 故意破坏代码，确保测试会失败（验证测试有效性）
- [ ] 检查覆盖率报告
- [ ] 在 CI 中验证测试通过

---

## 故障排查

### 测试卡住不结束

**原因**：异步操作未 `await`，或连接未关闭。

**解决**：
```typescript
// ❌ 错误：忘记 await
it('test', () => {
  n8n.triggerWebhook(...); // Promise 未等待
});

// ✅ 正确：使用 async/await
it('test', async () => {
  await n8n.triggerWebhook(...);
});

// 确保关闭连接
afterAll(async () => {
  await db.close();
});
```

### 测试通过但 CI 失败

**原因**：本地环境与 CI 环境不一致。

**检查**：
- Node 版本是否一致？
- 环境变量是否正确配置？
- 是否依赖本地服务（如本地 n8n）？

**解决**：
```bash
# 使用 CI 相同的 Docker 环境
docker-compose -f docker-compose.test.yml up -d
npm run test:run
```

### 内存泄漏

**症状**：测试运行越来越慢，最后 OOM。

**原因**：数据库连接、定时器未清理。

**解决**：
```typescript
afterAll(async () => {
  await db.close();
  clearInterval(myInterval);
});
```

---

## 未来改进方向

### 短期（1-3 个月）

- [ ] 添加 API Routes 的集成测试（不依赖 n8n）
- [ ] 提高单元测试覆盖率到 80%
- [ ] 添加 Smoke Tests（部署后快速验证）

### 中期（3-6 个月）

- [ ] 添加 E2E 测试（Playwright）
- [ ] 集成测试支持 Mock AI API（减少成本）
- [ ] 性能测试（k6）

### 长期（6-12 个月）

- [ ] Visual Regression Testing（Percy / Chromatic）
- [ ] Contract Testing（Pact）
- [ ] Mutation Testing（Stryker）

---

## 相关资源

- [Vitest 官方文档](https://vitest.dev/)
- [测试金字塔理论](https://martinfowler.com/bliki/TestPyramid.html)
- [测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [n8n API 文档](https://docs.n8n.io/api/)

---

## 贡献

如有测试相关的改进建议，请提 Issue 或 PR。

### 维护者

- 测试框架：@your-name
- CI/CD：@your-name
- n8n 集成测试：@your-name
