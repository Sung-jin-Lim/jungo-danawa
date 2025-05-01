import puppeteer from 'puppeteer';
import { load } from 'cheerio';
import CacheManager from './cacheManager.js';

// helper to scroll the page for lazy-loading
// async function autoScroll(page) {
//   await page.evaluate(async () => {
//     await new Promise((resolve) => {
//       let total = 0;
//       const distance = 100;
//       const timer = setInterval(() => {
//         window.scrollBy(0, distance);
//         total += distance;
//         if (total >= document.body.scrollHeight) {
//           clearInterval(timer);
//           resolve();
//         }
//       }, 100);
//     });
//   });
// }

export default class BunjangScraper {
  /**
   * @param {import('puppeteer').Browser} browser  shared Puppeteer instance
   * @param {Object} options Cache and other options
   * @param {boolean} options.useCache Enable caching of search results
   * @param {string} options.cacheDir Directory to save cache files
   * @param {number} options.cacheTTL Time to live for cache in ms (default: 1 hour)
   */
  constructor(browser, options = {}) {
    this.browser = browser;
    this.baseUrl = 'https://www.bunjang.co.kr';
    this.searchUrl = `${this.baseUrl}/search/products?q=`;

    // Initialize cache manager
    this.cache = new CacheManager({
      cacheDir: options.cacheDir || './cache/bunjang',
      defaultTTL: options.cacheTTL || 60 * 60 * 1000, // 1 hour
      enabled: options.useCache !== false // enabled by default
    });
  }

  /**
   * Search for products on Bunjang
   * @param {string} query Search query
   * @param {number} limit Max results
   * @param {boolean} forceRefresh Force refresh cache
   * @returns {Array} Products
   */
  async searchProducts(query, limit = 20, forceRefresh = false) {
    // Generate cache key
    const cacheKey = this.cache.generateKey('bunjang', 'search', { query, limit });

    // Try to get from cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedResults = this.cache.get(cacheKey);
      if (cachedResults) {
        console.log(`Using cached results for Bunjang search: ${query}`);
        return cachedResults;
      }
    }

    try {
      const page = await this.browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/112.0.0.0 Safari/537.36'
      );

      const url = `${this.searchUrl}${encodeURIComponent(query)}`;
      console.log('Bunjang URL:', url);
      // await page.goto(url, { waitUntil: 'networkidle2', timeout: 20_000 });
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // wait for at least one product card
      await page.waitForSelector('a[data-pid]', { timeout: 20_000 });

      // trigger lazy-loading
      // await autoScroll(page);
      // pause to allow images to load
      await new Promise(resolve => setTimeout(resolve, 1_000));
      // grab HTML and parse with cheerio
      const html = await page.content();
      const $ = load(html);
      const products = [];

      // each anchor with data-pid is a product card
      $('a[data-pid]').each((i, el) => {
        if (i >= limit) return false; // break out once we hit the limit
        const card = $(el);

        const pid = card.attr('data-pid');
        const title = card.find('div.sc-RcBXQ').text().trim();
        const priceText = card.find('div.sc-iSDuPN').text().trim();
        const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || null;

        let imageUrl = card.find('img').attr('data-original')
          || card.find('img').attr('src')
          || '';
        if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;

        const href = card.attr('href') || '';
        const productUrl =
          href.startsWith('http') ? href : this.baseUrl + href;

        if (pid && title && productUrl) {
          products.push({
            source: 'bunjang',
            pid,
            title,
            price,
            priceText,
            imageUrl,
            productUrl,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Cache successful results
      if (products.length > 0) {
        this.cache.set(cacheKey, products);
        console.log(`Cached ${products.length} Bunjang results for: ${query}`);
      }

      await page.close();
      return products;
    } catch (err) {
      console.error('Bunjang scrape error:', err);
      return [];
    } finally {
    }
  }

  /**
   * Clear the entire cache
   * @returns {number} Number of entries cleared
   */
  clearCache() {
    return this.cache.clear();
  }

  /**
   * Remove specific cache entry
   * @param {string} query Search query to remove from cache
   * @param {number} limit Limit value used in the original search
   */
  removeCacheEntry(query, limit = 20) {
    const cacheKey = this.cache.generateKey('bunjang', 'search', { query, limit });
    return this.cache.delete(cacheKey);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}
