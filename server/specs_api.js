const express = require('express');
const router = express.Router();
const pool = require('./db');
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
    const tmpPath = '/tmp/gcloud-key-specs.json';
    fs.writeFileSync(tmpPath, keyFilename, { encoding: 'utf8' });
    console.log(`🔐 Wrote GCP key JSON for specs from env to ${tmpPath}`);
    keyFilename = tmpPath;
  }
} catch (e) {
  console.error('⚠️ Failed to prepare GCP key file from env for specs:', e);
}

// Configure Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: keyFilename || undefined,
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME_SPECS_TABLE);

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
    const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME_SPECS_TABLE;
    console.log(`📤 Starting upload to bucket: ${bucketName}`);
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

// GET /api/specs - Fetch all specs
router.get('/specs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM specifications ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching specs:', err);
    res.status(500).json({ error: 'Failed to fetch specs' });
  }
});

// GET /api/specs/summary - Fetch summary with limit
router.get('/specs/summary', async (req, res) => {
  try {
    console.log('Query params received:', req.query);
    const limit = parseInt(req.query.limit) || 6;
    console.log('Limit set to:', limit);

    const result = await pool.query(`
      SELECT id, car_name, model_year, photos, slug
      FROM specifications
      ORDER BY created_at DESC
      LIMIT $1`, [limit]);

    console.log('Query executed, returning', result.rows.length, 'rows');
    console.log('First row data:', JSON.stringify(result.rows[0], null, 2));
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching spec summaries:', err);
    res.status(500).json({ error: 'Failed to fetch spec summaries' });
  }
});

// GET /api/specs/search - Search specs by brand, type, and price
router.get('/specs/search', async (req, res) => {
  try {
    const { brand, type, maxPrice } = req.query;
    console.log('=== SPECS SEARCH REQUEST ===');
    console.log('Search params:', { brand, type, maxPrice });

    // Build dynamic query
    let queryText = `
      SELECT id, car_name, model_year, pricing, photos, slug, tag, tag2, tag3, tag4, tag5
      FROM specifications
      WHERE 1=1
    `;
    const queryParams = [];
    let paramIndex = 1;

    // Filter by brand (check all tag fields)
    if (brand) {
      queryText += ` AND (
        LOWER(tag) = $${paramIndex} OR 
        LOWER(tag2) = $${paramIndex} OR 
        LOWER(tag3) = $${paramIndex} OR 
        LOWER(tag4) = $${paramIndex} OR 
        LOWER(tag5) = $${paramIndex}
      )`;
      queryParams.push(brand.toLowerCase());
      paramIndex++;
    }

    // Filter by type (check all tag fields)
    if (type) {
      queryText += ` AND (
        LOWER(tag) = $${paramIndex} OR 
        LOWER(tag2) = $${paramIndex} OR 
        LOWER(tag3) = $${paramIndex} OR 
        LOWER(tag4) = $${paramIndex} OR 
        LOWER(tag5) = $${paramIndex}
      )`;
      queryParams.push(type.toLowerCase());
      paramIndex++;
    }

    // Filter by price (handle pricing field which might be a string like "$45,000")
    // Show cars with price LESS THAN OR EQUAL TO the user's maximum price input
    if (maxPrice) {
      const maxPriceNum = parseInt(maxPrice);
      console.log('Max price numeric value:', maxPriceNum);
      if (maxPriceNum < 200000) {
        // Extract numeric value from pricing string and compare: car_price <= user_max_price
        // Use COALESCE with NULLIF to handle empty strings after regex replacement
        queryText += ` AND (
          CAST(
            COALESCE(
              NULLIF(REGEXP_REPLACE(COALESCE(pricing, '0'), '[^0-9]', '', 'g'), ''),
              '0'
            ) AS INTEGER
          ) <= $${paramIndex}
        )`;
        queryParams.push(maxPriceNum);
        paramIndex++;
        console.log(`Filtering: Show cars with price <= $${maxPriceNum.toLocaleString()}`);
      } else {
        console.log('Max price is 200000+, showing all cars regardless of price');
      }
    }

    queryText += ` ORDER BY created_at DESC LIMIT 5`;

    console.log('Executing query:', queryText);
    console.log('With params:', queryParams);

    const result = await pool.query(queryText, queryParams);

    console.log(`Found ${result.rows.length} matching specifications`);
    console.log('=== END SPECS SEARCH ===');
    res.json(result.rows);
  } catch (err) {
    console.error('=== ERROR IN SPECS SEARCH ===');
    console.error('Error searching specs:', err);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('=== END ERROR ===');
    res.status(500).json({ error: 'Failed to search specifications', details: err.message });
  }
});

// GET /api/specs/slug/:slug - Get spec by slug
router.get('/specs/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      'SELECT * FROM specifications WHERE slug = $1',
      [slug]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Specification not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching spec by slug:', error);
    res.status(500).json({ error: 'Failed to fetch specification' });
  }
});

// GET /api/specs/:id - Get spec by ID
router.get('/specs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM specifications WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Specification not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching spec:', err);
    res.status(500).json({ error: 'Failed to fetch specification' });
  }
});

// POST /api/specs - Create new spec
router.post('/specs', upload.array('photos', 10), async (req, res) => {
  // Debug logs to help diagnose file upload issues
  console.log('DEBUG req.files (specs):', req.files);
  console.log('DEBUG req.body (specs):', req.body);
  
  const {
    car_name,
    model_year,
    pricing,
    transmission,
    fuel_type,
    horsepower,
    torque,
    fuel_economy,
    seating_capacity,
    touch_screen_size,
    driver_display,
    safety_features,
    camera,
    additional_features,
    towing,
    payload,
    tag,
    tag2,
    tag3,
    tag4,
    tag5
  } = req.body;

  // Validate required fields
  if (!car_name || !model_year) {
    return res.status(400).json({ error: 'Car name and model year are required' });
  }

  // Check if at least one photo is uploaded
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'At least one photo is required' });
  }

  try {
    const id = uuidv4();
    const photoUrls = [];

    // Process uploaded photos
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} uploaded photos for spec...`);
      
      for (const file of req.files) {
        console.log('🖼️ DEBUG file object (specs):', file);
        if (!file.originalname || !file.buffer) {
          console.error('🚫 File missing originalname or buffer (specs):', file);
          continue;
        }
        try {
          // Generate unique filename with UUID (no folders)
          const fileExtension = file.originalname.split('.').pop();
          const filename = `${uuidv4()}.${fileExtension}`;
          
          console.log(`🚀 Attempting to upload (specs): ${filename}`);
          // Upload to Google Cloud Storage
          const publicUrl = await uploadToGCS(file, filename);
          photoUrls.push(publicUrl);
          console.log(`✅ Successfully uploaded (specs): ${filename} -> ${publicUrl}`);
        } catch (uploadError) {
          console.error(`❌ Error uploading file ${file.originalname} (specs):`, uploadError);
          // Continue with other files even if one fails
        }
      }
      
      console.log(`Final photoUrls array:`, photoUrls);
      console.log(`Number of successfully uploaded photos: ${photoUrls.length}`);
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
        'SELECT id FROM specifications WHERE slug = $1',
        [finalSlug]
      );
      
      if (existingSlug.rows.length === 0) break;
      
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    // Insert into database
    const result = await pool.query(
      `INSERT INTO specifications (
        id, car_name, model_year, pricing, transmission, fuel_type,
        horsepower, torque, fuel_economy, seating_capacity, touch_screen_size,
        driver_display, safety_features, camera, additional_features,
        towing, payload, tag, tag2, tag3, tag4, tag5, photos, slug
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      RETURNING *`,
      [
        id, car_name, model_year, pricing, transmission, fuel_type,
        horsepower, torque, fuel_economy, seating_capacity, touch_screen_size,
        driver_display, safety_features, camera, additional_features,
        towing, payload, tag, tag2, tag3, tag4, tag5, 
        photoUrls.length > 0 ? photoUrls : null, 
        finalSlug
      ]
    );

    res.status(201).json({
      ...result.rows[0],
      message: `Specification created successfully with ${photoUrls.length} photos uploaded`
    });
  } catch (err) {
    console.error('Error inserting spec:', err);
    res.status(500).json({ error: 'Failed to create specification' });
  }
});

// Category routes similar to reviews
// GET /api/specs/electric
router.get('/specs/electric', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year, photos, slug
      FROM specifications
      WHERE LOWER(tag) = 'ev' OR LOWER(tag2) = 'ev' OR LOWER(tag3) = 'ev' OR LOWER(tag4) = 'ev' OR LOWER(tag5) = 'ev'
         OR LOWER(tag) = 'electric' OR LOWER(tag2) = 'electric' OR LOWER(tag3) = 'electric' OR LOWER(tag4) = 'electric' OR LOWER(tag5) = 'electric'
         OR LOWER(fuel_type) LIKE '%electric%'
      ORDER BY model_year DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching EV specs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/specs/hybrid
router.get('/specs/hybrid', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year, photos, slug
      FROM specifications
      WHERE LOWER(tag) = 'hybrid' OR LOWER(tag2) = 'hybrid' OR LOWER(tag3) = 'hybrid' OR LOWER(tag4) = 'hybrid' OR LOWER(tag5) = 'hybrid'
         OR LOWER(tag) = 'hybrids' OR LOWER(tag2) = 'hybrids' OR LOWER(tag3) = 'hybrids' OR LOWER(tag4) = 'hybrids' OR LOWER(tag5) = 'hybrids'
         OR LOWER(fuel_type) LIKE '%hybrid%'
      ORDER BY model_year DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching hybrid specs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/specs/suv
router.get('/specs/suv', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year, photos, slug
      FROM specifications
      WHERE LOWER(tag) = 'suv' OR LOWER(tag2) = 'suv' OR LOWER(tag3) = 'suv' OR LOWER(tag4) = 'suv' OR LOWER(tag5) = 'suv'
         OR LOWER(tag) = 'suvs' OR LOWER(tag2) = 'suvs' OR LOWER(tag3) = 'suvs' OR LOWER(tag4) = 'suvs' OR LOWER(tag5) = 'suvs'
         OR LOWER(tag) = 'crossover' OR LOWER(tag2) = 'crossover' OR LOWER(tag3) = 'crossover' OR LOWER(tag4) = 'crossover' OR LOWER(tag5) = 'crossover'
      ORDER BY model_year DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching SUV specs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/specs/sedan
router.get('/specs/sedan', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year, photos, slug
      FROM specifications
      WHERE LOWER(tag) = 'sedan' OR LOWER(tag2) = 'sedan' OR LOWER(tag3) = 'sedan' OR LOWER(tag4) = 'sedan' OR LOWER(tag5) = 'sedan'
         OR LOWER(tag) = 'sedans' OR LOWER(tag2) = 'sedans' OR LOWER(tag3) = 'sedans' OR LOWER(tag4) = 'sedans' OR LOWER(tag5) = 'sedans'
      ORDER BY model_year DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sedan specs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/specs/pickup
router.get('/specs/pickup', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year, photos, slug
      FROM specifications
      WHERE LOWER(tag) = 'pickup' OR LOWER(tag2) = 'pickup' OR LOWER(tag3) = 'pickup' OR LOWER(tag4) = 'pickup' OR LOWER(tag5) = 'pickup'
         OR LOWER(tag) = 'truck' OR LOWER(tag2) = 'truck' OR LOWER(tag3) = 'truck' OR LOWER(tag4) = 'truck' OR LOWER(tag5) = 'truck'
         OR LOWER(tag) = 'pickups' OR LOWER(tag2) = 'pickups' OR LOWER(tag3) = 'pickups' OR LOWER(tag4) = 'pickups' OR LOWER(tag5) = 'pickups'
      ORDER BY model_year DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pickup specs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/specs/luxury
router.get('/specs/luxury', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, car_name, model_year, photos, slug
      FROM specifications
      WHERE LOWER(tag) = 'luxury' OR LOWER(tag2) = 'luxury' OR LOWER(tag3) = 'luxury' OR LOWER(tag4) = 'luxury' OR LOWER(tag5) = 'luxury'
      ORDER BY model_year DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching luxury specs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
