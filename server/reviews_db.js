require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: 'reviews', // explicitly use reviews database
  port: process.env.PGPORT,
});

module.exports = pool;
