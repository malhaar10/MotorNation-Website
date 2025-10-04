const pool = require('./reviews_db');

async function checkSchema() {
  try {
    console.log('Checking reviews table schema...');
    
    // Check if table exists and get column info
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'reviews' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nTable columns:');
    schemaResult.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check the actual data in the images column
    console.log('\nChecking images column data:');
    const dataResult = await pool.query(`
      SELECT id, car_name, 
             images IS NULL as images_is_null,
             array_length(images, 1) as images_count,
             images
      FROM reviews 
      LIMIT 3
    `);
    
    dataResult.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Car: ${row.car_name}`);
      console.log(`Images NULL: ${row.images_is_null}`);
      console.log(`Images Count: ${row.images_count}`);
      console.log(`Images Value: ${JSON.stringify(row.images)}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error checking schema:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();