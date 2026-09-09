import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.next'],
    globals: true,
    environment: 'node',
    pool: 'forks', // 使用 forks 模式避免 DataCloneError（axios 实例含函数无法被 structuredClone）
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000, // n8n workflow 执行可能需要较长时间
    hookTimeout: 30000,
    teardownTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['apps/frontend/src/lib/**/*.ts', 'apps/frontend/src/app/api/**/*.ts'],
      exclude: ['**/*.d.ts', '**/*.test.ts', '**/node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/frontend/src'),
    },
  },
});
