/**
 * ADVANCED TEST ARTICLE SUBMISSION WITH IMAGES
 * 
 * This version includes image upload testing with actual files.
 * Place test images in the server folder before running.
 * 
 * Run with: node test_article_with_images.js
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = 'https://motornation-336079007565.us-central1.run.app/api/articles';
// const API_URL = 'http://localhost:3000/api/articles'; // For local testing

// Test article data - shorter version for quick testing
const articleData = {
  article_title: 'Quick Test Article - EV Market Update',
  author: 'Automated Test System',
  
  ptitle1: 'Current EV Market Trends',
  para1: 'The electric vehicle market continues to grow exponentially in 2025. Major manufacturers are investing billions in EV technology and infrastructure.',
  
  ptitle2: 'Key Developments',
  para2: 'Battery technology improvements have led to longer ranges and faster charging times. Solid-state batteries are now entering production.',
  
  ptitle3: 'Conclusion',
  para3: 'The future of transportation is electric, and 2025 marks a pivotal year in the industry\'s transformation.',
  
  tag: 'EV',
  tag2: 'Electric',
  tag3: 'Technology',
  tag4: 'Test',
  tag5: '2025'
};

// Test images to look for (add your own image files to server directory)
const testImages = [
  'test-image-1.jpg',
  'test-image-2.jpg',
  'test-image-1.png',
  'test-image-2.png',
  'test1.jpg',
  'test2.jpg',
];

/**
 * Find available test images
 */
function findTestImages() {
  const foundImages = [];
  
  for (const imageName of testImages) {
    const imagePath = path.join(__dirname, imageName);
    if (fs.existsSync(imagePath)) {
      foundImages.push(imagePath);
      console.log(`✅ Found test image: ${imageName}`);
    }
  }
  
  // Also check parent directory assets folder
  const assetsDir = path.join(__dirname, '../assets');
  if (fs.existsSync(assetsDir)) {
    const assetFiles = fs.readdirSync(assetsDir);
    const imageFiles = assetFiles.filter(f => 
      f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.avif') || f.endsWith('.jpeg')
    );
    
    // Take first 3 from assets
    imageFiles.slice(0, 3).forEach(file => {
      const fullPath = path.join(assetsDir, file);
      foundImages.push(fullPath);
      console.log(`✅ Found asset image: ${file}`);
    });
  }
  
  return foundImages.slice(0, 5); // Max 5 for testing
}

/**
 * Submit test article with images
 */
async function submitTestArticle() {
  console.log('🚀 Starting test article submission with images...\n');
  
  try {
    // Create FormData
    const formData = new FormData();
    
    // Add all article fields
    Object.keys(articleData).forEach(key => {
      if (articleData[key]) {
        formData.append(key, articleData[key]);
      }
    });
    console.log('✅ Added all article fields\n');
    
    // Find and add test images
    console.log('🔍 Looking for test images...');
    const imageFiles = findTestImages();
    
    if (imageFiles.length > 0) {
      console.log(`\n📷 Adding ${imageFiles.length} image(s) to submission:\n`);
      
      imageFiles.forEach((imagePath, index) => {
        const fileName = path.basename(imagePath);
        const stats = fs.statSync(imagePath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        formData.append('images', fs.createReadStream(imagePath), {
          filename: fileName,
          contentType: `image/${path.extname(imagePath).slice(1)}`
        });
        
        console.log(`  ${index + 1}. ${fileName} (${fileSizeMB} MB)`);
      });
      
      console.log('');
    } else {
      console.log('⚠️  No test images found. Submitting article without images.');
      console.log('   To test with images, place .jpg or .png files in the server folder\n');
    }
    
    console.log('📤 Submitting to:', API_URL);
    console.log('⏳ Please wait (this may take 10-30 seconds for image upload)...\n');
    
    const startTime = Date.now();
    
    // Submit to API
    const response = await axios.post(API_URL, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 120000, // 2 minute timeout for image uploads
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        process.stdout.write(`\r📤 Upload progress: ${percentCompleted}%`);
      }
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ SUCCESS! Article created in the cloud database!');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📊 Article Details:');
    console.log('─────────────────────────────────────');
    console.log('ID:         ', response.data.id);
    console.log('Title:      ', response.data.article_title);
    console.log('Slug:       ', response.data.slug);
    console.log('Author:     ', response.data.author || 'Not specified');
    console.log('Tags:       ', [
      response.data.tag, 
      response.data.tag2, 
      response.data.tag3
    ].filter(Boolean).join(', '));
    console.log('Created:    ', response.data.created_at);
    console.log('Duration:   ', `${duration} seconds`);
    console.log('─────────────────────────────────────\n');
    
    // Show image details
    if (response.data.images && response.data.images.length > 0) {
      console.log('📷 Uploaded Images:');
      console.log('─────────────────────────────────────');
      response.data.images.forEach((url, index) => {
        console.log(`${index + 1}. ${url}`);
      });
      console.log('─────────────────────────────────────\n');
    } else {
      console.log('📷 No images uploaded\n');
    }
    
    // Show access URLs
    console.log('🔗 Access Your Article:');
    console.log('─────────────────────────────────────');
    console.log('By ID:');
    console.log(`  ${API_URL}/${response.data.id}`);
    console.log('\nBy Slug:');
    console.log(`  ${API_URL.replace('/articles', '/articles/slug')}/${response.data.slug}`);
    console.log('\nAll Articles:');
    console.log(`  ${API_URL}`);
    console.log('─────────────────────────────────────\n');
    
    console.log('✅ Article is now live in the cloud database!');
    console.log('✨ Test completed successfully!\n');
    
    return response.data;
    
  } catch (error) {
    console.log('\n');
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ ERROR during submission');
    console.error('═══════════════════════════════════════════════════════\n');
    
    if (error.response) {
      console.error('❌ Server Error Response:');
      console.error('─────────────────────────────────────');
      console.error('Status:', error.response.status, error.response.statusText);
      console.error('\nError Details:');
      console.error(JSON.stringify(error.response.data, null, 2));
      console.error('─────────────────────────────────────\n');
      
      // Helpful suggestions based on error
      if (error.response.status === 400) {
        console.log('💡 Suggestion: Check that all required fields are filled:');
        console.log('   - article_title, ptitle1-3, para1-3, tag, tag2\n');
      } else if (error.response.status === 500) {
        console.log('💡 Suggestion: This may be a database or storage issue.');
        console.log('   Check Cloud Run logs for detailed error messages.\n');
      } else if (error.response.status === 413) {
        console.log('💡 Suggestion: Images may be too large. Try smaller files.\n');
      }
    } else if (error.request) {
      console.error('❌ No Response from Server:');
      console.error('─────────────────────────────────────');
      console.error('The request was sent but no response was received.');
      console.error('This could mean:');
      console.error('  - Server is not running');
      console.error('  - Network connectivity issue');
      console.error('  - Request timeout (very large images?)');
      console.error('─────────────────────────────────────\n');
    } else {
      console.error('❌ Request Setup Error:');
      console.error('─────────────────────────────────────');
      console.error(error.message);
      console.error('─────────────────────────────────────\n');
    }
    
    throw error;
  }
}

// Main execution
console.log('═══════════════════════════════════════════════════════');
console.log('  TEST ARTICLE SUBMISSION TO CLOUD DATABASE');
console.log('  With Image Upload Support');
console.log('═══════════════════════════════════════════════════════\n');

submitTestArticle()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed!\n');
    process.exit(1);
  });
