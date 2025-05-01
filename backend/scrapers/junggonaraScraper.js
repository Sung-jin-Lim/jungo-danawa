// File: backend/scrapers/junggonaraScraper.js
import { load } from "cheerio";
import * as scraperUtils from '../utils/scraperUtils.js';

/**
 * @param {import('puppeteer').Browser} browser shared Puppeteer instance
 */
export default class JunggonaraScraper {
  constructor(browser, proxyList = []) {
    this.browser = browser;
    this.baseUrl = "https://cafe.naver.com/joonggonara";
    this.searchUrl = "https://cafe.naver.com/ArticleSearchList.nhn?search.clubid=10050146";
    this.proxyList = proxyList;
    this.source = "junggonara";
  }

  /**
   * Get a random proxy from the list
   * @returns {string|null} A random proxy or null if list is empty
   */
  getRandomProxy() {
    return scraperUtils.getRandomProxy(this.proxyList);
  }

  /**
   * Search for products on Junggonara
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

        // Try navigation with error handling
        try {
          // Navigate to search page with query
          const searchParams = new URLSearchParams({
            'search.clubid': '10050146',
            'search.searchBy': '0',
            'search.query': query
          });

          const url = `https://cafe.naver.com/ArticleSearchList.nhn?${searchParams.toString()}`;
          console.log(`Searching Junggonara for: ${query}`);
          console.log(`Navigating to: ${url}`);

          await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
        } catch (navError) {
          console.error(`Junggonara navigation error: ${navError.message}`);

          // Try alternative URL format
          const altUrl = `${this.baseUrl}?iframe_url=/ArticleSearchList.nhn?search.clubid=10050146%26search.searchBy=0%26search.query=${encodeURIComponent(query)}`;
          await page.goto(altUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        }

        // Wait a bit for JavaScript to execute
        await page.waitForTimeout(2000);

        // Junggonara loads content in an iframe, try to handle it
        let frame = null;
        try {
          await page.waitForSelector('iframe#cafe_main', { timeout: 8000 });
          const frameHandle = await page.$('iframe#cafe_main');
          frame = await frameHandle.contentFrame();
        } catch (frameError) {
          console.error(`Junggonara iframe error: ${frameError.message}`);
          // Continue with main page as fallback
          frame = page;
        }

        // Try to find products with multiple selectors in the frame
        let productsFound = false;
        const productSelectors = [
          '.article-board .article-board-list tr:not(.board-notice)',
          '.list-article',
          'table tr.board-list',
          'a[href*="articleid"]'
        ];

        for (const selector of productSelectors) {
          try {
            await frame.waitForSelector(selector, { timeout: 5000 });
            productsFound = true;
            console.log(`Junggonara products found with selector: ${selector}`);
            break;
          } catch (e) {
            console.log(`Junggonara selector ${selector} not found, trying next...`);
          }
        }

        if (!productsFound) {
          console.log('No Junggonara product selectors found, proceeding with basic scraping');
        }

        // Try to scroll in the frame to load more content
        try {
          await frame.evaluate(async () => {
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
          console.error(`Junggonara scroll error: ${scrollError.message}`);
        }

        // Get page content from the iframe or page
        const html = await frame.content();
        const $ = load(html);
        const products = [];

        console.log('Parsing Junggonara product listings...');

        // Try multiple selectors for finding product rows
        const selectors = [
          '.article-board .article-board-list tr:not(.board-notice)',
          '.list-article',
          'table tr.board-list',
          'a[href*="articleid"]'
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
                '.article',
                '.article_title',
                'a.article',
                '[class*="title"]',
                'a[href*="articleid"]'
              ];

              for (const ts of titleSelectors) {
                const element = $(el).find(ts);
                if (element.length && element.text().trim()) {
                  title = element.text().trim();
                  break;
                }
              }

              // If no title found yet, try direct text content
              if (!title && $(el).text().trim()) {
                const text = $(el).text().trim();
                // Look for title-like content with appropriate length
                const match = text.match(/[가-힣a-zA-Z0-9\s]{5,50}/);
                if (match) title = match[0].trim();
              }

              // Extract price from title or direct price element
              let price = 0;
              let priceText = '';

              // Look for price patterns in the title (e.g. "30,000원" or "30만원")
              const koreanPricePattern = /(\d{1,3}(,\d{3})*(\.\d+)?)(원|만원)/;
              const priceMatch = title.match(koreanPricePattern);

              if (priceMatch) {
                priceText = priceMatch[0];
                price = scraperUtils.formatPrice(priceText);

                // Handle special case for "만원" (10,000 won)
                if (priceText.includes('만원')) {
                  price *= 10000;
                }
              } else {
                // Try price-specific elements
                const priceSelectors = [
                  '.price',
                  '[class*="price"]',
                  'span:contains("원")'
                ];

                for (const ps of priceSelectors) {
                  const element = $(el).find(ps);
                  if (element.length && element.text().trim()) {
                    const text = element.text().trim();
                    const match = text.match(koreanPricePattern);
                    if (match) {
                      priceText = match[0];
                      price = scraperUtils.formatPrice(priceText);
                      if (priceText.includes('만원')) {
                        price *= 10000;
                      }
                      break;
                    }
                  }
                }
              }

              // Find product URL
              let articleId = null;
              let productUrl = null;

              // Check link in title first
              const titleLink = $(el).find('.article').attr('href') ||
                $(el).find('a[href*="articleid"]').attr('href');

              if (titleLink) {
                const match = titleLink.match(/articleid=(\d+)/);
                if (match) {
                  articleId = match[1];
                  productUrl = `${this.baseUrl}/ArticleRead.nhn?articleid=${articleId}&clubid=10050146`;
                }
              }

              // Check if element itself is a link
              if (!articleId && $(el).is('a') && $(el).attr('href')?.includes('articleid')) {
                const match = $(el).attr('href').match(/articleid=(\d+)/);
                if (match) {
                  articleId = match[1];
                  productUrl = `${this.baseUrl}/ArticleRead.nhn?articleid=${articleId}&clubid=10050146`;
                }
              }

              // Extract image URL with our utility function
              let imageUrl = scraperUtils.extractImageUrl(el, $);

              // If not found, try different methods
              if (!imageUrl) {
                // Check for thumbnails
                const thumbnailSelectors = [
                  '.thumb img',
                  '.thumbnail img',
                  'img.thumb',
                  'img.thumbnail',
                  'img[src*="thumb"]'
                ];

                for (const ts of thumbnailSelectors) {
                  const element = $(el).find(ts);
                  if (element.length) {
                    imageUrl = element.attr('src');
                    if (imageUrl) break;
                  }
                }

                // As a last resort, check any img tag
                if (!imageUrl) {
                  const imgElement = $(el).find('img');
                  if (imgElement.length) {
                    imageUrl = imgElement.attr('src');
                  }
                }
              }

              // Use default Naver image if none found
              if (!imageUrl) {
                imageUrl = 'https://ssl.pstatic.net/static/cafe/cafe_pc/default/cafe_profile_77.png';
              }

              // Create product if we have minimum required data
              if ((title || articleId) && (price > 0 || title.includes('판매'))) {
                products.push({
                  id: articleId || `junggonara-${Date.now()}-${i}`,
                  title: title || 'Junggonara Product', // Fallback title
                  price: price || 0,
                  priceText: priceText || '가격 문의',
                  url: productUrl || `${this.baseUrl}?q=${encodeURIComponent(query)}`,
                  imageUrl: imageUrl,
                  marketplace: 'junggonara'
                });
              }
            });

            // If we found products, no need to try other selectors
            if (products.length > 0) break;
          }
        }

        console.log(`Found ${products.length} products on Junggonara`);
        return products;
      } catch (error) {
        console.error(`Junggonara scraper error: ${error.message}`);
        return []; // Return empty array for graceful failure
      } finally {
        await page.close();
      }
    }, 3); // 3 retries
  }
}
