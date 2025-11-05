const express = require('express');
const router = express.Router();
const pool = require('./db'); // PostgreSQL connection pool
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const { generateSlug } = require('./utils/slug-generator');
require('dotenv').config();

// Ensure key file handling is robust: some deployments put the JSON content
// into the env var instead of a filesystem path. If so, write it to a temp
// file and pass that path to the Storage constructor to avoid ENOENT.
const fs = require('fs');
let keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE || '';
try {
  if (keyFilename.trim().startsWith('{')) {
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
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: keyFilename || undefined,
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME_ARTICLES);

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
    console.log(`📤 Starting upload to bucket: ${process.env.GOOGLE_CLOUD_BUCKET_NAME_ARTICLES}`);
    console.log(`📤 Filename: ${filename}`);
    console.log(`📤 File size: ${file.buffer.length} bytes`);
    console.log(`📤 Content type: ${file.mimetype}`);
    
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
        console.log(`📤 Upload finished for ${filename}`);
        // For uniform bucket-level access, files are automatically public
        // if the bucket is configured for public access
        const publicUrl = `https://storage.googleapis.com/${process.env.GOOGLE_CLOUD_BUCKET_NAME_ARTICLES}/${filename}`;
        console.log(`📤 Generated URL: ${publicUrl}`);
        resolve(publicUrl);
      } catch (err) {
        console.error(`📤 URL generation error for ${filename}:`, err);
        reject(err);
      }
    });

    console.log(`📤 Starting to write buffer for ${filename}...`);
    blobStream.end(file.buffer);
  });
}

// Route: POST /article
// Description: Adds a new article to the database with image upload support.
// Optional: author, images (files)
router.post('/articles', upload.array('images', 10), async (req, res) => {
  // Debug logs to help diagnose file upload issues
  console.log('DEBUG req.files:', req.files);
  console.log('DEBUG req.body:', req.body);
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
      console.log(`Processing ${req.files.length} uploaded images...`);
      
      for (const file of req.files) {
        // Log the entire file object for debugging
        console.log('🖼️ DEBUG file object:', file);
        if (!file.originalname || !file.buffer) {
          console.error('🚫 File missing originalname or buffer:', file);
          continue;
        }
        try {
          // Generate unique filename with UUID (no folders)
          const fileExtension = file.originalname.split('.').pop();
          const filename = `${uuidv4()}.${fileExtension}`;
          
          console.log(`Attempting to upload: ${filename}`);
          // Upload to Google Cloud Storage
          const publicUrl = await uploadToGCS(file, filename);
          imageUrls.push(publicUrl);
          console.log(`Successfully uploaded: ${filename} -> ${publicUrl}`);
        } catch (uploadError) {
          console.error(`Error uploading file ${file.originalname}:`, uploadError);
          // Continue with other files even if one fails
        }
      }
      
      console.log(`Final imageUrls array:`, imageUrls);
      console.log(`Number of successfully uploaded images: ${imageUrls.length}`);
    } else {
      console.log('No files received for upload');
    }

    // Insert into database with image URLs array
    // Generate slug from title
    let slug = generateSlug(article_title);
    let finalSlug = slug;
    let counter = 1;

    while (true) {
      const existingSlug = await pool.query(
        'SELECT id FROM articles WHERE slug = $1',
        [finalSlug]
      );
      
      if (existingSlug.rows.length === 0) break;
      
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    const result = await pool.query(
      `INSERT INTO articles (id, article_title, ptitle1, para1, ptitle2, para2, ptitle3, para3, ptitle4, para4, ptitle5, para5, ptitle6, para6, ptitle7, para7, ptitle8, para8, ptitle9, para9, ptitle10, para10, author, tag, tag2, tag3, tag4, tag5, images, slug)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
       RETURNING *`,
      [id, article_title, ptitle1, para1, ptitle2, para2, ptitle3, para3, ptitle4, para4, ptitle5, para5, ptitle6, para6, ptitle7, para7, ptitle8, para8, ptitle9, para9, ptitle10, para10, author, tag, tag2, tag3, tag4, tag5, imageUrls.length > 0 ? imageUrls : null, finalSlug]
    );

    res.status(201).json({
      ...result.rows[0],
      message: `Article created successfully with ${imageUrls.length} images uploaded`
    });
  } catch (err) {
    console.error('Error adding article:', err);
    res.status(500).json({ error: 'Failed to add article' });
  }
});

// Route: GET /articles/summary
// Description: Retrieves summary of latest 6 articles (for home/article cards)
router.get('/articles/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, article_title, created_at as date, tag, tag2, tag3, tag4, tag5, images, slug
      FROM articles
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching articles summary:', err);
    res.status(500).json({ error: 'Failed to fetch articles summary' });
  }
});

// Route: GET /articles/electric - Specific route must come BEFORE the parameterized route
// Description: Get latest 6 articles with tag = 'ev'
router.get('/articles/electric', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, article_title, created_at as date, tag, tag2, images, slug
      FROM articles
      WHERE LOWER(tag) = 'ev' OR LOWER(tag2) = 'ev' OR LOWER(tag3) = 'ev' OR LOWER(tag4) = 'ev' OR LOWER(tag5) = 'ev'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching EV articles:', error);
    res.status(500).json({ error: 'Failed to fetch EV articles' });
  }
});

router.get('/articles/hatchback', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, article_title, created_at as date, tag, tag2, images, slug
      FROM articles
      WHERE LOWER(tag) = 'hatchback' OR LOWER(tag2) = 'hatchback' OR LOWER(tag3) = 'hatchback' OR LOWER(tag4) = 'hatchback' OR LOWER(tag5) = 'hatchback'
         OR LOWER(tag) = 'hatchbacks' OR LOWER(tag2) = 'hatchbacks' OR LOWER(tag3) = 'hatchbacks' OR LOWER(tag4) = 'hatchbacks' OR LOWER(tag5) = 'hatchbacks'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching hatchback articles:', error);
    res.status(500).json({ error: 'Failed to fetch hatchback articles' });
  }
});

// Route: GET /articles/luxury - Specific route must come BEFORE the parameterized route
router.get('/articles/luxury', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, article_title, created_at as date, tag, tag2, images, slug
      FROM articles
      WHERE LOWER(tag) = 'luxury' OR LOWER(tag2) = 'luxury' OR LOWER(tag3) = 'luxury' OR LOWER(tag4) = 'luxury' OR LOWER(tag5) = 'luxury'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching luxury articles:', error);
    res.status(500).json({ error: 'Failed to fetch luxury articles' });
  }
});

// Route: GET /articles/hybrids - Specific route must come BEFORE the parameterized route
router.get('/articles/hybrids', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, article_title, created_at as date, tag, tag2, images, slug
      FROM articles
      WHERE LOWER(tag) = 'hybrid' OR LOWER(tag2) = 'hybrid' OR LOWER(tag3) = 'hybrid' OR LOWER(tag4) = 'hybrid' OR LOWER(tag5) = 'hybrid'
         OR LOWER(tag) = 'hybrids' OR LOWER(tag2) = 'hybrids' OR LOWER(tag3) = 'hybrids' OR LOWER(tag4) = 'hybrids' OR LOWER(tag5) = 'hybrids'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching hybrid articles:', error);
    res.status(500).json({ error: 'Failed to fetch hybrid articles' });
  }
});

// Route: GET /articles/minivan - Specific route must come BEFORE the parameterized route
router.get('/articles/minivan', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, article_title, created_at as date, tag, tag2, images, slug
      FROM articles
      WHERE LOWER(tag) = 'minivan' OR LOWER(tag2) = 'minivan' OR LOWER(tag3) = 'minivan' OR LOWER(tag4) = 'minivan' OR LOWER(tag5) = 'minivan'
         OR LOWER(tag) = 'mpv' OR LOWER(tag2) = 'mpv' OR LOWER(tag3) = 'mpv' OR LOWER(tag4) = 'mpv' OR LOWER(tag5) = 'mpv'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching minivan articles:', error);
    res.status(500).json({ error: 'Failed to fetch minivan articles' });
  }
});

// Route: GET /articles/pickups - Specific route must come BEFORE the parameterized route
router.get('/articles/pickups', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, article_title, created_at as date, tag, tag2, images, slug
      FROM articles
      WHERE LOWER(tag) = 'pickup' OR LOWER(tag2) = 'pickup' OR LOWER(tag3) = 'pickup' OR LOWER(tag4) = 'pickup' OR LOWER(tag5) = 'pickup'
         OR LOWER(tag) = 'truck' OR LOWER(tag2) = 'truck' OR LOWER(tag3) = 'truck' OR LOWER(tag4) = 'truck' OR LOWER(tag5) = 'truck'
         OR LOWER(tag) = 'pickups' OR LOWER(tag2) = 'pickups' OR LOWER(tag3) = 'pickups' OR LOWER(tag4) = 'pickups' OR LOWER(tag5) = 'pickups'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pickup articles:', error);
    res.status(500).json({ error: 'Failed to fetch pickup articles' });
  }
});

// Route: GET /articles/performance - Specific route must come BEFORE the parameterized route
router.get('/articles/performance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, article_title, created_at as date, tag, tag2, images, slug
      FROM articles
      WHERE LOWER(tag) = 'performance' OR LOWER(tag2) = 'performance' OR LOWER(tag3) = 'performance' OR LOWER(tag4) = 'performance' OR LOWER(tag5) = 'performance'
         OR LOWER(tag) = 'sports' OR LOWER(tag2) = 'sports' OR LOWER(tag3) = 'sports' OR LOWER(tag4) = 'sports' OR LOWER(tag5) = 'sports'
         OR LOWER(tag) = 'supercar' OR LOWER(tag2) = 'supercar' OR LOWER(tag3) = 'supercar' OR LOWER(tag4) = 'supercar' OR LOWER(tag5) = 'supercar'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching performance articles:', error);
    res.status(500).json({ error: 'Failed to fetch performance articles' });
  }
});

// Route: GET /articles/sedan - Specific route must come BEFORE the parameterized route
router.get('/articles/sedan', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, article_title, created_at as date, tag, tag2, images, slug
      FROM articles
      WHERE LOWER(tag) = 'sedan' OR LOWER(tag2) = 'sedan' OR LOWER(tag3) = 'sedan' OR LOWER(tag4) = 'sedan' OR LOWER(tag5) = 'sedan'
         OR LOWER(tag) = 'sedans' OR LOWER(tag2) = 'sedans' OR LOWER(tag3) = 'sedans' OR LOWER(tag4) = 'sedans' OR LOWER(tag5) = 'sedans'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sedan articles:', error);
    res.status(500).json({ error: 'Failed to fetch sedan articles' });
  }
});

// Route: GET /articles/suv - Specific route must come BEFORE the parameterized route
router.get('/articles/suv', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, article_title, created_at as date, tag, tag2, images, slug
      FROM articles
      WHERE LOWER(tag) = 'suv' OR LOWER(tag2) = 'suv' OR LOWER(tag3) = 'suv' OR LOWER(tag4) = 'suv' OR LOWER(tag5) = 'suv'
         OR LOWER(tag) = 'suvs' OR LOWER(tag2) = 'suvs' OR LOWER(tag3) = 'suvs' OR LOWER(tag4) = 'suvs' OR LOWER(tag5) = 'suvs'
         OR LOWER(tag) = 'crossover' OR LOWER(tag2) = 'crossover' OR LOWER(tag3) = 'crossover' OR LOWER(tag4) = 'crossover' OR LOWER(tag5) = 'crossover'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching SUV articles:', error);
    res.status(500).json({ error: 'Failed to fetch SUV articles' });
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
    const result = await pool.query('SELECT * FROM articles ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching articles:', err);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

module.exports = router;
