// File: backend/scrapers/coupangScraper.js
import { load } from "cheerio";
import * as scraperUtils from '../utils/scraperUtils.js';

/**
 * @param {import('puppeteer').Browser} browser shared Puppeteer instance
 */
export default class CoupangScraper {
  constructor(browser, proxyList = []) {
    this.browser = browser;
    this.baseUrl = "https://www.coupang.com";
    this.searchUrl = "https://www.coupang.com/np/search";
    this.proxyList = proxyList;
    this.source = "coupang";
  }

  /**
   * Get a random proxy from the list
   * @returns {string|null} A random proxy or null if list is empty
   */
  getRandomProxy() {
    return scraperUtils.getRandomProxy(this.proxyList);
  }

  /**
   * Search for products on Coupang
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

        // Set extra headers to avoid scraping detection
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'none',
          'sec-fetch-user': '?1',
          'Cache-Control': 'max-age=0',
          'upgrade-insecure-requests': '1'
        });

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

        // Use a try-catch block for navigation issues
        try {
          // Navigate to search page with query
          const url = `${this.searchUrl}?q=${encodeURIComponent(query)}`;
          console.log(`Navigating to Coupang URL: ${url}`);
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
        } catch (navError) {
          console.error(`Navigation error: ${navError.message}`);

          // Try a simpler approach
          const url = `${this.searchUrl}?q=${encodeURIComponent(query)}`;
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        }

        // Wait a bit to let the page stabilize
        await page.waitForTimeout(2000);

        // Try to wait for products with multiple selectors
        let productsFound = false;
        for (const selector of ['#productList li', '.search-product', '.product-item']) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 });
            productsFound = true;
            break;
          } catch (e) {
            console.log(`Selector ${selector} not found, trying next...`);
          }
        }

        if (!productsFound) {
          console.log('No product selectors found, proceeding with basic scraping');
        }

        // Try a gentler scroll
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
          console.error(`Scroll error: ${scrollError.message}`);
        }

        // Get page content
        const html = await page.content();
        const $ = load(html);
        const products = [];

        // Try multiple selectors for product cards
        const selectors = ['#productList li', '.search-product-wrap', '.product-item'];

        for (const selector of selectors) {
          const elements = $(selector);
          if (elements.length > 0) {
            console.log(`Found ${elements.length} products with selector: ${selector}`);

            elements.each((i, el) => {
              if (i >= limit) return false;

              const card = $(el);

              // Try various title selectors
              let title = '';
              const titleSelectors = ['.name', '.product-name', '.product-title', 'a > span'];
              for (const ts of titleSelectors) {
                const element = card.find(ts);
                if (element.length && element.text().trim()) {
                  title = element.text().trim();
                  break;
                }
              }

              // Get price, with retries on different selectors
              let price = 0;
              let priceText = '';
              const priceSelectors = [
                '.price-value',
                '.price-info .price',
                '.original-price',
                '.sale-price',
                '.product-price',
                'span[class*="price"]'
              ];

              for (const ps of priceSelectors) {
                const element = card.find(ps);
                if (element.length && element.text().trim()) {
                  priceText = element.text().trim();
                  price = scraperUtils.formatPrice(priceText);
                  if (price > 0) break;
                }
              }

              // Get URL
              let productUrl = null;
              let productId = null;
              const linkSelectors = ['a.search-product-link', 'a.product-link', 'a[href*="products"]', 'a'];

              for (const ls of linkSelectors) {
                const element = card.find(ls);
                if (element.length && element.attr('href')) {
                  const href = element.attr('href');
                  // Ensure it's a full URL
                  productUrl = href.startsWith('/') ? this.baseUrl + href : href;

                  // Try to extract ID
                  const idMatch = productUrl.match(/(?:products|itemId=)\/([^?&]+)/);
                  if (idMatch) {
                    productId = idMatch[1];
                  } else {
                    productId = href.split('/').pop();
                  }

                  break;
                }
              }

              // Extract image URL with improved utility
              let imageUrl = scraperUtils.extractImageUrl(card, $);

              // If still empty, try additional image selectors
              if (!imageUrl) {
                const imgSelectors = [
                  'img.search-product-wrap-img',
                  'img.product-image',
                  'img[alt*="product"]',
                  'img[src*="image"]',
                  'img'
                ];

                for (const is of imgSelectors) {
                  const element = card.find(is);
                  if (element.length) {
                    for (const attr of ['src', 'data-src', 'data-img-src']) {
                      const url = element.attr(attr);
                      if (url && url.trim() !== '') {
                        imageUrl = url;
                        break;
                      }
                    }
                    if (imageUrl) break;
                  }
                }
              }

              // Normalize image URL
              if (imageUrl && imageUrl.startsWith('//')) {
                imageUrl = 'https:' + imageUrl;
              }

              // Only add valid products that have at least title and price
              if (title && price > 0) {
                products.push({
                  id: productId || `coupang-${Date.now()}-${i}`,
                  title,
                  price,
                  priceText: priceText || `${price.toLocaleString()}원`,
                  url: productUrl || `${this.baseUrl}/np/search?q=${encodeURIComponent(query)}`,
                  imageUrl: imageUrl || 'https://image.coupangcdn.com/image/coupang/common/coupang_logo.png', // Fallback image
                  marketplace: 'coupang'
                });
              }
            });

            // If we found products with this selector, no need to try others
            if (products.length > 0) break;
          }
        }

        console.log(`Found ${products.length} products on Coupang`);
        return products;
      } catch (error) {
        console.error(`Coupang scraper error: ${error.message}`);
        return []; // Return empty array for graceful failure
      } finally {
        await page.close();
      }
    }, 3); // 3 retries
  }
}
