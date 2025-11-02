const { generateSlug, testSlugGeneration } = require('./utils/slug-generator');

// Run the test
testSlugGeneration();

// Test with your actual news titles
console.log('\nTesting with sample titles:');
console.log(generateSlug("Tesla Model 3 Review!")); // Should output: tesla-model-3-review
console.log(generateSlug("BMW X5 vs Audi Q7: Which is Better?")); // Should output: bmw-x5-vs-audi-q7-which-is-better