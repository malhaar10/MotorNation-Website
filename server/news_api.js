const express = require('express');
const router = express.Router();
const pool = require('./news_db'); // PostgreSQL connection pool
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

// Configure Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME_NEWS);

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Helper function to upload file to Google Cloud Storage
async function uploadToGCS(file, filename) {
  return new Promise((resolve, reject) => {
    console.log(`📤 News API: Starting upload to bucket: ${process.env.GOOGLE_CLOUD_BUCKET_NAME_NEWS}`);
    console.log(`📤 News API: Filename: ${filename}, Size: ${file.buffer.length} bytes, Type: ${file.mimetype}`);
    
    const blob = bucket.file(filename);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    blobStream.on('error', (err) => {
      console.error(`❌ News API: Stream error for ${filename}:`, {
        error: err.message,
        stack: err.stack,
        filename: filename,
        fileSize: file.buffer.length,
        mimetype: file.mimetype,
        bucket: process.env.GOOGLE_CLOUD_BUCKET_NAME_NEWS,
        timestamp: new Date().toISOString()
      });
      reject(err);
    });

    blobStream.on('finish', async () => {
      try {
        console.log(`✅ News API: Upload finished for ${filename}`);
        // For uniform bucket-level access, files are automatically public
        // if the bucket is configured for public access
        const publicUrl = `https://storage.googleapis.com/${process.env.GOOGLE_CLOUD_BUCKET_NAME_NEWS}/${filename}`;
        console.log(`✅ News API: Generated URL: ${publicUrl}`);
        resolve(publicUrl);
      } catch (err) {
        console.error(`❌ News API: URL generation error for ${filename}:`, {
          error: err.message,
          stack: err.stack,
          filename: filename,
          bucket: process.env.GOOGLE_CLOUD_BUCKET_NAME_NEWS,
          timestamp: new Date().toISOString()
        });
        reject(err);
      }
    });

    console.log(`📤 News API: Starting to write buffer for ${filename}...`);
    blobStream.end(file.buffer);
  });
}

// Route: POST /news
// Description: Adds a new news article to the database with image upload support.
// Required: news_title, para1, para2, para3, tag, tag2
// Optional: author, images (files)
router.post('/news', upload.array('images', 10), async (req, res) => {
  const {
    news_title,
    para1,
    para2,
    para3,
    tag,
    tag2,
    author = null,
  } = req.body;

  // Required fields must be non-empty strings
  const requiredFields = ['news_title', 'para1', 'para2', 'para3', 'tag', 'tag2'];
  const missingFields = requiredFields.filter(field => {
    const value = req.body[field];
    return typeof value !== 'string' || value.trim() === '';
  });

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missingFields.join(', ')}`
    });
  }

  try {
    const id = uuidv4();
    const imageUrls = [];

    // Process uploaded images if any
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} uploaded images...`);
      
      for (const file of req.files) {
        try {
          // Generate unique filename with UUID (no folders)
          const fileExtension = file.originalname.split('.').pop();
          const filename = `${uuidv4()}.${fileExtension}`;
          
          console.log(`Attempting to upload: ${filename}`);
          // Upload to Google Cloud Storage
          const publicUrl = await uploadToGCS(file, filename);
          imageUrls.push(publicUrl);
          console.log(`✅ Successfully uploaded: ${filename} -> ${publicUrl}`);
        } catch (uploadError) {
          console.error(`❌ News API: Error uploading file ${file.originalname}:`, {
            error: uploadError.message,
            stack: uploadError.stack,
            filename: file.originalname,
            fileSize: file.size,
            mimetype: file.mimetype,
            bucket: process.env.GOOGLE_CLOUD_BUCKET_NAME_NEWS,
            timestamp: new Date().toISOString()
          });
          // Continue with other files even if one fails
        }
      }
      
      console.log(`Final imageUrls array:`, imageUrls);
      console.log(`Number of successfully uploaded images: ${imageUrls.length}`);
    } else {
      console.log('No files received for upload');
    }

    // Insert into database with image URLs array
    const result = await pool.query(
      `INSERT INTO news (id, news_title, para1, para2, para3, author, tag, tag2, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, news_title, para1, para2, para3, author, tag, tag2, imageUrls.length > 0 ? imageUrls : null]
    );

    res.status(201).json({
      ...result.rows[0],
      message: `Article created successfully with ${imageUrls.length} images uploaded`
    });
  } catch (err) {
    console.error('❌ News API: Error adding news:', {
      error: err.message,
      stack: err.stack,
      code: err.code,
      timestamp: new Date().toISOString(),
      method: 'POST',
      endpoint: '/api/news',
      body: {
        news_title: req.body.news_title,
        author: req.body.author,
        tag: req.body.tag,
        tag2: req.body.tag2,
        filesCount: req.files ? req.files.length : 0
      },
      headers: req.headers['user-agent']
    });
    res.status(500).json({ error: 'Failed to add news article' });
  }
});

// Route: GET /news/summary
// Description: Retrieves summary of latest 6 articles (for home/news cards)
router.get('/news/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, news_title, date, tag, tag2, images
      FROM news
      ORDER BY created_at DESC
      LIMIT 6
    `);
    console.log(`✅ News API: Successfully fetched ${result.rows.length} news summaries`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ News API: Error fetching news summary:', {
      error: err.message,
      stack: err.stack,
      code: err.code,
      timestamp: new Date().toISOString(),
      method: 'GET',
      endpoint: '/api/news/summary',
      query: req.query,
      headers: req.headers['user-agent']
    });
    res.status(500).json({ error: 'Failed to fetch news summary' });
  }
});

// Route: GET /news/electric - Specific route must come BEFORE the parameterized route
// Description: Get latest 6 articles with tag = 'ev'
router.get('/news/electric', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, news_title, date, tag, tag2, images
      FROM news
      WHERE LOWER(tag) = 'ev'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    console.log(`✅ News API: Successfully fetched ${result.rows.length} EV news articles`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ News API: Error fetching EV news:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      timestamp: new Date().toISOString(),
      method: 'GET',
      endpoint: '/api/news/electric',
      query: req.query,
      headers: req.headers['user-agent']
    });
    res.status(500).json({ error: 'Failed to fetch EV news' });
  }
});

router.get('/news/hatchback', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, news_title, date, tag, tag2, images
      FROM news
      WHERE LOWER(tag) = 'hatchback' OR LOWER(tag2) = 'hatchback'
         OR LOWER(tag) = 'hatchbacks' OR LOWER(tag2) = 'hatchbacks'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching hatchback news:', error);
    res.status(500).json({ error: 'Failed to fetch hatchback news' });
  }
});

// Route: GET /news/luxury - Specific route must come BEFORE the parameterized route
router.get('/news/luxury', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, news_title, date, tag, tag2, images
      FROM news
      WHERE LOWER(tag) = 'luxury' OR LOWER(tag2) = 'luxury'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching luxury news:', error);
    res.status(500).json({ error: 'Failed to fetch luxury news' });
  }
});

// Route: GET /news/hybrids - Specific route must come BEFORE the parameterized route
router.get('/news/hybrids', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, news_title, date, tag, tag2, images
      FROM news
      WHERE LOWER(tag) = 'hybrid' OR LOWER(tag2) = 'hybrid'
         OR LOWER(tag) = 'hybrids' OR LOWER(tag2) = 'hybrids'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching hybrid news:', error);
    res.status(500).json({ error: 'Failed to fetch hybrid news' });
  }
});

// Route: GET /news/minivan - Specific route must come BEFORE the parameterized route
router.get('/news/minivan', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, news_title, date, tag, tag2, images
      FROM news
      WHERE LOWER(tag) = 'minivan' OR LOWER(tag2) = 'minivan'
         OR LOWER(tag) = 'mpv' OR LOWER(tag2) = 'mpv'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching minivan news:', error);
    res.status(500).json({ error: 'Failed to fetch minivan news' });
  }
});

// Route: GET /news/pickups - Specific route must come BEFORE the parameterized route
router.get('/news/pickups', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, news_title, date, tag, tag2, images
      FROM news
      WHERE LOWER(tag) = 'pickup' OR LOWER(tag2) = 'pickup'
         OR LOWER(tag) = 'truck' OR LOWER(tag2) = 'truck'
         OR LOWER(tag) = 'pickups' OR LOWER(tag2) = 'pickups'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pickup news:', error);
    res.status(500).json({ error: 'Failed to fetch pickup news' });
  }
});

// Route: GET /news/performance - Specific route must come BEFORE the parameterized route
router.get('/news/performance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, news_title, date, tag, tag2, images
      FROM news
      WHERE LOWER(tag) = 'performance' OR LOWER(tag2) = 'performance'
         OR LOWER(tag) = 'sports' OR LOWER(tag2) = 'sports'
         OR LOWER(tag) = 'supercar' OR LOWER(tag2) = 'supercar'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching performance news:', error);
    res.status(500).json({ error: 'Failed to fetch performance news' });
  }
});

// Route: GET /news/sedan - Specific route must come BEFORE the parameterized route
router.get('/news/sedan', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, news_title, date, tag, tag2, images
      FROM news
      WHERE LOWER(tag) = 'sedan' OR LOWER(tag2) = 'sedan'
         OR LOWER(tag) = 'sedans' OR LOWER(tag2) = 'sedans'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sedan news:', error);
    res.status(500).json({ error: 'Failed to fetch sedan news' });
  }
});

// Route: GET /news/suv - Specific route must come BEFORE the parameterized route
router.get('/news/suv', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, news_title, date, tag, tag2, images
      FROM news
      WHERE LOWER(tag) = 'suv' OR LOWER(tag2) = 'suv'
         OR LOWER(tag) = 'suvs' OR LOWER(tag2) = 'suvs'
         OR LOWER(tag) = 'crossover' OR LOWER(tag2) = 'crossover'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching SUV news:', error);
    res.status(500).json({ error: 'Failed to fetch SUV news' });
  }
});

// Route: GET /news/:id
// Description: Retrieves a specific news article by ID
router.get('/news/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM news WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'News article not found' });
    }
    
    console.log(`✅ News API: Successfully fetched news article: ${result.rows[0].news_title}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ News API: Error fetching news article:', {
      error: err.message,
      stack: err.stack,
      code: err.code,
      timestamp: new Date().toISOString(),
      method: 'GET',
      endpoint: `/api/news/${req.params.id}`,
      params: req.params,
      query: req.query,
      headers: req.headers['user-agent']
    });
    res.status(500).json({ error: 'Failed to fetch news article' });
  }
});

module.exports = router;
