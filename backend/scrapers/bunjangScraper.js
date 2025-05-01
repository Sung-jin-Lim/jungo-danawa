import puppeteer from 'puppeteer';
import { load } from 'cheerio';
import * as scraperUtils from '../utils/scraperUtils.js';

/**
 * @param {import('puppeteer').Browser} browser shared Puppeteer instance
 */
export default class BunjangScraper {
  constructor(browser, proxyList = []) {
    this.browser = browser;
    this.baseUrl = "https://m.bunjang.co.kr";
    this.searchUrl = "https://m.bunjang.co.kr/search/products";
    this.proxyList = proxyList;
    this.source = "bunjang";
  }

  /**
   * Get a random proxy from the list
   * @returns {string|null} A random proxy or null if list is empty
   */
  getRandomProxy() {
    return scraperUtils.getRandomProxy(this.proxyList);
  }

  /**
   * Search for products on Bunjang
   * @param {string} query The search query
   * @param {number} limit Maximum number of results to return
   * @returns {Promise<Array<Object>>} List of product objects
   */
  async searchProducts(query, limit = 20) {
    return scraperUtils.withRetry(async () => {
      const page = await this.browser.newPage();

      try {
        // Set a random user agent
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

        // Use mobile version for more consistent results
        await page.setViewport({
          width: 375,
          height: 812,
          isMobile: true,
          hasTouch: true
        });

        // Try navigation with error handling
        try {
          // Navigate to search page with query
          const url = `${this.searchUrl}?q=${encodeURIComponent(query)}`;
          console.log(`Searching Bunjang Market for: ${query}`);
          console.log(`Navigating to: ${url}`);

          await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
        } catch (navError) {
          console.error(`Bunjang navigation error: ${navError.message}`);

          // Try a simpler approach
          const url = `${this.searchUrl}?q=${encodeURIComponent(query)}`;
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        }

        // Wait for products to load with multiple possible selectors
        let productsFound = false;
        const productSelectors = ['.sc-iwyYcG', '.product-item', '.item-container', '[class*="product"]'];

        for (const selector of productSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 });
            productsFound = true;
            console.log(`Bunjang products found with selector: ${selector}`);
            break;
          } catch (e) {
            console.log(`Bunjang selector ${selector} not found, trying next...`);
          }
        }

        if (!productsFound) {
          console.log('No Bunjang product selectors found, proceeding with basic scraping');
        }

        // Try to scroll gently to load more content
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
          console.error(`Bunjang scroll error: ${scrollError.message}`);
        }

        // Get page content
        const html = await page.content();
        const $ = load(html);
        const products = [];

        console.log('Parsing Bunjang product listings...');

        // Try multiple selectors for products
        const selectors = [
          '.sc-iwyYcG',
          '.product-item',
          '[class*="ProductItem"]',
          '[class*="product-item"]',
          'a[href*="/products/"]'
        ];

        for (const selector of selectors) {
          const elements = $(selector);
          if (elements.length > 0) {
            console.log(`Found ${elements.length} products with selector: ${selector}`);

            elements.each((i, el) => {
              if (i >= limit) return false;

              // Try multiple title selectors
              let title = '';
              const titleSelectors = [
                '.sc-ksluID',
                '.product-name',
                '[class*="title"]',
                '[class*="name"]'
              ];

              for (const ts of titleSelectors) {
                const element = $(el).find(ts);
                if (element.length && element.text().trim()) {
                  title = element.text().trim();
                  break;
                }
              }

              // If title still not found, try direct text
              if (!title && $(el).text().trim()) {
                const text = $(el).text().trim();
                // Extract a reasonable length string that might be a title
                const match = text.match(/[가-힣a-zA-Z0-9\s]{5,50}/);
                if (match) title = match[0].trim();
              }

              // Get price with multiple selectors
              let price = 0;
              let priceText = '';
              const priceSelectors = [
                '.sc-bXdNzS',
                '.product-price',
                '[class*="price"]',
                'span:contains("원")'
              ];

              for (const ps of priceSelectors) {
                const element = $(el).find(ps);
                if (element.length && element.text().trim()) {
                  priceText = element.text().trim();
                  price = scraperUtils.formatPrice(priceText);
                  if (price > 0) break;
                }
              }

              // Find product URL with more robust approach
              let productUrl = null;
              let productId = null;

              // Check if element itself is a link
              if ($(el).is('a') && $(el).attr('href')) {
                productUrl = $(el).attr('href');
              } else {
                // Try to find a link inside
                const linkElement = $(el).find('a');
                if (linkElement.length) {
                  productUrl = linkElement.attr('href');
                }
              }

              // Ensure proper URL format
              if (productUrl) {
                if (productUrl.startsWith('/')) {
                  productUrl = this.baseUrl + productUrl;
                } else if (!productUrl.startsWith('http')) {
                  productUrl = this.baseUrl + '/' + productUrl;
                }

                // Extract ID from URL
                productId = productUrl.split('/').pop();
              }

              // Get image using our utility function
              let imageUrl = scraperUtils.extractImageUrl(el, $);

              // If not found, try more direct image extraction
              if (!imageUrl) {
                const imgElements = $(el).find('img');
                imgElements.each((_, img) => {
                  for (const attr of ['src', 'data-src', 'data-original', 'data-lazy-src']) {
                    const url = $(img).attr(attr);
                    if (url && url.trim() !== '' && !url.includes('data:image')) {
                      imageUrl = url;
                      return false; // Break the loop
                    }
                  }
                });
              }

              // Check for background images in style attributes if still no image
              if (!imageUrl) {
                const elementsWithStyle = $(el).find('[style*="background"]');
                elementsWithStyle.each((_, styled) => {
                  const style = $(styled).attr('style');
                  if (style) {
                    const match = style.match(/background(?:-image)?:\s*url\(['"]?(.*?)['"]?\)/i);
                    if (match && match[1]) {
                      imageUrl = match[1];
                      return false; // Break the loop
                    }
                  }
                });
              }

              // Add product if we have at least title and price
              if ((title || productUrl) && price > 0) {
                products.push({
                  id: productId || `bunjang-${Date.now()}-${i}`,
                  title: title || 'Bunjang Product', // Fallback title
                  price,
                  priceText: priceText || `${price.toLocaleString()}원`,
                  url: productUrl || `${this.baseUrl}/search/products?q=${encodeURIComponent(query)}`,
                  imageUrl: imageUrl || 'https://m.bunjang.co.kr/pc-static/resource/ee442d3dd827628bc5fe.png', // Fallback image
                  marketplace: 'bunjang'
                });
              }
            });

            // If we found products, no need to try other selectors
            if (products.length > 0) break;
          }
        }

        console.log(`Found ${products.length} products on Bunjang Market`);
        return products;
      } catch (error) {
        console.error(`Bunjang scraper error: ${error.message}`);
        return []; // Return empty array for graceful failure
      } finally {
        await page.close();
      }
    }, 3); // 3 retries
  }
}
