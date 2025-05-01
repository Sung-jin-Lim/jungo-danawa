import puppeteer from 'puppeteer';
import { load } from 'cheerio';

// helper to scroll the page for lazy-loading
// async function autoScroll(page) {
//   await page.evaluate(async () => {
//     await new Promise((resolve) => {
//       let total = 0;
//       const distance = 100;
//       const timer = setInterval(() => {
//         window.scrollBy(0, distance);
//         total += distance;
//         if (total >= document.body.scrollHeight) {
//           clearInterval(timer);
//           resolve();
//         }
//       }, 100);
//     });
//   });
// }

export default class BunjangScraper {
  /**
* @param {import('puppeteer').Browser} browser  shared Puppeteer instance
*/
  constructor(browser) {
    this.browser = browser;
    this.baseUrl = 'https://www.bunjang.co.kr';
    this.searchUrl = `${this.baseUrl}/search/products?q=`;
  }


  async searchProducts(query, limit = 20) {


    try {
      const page = await this.browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/112.0.0.0 Safari/537.36'
      );

      const url = `${this.searchUrl}${encodeURIComponent(query)}`;
      console.log('Bunjang URL:', url);
      // await page.goto(url, { waitUntil: 'networkidle2', timeout: 20_000 });
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // wait for at least one product card
      await page.waitForSelector('a[data-pid]', { timeout: 20_000 });

      // trigger lazy-loading
      // await autoScroll(page);
      // pause to allow images to load
      await new Promise(resolve => setTimeout(resolve, 1_000));
      // grab HTML and parse with cheerio
      const html = await page.content();
      const $ = load(html);
      const products = [];

      // each anchor with data-pid is a product card
      $('a[data-pid]').each((i, el) => {
        if (i >= limit) return false; // break out once we hit the limit
        const card = $(el);

        const pid = card.attr('data-pid');
        const title = card.find('div.sc-RcBXQ').text().trim();
        const priceText = card.find('div.sc-iSDuPN').text().trim();
        const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || null;

        let imageUrl = card.find('img').attr('data-original')
          || card.find('img').attr('src')
          || '';
        if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;

        const href = card.attr('href') || '';
        const productUrl =
          href.startsWith('http') ? href : this.baseUrl + href;

        if (pid && title && productUrl) {
          products.push({
            source: 'bunjang',
            pid,
            title,
            price,
            priceText,
            imageUrl,
            productUrl,
            timestamp: new Date().toISOString(),
          });
        }
      });
      await page.close();
      return products;
    } catch (err) {
      console.error('Bunjang scrape error:', err);
      return [];
    } finally {
    }
  }
}
