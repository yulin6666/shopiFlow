// 测试直连 Railway 数据库（不走代理）
const { Client } = require('pg');

const client = new Client({
  host: 'monorail.proxy.rlwy.net',
  port: 56507,
  database: 'railway',
  user: 'postgres',
  password: 'yaJBfbxzqeKvyJeDeTCIoykgHMCcunqA',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

console.log('🔍 Testing direct connection to Railway PostgreSQL...');

client.connect()
  .then(() => {
    console.log('✅ Direct connection successful!');
    return client.query('SELECT version()');
  })
  .then(result => {
    console.log('📊 PostgreSQL version:', result.rows[0].version);
    return client.end();
  })
  .then(() => {
    console.log('👍 Connection closed cleanly');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  });
