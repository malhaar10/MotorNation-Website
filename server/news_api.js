const express = require('express');
const router = express.Router();
const pool = require('./news_db'); // PostgreSQL connection pool
const { v4: uuidv4 } = require('uuid');

// Route: POST /news
// Description: Adds a new news article to the database.
// Required: news_title, para1, para2, para3, tag, tag2
// Optional: author, images
router.post('/news', async (req, res) => {
  const {
    news_title,
    para1,
    para2,
    para3,
    tag,
    tag2,
    author = null,
    images = null,
  } = req.body;

  // Required fields must be non-empty strings
  const requiredFields = ['news_title', 'para1', 'para2', 'para3', 'tag', 'tag2'];
  const missingFields = requiredFields.filter(field => {
    const value = req.body[field];
    return typeof value !== 'string' || value.trim() === '';
  });

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missingFields.join(', ')}`
    });
  }

  try {
    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO news (id, news_title, para1, para2, para3, author, tag, tag2, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, news_title, para1, para2, para3, author, tag, tag2, images]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding news:', err);
    res.status(500).json({ error: 'Failed to add news' });
  }
});

// Route: GET /news/summary
// Description: Retrieves summary of latest 6 articles (for home/news cards)
router.get('/news/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, news_title, date, tag, tag2
      FROM news
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching news summary:', err);
    res.status(500).json({ error: 'Failed to fetch news summary' });
  }
});

// Route: GET /news/electric
// Description: Get latest 6 articles with tag = 'ev'
router.get('/news/electric', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, news_title, date, tag, tag2
      FROM news
      WHERE LOWER(tag) = 'ev'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching EV news:', error);
    res.status(500).json({ error: 'Failed to fetch EV news' });
  }
});

module.exports = router;
