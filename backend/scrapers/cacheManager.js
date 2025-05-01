import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Cache manager for web scrapers
 * Provides file-based caching with TTL support
 */
export default class CacheManager {
  /**
   * Create a new cache manager
   * @param {Object} options Cache options
   * @param {string} options.cacheDir Directory to store cache files
   * @param {number} options.defaultTTL Default TTL in milliseconds
   * @param {boolean} options.enabled Whether caching is enabled
   */
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || path.join(process.cwd(), 'cache');
    this.defaultTTL = options.defaultTTL || 60 * 60 * 1000; // 1 hour
    this.enabled = options.enabled !== false; // enabled by default

    // Create cache directory if it doesn't exist
    if (this.enabled && !fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Generate a cache key
   * @param {string} source Source identifier (e.g., 'junggonara')
   * @param {string} action Action identifier (e.g., 'search')
   * @param {Object} params Parameters to include in the key
   * @returns {string} MD5 hash of the key
   */
  generateKey(source, action, params = {}) {
    const data = JSON.stringify({
      source,
      action,
      params
    });

    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Get full path to a cache file
   * @param {string} key Cache key
   * @returns {string} Full path to cache file
   */
  getCachePath(key) {
    return path.join(this.cacheDir, `${key}.json`);
  }

  /**
   * Check if a cache entry exists and is valid
   * @param {string} key Cache key
   * @param {number} ttl Optional TTL override
   * @returns {boolean} Whether cache is valid
   */
  isValid(key, ttl = null) {
    if (!this.enabled) return false;

    const cachePath = this.getCachePath(key);
    if (!fs.existsSync(cachePath)) return false;

    try {
      const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      const now = Date.now();
      const maxAge = ttl || this.defaultTTL;

      return (now - cacheData.timestamp) <= maxAge;
    } catch (err) {
      return false;
    }
  }

  /**
   * Get cached data
   * @param {string} key Cache key
   * @returns {any|null} Cached data or null if not found/invalid
   */
  get(key) {
    if (!this.enabled) return null;

    const cachePath = this.getCachePath(key);
    if (!fs.existsSync(cachePath)) return null;

    try {
      const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      const now = Date.now();

      if (now - cacheData.timestamp > this.defaultTTL) {
        return null;
      }

      return cacheData.data;
    } catch (err) {
      console.error('Cache read error:', err);
      return null;
    }
  }

  /**
   * Store data in cache
   * @param {string} key Cache key
   * @param {any} data Data to cache
   * @returns {boolean} Success status
   */
  set(key, data) {
    if (!this.enabled) return false;

    const cachePath = this.getCachePath(key);
    const cacheData = {
      timestamp: Date.now(),
      data: data
    };

    try {
      fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');
      return true;
    } catch (err) {
      console.error('Cache write error:', err);
      return false;
    }
  }

  /**
   * Delete a specific cache entry
   * @param {string} key Cache key to delete
   * @returns {boolean} Success status
   */
  delete(key) {
    if (!this.enabled) return false;

    const cachePath = this.getCachePath(key);
    if (!fs.existsSync(cachePath)) return true;

    try {
      fs.unlinkSync(cachePath);
      return true;
    } catch (err) {
      console.error('Cache delete error:', err);
      return false;
    }
  }

  /**
   * Clear all cache entries or those matching a pattern
   * @param {string} prefix Optional prefix to match keys
   * @returns {number} Number of entries cleared
   */
  clear(prefix = null) {
    if (!this.enabled) return 0;

    try {
      const files = fs.readdirSync(this.cacheDir);
      let count = 0;

      files.forEach(file => {
        if (!file.endsWith('.json')) return;

        if (!prefix || file.startsWith(prefix)) {
          fs.unlinkSync(path.join(this.cacheDir, file));
          count++;
        }
      });

      return count;
    } catch (err) {
      console.error('Cache clear error:', err);
      return 0;
    }
  }

  /**
   * Get cache stats (counts, size)
   * @returns {Object} Cache statistics
   */
  getStats() {
    if (!this.enabled) {
      return { enabled: false, count: 0, size: 0 };
    }

    try {
      const files = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json'));
      let totalSize = 0;

      files.forEach(file => {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      });

      return {
        enabled: true,
        count: files.length,
        size: totalSize,
        humanSize: this.formatBytes(totalSize)
      };
    } catch (err) {
      console.error('Error getting cache stats:', err);
      return { enabled: true, count: 0, size: 0, humanSize: '0 B' };
    }
  }

  /**
   * Format bytes to human-readable format
   * @param {number} bytes Bytes to format
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  }
} 