/**
 * Generates a URL-friendly slug from a title
 * This is a simple slug generator without UUID (for SEO-friendly URLs)
 * Note: This does NOT guarantee uniqueness - use counter logic in API if needed
 */
function generateSlug(title) {
  if (!title || typeof title !== 'string') {
    console.error('Invalid title provided to generateSlug:', title);
    return '';
  }
  
  const slug = title
    .toLowerCase()                    // Convert to lowercase
    .trim()                          // Remove leading/trailing spaces
    .replace(/[^\w\s-]/g, '')        // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-')            // Replace spaces with hyphens
    .replace(/-+/g, '-')             // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '');        // Remove leading/trailing hyphens

  if (!slug) {
    console.error('Generated slug is empty from title:', title);
    return '';
  }

  return slug.substring(0, 100);     // Limit length to 100 characters
}

module.exports = { generateSlug };