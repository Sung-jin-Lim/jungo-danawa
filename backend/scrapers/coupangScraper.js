// File: backend/scrapers/coupangScraper.js
import puppeteer from 'puppeteer';
import { load } from 'cheerio';

export default class CoupangScraper {
  /**
  * @param {import('puppeteer').Browser} browser  shared Puppeteer instance
  */
  constructor(browser) {
    this.browser = browser;
    this.baseUrl = 'https://www.coupang.com';
    this.searchUrl = 'https://www.coupang.com/np/search?component=&q=';
  }


  async searchProducts(query, limit = 20) {



    try {
      const page = await this.browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');

      const url = `${this.searchUrl}${encodeURIComponent(query)}`;
      await page.setExtraHTTPHeaders({
        Connection: 'close'
      });
      // await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 }); //stalls here
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      await page.waitForSelector('.search-product', { timeout: 15000 });

      // Scroll to bottom to trigger lazy-loading
      // await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
      // Pause briefly to allow images to load
      // await new Promise((resolve) => setTimeout(resolve, 1000));

      const html = await page.content();
      const $ = load(html);
      const products = [];

      $('.search-product').each((i, el) => {
        if (i >= limit) return false;
        const card = $(el);
        const title = card.find('.name').text().trim();
        const priceText = card.find('.price-value').text().trim();
        const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || null;

        // Prefer data-src for actual image URL
        const imgEl = card.find('img.search-product-wrap-img');
        let imageUrl =
          imgEl.attr('src') ||
          imgEl.attr('data-img-src') ||
          imgEl.attr('img-src') || '';
        if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;

        const relUrl = card.find('a.search-product-link').attr('href') || '';
        const productUrl = this.baseUrl + relUrl;

        if (title && productUrl) {
          products.push({
            source: 'coupang',
            title,
            price,
            priceText,
            imageUrl,
            productUrl,
            timestamp: new Date().toISOString(),
          });
        }
      });

      return products;
    } catch (err) {
      console.error('Coupang scrape error:', err);
      return [];
    } finally {
    }
  }
}
