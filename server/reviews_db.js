require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: 'reviews', // explicitly use reviews database
  port: process.env.PGPORT,
});

// Enhanced database connection error handling
pool.on('connect', (client) => {
  console.log('✅ Reviews DB: New client connected');
});

pool.on('error', (err, client) => {
  console.error('❌ Reviews DB: Unexpected error on idle client:', {
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    database: 'reviews',
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER
  });
});

pool.on('acquire', (client) => {
  console.log('📊 Reviews DB: Client acquired from pool');
});

pool.on('remove', (client) => {
  console.log('📊 Reviews DB: Client removed from pool');
});

// Test connection on startup with detailed error logging
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Reviews DB: Connection test failed:', {
      error: err.message,
      stack: err.stack,
      code: err.code,
      timestamp: new Date().toISOString(),
      database: 'reviews',
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      user: process.env.PGUSER,
      connectionString: `postgresql://${process.env.PGUSER}@${process.env.PGHOST}:${process.env.PGPORT}/reviews`
    });
    return;
  }
  
  console.log('✅ Reviews DB: Connection test successful');
  client.query('SELECT NOW()', (err, result) => {
    release();
    if (err) {
      console.error('❌ Reviews DB: Query test failed:', {
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
      return;
    }
    console.log('✅ Reviews DB: Query test successful, server time:', result.rows[0].now);
  });
});

module.exports = pool;
