const { Pool } = require('pg');
const config = require('../config');

// Enable TLS for managed providers (Neon, etc.) that require it. Detected from
// the connection string so local (non-SSL) Postgres keeps working unchanged.
const url = config.databaseUrl || '';
const needsSsl =
  /sslmode=require/i.test(url) ||
  /\.neon\.tech/i.test(url) ||
  process.env.PGSSL === 'true';

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: needsSsl ? { require: true, rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
