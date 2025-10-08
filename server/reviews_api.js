const express = require('express');
const router = express.Router();
const pool = require('./reviews_db');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

// Configure Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
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
      SELECT id, car_name, model_year, images
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
      SELECT id, car_name, model_year, images
      FROM reviews
      WHERE LOWER(tag) = 'ev' OR LOWER(tag2) = 'ev'
         OR LOWER(tag) = 'electric' OR LOWER(tag2) = 'electric'
      ORDER BY model_year DESC
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
      SELECT id, car_name, model_year, images
      FROM reviews
      WHERE LOWER(tag) = 'hatchback' OR LOWER(tag2) = 'hatchback'
      ORDER BY model_year DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching hatchback reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
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

router.post('/reviews', upload.array('images', 10), async (req, res) => {
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
    tag2
  } = req.body;

  if (!car_name || !model_year || !overview || !pricing || !drivetrain ||
    !interior || !technology || !safety || !warranty || !tag || !tag2) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const id = uuidv4();
    const imageUrls = [];

    // Process uploaded images if any
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} uploaded images for review...`);
      
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
          console.error(`❌ Error uploading file ${file.originalname}:`, uploadError);
          // Continue with other files even if one fails
        }
      }
      
      console.log(`Final imageUrls array:`, imageUrls);
      console.log(`Number of successfully uploaded images: ${imageUrls.length}`);
    } else {
      console.log('No files received for upload');
    }

    const result = await pool.query(
      `INSERT INTO reviews (
        id, car_name, model_year, overview, pricing, drivetrain,
        interior, technology, safety, warranty, tag, tag2, images
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [id, car_name, model_year, overview, pricing, drivetrain,
        interior, technology, safety, warranty, tag, tag2, imageUrls.length > 0 ? imageUrls : null]
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

