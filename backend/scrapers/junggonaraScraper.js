// File: backend/scrapers/junggonaraScraper.js
import puppeteer from "puppeteer";
import { load } from "cheerio";

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let total = 0, dist = 100;
      const timer = setInterval(() => {
        window.scrollBy(0, dist);
        total += dist;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

export default class JunggonaraScraper {
  /**
   * @param {import('puppeteer').Browser} browser  shared Puppeteer instance
   */
  constructor(browser) {
    this.browser = browser;
    this.baseUrl = 'https://web.joongna.com';
    this.searchPath = '/search/';
  }

  async searchProducts(query, limit = 20) {
    const page = await this.browser.newPage();


    try {
      // open a fresh page from the shared browser
      const url = `${this.baseUrl}${this.searchPath}${encodeURIComponent(query)}`;
      console.log("Junggonara URL:", url);

      await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 });
      // await page.goto(url, { waitUntil: 'domcontentloaded' });

      await page.waitForSelector("ul.search-results", { timeout: 15000 });

      // trigger lazy‐load
      await autoScroll(page);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const html = await page.content();
      const $ = load(html);
      const products = [];

      $("ul.search-results > li").each((i, el) => {
        if (i >= limit) return false;

        const card = $(el).find("a").first();
        const title = card.find("h2").text().trim();
        const priceTxt = card.find(".text-heading").text().trim();
        const price = parseInt(priceTxt.replace(/[^0-9]/g, ""), 10) || null;

        // the region and the posted-ago time are the 1st and 3rd span under .my-1
        const infoSpans = card.find(".my-1 span");
        const region = infoSpans.eq(0).text().trim();
        const timeAgo = infoSpans.eq(2).text().trim();

        let imgSrc = card.find("img").attr("src") || "";
        if (imgSrc.startsWith("//")) imgSrc = "https:" + imgSrc;

        const href = card.attr("href");
        const productUrl = this.baseUrl + href;

        if (title && productUrl) {
          products.push({
            source: "junggonara",
            title,
            price,
            priceText: priceTxt,
            location: region,
            timeAgo,
            imageUrl: imgSrc,
            productUrl,
            timestamp: new Date().toISOString(),
          });
        }
      });
      await page.close();
      return products;
    } catch (err) {
      console.error("junggonara scrape error:", err);
      return [];
    } finally {

    }
  }
}
