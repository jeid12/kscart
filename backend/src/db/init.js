// Applies the SQL schema. Run with: npm run db:init
const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function init() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('✓ KasiCart schema applied successfully.');
  } catch (err) {
    console.error('✗ Failed to apply schema:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

init();
