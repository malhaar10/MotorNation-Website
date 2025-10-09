/**
 * CacheManager - Client-side caching with 3-day expiration
 * Handles localStorage operations with error handling and automatic cleanup
 */
class CacheManager {
    static CACHE_DURATION = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
    static CACHE_PREFIX = 'motor_nation_';
    static MAX_CACHE_SIZE = 50; // Maximum number of cache items

    /**
     * Store data in cache with expiration
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     */
    static setCache(key, data) {
        const cacheItem = {
            data: data,
            timestamp: Date.now(),
            expiry: Date.now() + this.CACHE_DURATION
        };
        
        try {
            const cacheKey = this.CACHE_PREFIX + key;
            localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
            console.log(`✅ Cached: ${key} (expires in 3 days)`);
            
            // Check cache size and cleanup if needed
            this.maintainCacheSize();
        } catch (error) {
            console.warn('❌ Cache storage failed:', error);
            
            // Try to free up space by removing old items
            if (error.name === 'QuotaExceededError') {
                this.clearOldestCache();
                try {
                    localStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(cacheItem));
                    console.log(`✅ Cached after cleanup: ${key}`);
                } catch (retryError) {
                    console.error('❌ Cache storage failed even after cleanup:', retryError);
                }
            }
        }
    }

    /**
     * Retrieve data from cache if not expired
     * @param {string} key - Cache key
     * @returns {any|null} - Cached data or null if not found/expired
     */
    static getCache(key) {
        try {
            const cacheKey = this.CACHE_PREFIX + key;
            const cached = localStorage.getItem(cacheKey);
            
            if (!cached) {
                return null;
            }

            const cacheItem = JSON.parse(cached);
            
            // Check if cache has expired
            if (Date.now() > cacheItem.expiry) {
                this.removeCache(key);
                console.log(`🕒 Cache expired: ${key}`);
                return null;
            }

            console.log(`🎯 Cache hit: ${key}`);
            return cacheItem.data;
        } catch (error) {
            console.warn('❌ Cache retrieval failed:', error);
            this.removeCache(key); // Remove corrupted cache
            return null;
        }
    }

    /**
     * Remove specific cache item
     * @param {string} key - Cache key to remove
     */
    static removeCache(key) {
        localStorage.removeItem(this.CACHE_PREFIX + key);
    }

    /**
     * Clear oldest cache items when storage is full
     */
    static clearOldestCache() {
        const cacheItems = this.getAllCacheItems();
        
        if (cacheItems.length === 0) return;

        // Sort by timestamp (oldest first)
        cacheItems.sort((a, b) => a.timestamp - b.timestamp);

        // Remove oldest 30% of items
        const toRemove = Math.max(1, Math.ceil(cacheItems.length * 0.3));
        
        for (let i = 0; i < toRemove; i++) {
            localStorage.removeItem(cacheItems[i].fullKey);
            console.log(`🗑️ Removed old cache: ${cacheItems[i].key}`);
        }
    }

    /**
     * Maintain cache size within limits
     */
    static maintainCacheSize() {
        const cacheItems = this.getAllCacheItems();
        
        if (cacheItems.length > this.MAX_CACHE_SIZE) {
            const excess = cacheItems.length - this.MAX_CACHE_SIZE;
            cacheItems.sort((a, b) => a.timestamp - b.timestamp);
            
            for (let i = 0; i < excess; i++) {
                localStorage.removeItem(cacheItems[i].fullKey);
                console.log(`📦 Cache size limit: removed ${cacheItems[i].key}`);
            }
        }
    }

    /**
     * Get all cache items with metadata
     * @returns {Array} - Array of cache items with metadata
     */
    static getAllCacheItems() {
        const cacheItems = [];
        const keys = Object.keys(localStorage);
        
        keys.forEach(fullKey => {
            if (fullKey.startsWith(this.CACHE_PREFIX)) {
                try {
                    const item = JSON.parse(localStorage.getItem(fullKey));
                    const key = fullKey.replace(this.CACHE_PREFIX, '');
                    cacheItems.push({
                        fullKey,
                        key,
                        timestamp: item.timestamp || 0,
                        expiry: item.expiry || 0
                    });
                } catch (error) {
                    // Remove corrupted items
                    localStorage.removeItem(fullKey);
                }
            }
        });
        
        return cacheItems;
    }

    /**
     * Fetch data with caching
     * @param {string} url - URL to fetch
     * @param {string} cacheKey - Key to store/retrieve cache
     * @param {Object} options - Fetch options
     * @returns {Promise<any>} - Fetched/cached data
     */
    static async fetchWithCache(url, cacheKey, options = {}) {
        // Try cache first
        const cached = this.getCache(cacheKey);
        if (cached) {
            return cached;
        }

        // Fetch from server
        console.log(`🌐 Fetching from server: ${url}`);
        
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Cache the response
            this.setCache(cacheKey, data);
            
            return data;
        } catch (error) {
            console.error(`❌ Fetch failed for ${url}:`, error);
            throw error;
        }
    }

    /**
     * Clear all expired cache items
     */
    static clearExpiredCache() {
        const cacheItems = this.getAllCacheItems();
        let removedCount = 0;
        
        cacheItems.forEach(item => {
            if (item.expiry && Date.now() > item.expiry) {
                localStorage.removeItem(item.fullKey);
                removedCount++;
            }
        });
        
        if (removedCount > 0) {
            console.log(`🧹 Cleared ${removedCount} expired cache items`);
        }
    }

    /**
     * Clear all cache items
     */
    static clearAllCache() {
        const cacheItems = this.getAllCacheItems();
        
        cacheItems.forEach(item => {
            localStorage.removeItem(item.fullKey);
        });
        
        console.log(`🗑️ Cleared all cache (${cacheItems.length} items)`);
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    static getCacheStats() {
        const cacheItems = this.getAllCacheItems();
        const now = Date.now();
        
        const stats = {
            totalItems: cacheItems.length,
            expiredItems: cacheItems.filter(item => item.expiry && now > item.expiry).length,
            totalSize: 0,
            oldestItem: null,
            newestItem: null
        };

        // Calculate total size (approximate)
        cacheItems.forEach(item => {
            try {
                const itemData = localStorage.getItem(item.fullKey);
                stats.totalSize += itemData ? itemData.length : 0;
            } catch (error) {
                // Skip corrupted items
            }
        });

        // Find oldest and newest items
        if (cacheItems.length > 0) {
            const sorted = cacheItems.sort((a, b) => a.timestamp - b.timestamp);
            stats.oldestItem = sorted[0];
            stats.newestItem = sorted[sorted.length - 1];
        }

        return stats;
    }

    /**
     * Initialize cache manager - call on page load
     */
    static init() {
        // Clear expired cache on initialization
        this.clearExpiredCache();
        
        // Log cache statistics
        const stats = this.getCacheStats();
        console.log(`📊 Cache initialized: ${stats.totalItems} items, ~${Math.round(stats.totalSize / 1024)}KB`);
        
        if (stats.expiredItems > 0) {
            console.log(`🕒 Found ${stats.expiredItems} expired items (cleaned up)`);
        }
    }
}

// Initialize cache manager when script loads
if (typeof window !== 'undefined') {
    window.CacheManager = CacheManager;
}