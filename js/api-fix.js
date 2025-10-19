// Temporary fix to override API base URL
// Add this script tag AFTER api-client.js is loaded

if (typeof ApiClient !== 'undefined') {
    ApiClient.BASE_URL = 'https://motornation-336079007565.us-central1.run.app/api';
    console.log('✅ API Base URL overridden to:', ApiClient.BASE_URL);
} else {
    console.error('❌ ApiClient not found! Make sure api-client.js is loaded first.');
}

// Clear any existing cache to force fresh API calls
if (typeof CacheManager !== 'undefined') {
    CacheManager.clearAllCache();
    console.log('🗑️ Cleared all cache to force fresh API calls');
}