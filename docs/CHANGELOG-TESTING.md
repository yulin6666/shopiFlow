# 更新日志

## [测试框架实施] - 2026-09-04

### ✨ 新增功能

#### 测试基础设施
- ✅ 集成 **Vitest** 测试框架
- ✅ 配置 **Docker Compose** 测试环境（n8n + PostgreSQL）
- ✅ 创建 **GitHub Actions CI** 流水线
- ✅ 添加测试覆盖率报告

#### 单元测试
- ✅ `lib/utils.ts` - 11 个工具函数的完整测试（100% 覆盖）
- ✅ `lib/prompts.ts` - AI prompt 构建逻辑测试
- ✅ n8n workflow Code 节点逻辑测试（parseInput, parseClassification, handleAiError）

#### 集成测试
- ✅ `shopify-support-handler.json` workflow 端到端测试
  - 正常分类场景（auto/draft/escalate）
  - 边界条件（空消息、超长消息、XSS）
  - 错误降级逻辑验证
  - 并发请求测试
- ✅ `judgeme-review-handler.json` workflow 端到端测试
  - 不同评分场景（1星/3星/5星）
  - 回复质量检查（字数限制、无 JSON 格式）

#### 测试辅助工具
- ✅ `N8nClient` - 封装 n8n webhook 调用和健康检查
- ✅ `DbClient` - 封装 PostgreSQL 数据库操作和测试数据清理
- ✅ `fixtures.ts` - 预定义测试数据集（覆盖正常路径和边界条件）

### 📚 文档

- ✅ `docs/testing-guide.md` - 完整测试运行指南（快速开始、测试结构、常见问题）
- ✅ `docs/testing-maintenance.md` - 测试维护手册（添加新测试、Mock 策略、CI 调试）
- ✅ `docs/n8n-error-handling-optimization.md` - n8n 错误处理优化文档（已存在）

### 🔧 配置文件

- ✅ `vitest.config.ts` - Vitest 测试配置
- ✅ `tests/setup.ts` - 全局测试环境配置
- ✅ `.env.test` - 测试环境变量模板
- ✅ `docker-compose.test.yml` - 测试服务编排
- ✅ `.github/workflows/test.yml` - CI/CD 流水线
- ✅ `scripts/import-workflows-test.sh` - n8n workflow 导入脚本

### 📦 依赖更新

添加到 `apps/frontend/package.json`：
- `vitest: ^1.6.0`
- `@vitest/ui: ^1.6.0`
- `pg: ^8.12.0`
- `@types/pg: ^8.11.6`
- `dotenv: ^16.4.5`

### 🎯 测试覆盖率

- **单元测试覆盖率**：
  - `lib/utils.ts`: 100%
  - `lib/prompts.ts`: ~85%
  - n8n workflow 逻辑: 100%

- **集成测试场景**：
  - Support Handler: 12 个测试场景
  - Review Handler: 3 个测试场景

### 🚀 CI/CD

GitHub Actions 流水线包含：
1. **unit-tests** - Lint + 单元测试（~2 分钟）
2. **integration-tests** - n8n + PostgreSQL + 集成测试（~5 分钟）
3. **build-check** - TypeScript 编译 + Next.js 构建（~3 分钟）
4. **test-summary** - 测试结果汇总

**总运行时间**：~10 分钟

### 📝 脚本命令

添加到 `package.json`：
```json
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

### 🎨 项目结构

```
shopiFlow/
├── tests/
│   ├── setup.ts                          # 全局配置
│   ├── helpers/
│   │   ├── n8n-client.ts                 # n8n API 封装
│   │   ├── db-client.ts                  # 数据库操作封装
│   │   └── fixtures.ts                   # 测试数据集
│   ├── unit/
│   │   ├── lib/
│   │   │   ├── utils.test.ts             # 工具函数测试
│   │   │   └── prompts.test.ts           # Prompt 测试
│   │   └── n8n-workflow-logic.test.ts    # Workflow 逻辑测试
│   └── integration/
│       └── n8n-workflows/
│           ├── support-handler.test.ts   # Support Handler 集成测试
│           └── review-handler.test.ts    # Review Handler 集成测试
├── vitest.config.ts                      # Vitest 配置
├── docker-compose.test.yml               # 测试环境
├── .env.test                             # 测试环境变量
├── .github/workflows/test.yml            # CI/CD 流水线
└── docs/
    ├── testing-guide.md                  # 测试运行指南
    ├── testing-maintenance.md            # 测试维护手册
    └── n8n-error-handling-optimization.md # 错误处理文档
```

### ⚙️ 技术选型理由

- **Vitest vs Jest**：更快、原生 ESM、更好的 TypeScript 支持
- **n8n API 测试 vs Playwright UI 测试**：速度快（2-3 秒 vs 30-60 秒）、稳定性高、CI 友好
- **真实 API vs Mock**：集成测试用真实 API 发现实际问题，单元测试用 Mock 提高速度

### 🔮 未来计划

**短期（1-3 个月）**：
- [ ] 添加 API Routes 的集成测试（不依赖 n8n）
- [ ] 提高单元测试覆盖率到 80%
- [ ] 添加 Smoke Tests

**中期（3-6 个月）**：
- [ ] 添加 E2E 测试（Playwright）
- [ ] 集成测试支持 Mock AI API（减少成本）
- [ ] 性能测试（k6）

### 🐛 已知问题

1. **集成测试依赖外部 API**
   - 原因：测试真实的 OpenRouter 和 Pinecone 集成
   - 影响：测试速度较慢（5-10 秒/请求），依赖网络和 API 配额
   - 缓解：优先运行单元测试，集成测试仅在 CI 和重要改动时运行

2. **n8n workflow 需要手动导入**
   - 原因：n8n 没有提供命令行导入 API
   - 影响：首次运行测试前需要手动在 n8n UI 导入 workflow
   - 缓解：提供了导入脚本检查文件，文档中有详细步骤

3. **测试数据库需要预先初始化**
   - 原因：ai_processing_log 表需要提前创建
   - 影响：首次运行需要执行 `database/init.sql`
   - 缓解：CI 自动执行，本地测试指南中有说明

### 📊 性能指标

- **本地测试运行时间**：
  - 单元测试：< 5 秒
  - 集成测试：2-5 分钟
  - 全部测试 + 构建：5-8 分钟

- **CI 运行时间**：
  - 总计：~10 分钟
  - 并行运行 3 个 job（unit-tests、integration-tests、build-check）

### 🙏 致谢

测试框架实施基于《样板项目实施方案.md》中的技术方案，采用推荐的 **方案 A（n8n API + Vitest）**。

---

## 如何使用

### 本地运行测试

```bash
# 1. 安装依赖
npm install

# 2. 启动测试环境
docker-compose -f docker-compose.test.yml up -d

# 3. 初始化数据库
PGPASSWORD=test_password psql -h localhost -p 5433 -U test_user -d shopiflow_test -f database/init.sql

# 4. 运行测试
npm run test

# 5. 查看覆盖率
npm run test:coverage
```

### 在 CI 中自动运行

每次 Push 到 `main`、`feature_v2`、`develop` 分支，或创建 PR 时，GitHub Actions 会自动运行所有测试。

查看结果：GitHub → Actions → 最新 workflow run

---

## 相关链接

- [测试运行指南](./docs/testing-guide.md)
- [测试维护手册](./docs/testing-maintenance.md)
- [n8n 错误处理优化文档](./docs/n8n-error-handling-optimization.md)
- [Vitest 官方文档](https://vitest.dev/)
