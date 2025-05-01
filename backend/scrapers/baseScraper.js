import browserManager from '../services/browserManager.js';
import { load } from 'cheerio';

/**
 * Base scraper class with common functionality
 */
export default class BaseScraper {
  /**
   * @param {string} source - Source name (e.g., 'coupang', 'danggeun')
   * @param {string} baseUrl - Base URL for the source
   * @param {string} searchPath - Search path pattern
   */
  constructor(source, baseUrl, searchPath) {
    this.source = source;
    this.baseUrl = baseUrl;
    this.searchPath = searchPath;
    this.defaultTimeout = 8000; // Reduced timeout for faster scraping
    this.maxRetries = 3;
  }

  /**
   * Get a new page from browser with configured settings
   * @param {Object} options - Browser options
   * @returns {Promise<import('puppeteer').Page>}
   */
  async getPage(options = {}) {
    const browser = await browserManager.getBrowser(options);
    const page = await browser.newPage();

    // Set default viewport - smaller for performance
    await page.setViewport({
      width: options.width || 800,
      height: options.height || 600
    });

    // Block images, fonts, stylesheets to speed up page loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'image' || resourceType === 'font' || resourceType === 'stylesheet') {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Set default user agent if not provided
    const userAgent = options.userAgent ||
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    await page.setUserAgent(userAgent);

    // Set default headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Cache-Control': 'max-age=0',
      ...(options.headers || {})
    });

    return page;
  }

  /**
   * Retry a function with exponential backoff
   * @param {Function} fn - Function to retry
   * @param {number} maxRetries - Maximum number of retries
   * @returns {Promise<any>}
   */
  async withRetry(fn, maxRetries = this.maxRetries) {
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        console.log(`${this.source} attempt ${attempt + 1} failed: ${err.message}`);

        if (attempt < maxRetries - 1) {
          // Use shorter backoff: 500ms, 1s, 2s
          const delay = 500 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`All ${this.source} attempts failed:`, lastError);
    throw lastError;
  }

  /**
   * Helper function to auto-scroll a page
   * @param {import('puppeteer').Page} page - Puppeteer page
   * @param {number} distance - Distance to scroll each time
   * @param {number} scrollDelay - Delay between scrolls in ms
   */
  async autoScroll(page, distance = 300, scrollDelay = 50) {
    await page.evaluate(async (dist, delay) => {
      await new Promise((resolve) => {
        let total = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, dist);
          total += dist;
          if (total >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, delay);
      });
    }, distance, scrollDelay);
  }

  /**
   * Common function to parse HTML with cheerio
   * @param {string} html - HTML content
   * @param {Object} options - Cheerio options
   * @returns {cheerio.Root}
   */
  parseHTML(html, options = {}) {
    // Set optimized parsing options
    const defaultOptions = {
      xmlMode: false,
      decodeEntities: false,
    };
    return load(html, { ...defaultOptions, ...options });
  }
} 