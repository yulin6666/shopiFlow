# 速率限制集成测试说明

## 测试文件位置

```
tests/integration/api/rate-limiting.test.ts
```

## 测试覆盖范围

### 1. 速率限制基本功能

#### ✅ 允许限制内的请求
- 测试场景：同一 IP 连续发送 3 次请求（未超过 5 次限制）
- 预期结果：所有请求成功，`X-RateLimit-Remaining` 逐次递减
- 验证点：数据库中有 3 条 `rate_limit_log` 记录

#### ✅ 阻止超限请求
- 测试场景：同一 IP 快速发送 6 次请求（超过 5 次限制）
- 预期结果：至少 1 次返回 `429 Too Many Requests`
- 验证点：
  - 响应头包含 `X-RateLimit-Remaining: 0`
  - 响应头包含 `Retry-After` (秒数)
  - 响应体包含 `error` 和 `retryAfter` 字段

#### ✅ 时间窗口重置
- 测试场景：达到限制后等待 61 秒（超过 60 秒窗口）
- 预期结果：窗口重置后可以再次发送请求
- 耗时：约 **90 秒**（包括请求时间）

---

### 2. 独立性测试

#### ✅ 不同端点独立限制
- 测试场景：`/api/support` 达到限制后访问 `/api/ai/review`
- 预期结果：`/api/ai/review` 不受影响（目前未接入速率限制）

#### ✅ 不同客户端独立限制
- 测试场景：IP1 达到限制后，IP2 发起请求
- 预期结果：IP2 不受影响

---

### 3. 数据库管理

#### ✅ 自动清理过期记录
- 测试场景：插入 10 分钟前的记录，触发清理逻辑
- 预期结果：超过 5 分钟的记录被删除
- 说明：清理在每次请求时触发（`DELETE FROM rate_limit_log WHERE timestamp < NOW() - INTERVAL '5 minutes'`）

---

### 4. 容错处理

#### ✅ 数据库错误时放行
- 测试场景：模拟数据库连接失败（需要 mock）
- 预期结果：API 返回正常响应，不阻塞请求
- 说明：当前测试仅验证正常场景，mock 场景需额外配置

---

## 运行测试

### 本地测试（需要本地数据库和前端服务）

```bash
# 1. 启动 PostgreSQL（Docker）
docker-compose up -d postgres

# 2. 启动前端服务
cd apps/frontend
npm run dev  # 默认 http://localhost:3000

# 3. 运行速率限制测试
npm test -- tests/integration/api/rate-limiting.test.ts
```

### Railway 环境测试

```bash
# 设置环境变量
export FRONTEND_URL=https://shopiflow-production.up.railway.app
export TEST_DB_HOST=<railway-postgres-host>
export TEST_DB_PORT=5432
export TEST_DB_NAME=railway
export TEST_DB_USER=postgres
export TEST_DB_PASSWORD=<railway-db-password>

# 运行测试
npm test -- tests/integration/api/rate-limiting.test.ts
```

---

## 测试时长估算

| 测试用例 | 预计耗时 |
|---------|---------|
| 允许限制内的请求 | ~15 秒 |
| 阻止超限请求 | ~20 秒 |
| 时间窗口重置 | ~90 秒 ⏰ |
| 不同端点独立限制 | ~20 秒 |
| 不同客户端独立限制 | ~20 秒 |
| 自动清理过期记录 | ~10 秒 |
| 容错处理 | ~10 秒 |
| **总计** | **~3 分钟** |

---

## 注意事项

### 1. 并发请求模拟

测试中使用 `Promise.all()` 模拟并发请求：

```ts
const requests = [];
for (let i = 0; i < 6; i++) {
  requests.push(fetch(...));
}
const responses = await Promise.all(requests);
```

由于网络延迟，实际可能串行执行。真实压力测试建议使用 `artillery` 或 `k6`。

### 2. IP 识别

测试通过 `X-Forwarded-For` header 模拟不同 IP：

```ts
headers: {
  'X-Forwarded-For': 'test-ip-12345',
}
```

Railway 部署时会注入真实 IP，本地测试需手动设置。

### 3. 数据清理

每个测试后自动清理 `identifier LIKE 'test-%'` 的记录，避免污染数据库。

### 4. 跳过慢速测试

如果不想等待 61 秒的窗口重置测试，可以跳过：

```bash
npm test -- tests/integration/api/rate-limiting.test.ts --skip "should reset rate limit"
```

---

## 扩展测试场景

### 性能压测（Artillery）

创建 `tests/load/rate-limiting.yml`：

```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10  # 每秒 10 个请求
  processor: "./processor.js"

scenarios:
  - name: "Rate limit stress test"
    flow:
      - post:
          url: "/api/support"
          json:
            message: "Load test message"
            source: "shopify"
```

运行：

```bash
npx artillery run tests/load/rate-limiting.yml
```

### 真实用户模拟

使用不同的 `X-Forwarded-For` IP 模拟多用户：

```ts
const ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3'];
for (const ip of ips) {
  // 每个 IP 发送 5 次请求
}
```

---

## 常见问题

### Q1: 测试失败 - 数据库连接超时
**A:** 检查 `.env.test` 中的数据库配置，确保 PostgreSQL 已启动。

### Q2: 所有请求都被拒绝
**A:** 清理 `rate_limit_log` 表：
```sql
DELETE FROM rate_limit_log;
```

### Q3: 测试通过但生产环境不生效
**A:** 检查 Railway 是否正确注入 `X-Forwarded-For` header，查看日志验证 IP 识别逻辑。
