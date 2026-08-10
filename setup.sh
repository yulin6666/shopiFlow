#!/bin/bash
# ============================================================
# ShopiFow Setup Script
# 一键部署 — 复用 n8n self-hosted-ai-starter-kit 的 Docker 容器
# ============================================================

set -e

# 颜色输出
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
err()  { echo -e "${RED}✗${NC} $1"; }
info() { echo -e "${BLUE}→${NC} $1"; }

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║        ShopiFow Setup — v1.0              ║"
echo "║  AI Automation Demo for E-commerce        ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# ── 目录检测 ─────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
N8N_STARTER_KIT="/Users/lindediannao/Documents/project/n8n/self-hosted-ai-starter-kit"

cd "$SCRIPT_DIR"

# ── 1. 检查前置依赖 ──────────────────────────────────────────

echo "━━━ 1. Checking prerequisites ━━━━━━━━━━━━━━"

if ! command -v node &> /dev/null; then
  err "Node.js not found. Please install Node.js >= 18"
  echo "   brew install node  or  https://nodejs.org"
  exit 1
fi
NODE_VERSION=$(node -v)
ok "Node.js $NODE_VERSION"

if ! command -v docker &> /dev/null; then
  err "Docker not found. Please install Docker Desktop"
  exit 1
fi
ok "Docker $(docker --version | cut -d',' -f1 | cut -d' ' -f3)"

echo ""

# ── 2. 检查 Docker 服务 ──────────────────────────────────────

echo "━━━ 2. Checking Docker services ━━━━━━━━━━━━"

# 优先找 starter kit 的 postgres（映射了 5433 端口），不是 shopiflow 自己的
POSTGRES_CONTAINER=$(docker ps --format '{{.Names}}' | grep 'starter-kit.*postgres' | head -1)
if [ -z "$POSTGRES_CONTAINER" ]; then
  POSTGRES_CONTAINER=$(docker ps --format '{{.Names}}' | grep 'postgres' | head -1)
fi
N8N_CONTAINER=$(docker ps --format '{{.Names}}' | grep '^n8n$' | head -1)

if [ -z "$POSTGRES_CONTAINER" ] || [ -z "$N8N_CONTAINER" ]; then
  warn "Docker services not running. Starting from $N8N_STARTER_KIT ..."
  if [ ! -d "$N8N_STARTER_KIT" ]; then
    err "Cannot find n8n starter kit at: $N8N_STARTER_KIT"
    echo ""
    echo "Please start the Docker services manually:"
    echo "  cd $N8N_STARTER_KIT && docker compose up -d postgres n8n"
    exit 1
  fi
  cd "$N8N_STARTER_KIT"
  docker compose up -d postgres n8n
  cd "$SCRIPT_DIR"
  sleep 5
  POSTGRES_CONTAINER=$(docker ps --format '{{.Names}}' | grep 'postgres' | head -1)
  N8N_CONTAINER=$(docker ps --format '{{.Names}}' | grep '^n8n$' | head -1)
fi

if [ -n "$POSTGRES_CONTAINER" ]; then
  ok "PostgreSQL running ($POSTGRES_CONTAINER)"
else
  err "PostgreSQL container not found after start attempt"
  exit 1
fi

if [ -n "$N8N_CONTAINER" ]; then
  ok "n8n running (port 5678)"
else
  err "n8n container not found after start attempt"
  exit 1
fi

echo ""

# ── 3. 配置环境变量 ──────────────────────────────────────────

echo "━━━ 3. Environment variables ━━━━━━━━━━━━━━━"

if [ ! -f ".env" ]; then
  cp .env.example .env
  ok ".env created from .env.example"
  echo ""
  echo "  Please edit .env and set your API keys:"
  echo "    OPENROUTER_API_KEY   → https://openrouter.ai/keys"
  echo "    SHOPIFY_STORE_DOMAIN → your-store.myshopify.com"
  echo "    SHOPIFY_ACCESS_TOKEN → Shopify Admin API token"
  echo ""
  read -p "  Press ENTER after editing .env (or Ctrl+C to exit) ..."
else
  ok ".env already exists"
fi

# 读取 .env 变量
set -a
# shellcheck disable=SC1091
source .env
set +a

# 验证必要变量
MISSING=()
[ -z "${OPENROUTER_API_KEY:-}" ] && MISSING+=("OPENROUTER_API_KEY")
if [ ${#MISSING[@]} -gt 0 ]; then
  err "Missing required env vars: ${MISSING[*]}"
  echo "  Edit .env and re-run setup.sh"
  exit 1
fi
ok "Required env vars present"

echo ""

# ── 4. 创建数据库 ────────────────────────────────────────────

echo "━━━ 4. Database setup ━━━━━━━━━━━━━━━━━━━━━━"

# 等待 PostgreSQL 就绪
info "Waiting for PostgreSQL ..."
for i in {1..15}; do
  if docker exec "$POSTGRES_CONTAINER" pg_isready -U root -q 2>/dev/null; then
    break
  fi
  sleep 2
done

# 创建 shopiflow_db（如果不存在）
EXISTS=$(docker exec "$POSTGRES_CONTAINER" psql -U root -d n8n -tAc \
  "SELECT 1 FROM pg_database WHERE datname='shopiflow_db'" 2>/dev/null || echo "")

if [ "$EXISTS" != "1" ]; then
  docker exec "$POSTGRES_CONTAINER" psql -U root -d n8n -c \
    "CREATE DATABASE shopiflow_db;" > /dev/null
  ok "shopiflow_db created"
else
  ok "shopiflow_db already exists"
fi

# 执行 schema
docker exec -i "$POSTGRES_CONTAINER" psql -U root -d shopiflow_db \
  < database/init.sql > /dev/null
ok "Database schema applied"

echo ""

# ── 5. 安装依赖 ──────────────────────────────────────────────

echo "━━━ 5. Installing dependencies ━━━━━━━━━━━━━"

npm install --legacy-peer-deps
ok "Dependencies installed"

echo ""

# ── 6. n8n 工作流说明 ────────────────────────────────────────

echo "━━━ 6. n8n Workflows ━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Import these workflow files manually in n8n UI:"
echo "  http://localhost:5678  →  Workflows → Import"
echo ""
echo "  Files:"
echo "    n8n/workflows/order-sync.json             (hourly Shopify → Pinecone)"
echo "    n8n/workflows/support-ticket-handler.json (chat RAG webhook)"
echo "    n8n/workflows/review-reply-generator.json (review reply webhook)"
echo ""
echo "  Required n8n credentials:"
echo "    ① OpenRouter (OpenAI-compatible)"
echo "       Base URL: https://openrouter.ai/api/v1"
echo "       API Key:  \$OPENROUTER_API_KEY"
echo "    ② OpenAI API (for embeddings)"
echo "       Base URL: https://openrouter.ai/api/v1  (or real OpenAI)"
echo "       API Key:  any OpenAI-compatible key"
echo "    ③ Pinecone API"
echo "       API Key:  from app.pinecone.io"
echo "    ④ ShopiFow Database (Postgres)"
echo "       Host: postgres  Port: 5432"
echo "       DB: shopiflow_db  User: root  Password: password"
echo ""
echo "  Pinecone index (create if not exists):"
echo "    Name: shopiflow-orders"
echo "    Dimensions: 1536  |  Metric: cosine"
echo ""
read -p "  Press ENTER to continue ..."

echo ""

# ── 7. 完成 ─────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
ok "Setup complete!"
echo ""
echo "  Start the app:"
echo "    npm run dev"
echo ""
echo "  Open in browser:"
echo "    Frontend  → http://localhost:3000"
echo "    n8n       → http://localhost:5678"
echo ""
echo "  Full guide: docs/SETUP.md"
echo ""
