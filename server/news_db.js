const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'news',
  password: 'Malhaar@10',
  port: 5432,
});

module.exports = pool;
