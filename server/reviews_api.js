const express = require('express');
const router = express.Router();
const pool = require('./reviews_db');

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

// ✅ Fix this in reviews_api.js
router.get('/reviews/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year
      FROM reviews
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching review summaries:', err);
    res.status(500).json({ error: 'Failed to fetch review summaries' });
  }
});

router.get('/reviews/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year
      FROM reviews
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching review summary:', err);
    res.status(500).json({ error: 'Failed to fetch review summary' });
  }
});

// reviews_api.js
router.get('/reviews/electric', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year
      FROM reviews
      WHERE tag = 'ev'
      ORDER BY model_year DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching EV reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reviews', async (req, res) => {
  const {
    car_name,
    model_year,
    overview,
    pricing,
    drivetrain,
    interior,
    technology,
    safety,
    warranty,
    tag,
    tag2
  } = req.body;

  if (!car_name || !model_year || !overview || !pricing || !drivetrain ||
      !interior || !technology || !safety || !warranty || !tag || !tag2) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO reviews (
        car_name, model_year, overview, pricing, drivetrain,
        interior, technology, safety, warranty, tag, tag2
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [car_name, model_year, overview, pricing, drivetrain,
       interior, technology, safety, warranty, tag, tag2]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error inserting review:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

module.exports = router;
