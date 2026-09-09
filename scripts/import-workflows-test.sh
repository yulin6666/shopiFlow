#!/bin/bash
set -e

# n8n workflow 导入脚本（测试环境）
# 用于 CI/CD 中自动导入 workflow

N8N_URL="${N8N_TEST_URL:-http://localhost:5678}"
WORKFLOWS_DIR="${WORKFLOWS_DIR:-./n8n/workflows}"
CONTAINER_NAME="${N8N_CONTAINER_NAME:-n8n-test}"

echo "🔧 Importing n8n workflows to $N8N_URL..."

# 检查 n8n 是否就绪
echo "⏳ Waiting for n8n to be ready..."
timeout 90 bash -c "until curl -sf $N8N_URL/healthz > /dev/null 2>&1; do sleep 3; done" || {
  echo "❌ n8n is not ready after 90 seconds"
  exit 1
}

echo "✅ n8n is ready"

# 检查 Docker 容器是否存在
if ! docker ps | grep -q "$CONTAINER_NAME"; then
  echo "⚠️  Docker container '$CONTAINER_NAME' not found"
  echo "💡 Workflows will need to be imported manually"
  exit 0
fi

# 导入所有 workflow JSON 文件
if [ -d "$WORKFLOWS_DIR" ]; then
  echo "📂 Found workflows directory: $WORKFLOWS_DIR"
  workflow_count=$(find "$WORKFLOWS_DIR" -name "*.json" | wc -l)
  echo "📝 Found $workflow_count workflow files"

  if [ "$workflow_count" -gt 0 ]; then
    success_count=0

    for workflow_file in "$WORKFLOWS_DIR"/*.json; do
      workflow_name=$(basename "$workflow_file")
      echo "📥 Importing $workflow_name..."

      # 复制 workflow 到容器
      docker cp "$workflow_file" "$CONTAINER_NAME:/tmp/$workflow_name"

      # 使用 n8n CLI 导入
      if docker exec "$CONTAINER_NAME" n8n import:workflow --input="/tmp/$workflow_name" 2>/dev/null; then
        echo "  ✅ Successfully imported $workflow_name"
        ((success_count++))
      else
        echo "  ⚠️  Failed to import $workflow_name (might already exist or invalid)"
      fi

      # 清理临时文件
      docker exec "$CONTAINER_NAME" rm -f "/tmp/$workflow_name" 2>/dev/null || true
    done

    echo ""
    echo "✅ Import completed: $success_count/$workflow_count workflows imported"

    if [ "$success_count" -eq 0 ]; then
      echo "⚠️  No workflows were imported. Tests may fail."
      echo "💡 Check n8n logs: docker logs $CONTAINER_NAME"
    fi
  else
    echo "⚠️  No workflow files found"
  fi
else
  echo "⚠️ Workflows directory not found: $WORKFLOWS_DIR"
  echo "⚠️ Tests may fail if workflows are not imported"
fi

echo "✅ Workflow import script completed"
