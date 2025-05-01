// File: backend/scrapers/danggeunScraper.js
import puppeteer from 'puppeteer';
import { load } from 'cheerio';
import fs from 'fs';
import * as scraperUtils from '../utils/scraperUtils.js';

/**
 * Helper function to auto-scroll the page to load lazy-loaded content
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const distance = 300;
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

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum retries
 * @returns {Promise<any>}
 */
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      // exponential back-off
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      console.log(`Retrying (${i + 1}/${maxRetries}) after error: ${err.message}`);
    }
  }
}

/**
 * @param {import('puppeteer').Browser} browser shared Puppeteer instance
 */
export default class DanggeunScraper {
  constructor(browser) {
    this.browser = browser;
    this.baseUrl = 'https://www.daangn.com';
    this.searchUrl = 'https://www.daangn.com/kr/buy-sell/all/';
    this.source = 'danggeun';
  }

  /**
   * Search for products on Danggeun Market
   * @param {string} query - Search query
   * @returns {Promise<Array<Object>>} List of product objects
   */
  async searchProducts(query, limit = 20) {
    return scraperUtils.withRetry(async () => {
      const page = await this.browser.newPage();

      try {
        // Set a realistic user agent
        await scraperUtils.setRandomUserAgent(page);

        // Set default timeout
        await page.setDefaultTimeout(30000);

        // Configure request interception to block unnecessary resources
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          const resourceType = req.resourceType();
          if (resourceType === 'image' || resourceType === 'font' || resourceType === 'media') {
            req.abort();
          } else {
            req.continue();
          }
        });

        // Try navigation with error handling
        try {
          // Navigate to search page with query
          const searchUrl = `${this.searchUrl}?q=${encodeURIComponent(query)}`;
          console.log(`Searching Danggeun Market for: ${query}`);
          console.log(`Navigating to: ${searchUrl}`);
          await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        } catch (navError) {
          console.error(`Danggeun navigation error: ${navError.message}`);

          // Try alternative approach
          const searchUrl = `${this.searchUrl}?q=${encodeURIComponent(query)}`;
          await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        }

        // Wait a bit for the page to stabilize
        await page.waitForTimeout(2000);

        // Try to scroll gently to avoid detection
        try {
          await page.evaluate(async () => {
            await new Promise((resolve) => {
              let scrolled = 0;
              const interval = setInterval(() => {
                window.scrollBy(0, 200);
                scrolled += 1;
                if (scrolled >= 5) {
                  clearInterval(interval);
                  resolve();
                }
              }, 200);
            });
          });
        } catch (scrollError) {
          console.error(`Danggeun scroll error: ${scrollError.message}`);
        }

        // Take a screenshot for debugging
        try {
          await page.screenshot({ path: 'danggeun-debug.png' });
        } catch (e) {
          console.error('Failed to take screenshot:', e.message);
        }

        // Extract product data using the new method - getting data from window.__remixContext
        const products = await this.extractProductsFromRemixData(page, query, limit);

        console.log(`Found ${products.length} products on Danggeun Market`);
        return products;
      } catch (error) {
        console.error(`Error scraping Danggeun Market: ${error.message}`);

        // Save page HTML for debugging
        try {
          const html = await page.content();
          fs.writeFileSync('danggeun-html.txt', html);
        } catch (e) {
          console.error('Failed to save HTML:', e.message);
        }

        return []; // Return empty array for graceful failure
      } finally {
        await page.close();
      }
    }, 3); // 3 retries
  }

  /**
   * Extract products from the window.__remixContext data
   * @param {import('puppeteer').Page} page - Puppeteer page
   * @param {string} query - Original search query for relevance filtering
   * @param {number} limit - Maximum number of products to return
   * @returns {Promise<Array<Object>>} List of product objects
   */
  async extractProductsFromRemixData(page, query, limit = 20) {
    try {
      // Extract the product data from window.__remixContext
      const productsData = await page.evaluate(() => {
        try {
          // Look for the product data in the window objects
          const data = document.documentElement.innerHTML;

          // Find all JSON-like product listings
          const regex = /"id":"\/kr\/buy-sell\/[^"]+","href":"[^"]+","price":"[^"]+","title":"[^"]+","thumbnail":"[^"]+"/g;
          const matches = data.match(regex) || [];

          // Parse the matches into proper JSON objects
          return matches.map(match => {
            try {
              // Add curly braces to make it valid JSON
              const jsonStr = `{${match}}`;
              // Parse JSON and return
              return JSON.parse(jsonStr);
            } catch (e) {
              console.error("Error parsing item:", e);
              return null;
            }
          }).filter(Boolean); // Remove any null entries
        } catch (error) {
          console.error("Error extracting data:", error);
          return [];
        }
      });

      // Format the extracted data into our standard product format
      const products = productsData.slice(0, limit).map((item, index) => {
        // Extract the product ID from the URL
        const productId = item.id?.split('/').pop()?.replace(/\/$/, '') || `danggeun-${Date.now()}-${index}`;

        // Clean up the price - remove the decimal part and convert to number
        let price = 0;
        if (item.price) {
          price = parseInt(parseFloat(item.price).toString().replace(/\.\d+$/, ''), 10);
        }

        // Process and fix image URL
        let imageUrl = item.thumbnail || '';

        // Fix image URL if needed
        if (imageUrl) {
          // Add https: prefix if URL starts with //
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
          }

          // Fix malformed URLs or escape codes
          imageUrl = imageUrl.replace(/\\u0026/g, '&');
        }

        // Format the result to match our standard product format
        return {
          id: productId,
          title: item.title || 'Danggeun Product',
          price: price || 0,
          priceText: price ? `${price.toLocaleString()}원` : '가격 문의',
          url: item.href ? this.baseUrl + item.href : `${this.baseUrl}${item.id || ''}`,
          imageUrl: imageUrl || 'https://www.daangn.com/logo.png', // Fallback image
          marketplace: 'danggeun'
        };
      });

      return products;
    } catch (error) {
      console.error(`Error extracting products from Remix data: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract images using multiple strategies for robustness
   * @param {import('puppeteer').Page} page - Puppeteer page
   * @returns {Promise<string>} URL of the first product image found
   */
  async extractProductImages(page) {
    try {
      // Try multiple strategies to extract images

      // Strategy 1: Use our utility function
      const html = await page.content();
      const $ = load(html);
      const productElement = $('.product-container, .item-container, main');

      if (productElement.length) {
        const imageUrl = scraperUtils.extractImageUrl(productElement, $);
        if (imageUrl) return this.normalizeImageUrl(imageUrl);
      }

      // Strategy 2: Extract from meta tags
      const metaImage = await page.evaluate(() => {
        const metaTag = document.querySelector('meta[property="og:image"], meta[name="og:image"], meta[property="twitter:image"]');
        return metaTag ? metaTag.getAttribute('content') : null;
      });

      if (metaImage) return this.normalizeImageUrl(metaImage);

      // Strategy 3: Look for image elements with specific classes or patterns
      const mainImage = await page.evaluate(() => {
        // Look for images in various containers
        const imgSelectors = [
          'img[src*="karroter"]',
          '.product-image img',
          '.item-image img',
          '.main-image img',
          '.carousel img',
          '.product-photos img',
          'picture source',
          'img[src*="prod"]',
          'img[alt*="product"]',
          'img.product'
        ];

        for (const selector of imgSelectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          if (elements.length > 0) {
            const img = elements[0];
            // Try various attributes
            return img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
          }
        }

        return null;
      });

      if (mainImage) return this.normalizeImageUrl(mainImage);

      // Strategy 4: Extract from remix data
      const remixImage = await page.evaluate(() => {
        try {
          const htmlContent = document.documentElement.innerHTML;
          const imagePatterns = [
            /"thumbnail":"([^"]+)"/,
            /"image":"([^"]+)"/,
            /"imageUrl":"([^"]+)"/,
            /"productImage":"([^"]+)"/
          ];

          for (const pattern of imagePatterns) {
            const match = htmlContent.match(pattern);
            if (match) {
              return match[1].replace(/\\u0026/g, '&');
            }
          }

          return null;
        } catch (e) {
          return null;
        }
      });

      return this.normalizeImageUrl(remixImage || '');
    } catch (error) {
      console.error(`Error extracting product images: ${error.message}`);
      return '';
    }
  }

  /**
   * Normalize image URL to ensure it has proper protocol and format
   * @param {string} url - The image URL to normalize
   * @returns {string} - Normalized image URL
   */
  normalizeImageUrl(url) {
    if (!url) return '';

    // Add https: if the URL starts with //
    if (url.startsWith('//')) {
      return 'https:' + url;
    }

    // Add base URL if the URL is relative
    if (url.startsWith('/')) {
      return this.baseUrl + url;
    }

    // Fix escaped characters
    return url.replace(/\\u0026/g, '&').replace(/\\/g, '');
  }
}
