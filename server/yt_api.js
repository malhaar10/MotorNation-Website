require('dotenv').config();
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const cors = require('cors');
const pool = require('./reviews_db');  // ⬅️ PostgreSQL connection
pool.query('SELECT 1', (err, res) => {
  if (err) {
    console.error('❌ DB test connection failed:', err.stack);
  } else {
    console.log('✅ DB test connection successful');
  }
});


const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.YT_API_KEY;
const cache = new NodeCache({ stdTTL: 86400 });

app.use(cors());
app.use(express.json());  // ⬅️ Parse JSON bodies

/**
 * Fetch videos from a specific playlist
 */
app.get('/getPlaylistVideos', async (req, res) => {
    const { playlistId } = req.query;
    if (!playlistId) return res.status(400).json({ error: 'playlistId is required' });

    const cached = cache.get(`playlist-${playlistId}`);
    if (cached) return res.json(cached);

    try {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
            params: {
                part: 'snippet',
                playlistId,
                maxResults: 6,
                key: API_KEY
            }
        });

        const videos = response.data.items.map(item => ({
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url
        }));

        cache.set(`playlist-${playlistId}`, videos);
        res.json(videos);
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch playlist videos' });
    }
});

/**
 * Fetch latest videos from a channel
 */
app.get('/getChannelVideos', async (req, res) => {
    const { channelId } = req.query;
    if (!channelId) return res.status(400).json({ error: 'channelId is required' });

    const cacheKey = `channel-${channelId}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
        const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                part: 'id',
                channelId,
                order: 'date',
                maxResults: 6,
                type: 'video',
                key: API_KEY
            }
        });

        const videoIds = searchResponse.data.items.map(item => item.id.videoId).join(',');

        const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
            params: {
                part: 'snippet',
                id: videoIds,
                key: API_KEY
            }
        });

        const videos = videosResponse.data.items.map(item => ({
            videoId: item.id,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url,
            publishedAt: item.snippet.publishedAt
        }));

        cache.set(cacheKey, videos);
        res.json(videos);
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch latest channel videos' });
    }
});

/**
 * POST /api/reviews - Insert a new review
 */
app.post('/api/reviews', async (req, res) => {
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
        res.status(500).json({ error: 'Failed to insert review' });
    }
});

/**
 * GET /api/reviews - Fetch all reviews
 */
app.get('/api/reviews', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
    console.error('Error fetching reviews:', err.stack); // shows full error
    res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});



app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
