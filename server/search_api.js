const express = require('express');
const router = express.Router();
const poolReview = require('./reviews_db');
const poolNews = require('./news_db');

router.get('/search', async (req, res) => {
    const keyword = req.query.tag?.toLowerCase();
    console.log("Received search keyword:", keyword); // TEST PRINT

    if (!keyword) {
        return res.status(400).json({ error: 'Tag is required' });
    }

    try {
        const [reviewsResult, newsResult] = await Promise.all([
            poolReview.query(
                `SELECT id, car_name, model_year, tag, tag2
                 FROM reviews
                 WHERE LOWER(tag) ILIKE $1
                    OR LOWER(tag2) ILIKE $1
                    OR LOWER(car_name) ILIKE $1
                 ORDER BY model_year DESC
                 LIMIT 7`,
                [`%${keyword}%`]
            ),
            poolNews.query(
                `SELECT id, news_title, date, tag, tag2
                 FROM news
                 WHERE LOWER(tag) ILIKE $1
                    OR LOWER(tag2) ILIKE $1
                    OR LOWER(news_title) ILIKE $1
                 ORDER BY date DESC
                 LIMIT 7`,
                [`%${keyword}%`]
            ),
        ]);

        console.log("Reviews found:", reviewsResult.rows.length); // TEST PRINT
        console.log("News found:", newsResult.rows.length); // TEST PRINT

        res.json({
            reviews: reviewsResult.rows,
            news: newsResult.rows
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;