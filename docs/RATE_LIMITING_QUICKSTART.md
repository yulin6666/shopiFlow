# 速率限制 - 快速测试指南

## 快速开始

### 1. 启动服务

```bash
# 启动数据库
docker-compose up -d postgres

# 启动前端
cd apps/frontend
npm run dev  # http://localhost:3000
```

### 2. 运行测试

```bash
# 运行速率限制集成测试
npm test -- tests/integration/api/rate-limiting.test.ts

# 跳过慢速测试（61秒等待窗口重置）
npm test -- tests/integration/api/rate-limiting.test.ts -t "should allow|should block|should track"
```

---

## 手动测试

### 测试工具：curl

```bash
# 发送 6 次请求，第 6 次应该被限制
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/support \
    -H "Content-Type: application/json" \
    -H "X-Forwarded-For: 192.168.1.100" \
    -d '{"message":"Test message","source":"shopify"}' \
    -i | grep -E "HTTP|X-RateLimit"
  echo ""
  sleep 1
done
```

预期输出：

```
Request 1:
HTTP/1.1 200 OK
X-RateLimit-Remaining: 4

Request 2:
HTTP/1.1 200 OK
X-RateLimit-Remaining: 3

...

Request 6:
HTTP/1.1 429 Too Many Requests
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-09-15T10:01:00.000Z
Retry-After: 47
```

---

## 数据库验证

```sql
-- 查看所有速率限制记录
SELECT identifier, endpoint, timestamp
FROM rate_limit_log
ORDER BY timestamp DESC
LIMIT 10;

-- 查看某个 IP 的请求数
SELECT COUNT(*) as request_count
FROM rate_limit_log
WHERE identifier = '192.168.1.100'
  AND timestamp >= NOW() - INTERVAL '1 minute';

-- 清空测试数据
DELETE FROM rate_limit_log WHERE identifier LIKE 'test-%';
```

---

## 测试场景

### ✅ 场景 1：正常使用（3 次请求）
- 预期：全部成功
- 验证：`X-RateLimit-Remaining` 从 4 → 3 → 2

### ✅ 场景 2：超限（6 次请求）
- 预期：至少 1 次返回 `429`
- 验证：错误消息 + `Retry-After` header

### ✅ 场景 3：不同 IP 独立
- 预期：IP1 被限制后，IP2 仍可访问

### ✅ 场景 4：时间窗口重置
- 预期：等待 61 秒后可以再次请求

---

## 常见问题

**Q: 测试失败 - "Table rate_limit_log does not exist"**

A: 表会在首次请求时自动创建，确保前端服务已启动并收到至少一次请求。

**Q: 所有请求都被限制**

A: 清理数据库：
```sql
DELETE FROM rate_limit_log;
```

**Q: Railway 环境测试**

A: 设置环境变量：
```bash
export FRONTEND_URL=https://shopiflow.up.railway.app
export TEST_DB_HOST=<railway-db-host>
export TEST_DB_PASSWORD=<railway-db-password>
```

---

## 相关文档

- [速率限制实现文档](./rate-limiting.md)
- [测试详细说明](./rate-limiting-tests.md)
