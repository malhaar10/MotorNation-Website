const express = require('express');
const router = express.Router();
const poolReview = require('./reviews_db');
const poolNews = require('./news_db');

router.get('/search', async (req, res) => {
    const keyword = req.query.tag?.toLowerCase();
    console.log("📊 Search API: Received search keyword:", keyword);

    if (!keyword) {
        console.log("❌ Search API: Missing required 'tag' parameter");
        return res.status(400).json({ error: 'Tag parameter is required' });
    }

    try {
        console.log(`📊 Search API: Starting parallel search for keyword: "${keyword}"`);
        const [reviewsResult, newsResult] = await Promise.all([
            poolReview.query(
                `SELECT id, car_name, model_year, tag, tag2, images
                 FROM reviews
                 WHERE LOWER(tag) ILIKE $1
                    OR LOWER(tag2) ILIKE $1
                    OR LOWER(car_name) ILIKE $1
                 ORDER BY model_year DESC
                 LIMIT 7`,
                [`%${keyword}%`]
            ),
            poolNews.query(
                `SELECT id, news_title, date, tag, tag2, images
                 FROM news
                 WHERE LOWER(tag) ILIKE $1
                    OR LOWER(tag2) ILIKE $1
                    OR LOWER(news_title) ILIKE $1
                 ORDER BY date DESC
                 LIMIT 7`,
                [`%${keyword}%`]
            ),
        ]);

        console.log(`✅ Search API: Found ${reviewsResult.rows.length} reviews and ${newsResult.rows.length} news articles for "${keyword}"`);

        res.json({
            reviews: reviewsResult.rows,
            news: newsResult.rows,
            keyword: keyword,
            totalResults: reviewsResult.rows.length + newsResult.rows.length
        });
    } catch (error) {
        console.error('❌ Search API: Search error:', {
            error: error.message,
            stack: error.stack,
            code: error.code,
            timestamp: new Date().toISOString(),
            method: 'GET',
            endpoint: '/api/search',
            query: req.query,
            keyword: keyword,
            headers: req.headers['user-agent']
        });
        res.status(500).json({ error: 'Search operation failed' });
    }
});

module.exports = router;