function generateSlug(title) {
  if (!title) return '';
  
  return title
    .toLowerCase()                    // Convert to lowercase
    .trim()                          // Remove leading/trailing spaces
    .replace(/[^\w\s-]/g, '')        // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-')            // Replace spaces with hyphens
    .replace(/-+/g, '-')             // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '')         // Remove leading/trailing hyphens
    .substring(0, 100);              // Limit length to 100 characters
}

// Test function to verify it works
function testSlugGeneration() {
  const testCases = [
    "Tesla Model 3 Review!",
    "BMW X5 vs Audi Q7: Which is Better?",
    "2024 Ford F-150 Lightning Review & Test Drive",
    "Electric Vehicle News Update - October 2024"
  ];
  
  console.log('Testing slug generation:');
  testCases.forEach(title => {
    const slug = generateSlug(title);
    console.log(`"${title}" → "${slug}"`);
  });
}

module.exports = { generateSlug, testSlugGeneration };