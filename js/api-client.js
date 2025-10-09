/**
 * ApiClient - Centralized API client with caching
 * Wraps all API calls with automatic caching using CacheManager
 */
class ApiClient {
    static BASE_URL = 'http://localhost:3000/api';
    static DEFAULT_OPTIONS = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    /**
     * Get reviews summary with optional limit
     * @param {number|null} limit - Number of reviews to fetch
     * @returns {Promise<Object>} - Reviews summary data
     */
    static async getReviewsSummary(limit = null) {
        const url = limit ? 
            `${this.BASE_URL}/reviews/summary?limit=${limit}` : 
            `${this.BASE_URL}/reviews/summary`;
        const cacheKey = `reviews_summary_${limit || 'all'}`;
        
        return CacheManager.fetchWithCache(url, cacheKey, this.DEFAULT_OPTIONS);
    }

    /**
     * Get reviews for specific category
     * @param {string} category - Category name (luxury, performance, etc.)
     * @returns {Promise<Object>} - Category reviews data
     */
    static async getCategoryReviews(category) {
        const url = `${this.BASE_URL}/reviews/${category}`;
        const cacheKey = `reviews_${category}`;
        
        return CacheManager.fetchWithCache(url, cacheKey, this.DEFAULT_OPTIONS);
    }

    /**
     * Get specific review by ID
     * @param {string|number} id - Review ID
     * @returns {Promise<Object>} - Review data
     */
    static async getReviewById(id) {
        const url = `${this.BASE_URL}/reviews/${id}`;
        const cacheKey = `review_${id}`;
        
        return CacheManager.fetchWithCache(url, cacheKey, this.DEFAULT_OPTIONS);
    }

    /**
     * Get all reviews
     * @returns {Promise<Object>} - All reviews data
     */
    static async getAllReviews() {
        const url = `${this.BASE_URL}/reviews`;
        const cacheKey = 'reviews_all';
        
        return CacheManager.fetchWithCache(url, cacheKey, this.DEFAULT_OPTIONS);
    }

    /**
     * Get news articles with optional limit
     * @param {number|null} limit - Number of articles to fetch
     * @returns {Promise<Object>} - News articles data
     */
    static async getNews(limit = null) {
        const url = limit ? 
            `${this.BASE_URL}/news?limit=${limit}` : 
            `${this.BASE_URL}/news`;
        const cacheKey = `news_${limit || 'all'}`;
        
        return CacheManager.fetchWithCache(url, cacheKey, this.DEFAULT_OPTIONS);
    }

    /**
     * Get news summary (typically latest 6 articles)
     * @param {number|null} limit - Number of articles to fetch
     * @returns {Promise<Object>} - News summary data
     */
    static async getNewsSummary(limit = null) {
        const url = limit ? 
            `${this.BASE_URL}/news/summary?limit=${limit}` : 
            `${this.BASE_URL}/news/summary`;
        const cacheKey = `news_summary_${limit || 'all'}`;
        
        return CacheManager.fetchWithCache(url, cacheKey, this.DEFAULT_OPTIONS);
    }

    /**
     * Get specific news article by ID
     * @param {string|number} id - News article ID
     * @returns {Promise<Object>} - News article data
     */
    static async getNewsById(id) {
        const url = `${this.BASE_URL}/news/${id}`;
        const cacheKey = `news_${id}`;
        
        return CacheManager.fetchWithCache(url, cacheKey, this.DEFAULT_OPTIONS);
    }

    /**
     * Get images/gallery data
     * @returns {Promise<Object>} - Images data
     */
    static async getImages() {
        const url = `${this.BASE_URL}/images`;
        const cacheKey = 'images';
        
        return CacheManager.fetchWithCache(url, cacheKey, this.DEFAULT_OPTIONS);
    }

    /**
     * Get YouTube videos data (not cached - always fresh)
     * @param {string|null} category - Video category filter
     * @returns {Promise<Object>} - YouTube videos data
     */
    static async getYouTubeVideos(category = null) {
        const url = category ? 
            `${this.BASE_URL}/youtube?category=${category}` : 
            `${this.BASE_URL}/youtube`;
        
        console.log(`🌐 Fetching YouTube videos from server: ${url}`);
        
        try {
            const response = await fetch(url, this.DEFAULT_OPTIONS);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`❌ YouTube fetch failed for ${url}:`, error);
            throw error;
        }
    }

    /**
     * Search functionality
     * @param {string} query - Search query
     * @param {string} type - Search type (reviews, news, all)
     * @returns {Promise<Object>} - Search results
     */
    static async search(query, type = 'all') {
        const url = `${this.BASE_URL}/search?q=${encodeURIComponent(query)}&type=${type}`;
        const cacheKey = `search_${type}_${query.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        
        return CacheManager.fetchWithCache(url, cacheKey, this.DEFAULT_OPTIONS);
    }

    /**
     * Generic API call with caching
     * @param {string} endpoint - API endpoint (without base URL)
     * @param {string} cacheKey - Cache key for storing/retrieving data
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} - API response data
     */
    static async apiCall(endpoint, cacheKey, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.BASE_URL}${endpoint}`;
        const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };
        
        return CacheManager.fetchWithCache(url, cacheKey, mergedOptions);
    }

    /**
     * Clear specific API cache
     * @param {string} cacheKey - Cache key to clear
     */
    static clearCache(cacheKey) {
        CacheManager.removeCache(cacheKey);
        console.log(`🗑️ Cleared API cache: ${cacheKey}`);
    }

    /**
     * Clear all API cache
     */
    static clearAllCache() {
        CacheManager.clearAllCache();
        console.log('🗑️ Cleared all API cache');
    }

    /**
     * Refresh specific data (force re-fetch)
     * @param {string} method - API method name
     * @param {...any} args - Method arguments
     * @returns {Promise<Object>} - Fresh data
     */
    static async refresh(method, ...args) {
        // Generate cache key based on method and arguments
        const cacheKey = this.generateCacheKey(method, args);
        
        // Clear existing cache
        this.clearCache(cacheKey);
        
        // Call the method again to fetch fresh data
        return this[method](...args);
    }

    /**
     * Generate cache key for method and arguments
     * @param {string} method - Method name
     * @param {Array} args - Method arguments
     * @returns {string} - Generated cache key
     */
    static generateCacheKey(method, args) {
        const argString = args.length > 0 ? args.join('_') : 'default';
        return `${method}_${argString}`;
    }

    /**
     * Batch load multiple endpoints
     * @param {Array} requests - Array of {method, args, key} objects
     * @returns {Promise<Object>} - Object with results keyed by request keys
     */
    static async batchLoad(requests) {
        const promises = requests.map(async (request) => {
            try {
                const result = await this[request.method](...(request.args || []));
                return { key: request.key, data: result, error: null };
            } catch (error) {
                return { key: request.key, data: null, error: error.message };
            }
        });

        const results = await Promise.all(promises);
        
        // Convert to object
        const batchResult = {};
        results.forEach(result => {
            batchResult[result.key] = {
                data: result.data,
                error: result.error
            };
        });

        return batchResult;
    }

    /**
     * Get cache statistics for API calls
     * @returns {Object} - Cache statistics
     */
    static getCacheStats() {
        return CacheManager.getCacheStats();
    }

    /**
     * Check if data is cached
     * @param {string} cacheKey - Cache key to check
     * @returns {boolean} - True if cached and not expired
     */
    static isCached(cacheKey) {
        return CacheManager.getCache(cacheKey) !== null;
    }

    /**
     * Get cache age for specific data
     * @param {string} cacheKey - Cache key to check
     * @returns {number|null} - Age in milliseconds, or null if not cached
     */
    static getCacheAge(cacheKey) {
        const cached = localStorage.getItem(CacheManager.CACHE_PREFIX + cacheKey);
        if (!cached) return null;

        try {
            const cacheItem = JSON.parse(cached);
            return Date.now() - cacheItem.timestamp;
        } catch (error) {
            return null;
        }
    }

    /**
     * Preload common data
     * @returns {Promise<void>}
     */
    static async preloadCommonData() {
        console.log('🚀 Preloading common data...');
        
        try {
            const preloadTasks = [
                this.getReviewsSummary(5),
                this.getNews(5),
                this.getCategoryReviews('luxury'),
                this.getCategoryReviews('performance')
            ];

            await Promise.all(preloadTasks);
            console.log('✅ Common data preloaded');
        } catch (error) {
            console.warn('⚠️ Preload failed:', error);
        }
    }
}

// Make ApiClient available globally
if (typeof window !== 'undefined') {
    window.ApiClient = ApiClient;
}