const http = require('http');

function testAPI() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/reviews/summary?limit=3',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('Response:', data);
      
      try {
        const parsed = JSON.parse(data);
        console.log('\nParsed Response:');
        parsed.forEach((review, index) => {
          console.log(`${index + 1}. ${review.car_name} (${review.model_year})`);
          if (review.images && review.images.length > 0) {
            console.log(`   Images: ${review.images.length} - First: ${review.images[0]}`);
          } else {
            console.log(`   Images: None`);
          }
        });
      } catch (e) {
        console.log('Failed to parse JSON:', e.message);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request error:', error.message);
  });

  req.end();
}

console.log('Testing API endpoint...');
testAPI();