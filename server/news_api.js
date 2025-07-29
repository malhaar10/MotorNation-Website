const express = require('express');
const router = express.Router();
const pool = require('./news_db'); // PostgreSQL connection pool

// Route: GET /news/electric
// Description: Fetches the latest 6 news articles tagged specifically as "ev" (case-insensitive).
// This route is meant for the electric vehicle (EV) section of the website.
router.get('/news/electric', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, news_title, date, tag
       FROM news
       WHERE LOWER(tag) = 'ev'
       ORDER BY created_at DESC
       LIMIT 6`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching EV news:', error);
    res.status(500).json({ error: 'Failed to fetch EV news' });
  }
});

// Route: POST /news
// Description: Adds a new news article to the database.
// Expects the request body to contain: news_title, para1, para2, para3, author, and tag.
router.post('/news', async (req, res) => {
  const { news_title, para1, para2, para3, author, tag } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO news (news_title, para1, para2, para3, author, tag)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [news_title, para1, para2, para3, author, tag]
    );

    // Respond with the newly created article
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding news:', err);
    res.status(500).json({ error: 'Failed to add news' });
  }
});

// Route: GET /news/summary
// Description: Retrieves a summary of the latest 6 news articles.
// Returns only the id, title, date, and tag for quick previews on the frontend.
router.get('/news/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, news_title, date, tag
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

// Route duplication notice:
// The following route is a duplicate of the earlier /news/electric route.
// It is recommended to remove this redundant block to avoid unexpected behavior.
router.get('/news/electric', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, news_title, date, tag
       FROM news
       WHERE LOWER(tag) = 'ev'
       ORDER BY created_at DESC
       LIMIT 6`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching EV news:', error);
    res.status(500).json({ error: 'Failed to fetch EV news' });
  }
});

module.exports = router;
