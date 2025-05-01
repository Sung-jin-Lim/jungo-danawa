// File: backend/scrapers/junggonaraScraper.js
import puppeteer from "puppeteer";
import { load } from "cheerio";
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let total = 0, dist = 100;
      const timer = setInterval(() => {
        window.scrollBy(0, dist);
        total += dist;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

export default class JunggonaraScraper {
  /**
   * @param {import('puppeteer').Browser} browser  shared Puppeteer instance
   * @param {Object} options Additional options
   * @param {boolean} options.debug Enable debug mode with screenshots
   * @param {string} options.debugDir Directory to save debug files
   * @param {boolean} options.useCache Enable caching of search results
   * @param {string} options.cacheDir Directory to save cache files
   * @param {number} options.cacheTTL Time to live for cache in ms (default: 1 hour)
   */
  constructor(browser, options = {}) {
    this.browser = browser;
    this.baseUrl = 'https://web.joongna.com';
    this.searchPath = '/search/';
    this.debug = options.debug || false;
    this.debugDir = options.debugDir || path.join(process.cwd(), 'debug');

    // Cache settings
    this.useCache = options.useCache !== false; // Enable by default
    this.cacheDir = options.cacheDir || path.join(process.cwd(), 'cache');
    this.cacheTTL = options.cacheTTL || 60 * 60 * 1000; // 1 hour default

    // Create debug directory if it doesn't exist and debug is enabled
    if (this.debug && !fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }

    // Create cache directory if it doesn't exist and cache is enabled
    if (this.useCache && !fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Generate a cache key for a given query
   * @param {string} query Search query
   * @param {number} limit Result limit
   * @returns {string} Cache key
   */
  getCacheKey(query, limit) {
    const data = `junggonara:${query}:${limit}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Try to get results from cache
   * @param {string} cacheKey Cache key
   * @returns {Array|null} Cached results or null if not found/expired
   */
  getFromCache(cacheKey) {
    if (!this.useCache) return null;

    const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);

    try {
      if (!fs.existsSync(cacheFile)) return null;

      const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const now = Date.now();

      // Check if cache is expired
      if (now - cacheData.timestamp > this.cacheTTL) {
        console.log('Cache expired for', cacheKey);
        return null;
      }

      console.log('Using cached results for', cacheKey);
      return cacheData.data;
    } catch (err) {
      console.error('Error reading cache:', err);
      return null;
    }
  }

  /**
   * Save results to cache
   * @param {string} cacheKey Cache key
   * @param {Array} data Data to cache
   */
  saveToCache(cacheKey, data) {
    if (!this.useCache) return;

    const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
    const cacheData = {
      timestamp: Date.now(),
      data: data
    };

    try {
      fs.writeFileSync(cacheFile, JSON.stringify(cacheData), 'utf8');
      console.log('Saved results to cache:', cacheKey);
    } catch (err) {
      console.error('Error writing cache:', err);
    }
  }

  /**
   * Save debug information during scraping
   * @param {Object} page Puppeteer page 
   * @param {string} step Name of the step
   */
  async saveDebugInfo(page, step) {
    if (!this.debug) return;

    const timestamp = Date.now();
    const prefix = `junggonara_${step}_${timestamp}`;

    // Save screenshot
    await page.screenshot({
      path: path.join(this.debugDir, `${prefix}.png`),
      fullPage: true
    });

    // Save HTML
    const html = await page.content();
    fs.writeFileSync(
      path.join(this.debugDir, `${prefix}.html`),
      html
    );

    console.log(`Debug info saved for step: ${step}`);
  }

  /**
   * Search for products with caching support
   * @param {string} query Search query
   * @param {number} limit Max results to return
   * @param {boolean} forceRefresh Force refresh cache
   * @returns {Array} Search results
   */
  async searchProducts(query, limit = 20, forceRefresh = false) {
    // Generate cache key
    const cacheKey = this.getCacheKey(query, limit);

    // Try to get from cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedResults = this.getFromCache(cacheKey);
      if (cachedResults) {
        return cachedResults;
      }
    }

    const page = await this.browser.newPage();

    // Set longer default timeout
    await page.setDefaultNavigationTimeout(30000);
    await page.setDefaultTimeout(30000);

    try {
      // open a fresh page from the shared browser
      const url = `${this.baseUrl}${this.searchPath}${encodeURIComponent(query)}`;
      console.log("Junggonara URL:", url);

      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');

      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      await this.saveDebugInfo(page, 'after_navigation');

      // Wait for search results with more generous timeout
      const resultsSelector = "ul.search-results";
      const fallbackSelector = ".search-container";

      try {
        await page.waitForSelector(resultsSelector, { timeout: 25000 });
      } catch (error) {
        console.log("Primary selector failed, trying fallback selector");
        await page.waitForSelector(fallbackSelector, { timeout: 10000 });
      }

      await this.saveDebugInfo(page, 'after_wait_selector');

      // trigger lazy-load
      await autoScroll(page);
      await this.saveDebugInfo(page, 'after_scroll');

      // Increased wait time after scrolling for lazy-loaded content
      await new Promise(resolve => setTimeout(resolve, 3000));

      const html = await page.content();
      const $ = load(html);
      const products = [];

      // Verify if we have results
      const resultCount = $("ul.search-results > li").length;
      console.log(`Found ${resultCount} results on Junggonara`);

      if (resultCount === 0 && this.debug) {
        // Save page source for debugging when no results found
        fs.writeFileSync(
          path.join(this.debugDir, `junggonara_no_results_${Date.now()}.html`),
          html
        );
      }

      $("ul.search-results > li").each((i, el) => {
        if (i >= limit) return false;

        try {
          const card = $(el).find("a").first();
          if (!card.length) return; // Skip if card not found

          const title = card.find("h2").text().trim();
          const priceTxt = card.find(".text-heading").text().trim();
          const price = parseInt(priceTxt.replace(/[^0-9]/g, ""), 10) || null;

          // the region and the posted-ago time are the 1st and 3rd span under .my-1
          const infoSpans = card.find(".my-1 span");
          const region = infoSpans.length > 0 ? infoSpans.eq(0).text().trim() : '';
          const timeAgo = infoSpans.length > 2 ? infoSpans.eq(2).text().trim() : '';

          // More robust image extraction
          let imgSrc = '';
          const imgEl = card.find("img");
          if (imgEl.length) {
            imgSrc = imgEl.attr("src") || imgEl.attr("data-src") || imgEl.attr("data-lazy-src") || '';
          }

          if (imgSrc.startsWith("//")) imgSrc = "https:" + imgSrc;
          if (!imgSrc && imgEl.length) {
            // Try to extract from style attribute if src is empty
            const style = imgEl.attr("style") || '';
            const match = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/i);
            if (match && match[1]) {
              imgSrc = match[1];
            }
          }

          const href = card.attr("href");
          if (!href) return; // Skip if no product link

          const productUrl = href.startsWith('http') ? href : (this.baseUrl + href);

          if (title && productUrl) {
            products.push({
              source: "junggonara",
              title,
              price,
              priceText: priceTxt,
              location: region,
              timeAgo,
              imageUrl: imgSrc,
              productUrl,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (itemError) {
          console.error("Error processing Junggonara item:", itemError);
        }
      });

      if (this.debug) {
        // Log extracted products for debugging
        fs.writeFileSync(
          path.join(this.debugDir, `junggonara_products_${Date.now()}.json`),
          JSON.stringify(products, null, 2)
        );
      }

      // Cache the successful results
      this.saveToCache(cacheKey, products);

      return products;
    } catch (err) {
      console.error("Junggonara scrape error:", err);

      if (this.debug) {
        try {
          // Save error screenshot
          await this.saveDebugInfo(page, 'error');
          // Save error details
          fs.writeFileSync(
            path.join(this.debugDir, `junggonara_error_${Date.now()}.txt`),
            err.toString() + '\n' + (err.stack || '')
          );
        } catch (debugErr) {
          console.error("Failed to save debug info:", debugErr);
        }
      }

      return [];
    } finally {
      // Ensure page is always closed
      try {
        await page.close();
      } catch (closeErr) {
        console.error("Error closing Junggonara page:", closeErr);
      }
    }
  }

  /**
   * Clear the entire cache
   */
  clearCache() {
    if (!this.useCache) return;

    try {
      const files = fs.readdirSync(this.cacheDir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
      });
      console.log('Cache cleared');
    } catch (err) {
      console.error('Error clearing cache:', err);
    }
  }

  /**
   * Remove specific cache entry
   * @param {string} query Search query to remove from cache
   * @param {number} limit Limit value used in the original search
   */
  removeCacheEntry(query, limit = 20) {
    const cacheKey = this.getCacheKey(query, limit);
    const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);

    try {
      if (fs.existsSync(cacheFile)) {
        fs.unlinkSync(cacheFile);
        console.log(`Cache entry removed: ${query}`);
      }
    } catch (err) {
      console.error('Error removing cache entry:', err);
    }
  }
}
