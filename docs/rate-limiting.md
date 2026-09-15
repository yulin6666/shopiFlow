# API 速率限制实现文档

## 背景

`/api/support` 每次请求都会触发 n8n → OpenRouter (claude-sonnet-4-6) 调用，成本较高。若被恶意刷接口或用户高频对话，费用会快速增长。通过速率限制，将每个 IP 每分钟的请求数控制在 5 次以内。

---

## 实现方案：滑动窗口计数器（PostgreSQL）

### 为什么用 PostgreSQL 而不是内存 Map？

| 方案 | 优点 | 缺点 |
|------|------|------|
| 内存 Map | 速度快，零依赖 | 多实例部署（Railway 水平扩展）时各实例独立计数，限制失效 |
| PostgreSQL | 多实例共享状态，Railway 已有数据库 | 每次请求多一次 DB 查询 |
| Redis | 速度快，支持 TTL | 需要额外服务，增加成本 |

项目已有 PostgreSQL（Railway 部署），选择 PostgreSQL 方案，无需增加新依赖。

### 算法：滑动窗口

```
时间轴：---[窗口起点]---[当前时间]---
              |← 60 秒 →|

窗口内请求数 >= 5 → 拒绝，返回 429
窗口内请求数 < 5  → 放行，记录本次请求
```

每次请求时：
1. 删除超过 5 分钟的旧记录（清理）
2. 查询过去 60 秒内该 IP 的请求数
3. 超过 5 次 → 返回 429
4. 未超过 → 插入记录，放行

---

## 涉及文件

```
apps/frontend/src/
├── lib/
│   └── rate-limiter.ts          # 速率限制核心逻辑
└── app/api/support/
    └── route.ts                 # 接入速率限制检查
```

---

## 数据库表结构

```sql
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id         SERIAL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,   -- 客户端 IP
  endpoint   VARCHAR(255) NOT NULL,   -- API 路径，如 /api/support
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit
  ON rate_limit_log (identifier, endpoint, timestamp);
```

表在首次请求时自动创建（`CREATE TABLE IF NOT EXISTS`），无需手动执行 migration。

---

## API 响应

### 正常请求

```http
HTTP/1.1 200 OK
X-RateLimit-Remaining: 4
```

### 触发限制

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-09-15T10:01:00.000Z
Retry-After: 47

{
  "error": "Rate limit exceeded. Please try again later.",
  "retryAfter": 47
}
```

---

## 配置参数

`checkRateLimit` 函数签名：

```ts
checkRateLimit(
  identifier: string,  // 客户端 IP
  endpoint: string,    // API 路径
  maxRequests = 5,     // 每窗口最大请求数
  windowMs = 60000,    // 时间窗口（毫秒），默认 1 分钟
)
```

如需调整限制（如演示时放宽到每分钟 20 次），修改 `route.ts` 中的调用：

```ts
await checkRateLimit(identifier, '/api/support', 20, 60000);
```

---

## 容错设计

数据库查询失败时，速率限制会**静默放行**而不是拒绝请求，避免数据库故障导致服务不可用：

```ts
} catch (error) {
  console.error('[rate-limiter] Database error:', error);
  return { allowed: true, remaining: maxRequests - 1, resetAt: ... };
}
```

---

## IP 识别逻辑

```ts
const forwarded = req.headers.get('x-forwarded-for');  // Nginx/Railway 反向代理
const realIp    = req.headers.get('x-real-ip');
const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
```

优先读取 `X-Forwarded-For`（Railway 注入），取第一个 IP（最靠近客户端）。

---

## 当前覆盖范围

| 端点 | 是否有速率限制 |
|------|--------------|
| `POST /api/support` | ✅ 5次/分钟/IP |
| `POST /api/ai/review` | ❌ 未接入（评论回复频率较低，暂不需要） |
