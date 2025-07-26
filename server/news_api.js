const express = require('express');
const router = express.Router();
const pool = require('./news_db');

// POST a news article
router.post('/news', async (req, res) => {
  const { news_title, para1, para2, para3, author, tag} = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO news (news_title, para1, para2, para3, author, tag)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [news_title, para1, para2, para3, author, tag]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding news:', err);
    res.status(500).json({ error: 'Failed to add news' });
  }
});

// GET latest news (optional limit)
// GET /api/news/latest - returns top 7 recent news
router.get('/news/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, news_title, date, tag
      FROM news
      ORDER BY created_at DESC
      LIMIT 7
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching news summary:', err);
    res.status(500).json({ error: 'Failed to fetch news summary' });
  }
});


// GET /api/news/:id - Fetch a single news article by ID
router.get('/news/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM news WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'News not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching news by ID:', err);
    res.status(500).json({ error: 'Failed to fetch news article' });
  }
});


module.exports = router;
