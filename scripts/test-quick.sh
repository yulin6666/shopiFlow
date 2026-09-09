#!/bin/bash
# 快速测试脚本 - 仅运行单元测试

echo "🧪 运行单元测试..."
npm run test:run -- tests/unit

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 所有单元测试通过！"
  echo ""
  echo "💡 提示：集成测试需要配置 n8n workflow，跳过。"
  echo "   如需运行集成测试，请先在 n8n UI 中导入并激活 workflow。"
else
  echo "❌ 测试失败"
  exit 1
fi
