require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE, // Use environment variable like news_db.js
  port: process.env.PGPORT,
});

module.exports = pool;
