// === Load environment and setup ===
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080; // Cloud Run uses 8080 by default
const API_KEY = process.env.YT_API_KEY;
const cache = new NodeCache({ stdTTL: 86400 }); // Cache with 24-hour TTL

// === Database and API route imports ===
const pool = require('./db');
const reviewsApi = require('./reviews_api');
const newsApi = require('./news_api');
const searchApi = require('./search_api');

// === Middleware Setup ===
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Configure for production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// === Serve Static Files ===
app.use(express.static('../'));

// === Health Check Endpoints for Cloud Run ===
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health/db', async (req, res) => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const duration = Date.now() - start;
    res.status(200).json({ 
      database: 'connected',
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    res.status(503).json({ 
      database: 'disconnected', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// === Mount API Routes ===
app.use('/api', reviewsApi);
app.use('/api', newsApi);
app.use('/api', searchApi);

// === Enhanced DB Connection Test ===
async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ DB connection successful');
    console.log(`📍 Database time: ${result.rows[0].current_time}`);
    console.log(`🐘 PostgreSQL version: ${result.rows[0].pg_version.split(' ')[0]}`);
    client.release();
  } catch (err) {
    console.error('❌ DB connection failed:', err.stack);
    // Don't exit in production, let health checks handle it
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

// Test database connection on startup
testDatabaseConnection();

// === GET /getPlaylistVideos ===
app.get('/getPlaylistVideos', async (req, res) => {
  const { playlistId } = req.query;
  if (!playlistId) return res.status(400).json({ error: 'playlistId is required' });

  const cached = cache.get(`playlist-${playlistId}`);
  if (cached) return res.json(cached);

  // Retry logic for network issues
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempting to fetch playlist videos (attempt ${attempt}/${maxRetries})`);
      
      const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
        params: {
          part: 'snippet',
          playlistId,
          maxResults: 6,
          key: API_KEY,
        },
        timeout: 10000, // 10 second timeout
      });

      const videos = response.data.items.map(item => ({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
      }));

      cache.set(`playlist-${playlistId}`, videos);
      console.log(`✅ Successfully fetched ${videos.length} playlist videos`);
      return res.json(videos);
    } catch (error) {
      lastError = error;
      console.error(`❌ Error fetching playlist videos (attempt ${attempt}/${maxRetries}):`, {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
      
      // Wait before retrying (except on last attempt)
      if (attempt < maxRetries) {
        console.log(`⏳ Waiting 2 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  // All retries failed
  console.error('❌ All retry attempts failed for playlist videos');
  res.status(500).json({ 
    error: 'Failed to fetch playlist videos after multiple attempts',
    details: lastError?.message || 'Unknown error'
  });
});

// === GET /getChannelVideos ===
app.get('/getChannelVideos', async (req, res) => {
  const { channelId } = req.query;
  if (!channelId) return res.status(400).json({ error: 'channelId is required' });

  const cacheKey = `channel-${channelId}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  // Retry logic for network issues
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempting to fetch channel videos (attempt ${attempt}/${maxRetries})`);
      
      const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'id',
          channelId,
          order: 'date',
          maxResults: 6,
          type: 'video',
          key: API_KEY,
        },
        timeout: 10000, // 10 second timeout
      });

      const videoIds = searchResponse.data.items.map(item => item.id.videoId).join(',');

      const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'snippet',
          id: videoIds,
          key: API_KEY,
        },
        timeout: 10000, // 10 second timeout
      });

      const videos = videosResponse.data.items.map(item => ({
        videoId: item.id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
        publishedAt: item.snippet.publishedAt,
      }));

      cache.set(cacheKey, videos);
      return res.json(videos);
    } catch (error) {
      lastError = error;
      console.error(`❌ Error fetching channel videos (attempt ${attempt}/${maxRetries}):`, {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        config: {
          url: error.config?.url,
          timeout: error.config?.timeout
        }
      });
      
      // Wait before retrying (except on last attempt)
      if (attempt < maxRetries) {
        console.log(`⏳ Waiting 2 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  // All retries failed
  console.error('❌ All retry attempts failed for channel videos');
  res.status(500).json({ 
    error: 'Failed to fetch latest channel videos after multiple attempts',
    details: lastError?.message || 'Unknown error'
  });
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
