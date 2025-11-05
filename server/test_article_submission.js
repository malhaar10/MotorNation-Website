/**
 * TEST ARTICLE SUBMISSION SCRIPT
 * 
 * This script simulates the article input form and sends a test article
 * directly to the cloud database with image uploads.
 * 
 * Run with: node test_article_submission.js
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = 'https://motornation-336079007565.us-central1.run.app/api/articles';
// For local testing (if db connected): const API_URL = 'http://localhost:3000/api/articles';

// Test article data
const articleData = {
  article_title: '2025 Tesla Model Y Review - The Ultimate Electric SUV',
  author: 'Test Author',
  
  ptitle1: 'Introduction to the 2025 Model Y',
  para1: 'The 2025 Tesla Model Y represents the pinnacle of electric SUV technology. With its sleek design, impressive range, and cutting-edge autonomous driving features, it continues to dominate the EV market. This comprehensive review explores every aspect of this revolutionary vehicle.',
  
  ptitle2: 'Performance and Range',
  para2: 'The dual-motor all-wheel-drive configuration delivers breathtaking acceleration, going from 0-60 mph in just 3.5 seconds. The latest battery technology provides an EPA-estimated range of 330 miles on a single charge, making range anxiety a thing of the past. The improved thermal management system ensures consistent performance in all weather conditions.',
  
  ptitle3: 'Interior Design and Comfort',
  para3: 'Step inside and you\'re greeted by a minimalist yet luxurious cabin. The panoramic glass roof creates an airy atmosphere, while the premium sound system delivers concert-hall quality audio. Seating for five adults is comfortable even on long journeys, with heated and ventilated front seats as standard.',
  
  ptitle4: 'Technology and Features',
  para4: 'The centerpiece is the massive 15-inch touchscreen that controls virtually every aspect of the vehicle. The latest Full Self-Driving (FSD) software includes advanced highway navigation, automatic lane changes, and summon capabilities. Over-the-air updates continually add new features and improvements.',
  
  ptitle5: 'Safety Ratings',
  para5: 'Tesla\'s Model Y has achieved a 5-star safety rating in every category. Advanced driver assistance systems include automatic emergency braking, blind spot monitoring, and collision avoidance. The rigid body structure and strategically placed crumple zones provide exceptional crash protection.',
  
  ptitle6: 'Charging and Infrastructure',
  para6: 'Access to Tesla\'s Supercharger network makes long-distance travel effortless. With over 50,000 Superchargers worldwide, you can add 200 miles of range in just 15 minutes. Home charging is simple with the included Mobile Connector, or upgrade to the Wall Connector for faster charging speeds.',
  
  ptitle7: 'Storage and Practicality',
  para7: 'The Model Y offers 76 cubic feet of cargo space with the rear seats folded, making it one of the most practical vehicles in its class. The power liftgate, hidden storage compartments, and front trunk (frunk) provide versatile storage solutions for any adventure.',
  
  ptitle8: 'Cost of Ownership',
  para8: 'While the initial purchase price is premium, the total cost of ownership is surprisingly low. With no gas, minimal maintenance, and potential tax incentives, many owners find their Model Y costs less to own than comparable gas-powered SUVs. The resale value remains strong due to high demand.',
  
  ptitle9: 'Environmental Impact',
  para9: 'Choosing an electric vehicle like the Model Y significantly reduces your carbon footprint. With zero tailpipe emissions and Tesla\'s commitment to renewable energy production, you can drive guilt-free knowing you\'re contributing to a cleaner future.',
  
  ptitle10: 'Final Verdict',
  para10: 'The 2025 Tesla Model Y sets the standard for electric SUVs. Its combination of performance, technology, safety, and practicality make it an excellent choice for families and tech enthusiasts alike. While not perfect, it represents the future of automotive transportation and receives our highest recommendation.',
  
  tag: 'EV',
  tag2: 'Electric',
  tag3: 'SUV',
  tag4: 'Tesla',
  tag5: 'Review'
};

/**
 * Create test images (placeholder approach)
 * In real testing, you would use actual image files
 */
async function submitTestArticle() {
  console.log('🚀 Starting test article submission...\n');
  
  try {
    // Create FormData
    const formData = new FormData();
    
    // Add all article fields
    Object.keys(articleData).forEach(key => {
      if (articleData[key]) {
        formData.append(key, articleData[key]);
        console.log(`✅ Added field: ${key}`);
      }
    });
    
    // Optional: Add test images if you have them
    // Uncomment and modify these lines if you have test images
    /*
    const imagePath1 = path.join(__dirname, '../assets/test-image-1.jpg');
    const imagePath2 = path.join(__dirname, '../assets/test-image-2.jpg');
    
    if (fs.existsSync(imagePath1)) {
      formData.append('images', fs.createReadStream(imagePath1));
      console.log('✅ Added image: test-image-1.jpg');
    }
    if (fs.existsSync(imagePath2)) {
      formData.append('images', fs.createReadStream(imagePath2));
      console.log('✅ Added image: test-image-2.jpg');
    }
    */
    
    console.log('\n📤 Submitting to:', API_URL);
    console.log('⏳ Please wait...\n');
    
    // Submit to API
    const response = await axios.post(API_URL, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000, // 60 second timeout
    });
    
    // Success!
    console.log('✅ SUCCESS! Article created!\n');
    console.log('📊 Response Details:');
    console.log('─────────────────────────────────────');
    console.log('ID:', response.data.id);
    console.log('Title:', response.data.article_title);
    console.log('Slug:', response.data.slug);
    console.log('Author:', response.data.author || 'Not specified');
    console.log('Images:', response.data.images ? response.data.images.length : 0);
    console.log('Created:', response.data.created_at);
    console.log('─────────────────────────────────────\n');
    
    // Show access URLs
    console.log('🔗 Access your article at:');
    console.log('By ID:', `https://motornation-336079007565.us-central1.run.app/api/articles/${response.data.id}`);
    console.log('By Slug:', `https://motornation-336079007565.us-central1.run.app/api/articles/slug/${response.data.slug}`);
    console.log('\n✨ Test completed successfully!');
    
    return response.data;
    
  } catch (error) {
    console.error('\n❌ ERROR during submission:');
    console.error('─────────────────────────────────────');
    
    if (error.response) {
      // Server responded with error
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data.error || error.response.data);
      console.error('\n📋 Response Data:');
      console.error(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // Request made but no response
      console.error('No response received from server');
      console.error('Check if the server is running and accessible');
    } else {
      // Error in request setup
      console.error('Error:', error.message);
    }
    
    console.error('─────────────────────────────────────\n');
    process.exit(1);
  }
}

// Run the test
console.log('═══════════════════════════════════════════════════════');
console.log('  TEST ARTICLE SUBMISSION TO CLOUD DATABASE');
console.log('═══════════════════════════════════════════════════════\n');

submitTestArticle()
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
