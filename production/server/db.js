const { Pool } = require('pg');
require('dotenv').config();

// Cloud SQL connection configuration with enhanced error handling and pooling
const pool = new Pool({
  user: process.env.DB_USER || process.env.PGUSER,
  host: process.env.DB_HOST || process.env.PGHOST,
  database: process.env.DB_NAME || process.env.PGDATABASE,
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
  port: process.env.DB_PORT || process.env.PGPORT || 5432,
  
  // Connection pool configuration for Cloud SQL
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // how long to wait when connecting a new client
  
  // SSL configuration for Cloud SQL (recommended for production)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // Connection retry configuration
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Enhanced error handling for connection pool
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

pool.on('connect', (client) => {
  console.log('✅ New client connected to database');
});

module.exports = pool;