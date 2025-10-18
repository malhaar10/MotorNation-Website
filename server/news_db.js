const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Enhanced database connection error handling
pool.on('connect', (client) => {
  console.log('✅ News DB: New client connected');
});

pool.on('error', (err, client) => {
  console.error('❌ News DB: Unexpected error on idle client:', {
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    database: process.env.PGDATABASE,
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER
  });
});

pool.on('acquire', (client) => {
  console.log('📊 News DB: Client acquired from pool');
});

pool.on('remove', (client) => {
  console.log('📊 News DB: Client removed from pool');
});

// Test connection on startup with detailed error logging
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ News DB: Connection test failed:', {
      error: err.message,
      stack: err.stack,
      code: err.code,
      timestamp: new Date().toISOString(),
      database: process.env.PGDATABASE,
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      user: process.env.PGUSER,
      connectionString: `postgresql://${process.env.PGUSER}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`
    });
    return;
  }
  
  console.log('✅ News DB: Connection test successful');
  client.query('SELECT NOW()', (err, result) => {
    release();
    if (err) {
      console.error('❌ News DB: Query test failed:', {
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
      return;
    }
    console.log('✅ News DB: Query test successful, server time:', result.rows[0].now);
  });
});

module.exports = pool;
