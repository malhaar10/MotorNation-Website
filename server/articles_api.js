const express = require('express');
const router = express.Router();
const pool = require('./db'); // PostgreSQL connection pool
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const { generateSlug } = require('./utils/slug-generator');
const { authenticateUser } = require('./middleware/firebase-auth');
require('dotenv').config();

// Ensure key file handling is robust: some deployments put the JSON content
// into the env var instead of a filesystem path. If so, write it to a temp
// file and pass that path to the Storage constructor to avoid ENOENT.
const fs = require('fs');
let keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE || '';
try {
  if (keyFilename && keyFilename.trim().startsWith('{')) {
    // env contains JSON content, write to temp file
    const tmpPath = '/tmp/gcloud-key.json';
    fs.writeFileSync(tmpPath, keyFilename, { encoding: 'utf8' });
    console.log(`🔐 Wrote GCP key JSON from env to ${tmpPath}`);
    keyFilename = tmpPath;
  }
} catch (e) {
  console.error('⚠️ Failed to prepare GCP key file from env:', e);
}

// Configure Google Cloud Storage
// For Cloud Run, authentication happens automatically via service account
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: keyFilename || undefined,
});

// Validate required environment variables
if (!process.env.GOOGLE_CLOUD_BUCKET_NAME_ARTICLES) {
  console.error('❌ CRITICAL: GOOGLE_CLOUD_BUCKET_NAME_ARTICLES environment variable is not set!');
  console.error('⚠️  Article image uploads will fail. Please set this in Cloud Run environment variables.');
}

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME_ARTICLES;
const bucket = bucketName ? storage.bucket(bucketName) : null;

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
    if (!bucket) {
      const error = new Error('GCS bucket not configured. Set GOOGLE_CLOUD_BUCKET_NAME_ARTICLES environment variable.');
      console.error('❌', error.message);
      reject(error);
      return;
    }
    
    const blob = bucket.file(filename);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    blobStream.on('error', (err) => {
      console.error(`📤 Stream error for ${filename}:`, err);
      reject(err);
    });

    blobStream.on('finish', async () => {
      try {
        // For uniform bucket-level access, files are automatically public
        // if the bucket is configured for public access
        const publicUrl = `https://storage.googleapis.com/${process.env.GOOGLE_CLOUD_BUCKET_NAME_ARTICLES}/${filename}`;
        resolve(publicUrl);
      } catch (err) {
        console.error(`URL generation error for ${filename}:`, err);
        reject(err);
      }
    });

    blobStream.end(file.buffer);
  });
}

// Route: POST /article
// Description: Adds a new article to the database with image upload support.
// Optional: author, images (files)
// PROTECTED: Requires Firebase authentication
router.post('/articles', authenticateUser, upload.array('images', 10), async (req, res) => {
  const {
    article_title,
    ptitle1,
    para1,
    ptitle2,
    para2,
    ptitle3,
    para3,
    ptitle4,
    para4,
    ptitle5,
    para5,
    ptitle6,
    para6,
    ptitle7,
    para7,
    ptitle8,
    para8,
    ptitle9,
    para9,
    ptitle10,
    para10,
    tag,
    tag2,
    tag3,
    tag4,
    tag5,
    author = null,
  } = req.body;

  // Required fields must be non-empty strings
  const requiredFields = ['article_title', 'ptitle1', 'para1', 'ptitle2','para2', 'ptitle3','para3', 'tag', 'tag2'];
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
      for (const file of req.files) {
        if (!file.originalname || !file.buffer) {
          console.error('File missing originalname or buffer');
          continue;
        }
        try {
          // Generate unique filename with UUID (no folders)
          const fileExtension = file.originalname.split('.').pop();
          const filename = `${uuidv4()}.${fileExtension}`;
          
          const publicUrl = await uploadToGCS(file, filename);
          imageUrls.push(publicUrl);
        } catch (uploadError) {
          console.error(`Error uploading file ${file.originalname}:`, uploadError);
          // Continue with other files even if one fails
        }
      }
    }

    // Insert into database with image URLs array
    // Generate permalink from title (immutable, unique)
    const permalink = generateSlug(article_title);
    
    if (!permalink) {
      return res.status(400).json({ 
        error: 'Invalid article title - cannot generate permalink',
        details: 'Article title must contain at least some alphanumeric characters'
      });
    }
    
    // Check for duplicate permalink (extremely unlikely with 6-char UUID, but good practice)
    const existingPermalink = await pool.query(
      'SELECT id FROM articles WHERE slug = $1',
      [permalink]
    );
    
    if (existingPermalink.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Permalink conflict (extremely rare)',
        details: 'Please try creating the article again'
      });
    }

    const result = await pool.query(
      `INSERT INTO articles (id, article_title, ptitle1, para1, ptitle2, para2, ptitle3, para3, ptitle4, para4, ptitle5, para5, ptitle6, para6, ptitle7, para7, ptitle8, para8, ptitle9, para9, ptitle10, para10, author, tag, tag2, tag3, tag4, tag5, images, slug, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, article_title, ptitle1, para1, ptitle2, para2, ptitle3, para3, ptitle4, para4, ptitle5, para5, ptitle6, para6, ptitle7, para7, ptitle8, para8, ptitle9, para9, ptitle10, para10, author, tag, tag2, tag3, tag4, tag5, imageUrls.length > 0 ? imageUrls : null, permalink]
    );

    res.status(201).json({
      ...result.rows[0],
      message: `Article created successfully with ${imageUrls.length} images uploaded`
    });
  } catch (err) {
    console.error('Error adding article:', err.message);
    res.status(500).json({ 
      error: 'Failed to add article',
      details: err.message,
      code: err.code
    });
  }
});

// Route: GET /articles/summary
// Description: Retrieves summary of latest articles (for home/article cards)
// Supports optional ?limit query parameter (default: 6)
router.get('/articles/summary', async (req, res) => {
  try {
    // Parse limit from query params, default to 6, max 50 for safety
    const limit = Math.min(parseInt(req.query.limit) || 6, 50);
    
    const result = await pool.query(`
      SELECT id, article_title, tag, tag2, tag3, tag4, tag5, images, slug, created_at
      FROM articles
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching articles summary:', err);
    res.status(500).json({ error: 'Failed to fetch articles summary' });
  }
});

// Route: GET /articles/slug/:slug
// Description: Retrieves a specific article by slug
router.get('/articles/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      'SELECT * FROM articles WHERE slug = $1',
      [slug]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching article by slug:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// Route: GET /articles/:id
// Description: Retrieves a specific article by ID
router.get('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM articles WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching article:', err);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// GET /api/articles - Fetch all articles
router.get('/articles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM articles ORDER BY created_at');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching articles:', err);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

module.exports = router;
