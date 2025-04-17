// File: backend/scrapers/danggeunScraper.js
import puppeteer from 'puppeteer';
import { load } from 'cheerio';

export default class DanggeunScraper {
  constructor() {
    this.baseUrl = 'https://www.daangn.com';
    this.searchPath = '/kr/buy-sell/';
    this.region = process.env.DANGGEUN_REGION || '마장동-56';
  }

  async searchProducts(query, limit = 20) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      const url =
        `${this.baseUrl}${this.searchPath}` +
        `?in=${encodeURIComponent(this.region)}` +
        `&search=${encodeURIComponent(query)}`;

      console.log('Danggeun URL:', url);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      await page.waitForSelector('a[data-gtm="search_article"]', { timeout: 20000 });

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

        let img = card.find('img').attr('src') ||
          card.find('.lm809sg').attr('src') ||
          '';
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

      return products;
    } catch (err) {
      console.error('Danggeun scrape error:', err);
      return [];
    } finally {
      await browser.close();
    }
  }
}