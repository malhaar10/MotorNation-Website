/**
 * Test script to verify Articles API endpoint is working
 * Run this to quickly check if the backend is properly configured
 */

const API_URL = 'https://motornation-336079007565.us-central1.run.app';

console.log('🧪 Testing Articles API Endpoint...\n');

// Test 1: Check if API root shows articles endpoints
console.log('📍 Test 1: Checking API root endpoint...');
fetch(API_URL)
  .then(res => res.json())
  .then(data => {
    if (data.endpoints && data.endpoints.articles_summary) {
      console.log('✅ Articles endpoints are registered in API');
      console.log('   - Articles Summary:', data.endpoints.articles_summary);
      console.log('   - Articles Categories:', data.endpoints.article_categories);
    } else {
      console.log('❌ Articles endpoints NOT found in API');
      console.log('⚠️  Articles API may not be deployed yet');
    }
  })
  .catch(err => {
    console.error('❌ Failed to connect to API root:', err.message);
  })
  .finally(() => {
    console.log('\n');
    testGetArticles();
  });

// Test 2: GET /api/articles
function testGetArticles() {
  console.log('📍 Test 2: Checking GET /api/articles...');
  fetch(`${API_URL}/api/articles`)
    .then(res => {
      console.log('   Status:', res.status, res.statusText);
      return res.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        console.log('✅ GET /api/articles works!');
        console.log(`   Found ${data.length} articles in database`);
      } else {
        console.log('⚠️  Unexpected response format:', data);
      }
    })
    .catch(err => {
      console.error('❌ Failed to GET articles:', err.message);
    })
    .finally(() => {
      console.log('\n');
      testPostArticle();
    });
}

// Test 3: POST /api/articles (with minimal data)
function testPostArticle() {
  console.log('📍 Test 3: Testing POST /api/articles...');
  
  const formData = new FormData();
  formData.append('article_title', 'Test Article - ' + new Date().toISOString());
  formData.append('ptitle1', 'Introduction');
  formData.append('para1', 'This is a test paragraph for diagnostic purposes.');
  formData.append('ptitle2', 'Body Content');
  formData.append('para2', 'This is the main body content of the test article.');
  formData.append('ptitle3', 'Conclusion');
  formData.append('para3', 'This is the conclusion of the test article.');
  formData.append('tag', 'test');
  formData.append('tag2', 'diagnostic');

  fetch(`${API_URL}/api/articles`, {
    method: 'POST',
    body: formData
  })
    .then(async res => {
      console.log('   Status:', res.status, res.statusText);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('   Response is not JSON:', text);
        throw new Error('Invalid JSON response');
      }
      return { ok: res.ok, data };
    })
    .then(({ ok, data }) => {
      if (ok) {
        console.log('✅ POST /api/articles works!');
        console.log('   Created article ID:', data.id);
        console.log('   Article slug:', data.slug);
        console.log('   Full response:', data);
      } else {
        console.error('❌ POST failed with error:', data.error || data);
      }
    })
    .catch(err => {
      console.error('❌ Failed to POST article:', err.message);
    })
    .finally(() => {
      console.log('\n');
      printSummary();
    });
}

function printSummary() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\nIf you see ❌ errors above, check:');
  console.log('1. Articles API is deployed (push latest code to GitHub)');
  console.log('2. Articles table exists in database (run CREATE TABLE SQL)');
  console.log('3. Environment variable GOOGLE_CLOUD_BUCKET_NAME_ARTICLES is set');
  console.log('4. GCS bucket "articles-images-mn" exists');
  console.log('\nFor more help, see: ARTICLE_SUBMISSION_DIAGNOSTICS.md');
  console.log('═══════════════════════════════════════════════════════\n');
}
