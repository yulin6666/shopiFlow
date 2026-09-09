import { config } from 'dotenv';
import path from 'path';

// 加载测试环境变量
config({ path: path.resolve(__dirname, '../.env.test') });

// 全局测试配置
export const TEST_CONFIG = {
  n8n: {
    baseUrl: process.env.N8N_TEST_URL || 'http://localhost:5678',
    webhookTimeout: 30000,
  },
  database: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5433'),
    database: process.env.TEST_DB_NAME || 'shopiflow_test',
    user: process.env.TEST_DB_USER || 'test_user',
    password: process.env.TEST_DB_PASSWORD || 'test_password',
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || 'test-key',
  },
};

// 全局 beforeAll - 可选的初始化逻辑
beforeAll(() => {
  console.log('🧪 Test environment initialized');
});

// 全局 afterAll - 清理逻辑
afterAll(() => {
  console.log('✅ Test suite completed');
});
