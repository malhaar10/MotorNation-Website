const express = require('express');
const router = express.Router();
const pool = require('./db');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const { authenticateUser } = require('./middleware/firebase-auth');
require('dotenv').config();

// Ensure key file handling is robust
const fs = require('fs');
let keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE || '';
try {
  if (keyFilename.trim().startsWith('{')) {
    // env contains JSON content, write to temp file
    const tmpPath = '/tmp/gcloud-key-spechome.json';
    fs.writeFileSync(tmpPath, keyFilename, { encoding: 'utf8' });
    console.log(`🔐 Wrote GCP key JSON for spechome from env to ${tmpPath}`);
    keyFilename = tmpPath;
  }
} catch (e) {
  console.error('⚠️ Failed to prepare GCP key file from env for spechome:', e);
}

// Configure Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: keyFilename || undefined,
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME_SPECSHOME_TABLE);

// Configure multer for file uploads (optional - for future image uploads)
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

// Helper function to upload image to Google Cloud Storage
async function uploadToGCS(file, filename) {
  return new Promise((resolve, reject) => {
    const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME_SPECSHOME_TABLE;
    console.log(`📤 Starting upload to spechome bucket: ${bucketName}`);
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
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
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

// Helper function to process image (URL or upload)
async function processSpechomeImage(imageUrl, carName, year) {
  // If the image is already a URL (starts with http), return it as-is
  if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
    return imageUrl;
  }
  
  // Otherwise, return the URL as provided
  // (For now, we're accepting direct URLs for spechome images)
  return imageUrl || null;
}

// ========================================
// SPECHOME ROUTES
// ========================================

// GET /api/spechome - Fetch all spechome entries
router.get('/spechome', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM spechome ORDER BY year DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching spechome:', err);
    res.status(500).json({ error: 'Failed to fetch spechome data' });
  }
});

// GET /api/spechome/summary - Fetch spechome summary with limit
router.get('/spechome/summary', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await pool.query(`
      SELECT id, name, year, minprice, maxprice, fuel, tag1, image
      FROM spechome
      ORDER BY year DESC
      LIMIT $1
    `, [limit]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching spechome summary:', err);
    res.status(500).json({ error: 'Failed to fetch spechome summary' });
  }
});

// GET /api/spechome/:id - Get spechome by ID
router.get('/spechome/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM spechome WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spechome entry not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching spechome:', err);
    res.status(500).json({ error: 'Failed to fetch spechome entry' });
  }
});

// POST /api/spechome - Create new spechome entry
// PROTECTED: Requires Firebase authentication
router.post('/spechome', authenticateUser, upload.single('image'), async (req, res) => {
  console.log('DEBUG req.body (spechome):', req.body);
  console.log('DEBUG req.file (spechome):', req.file);
  
  const {
    name,
    year,
    minprice,
    maxprice,
    fuel,
    tag1,
    tag2,
    tag3
  } = req.body;

  // Validate required fields
  if (!name || !year) {
    return res.status(400).json({ error: 'Name and year are required' });
  }

  try {
    const id = uuidv4();
    let imageUrl = null;

    // Process uploaded image file
    if (req.file) {
      console.log(`🖼️ Processing uploaded image for spechome...`);
      try {
        // Generate unique filename with UUID
        const fileExtension = req.file.originalname.split('.').pop();
        const filename = `${uuidv4()}.${fileExtension}`;
        
        console.log(`🚀 Attempting to upload spechome image: ${filename}`);
        // Upload to Google Cloud Storage
        imageUrl = await uploadToGCS(req.file, filename);
        console.log(`✅ Successfully uploaded spechome image: ${filename} -> ${imageUrl}`);
      } catch (uploadError) {
        console.error(`❌ Error uploading spechome image:`, uploadError);
        // Continue without image if upload fails
      }
    }

    // Insert into database
    const result = await pool.query(
      `INSERT INTO spechome (
        id, name, year, minprice, maxprice, fuel, tag1, tag2, tag3, image
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id, name, year, minprice, maxprice, fuel, tag1, tag2, tag3, imageUrl
      ]
    );

    res.status(201).json({
      ...result.rows[0],
      message: 'Spechome entry created successfully'
    });
  } catch (err) {
    console.error('Error inserting spechome:', err);
    res.status(500).json({ error: 'Failed to create spechome entry' });
  }
});

// PUT /api/spechome/:id - Update spechome entry
// PROTECTED: Requires Firebase authentication
router.put('/spechome/:id', authenticateUser, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const {
    name,
    year,
    minprice,
    maxprice,
    fuel,
    tag1,
    tag2,
    tag3
  } = req.body;

  // Validate required fields
  if (!name || !year) {
    return res.status(400).json({ error: 'Name and year are required' });
  }

  try {
    let imageUrl = req.body.image; // Use existing image URL if no new file uploaded

    // Process uploaded image file if provided
    if (req.file) {
      console.log(`🖼️ Processing new image for spechome update...`);
      try {
        const fileExtension = req.file.originalname.split('.').pop();
        const filename = `${uuidv4()}.${fileExtension}`;
        
        imageUrl = await uploadToGCS(req.file, filename);
        console.log(`✅ Successfully uploaded new spechome image: ${imageUrl}`);
      } catch (uploadError) {
        console.error(`❌ Error uploading spechome image:`, uploadError);
        // Keep existing image if upload fails
      }
    }

    // Update in database
    const result = await pool.query(
      `UPDATE spechome SET
        name = $1, year = $2, minprice = $3, maxprice = $4, fuel = $5,
        tag1 = $6, tag2 = $7, tag3 = $8, image = $9, updated_at = NOW()
      WHERE id = $10
      RETURNING *`,
      [name, year, minprice, maxprice, fuel, tag1, tag2, tag3, imageUrl, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spechome entry not found' });
    }

    res.json({
      ...result.rows[0],
      message: 'Spechome entry updated successfully'
    });
  } catch (err) {
    console.error('Error updating spechome:', err);
    res.status(500).json({ error: 'Failed to update spechome entry' });
  }
});

// DELETE /api/spechome/:id - Delete spechome entry
// PROTECTED: Requires Firebase authentication
router.delete('/spechome/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM spechome WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spechome entry not found' });
    }

    res.json({
      message: 'Spechome entry deleted successfully',
      deleted: result.rows[0]
    });
  } catch (err) {
    console.error('Error deleting spechome:', err);
    res.status(500).json({ error: 'Failed to delete spechome entry' });
  }
});

// Category/filter routes
// GET /api/spechome/fuel/:fuelType - Get spechome by fuel type
router.get('/spechome/fuel/:fuelType', async (req, res) => {
  try {
    const { fuelType } = req.params;
    const result = await pool.query(
      'SELECT * FROM spechome WHERE LOWER(fuel) = LOWER($1) ORDER BY year DESC',
      [fuelType]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching spechome by fuel type:', err);
    res.status(500).json({ error: 'Failed to fetch spechome by fuel type' });
  }
});

// GET /api/spechome/tag/:tag - Get spechome by tag
router.get('/spechome/tag/:tag', async (req, res) => {
  try {
    const { tag } = req.params;
    const result = await pool.query(`
      SELECT * FROM spechome 
      WHERE LOWER(tag1) = LOWER($1) 
         OR LOWER(tag2) = LOWER($1) 
         OR LOWER(tag3) = LOWER($1)
      ORDER BY year DESC
    `, [tag]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching spechome by tag:', err);
    res.status(500).json({ error: 'Failed to fetch spechome by tag' });
  }
});

// GET /api/spechome/year/:year - Get spechome by year
router.get('/spechome/year/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const result = await pool.query(
      'SELECT * FROM spechome WHERE year = $1 ORDER BY name ASC',
      [year]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching spechome by year:', err);
    res.status(500).json({ error: 'Failed to fetch spechome by year' });
  }
});

module.exports = router;
