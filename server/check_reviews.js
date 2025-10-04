const pool = require('./reviews_db'); // Use the same pool as reviews_api.js

async function checkReviews() {
  try {
    console.log('Checking reviews database...');
    
    // Check total count
    const countResult = await pool.query('SELECT COUNT(*) FROM reviews');
    console.log('Total reviews:', countResult.rows[0].count);
    
    // Check recent reviews with images column
    const recentResult = await pool.query(`
      SELECT id, car_name, model_year, 
             CASE 
               WHEN images IS NULL THEN 'NULL'
               WHEN array_length(images, 1) IS NULL THEN 'EMPTY ARRAY'
               ELSE 'HAS ' || array_length(images, 1) || ' IMAGES'
             END as image_status,
             images
      FROM reviews 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\nRecent reviews:');
    recentResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.car_name} (${row.model_year}) - ${row.image_status}`);
      if (row.images && row.images.length > 0) {
        console.log(`   First image: ${row.images[0]}`);
      }
    });
    
  } catch (error) {
    console.error('Error checking reviews:', error.message);
  } finally {
    await pool.end();
  }
}

checkReviews();