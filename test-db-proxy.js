// 测试通过 socks5 代理连接 Railway 数据库
const { Client } = require('pg');
const { SocksClient } = require('socks');

console.log('🔍 Testing connection via socks5 proxy...');
console.log('Proxy: socks5://127.0.0.1:7897');
console.log('Target: monorail.proxy.rlwy.net:56507');

const config = {
  host: 'monorail.proxy.rlwy.net',
  port: 56507,
  database: 'railway',
  user: 'postgres',
  password: 'yaJBfbxzqeKvyJeDeTCIoykgHMCcunqA',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  stream: async () => {
    console.log('📡 Creating socks5 connection...');
    const { socket } = await SocksClient.createConnection({
      proxy: {
        host: '127.0.0.1',
        port: 7897,
        type: 5,
      },
      command: 'connect',
      destination: {
        host: 'monorail.proxy.rlwy.net',
        port: 56507,
      },
      timeout: 10000,
    });
    console.log('✅ Socks5 tunnel established');
    return socket;
  },
};

const client = new Client(config);

client.connect()
  .then(() => {
    console.log('✅ PostgreSQL connection successful!');
    return client.query('SELECT version()');
  })
  .then(result => {
    console.log('📊 PostgreSQL version:', result.rows[0].version.substring(0, 50) + '...');
    return client.query('SELECT current_database(), current_user');
  })
  .then(result => {
    console.log('📊 Database:', result.rows[0].current_database);
    console.log('📊 User:', result.rows[0].current_user);
    return client.end();
  })
  .then(() => {
    console.log('👍 Connection closed cleanly');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    console.error('Error code:', err.code);
    console.error('Full error:', err);
    process.exit(1);
  });
