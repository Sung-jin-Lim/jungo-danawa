// File: backend/scrapers/danggeunScraper.js
import puppeteer from 'puppeteer';
import { load } from 'cheerio';
import CacheManager from './cacheManager.js';

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const distance = 100;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        total += distance;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

export default class DanggeunScraper {
  /**
   * @param {import('puppeteer').Browser} browser shared Puppeteer instance
   * @param {Object} options Cache and other options
   * @param {boolean} options.useCache Enable caching of search results
   * @param {string} options.cacheDir Directory to save cache files
   * @param {number} options.cacheTTL Time to live for cache in ms (default: 1 hour)
   */
  constructor(browser, options = {}) {
    this.browser = browser;
    this.baseUrl = 'https://www.daangn.com';
    this.searchPath = '/kr/buy-sell/';
    this.region = process.env.DANGGEUN_REGION || '마장동-56';

    // Initialize cache manager
    this.cache = new CacheManager({
      cacheDir: options.cacheDir || './cache/danggeun',
      defaultTTL: options.cacheTTL || 60 * 60 * 1000, // 1 hour
      enabled: options.useCache !== false // enabled by default
    });
  }

  /**
   * @param {string} query - Search term
   * @param {number} limit - Maximum number of products to return
   * @param {boolean} forceRefresh - Force refresh cache
   */
  async searchProducts(query, limit = 20, forceRefresh = false) {
    // Generate cache key
    const cacheKey = this.cache.generateKey('danggeun', 'search', { query, limit });

    // Try to get from cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedResults = this.cache.get(cacheKey);
      if (cachedResults) {
        console.log(`Using cached results for Danggeun search: ${query}`);
        return cachedResults;
      }
    }

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-spdy'],
    });
    try {
      const page = await browser.newPage();
      const url =
        `${this.baseUrl}${this.searchPath}` +
        `?in=${encodeURIComponent(this.region)}` +
        `&search=${encodeURIComponent(query)}`;

      console.log('Danggeun URL:', url);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
      await page.waitForSelector('a[data-gtm="search_article"]', { timeout: 15000 });

      // scroll through the page to trigger lazy‐load
      await autoScroll(page);
      // short pause to let images load
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const html = await page.content();
      const $ = load(html);
      const products = [];

      $('a[data-gtm="search_article"]').each((i, el) => {
        if (i >= limit) return false;
        const card = $(el);
        const title = card.find('span.lm809sh').text().trim();
        const priceTxt = card.find('span.lm809si').text().trim();
        const price = parseInt(priceTxt.replace(/[^0-9]/g, ''), 10) || null;
        const location = card.find('span.lm809sj').first().text().trim();

        let img = card.find('img').attr('src') || '';
        if (img.startsWith('//')) img = 'https:' + img;

        const relUrl = card.attr('href');
        const productUrl = this.baseUrl + relUrl;

        if (title && productUrl) {
          products.push({
            source: 'danggeun',
            title,
            price,
            priceText: priceTxt,
            location,
            imageUrl: img,
            productUrl,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Cache successful results
      if (products.length > 0) {
        this.cache.set(cacheKey, products);
        console.log(`Cached ${products.length} Danggeun results for: ${query}`);
      }

      await page.close();
      return products;
    } catch (err) {
      console.error('Danggeun scrape error:', err);
      return [];
    } finally {
      // await browser.close();
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
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}
