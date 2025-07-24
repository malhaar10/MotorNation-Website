require('dotenv').config();
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const cors = require('cors');

const app = express();
const PORT = 3000;
const API_KEY = process.env.YT_API_KEY;
const cache = new NodeCache({ stdTTL: 86400 }); // cache for 1 day

app.use(cors());

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
 * Fetch accurate and latest videos from the YouTube channel
 */
app.get('/getChannelVideos', async (req, res) => {
    const { channelId } = req.query;
    if (!channelId) return res.status(400).json({ error: 'channelId is required' });

    const cacheKey = `channel-${channelId}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
        // Step 1: Get the latest video IDs using search endpoint
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

        // Step 2: Fetch actual video details using videos endpoint
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

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
