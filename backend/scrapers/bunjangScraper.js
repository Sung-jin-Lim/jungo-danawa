const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

/**
 * Scraper for Bunjang Market (번개장터)
 * Extracts product information from search results
 */
class BunjangScraper {
  /**
   * Initialize the scraper
   */
  constructor() {
    this.baseUrl = 'https://m.bunjang.co.kr';
    this.searchUrl = 'https://m.bunjang.co.kr/search/products?q=';
  }

  /**
   * Search for products on Bunjang Market
   * @param {string} query - Search query
   * @param {number} limit - Maximum number of results to return
   * @returns {Promise<Array>} - Array of product objects
   */
  async searchProducts(query, limit = 20) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      // Set user agent to mobile to access mobile version
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1');

      // Navigate to search page
      const searchPageUrl = `${this.searchUrl}${encodeURIComponent(query)}`;
      await page.goto(searchPageUrl, { waitUntil: 'networkidle2' });

      // Wait for product listings to load
      await page.waitForSelector('.sc-iBkjds');

      // Scroll down to load more products
      await this.autoScroll(page, 3); // Scroll 3 times

      // Get page content and parse with cheerio
      const content = await page.content();
      const $ = cheerio.load(content);

      // Extract product information
      const products = [];
      $('.sc-iBkjds').each((index, element) => {
        if (index >= limit) return false;

        const productCard = $(element);
        const title = productCard.find('.sc-ehvNnt').text().trim();
        const priceText = productCard.find('.sc-iAvgwm').text().trim();
        const imageUrl = productCard.find('img').attr('src') || '';

        // Extract product URL
        const relativeUrl = productCard.find('a').attr('href') || '';
        const productUrl = this.baseUrl + relativeUrl;

        // Clean up price text and convert to number
        const priceValue = priceText.replace(/[^0-9]/g, '');

        if (title && productUrl) {
          products.push({
            source: 'bunjang',
            title,
            price: priceValue ? parseInt(priceValue) : null,
            priceText,
            imageUrl,
            productUrl,
            timestamp: new Date().toISOString()
          });
        }
      });

      return products;
    } catch (error) {
      console.error('Error scraping Bunjang Market:', error);
      return [];
    } finally {
      await browser.close();
    }
  }

  /**
   * Get detailed information for a specific product
   * @param {string} productUrl - URL of the product page
   * @returns {Promise<Object>} - Detailed product information
   */
  async getProductDetails(productUrl) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1');
      await page.goto(productUrl, { waitUntil: 'networkidle2' });

      // Wait for product details to load
      await page.waitForSelector('.sc-kgflAQ');

      // Get page content and parse with cheerio
      const content = await page.content();
      const $ = cheerio.load(content);

      // Extract detailed product information
      const title = $('.sc-kgflAQ').text().trim();
      const priceText = $('.sc-fLlhyt').text().trim();
      const description = $('.sc-iBdmCd').text().trim();
      const sellerName = $('.sc-cCsOjp').text().trim();

      // Extract images
      const images = [];
      $('.sc-jIZahH img').each((_, img) => {
        const src = $(img).attr('src');
        if (src) images.push(src);
      });

      // Clean up price text and convert to number
      const priceValue = priceText.replace(/[^0-9]/g, '');

      return {
        source: 'bunjang',
        title,
        price: priceValue ? parseInt(priceValue) : null,
        priceText,
        description,
        sellerName,
        images,
        productUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting product details from Bunjang Market:', error);
      return null;
    } finally {
      await browser.close();
    }
  }

  /**
   * Auto-scroll function to load more products
   * @param {Page} page - Puppeteer page object
   * @param {number} scrollCount - Number of times to scroll
   */
  async autoScroll(page, scrollCount = 5) {
    for (let i = 0; i < scrollCount; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await page.waitForTimeout(1000); // Wait for 1 second between scrolls
    }
  }
}

module.exports = BunjangScraper;