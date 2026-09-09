#!/bin/bash

echo "🛑 Stopping all services..."

# Stop Next.js dev server
pkill -f "next dev" 2>/dev/null
echo "  ✓ Next.js stopped"

# Stop n8n (if running standalone)
# pkill -f "n8n" 2>/dev/null

# Stop n8n Docker containers
cd /Users/lindediannao/Documents/project/n8n/self-hosted-ai-starter-kit
docker compose stop
echo "  ✓ n8n Docker stopped"

cd /Users/lindediannao/Documents/project/shopiFlow

echo ""
echo "🧹 Cleaning cache..."
rm -rf .next
echo "  ✓ .next cache cleared"

echo ""
echo "🚀 Starting services..."

# Start n8n Docker
cd /Users/lindediannao/Documents/project/n8n/self-hosted-ai-starter-kit
docker compose start
echo "  ✓ n8n Docker starting..."

cd /Users/lindediannao/Documents/project/shopiFlow

# Start Next.js
npm run dev > /tmp/shopiflow-dev.log 2>&1 &
echo "  ✓ Next.js starting on http://localhost:3000"

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 8

echo ""
echo "🔄 Testing n8n webhook registration..."
WEBHOOK_TEST=$(curl -s -X POST http://localhost:5678/webhook/shopify-support \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' 2>&1 | grep -o "status" | head -1)

if [ "$WEBHOOK_TEST" = "status" ]; then
  echo "  ✅ n8n webhooks registered successfully"
else
  echo "  ⚠️  n8n webhooks not ready - restarting n8n container..."
  cd /Users/lindediannao/Documents/project/n8n/self-hosted-ai-starter-kit
  docker compose restart n8n
  cd /Users/lindediannao/Documents/project/shopiFlow
  sleep 10
  echo "  ✓ n8n restarted"
fi

echo ""
echo "✅ All services restarted!"
echo ""
echo "📊 Status:"
echo "  - Next.js: http://localhost:3000"
echo "  - n8n: http://localhost:5678"
echo "  - Logs: tail -f /tmp/shopiflow-dev.log"
