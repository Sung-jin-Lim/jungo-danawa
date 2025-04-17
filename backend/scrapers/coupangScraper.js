// File: backend/scrapers/coupangScraper.js
import puppeteer from 'puppeteer';
import { load } from 'cheerio';

export default class CoupangScraper {
  constructor() {
    this.baseUrl = 'https://www.coupang.com';
    this.searchUrl = 'https://www.coupang.com/np/search?component=&q=';
  }

  async searchProducts(query, limit = 20) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)…'
      );

      const url = `${this.searchUrl}${encodeURIComponent(query)}`;
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForSelector('.search-product');

      const html = await page.content();
      const $ = load(html);           // ← use load()

      const products = [];
      $('.search-product').each((i, el) => {
        if (i >= limit) return false;
        const card = $(el);
        const title = card.find('.name').text().trim();
        const priceText = card.find('.price-value').text().trim();
        const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || null;
        let imageUrl = card.find('img.search-product-wrap-img').attr('src') || '';
        if (imageUrl && !imageUrl.startsWith('http')) imageUrl = 'https:' + imageUrl;
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
            timestamp: new Date().toISOString()
          });
        }
      });

      return products;
    } catch (err) {
      console.error('Coupang scrape error:', err);
      return [];
    } finally {
      await browser.close();
    }
  }
}
