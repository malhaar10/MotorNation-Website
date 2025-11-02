const { generateSlug } = require('./utils/slug-generator');

// Hardcode your database connection for this script
// Replace these values with your actual Google Cloud SQL connection details
const { Pool } = require('pg');

const pool = new Pool({
  host: '34.66.26.244',        // Replace with your Cloud SQL IP
  port: 5432,
  database: 'motornation',    // Replace with your database name
  user: 'postgres',             // Replace with your username
  password: 'Malhaar@10',         // Replace with your password
  ssl: {
    rejectUnauthorized: false        // For Cloud SQL SSL connection
  }
});

async function generateSlugsForExistingNews() {
  try {
    console.log('Connecting to database...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✓ Database connected successfully');
    
    // Get all news articles without slugs
    console.log('\nFetching news articles without slugs...');
    const newsResult = await pool.query(
      'SELECT id, news_title FROM news WHERE slug IS NULL OR slug = \'\' ORDER BY id'
    );
    
    console.log(`Found ${newsResult.rows.length} news articles to update\n`);
    
    if (newsResult.rows.length === 0) {
      console.log('No articles need slug generation. All done!');
      return;
    }
    
    // Update each news article
    for (const article of newsResult.rows) {
      const slug = generateSlug(article.news_title);
      
      if (!slug) {
        console.log(`⚠️  Skipping article ${article.id}: Could not generate slug from title "${article.news_title}"`);
        continue;
      }
      
      // Check if slug already exists (handle duplicates)
      let finalSlug = slug;
      let counter = 1;
      
      while (true) {
        const existingSlug = await pool.query(
          'SELECT id FROM news WHERE slug = $1 AND id != $2',
          [finalSlug, article.id]
        );
        
        if (existingSlug.rows.length === 0) break;
        
        finalSlug = `${slug}-${counter}`;
        counter++;
      }
      
      // Update the article with the slug
      await pool.query(
        'UPDATE news SET slug = $1 WHERE id = $2',
        [finalSlug, article.id]
      );
      
      console.log(`✓ Updated article ${article.id}: "${article.news_title}" → "${finalSlug}"`);
    }
    
    console.log(`\n🎉 Successfully generated slugs for ${newsResult.rows.length} articles!`);
    
    // Verify the results
    console.log('\nVerifying results...');
    const verifyResult = await pool.query(
      'SELECT COUNT(*) as total, COUNT(slug) as with_slugs FROM news'
    );
    
    const { total, with_slugs } = verifyResult.rows[0];
    console.log(`Total articles: ${total}`);
    console.log(`Articles with slugs: ${with_slugs}`);
    
    if (total === with_slugs) {
      console.log('✓ All articles now have slugs!');
    } else {
      console.log(`⚠️  ${total - with_slugs} articles still missing slugs`);
    }
    
  } catch (error) {
    console.error('❌ Error generating slugs:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection tips:');
      console.log('- Make sure your Cloud SQL instance is running');
      console.log('- Check your IP address is allowed in Cloud SQL');
      console.log('- Verify your connection details are correct');
    }
  } finally {
    await pool.end();
    console.log('\nDatabase connection closed.');
  }
}

// Show some example articles first
async function showExampleArticles() {
  try {
    console.log('📋 Showing first 5 articles in your database:\n');
    
    const result = await pool.query(
      'SELECT id, news_title, slug FROM news ORDER BY id LIMIT 5'
    );
    
    result.rows.forEach(article => {
      console.log(`ID: ${article.id}`);
      console.log(`Title: "${article.news_title}"`);
      console.log(`Current slug: ${article.slug || '(none)'}`);
      console.log(`Would generate: "${generateSlug(article.news_title)}"`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error fetching example articles:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 News Slug Generation Script\n');
  
  // Show examples first
  await showExampleArticles();
  
  // Ask for confirmation
  console.log('\n❓ Do you want to proceed with generating slugs?');
  console.log('This will update your database with slug values for all news articles.');
  console.log('\nPress Ctrl+C to cancel, or press Enter to continue...');
  
  // Wait for user input
  process.stdin.once('data', async () => {
    await generateSlugsForExistingNews();
    process.exit(0);
  });
}

main();