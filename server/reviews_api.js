const express = require('express');
const router = express.Router();
const pool = require('./reviews_db');

// POST /api/reviews - Create a new review
router.post('/reviews', async (req, res) => {
  const { overview, pricing, drivetrain, warranty, interior, safety, technology, tag } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO reviews (
        overview, pricing, drivetrain, warranty, interior, safety, technology, tag
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [overview, pricing, drivetrain, warranty, interior, safety, technology, tag]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error inserting review:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// GET /api/reviews - Fetch all reviews
router.get('/reviews', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

module.exports = router;
