const express = require('express');
const router = express.Router();
const pool = require('./db');
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
  if (keyFilename.trim().startsWith('{')) {
    // env contains JSON content, write to temp file
    const tmpPath = '/tmp/gcloud-key-reviews.json';
    fs.writeFileSync(tmpPath, keyFilename, { encoding: 'utf8' });
    console.log(`🔐 Wrote GCP key JSON for reviews from env to ${tmpPath}`);
    keyFilename = tmpPath;
  }
} catch (e) {
  console.error('⚠️ Failed to prepare GCP key file from env for reviews:', e);
}

// Configure Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: keyFilename || undefined,
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME_REVIEWS);

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
    console.log(`📤 Starting upload to bucket: ${process.env.GOOGLE_CLOUD_BUCKET_NAME_REVIEWS}`);
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
        const publicUrl = `https://storage.googleapis.com/${process.env.GOOGLE_CLOUD_BUCKET_NAME_REVIEWS}/${filename}`;
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

router.get('/reviews/summary', async (req, res) => {
  try {
    console.log('Query params received:', req.query);
    const limit = parseInt(req.query.limit) || 6;
    console.log('Limit set to:', limit);

    const result = await pool.query(`
      SELECT id, car_name, model_year, images, slug
      FROM reviews
      ORDER BY created_at DESC
      LIMIT $1`, [limit]);

    console.log('Query executed, returning', result.rows.length, 'rows');
    console.log('First row data:', JSON.stringify(result.rows[0], null, 2));
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching review summaries:', err);
    res.status(500).json({ error: 'Failed to fetch review summaries' });
  }
});

// Route: GET /reviews/electric - Specific route must come BEFORE the parameterized route
router.get('/reviews/electric', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year, images, slug
      FROM reviews
      WHERE LOWER(tag) = 'ev' OR LOWER(tag2) = 'ev' OR LOWER(tag3) = 'ev' OR LOWER(tag4) = 'ev' OR LOWER(tag5) = 'ev'
         OR LOWER(tag) = 'electric' OR LOWER(tag2) = 'electric' OR LOWER(tag3) = 'electric' OR LOWER(tag4) = 'electric' OR LOWER(tag5) = 'electric'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching EV reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route: GET /reviews/hatchback - Specific route must come BEFORE the parameterized route
router.get('/reviews/hatchback', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year, images, slug
      FROM reviews
      WHERE LOWER(tag) = 'hatchback' OR LOWER(tag2) = 'hatchback' OR LOWER(tag3) = 'hatchback' OR LOWER(tag4) = 'hatchback' OR LOWER(tag5) = 'hatchback'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching hatchback reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route: GET /reviews/luxury - Specific route must come BEFORE the parameterized route
router.get('/reviews/luxury', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year, images, slug
      FROM reviews
      WHERE LOWER(tag) = 'luxury' OR LOWER(tag2) = 'luxury' OR LOWER(tag3) = 'luxury' OR LOWER(tag4) = 'luxury' OR LOWER(tag5) = 'luxury'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching luxury reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route: GET /reviews/hybrids - Specific route must come BEFORE the parameterized route
router.get('/reviews/hybrids', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year, images, slug
      FROM reviews
      WHERE LOWER(tag) = 'hybrid' OR LOWER(tag2) = 'hybrid' OR LOWER(tag3) = 'hybrid' OR LOWER(tag4) = 'hybrid' OR LOWER(tag5) = 'hybrid'
         OR LOWER(tag) = 'hybrids' OR LOWER(tag2) = 'hybrids' OR LOWER(tag3) = 'hybrids' OR LOWER(tag4) = 'hybrids' OR LOWER(tag5) = 'hybrids'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching hybrid reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route: GET /reviews/minivan - Specific route must come BEFORE the parameterized route
router.get('/reviews/minivan', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year, images, slug
      FROM reviews
      WHERE LOWER(tag) = 'minivan' OR LOWER(tag2) = 'minivan' OR LOWER(tag3) = 'minivan' OR LOWER(tag4) = 'minivan' OR LOWER(tag5) = 'minivan'
         OR LOWER(tag) = 'mpv' OR LOWER(tag2) = 'mpv' OR LOWER(tag3) = 'mpv' OR LOWER(tag4) = 'mpv' OR LOWER(tag5) = 'mpv'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching minivan reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route: GET /reviews/pickups - Specific route must come BEFORE the parameterized route
router.get('/reviews/pickups', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year, images, slug
      FROM reviews
      WHERE LOWER(tag) = 'pickup' OR LOWER(tag2) = 'pickup' OR LOWER(tag3) = 'pickup' OR LOWER(tag4) = 'pickup' OR LOWER(tag5) = 'pickup'
         OR LOWER(tag) = 'truck' OR LOWER(tag2) = 'truck' OR LOWER(tag3) = 'truck' OR LOWER(tag4) = 'truck' OR LOWER(tag5) = 'truck'
         OR LOWER(tag) = 'pickups' OR LOWER(tag2) = 'pickups' OR LOWER(tag3) = 'pickups' OR LOWER(tag4) = 'pickups' OR LOWER(tag5) = 'pickups'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pickup reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route: GET /reviews/performance - Specific route must come BEFORE the parameterized route
router.get('/reviews/performance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year, images, slug
      FROM reviews
      WHERE LOWER(tag) = 'performance' OR LOWER(tag2) = 'performance' OR LOWER(tag3) = 'performance' OR LOWER(tag4) = 'performance' OR LOWER(tag5) = 'performance'
         OR LOWER(tag) = 'sports' OR LOWER(tag2) = 'sports' OR LOWER(tag3) = 'sports' OR LOWER(tag4) = 'sports' OR LOWER(tag5) = 'sports'
         OR LOWER(tag) = 'supercar' OR LOWER(tag2) = 'supercar' OR LOWER(tag3) = 'supercar' OR LOWER(tag4) = 'supercar' OR LOWER(tag5) = 'supercar'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching performance reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route: GET /reviews/sedan - Specific route must come BEFORE the parameterized route
router.get('/reviews/sedan', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year, images, slug
      FROM reviews
      WHERE LOWER(tag) = 'sedan' OR LOWER(tag2) = 'sedan' OR LOWER(tag3) = 'sedan' OR LOWER(tag4) = 'sedan' OR LOWER(tag5) = 'sedan'
         OR LOWER(tag) = 'sedans' OR LOWER(tag2) = 'sedans' OR LOWER(tag3) = 'sedans' OR LOWER(tag4) = 'sedans' OR LOWER(tag5) = 'sedans'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sedan reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route: GET /reviews/suv - Specific route must come BEFORE the parameterized route
router.get('/reviews/suv', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year, images, slug
      FROM reviews
      WHERE LOWER(tag) = 'suv' OR LOWER(tag2) = 'suv' OR LOWER(tag3) = 'suv' OR LOWER(tag4) = 'suv' OR LOWER(tag5) = 'suv'
         OR LOWER(tag) = 'suvs' OR LOWER(tag2) = 'suvs' OR LOWER(tag3) = 'suvs' OR LOWER(tag4) = 'suvs' OR LOWER(tag5) = 'suvs'
         OR LOWER(tag) = 'crossover' OR LOWER(tag2) = 'crossover' OR LOWER(tag3) = 'crossover' OR LOWER(tag4) = 'crossover' OR LOWER(tag5) = 'crossover'
      ORDER BY created_at DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching SUV reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route: GET /reviews/slug/:slug
// Description: Retrieves a specific review by slug
router.get('/reviews/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      'SELECT * FROM reviews WHERE slug = $1',
      [slug]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching review by slug:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// Route: GET /reviews/:id
// Description: Retrieves a specific review by ID
router.get('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM reviews WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching review:', err);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// PROTECTED: Requires Firebase authentication
router.post('/reviews', authenticateUser, upload.array('images', 10), async (req, res) => {
  // Debug logs to help diagnose file upload issues
  console.log('DEBUG req.files (reviews):', req.files);
  console.log('DEBUG req.body (reviews):', req.body);
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
    tag2,
    tag3,
    tag4,
    tag5,
    pros,
    cons,
    mn_take
  } = req.body;

  if (!car_name || !model_year || !overview || !pricing || !drivetrain ||
    !interior || !technology || !safety || !warranty || !tag || !tag2 ||
    !pros || !cons || !mn_take) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if at least one image is uploaded
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'At least one image is required' });
  }

  try {
    const id = uuidv4();
    const imageUrls = [];

    // Process uploaded images if any
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} uploaded images for review...`);
      
      for (const file of req.files) {
        console.log('🖼️ DEBUG file object (reviews):', file);
        if (!file.originalname || !file.buffer) {
          console.error('🚫 File missing originalname or buffer (reviews):', file);
          continue;
        }
        try {
          // Generate unique filename with UUID (no folders)
          const fileExtension = file.originalname.split('.').pop();
          const filename = `${uuidv4()}.${fileExtension}`;
          
          console.log(`🚀 Attempting to upload (reviews): ${filename}`);
          // Upload to Google Cloud Storage
          const publicUrl = await uploadToGCS(file, filename);
          imageUrls.push(publicUrl);
          console.log(`✅ Successfully uploaded (reviews): ${filename} -> ${publicUrl}`);
        } catch (uploadError) {
          console.error(`❌ Error uploading file ${file.originalname} (reviews):`, uploadError);
          // Continue with other files even if one fails
        }
      }
      
      console.log(`Final imageUrls array:`, imageUrls);
      console.log(`Number of successfully uploaded images: ${imageUrls.length}`);
    } else {
      console.log('No files received for upload');
    }

    // Generate slug from car_name and model_year
    let slug = generateSlug(`${car_name} ${model_year}`);
    let finalSlug = slug;
    let counter = 1;
    
    // Check for duplicate slugs and append counter if needed
    while (counter <= 100) {
      const existingSlug = await pool.query(
        'SELECT id FROM reviews WHERE slug = $1',
        [finalSlug]
      );
      
      if (existingSlug.rows.length === 0) break;
      
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    const result = await pool.query(
      `INSERT INTO reviews (
        id, car_name, model_year, overview, pricing, drivetrain,
        interior, technology, safety, warranty, tag, tag2, tag3, tag4, tag5, pros, cons, mn_take, images, slug
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *`,
      [id, car_name, model_year, overview, pricing, drivetrain,
        interior, technology, safety, warranty, tag, tag2, tag3, tag4, tag5, pros, cons, mn_take, imageUrls.length > 0 ? imageUrls : null, finalSlug]
    );

    res.status(201).json({
      ...result.rows[0],
      message: `Review created successfully with ${imageUrls.length} images uploaded`
    });
  } catch (err) {
    console.error('Error inserting review:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

module.exports = router;
