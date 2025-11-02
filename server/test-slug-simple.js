// Simple test using Node.js built-in fetch (Node 18+) or manual curl commands

async function testSlugAPI() {
  const baseUrl = 'https://motornation-336079007565.us-central1.run.app'; // Your Google Cloud Run URL
  
  console.log('🧪 Testing News Slug API\n');
  console.log('If fetch is not available, use these curl commands to test manually:\n');
  
  try {
    // Try to use built-in fetch (Node 18+)
    if (typeof fetch === 'undefined') {
      console.log('❌ fetch not available. Please test manually with these commands:\n');
      
      console.log('1. Test all news:');
      console.log(`   curl ${baseUrl}/api/news\n`);
      
      console.log('2. Test news summary (should include slugs):');
      console.log(`   curl ${baseUrl}/api/news/summary\n`);
      
      console.log('3. Test slug endpoint (replace SLUG_HERE with actual slug):');
      console.log(`   curl ${baseUrl}/api/news/slug/SLUG_HERE\n`);
      
      console.log('4. Test non-existent slug (should return 404):');
      console.log(`   curl ${baseUrl}/api/news/slug/non-existent-slug\n`);
      
      console.log('💡 To see what slugs are available, first run:');
      console.log(`   curl ${baseUrl}/api/news | grep -o '"slug":"[^"]*"' | head -5`);
      
      return;
    }
    
    // Use built-in fetch if available
    console.log('1. Fetching all news articles...');
    const allNewsResponse = await fetch(`${baseUrl}/api/news`);
    
    if (!allNewsResponse.ok) {
      console.log('❌ Could not fetch news articles. Is your server running?');
      console.log(`   Expected server at: ${baseUrl}`);
      console.log('\n💡 Manual test commands:');
      console.log(`   curl ${baseUrl}/api/news`);
      return;
    }
    
    const allNews = await allNewsResponse.json();
    console.log(`✓ Found ${allNews.length} articles`);
    
    if (allNews.length === 0) {
      console.log('No articles found to test with.');
      return;
    }
    
    // Show first few articles with their slugs
    console.log('\nFirst 3 articles:');
    allNews.slice(0, 3).forEach((article, index) => {
      console.log(`  ${index + 1}. "${article.news_title}"`);
      console.log(`     Slug: "${article.slug || 'NO SLUG'}"`);
      console.log(`     ID: ${article.id}`);
    });
    
    // Test with the first article that has a slug
    const articleWithSlug = allNews.find(article => article.slug);
    
    if (!articleWithSlug) {
      console.log('\n❌ No articles have slugs yet. Did the slug generation script run?');
      return;
    }
    
    console.log(`\n2. Testing slug endpoint with: "${articleWithSlug.slug}"`);
    
    // Test the slug endpoint
    const slugResponse = await fetch(`${baseUrl}/api/news/slug/${articleWithSlug.slug}`);
    
    if (slugResponse.ok) {
      const slugData = await slugResponse.json();
      console.log(`✓ Successfully fetched article by slug!`);
      console.log(`   Title: "${slugData.news_title}"`);
      console.log(`   Slug: "${slugData.slug}"`);
      console.log(`   ID: ${slugData.id}`);
    } else {
      console.log(`❌ Failed to fetch article by slug. Status: ${slugResponse.status}`);
      const errorText = await slugResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
    // Test with non-existent slug
    console.log(`\n3. Testing with non-existent slug...`);
    const notFoundResponse = await fetch(`${baseUrl}/api/news/slug/non-existent-slug-12345`);
    
    if (notFoundResponse.status === 404) {
      console.log(`✓ Correctly returned 404 for non-existent slug`);
    } else {
      console.log(`❌ Expected 404, got ${notFoundResponse.status}`);
    }
    
    // Test summary endpoint includes slugs
    console.log(`\n4. Testing summary endpoint includes slugs...`);
    const summaryResponse = await fetch(`${baseUrl}/api/news/summary`);
    
    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      const hasSlug = summaryData.length > 0 && summaryData[0].slug;
      console.log(`✓ Summary endpoint ${hasSlug ? 'includes' : 'MISSING'} slug field`);
      
      if (hasSlug) {
        console.log(`   First summary item slug: "${summaryData[0].slug}"`);
      }
    } else {
      console.log(`❌ Summary endpoint failed: ${summaryResponse.status}`);
    }
    
    console.log('\n🎉 API testing complete!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Connection tips:');
      console.log('- Make sure your server is running');
      console.log('- Check if server is on port 8080 or change baseUrl above');
      console.log('- Try: curl http://localhost:8080/api/news');
    }
    
    console.log('\n📋 Manual test commands:');
    console.log(`curl ${baseUrl}/api/news/summary`);
    console.log(`curl ${baseUrl}/api/news | head -50`);
  }
}

if (require.main === module) {
  testSlugAPI();
}

module.exports = { testSlugAPI };