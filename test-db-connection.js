const { Pool } = require('pg');

const pool = new Pool({
  host: 'monorail.proxy.rlwy.net',
  port: 56507,
  database: 'railway',
  user: 'postgres',
  password: 'yaJBfbxzqeKvyJeDeTCIoykgHMCcunqA',
  ssl: { rejectUnauthorized: false },
});

async function test() {
  try {
    console.log('⏳ Connecting to Railway database...');
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ Database connected successfully!');
    console.log('Result:', result.rows);

    // Check if ai_processing_log table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'ai_processing_log'
      );
    `);
    console.log('ai_processing_log table exists:', tableCheck.rows[0].exists);

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

test();
