// === Load environment and setup ===
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.YT_API_KEY;
const cache = new NodeCache({ stdTTL: 86400 }); // Cache with 24-hour TTL

// === Database and API route imports ===
const pool = require('./reviews_db');
const reviewsApi = require('./reviews_api');
const newsApi = require('./news_api');
const searchApi = require('./search_api');

// === Middleware Setup ===
app.use(cors());
app.use(express.json());

// === Mount API Routes ===
app.use('/api', reviewsApi);
app.use('/api', newsApi);
app.use('/api', searchApi);

// === Test DB Connection ===
pool.query('SELECT 1', (err) => {
  if (err) {
    console.error('❌ DB test connection failed:', err.stack);
  } else {
    console.log('✅ DB test connection successful');
  }
});

// === GET /getPlaylistVideos ===
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
        key: API_KEY,
      },
    });

    const videos = response.data.items.map(item => ({
      videoId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
    }));

    cache.set(`playlist-${playlistId}`, videos);
    res.json(videos);
  } catch (error) {
    console.error('❌ Error fetching playlist videos:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch playlist videos' });
  }
});

// === GET /getChannelVideos ===
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
        key: API_KEY,
      },
    });

    const videoIds = searchResponse.data.items.map(item => item.id.videoId).join(',');

    const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet',
        id: videoIds,
        key: API_KEY,
      },
    });

    const videos = videosResponse.data.items.map(item => ({
      videoId: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      publishedAt: item.snippet.publishedAt,
    }));

    cache.set(cacheKey, videos);
    res.json(videos);
  } catch (error) {
    console.error('❌ Error fetching channel videos:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch latest channel videos' });
  }
});

// === GET /api/playlist/latest ===
app.get('/api/playlist/latest', async (req, res) => {
  const playlistId = 'YOUR_PLAYLIST_ID'; // Replace this with your actual ID
  const cacheKey = `playlist-${playlistId}`;

  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
      params: {
        part: 'snippet',
        playlistId,
        maxResults: 6,
        key: API_KEY,
      },
    });

    const videos = response.data.items.map(item => ({
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      publishedAt: item.snippet.publishedAt,
      videoId: item.snippet.resourceId.videoId,
    }));

    cache.set(cacheKey, videos);
    res.json(videos);
  } catch (error) {
    console.error('❌ Error fetching playlist videos:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch playlist videos' });
  }
});

// === Start Server ===
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
