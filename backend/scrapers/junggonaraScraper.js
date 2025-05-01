// File: backend/scrapers/junggonaraScraper.js
import puppeteer from "puppeteer";
import { load } from "cheerio";
import fs from 'fs';
import path from 'path';

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
   * @param {Object} options Additional options
   * @param {boolean} options.debug Enable debug mode with screenshots
   * @param {string} options.debugDir Directory to save debug files
   */
  constructor(browser, options = {}) {
    this.browser = browser;
    this.baseUrl = 'https://web.joongna.com';
    this.searchPath = '/search/';
    this.debug = options.debug || false;
    this.debugDir = options.debugDir || path.join(process.cwd(), 'debug');

    // Create debug directory if it doesn't exist and debug is enabled
    if (this.debug && !fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }
  }

  /**
   * Save debug information during scraping
   * @param {Object} page Puppeteer page 
   * @param {string} step Name of the step
   */
  async saveDebugInfo(page, step) {
    if (!this.debug) return;

    const timestamp = Date.now();
    const prefix = `junggonara_${step}_${timestamp}`;

    // Save screenshot
    await page.screenshot({
      path: path.join(this.debugDir, `${prefix}.png`),
      fullPage: true
    });

    // Save HTML
    const html = await page.content();
    fs.writeFileSync(
      path.join(this.debugDir, `${prefix}.html`),
      html
    );

    console.log(`Debug info saved for step: ${step}`);
  }

  async searchProducts(query, limit = 20) {
    const page = await this.browser.newPage();

    // Set longer default timeout
    await page.setDefaultNavigationTimeout(30000);
    await page.setDefaultTimeout(30000);

    try {
      // open a fresh page from the shared browser
      const url = `${this.baseUrl}${this.searchPath}${encodeURIComponent(query)}`;
      console.log("Junggonara URL:", url);

      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');

      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      await this.saveDebugInfo(page, 'after_navigation');

      // Wait for search results with more generous timeout
      const resultsSelector = "ul.search-results";
      const fallbackSelector = ".search-container";

      try {
        await page.waitForSelector(resultsSelector, { timeout: 25000 });
      } catch (error) {
        console.log("Primary selector failed, trying fallback selector");
        await page.waitForSelector(fallbackSelector, { timeout: 10000 });
      }

      await this.saveDebugInfo(page, 'after_wait_selector');

      // trigger lazy-load
      await autoScroll(page);
      await this.saveDebugInfo(page, 'after_scroll');

      // Increased wait time after scrolling for lazy-loaded content
      await new Promise(resolve => setTimeout(resolve, 3000));

      const html = await page.content();
      const $ = load(html);
      const products = [];

      // Verify if we have results
      const resultCount = $("ul.search-results > li").length;
      console.log(`Found ${resultCount} results on Junggonara`);

      if (resultCount === 0 && this.debug) {
        // Save page source for debugging when no results found
        fs.writeFileSync(
          path.join(this.debugDir, `junggonara_no_results_${Date.now()}.html`),
          html
        );
      }

      $("ul.search-results > li").each((i, el) => {
        if (i >= limit) return false;

        try {
          const card = $(el).find("a").first();
          if (!card.length) return; // Skip if card not found

          const title = card.find("h2").text().trim();
          const priceTxt = card.find(".text-heading").text().trim();
          const price = parseInt(priceTxt.replace(/[^0-9]/g, ""), 10) || null;

          // the region and the posted-ago time are the 1st and 3rd span under .my-1
          const infoSpans = card.find(".my-1 span");
          const region = infoSpans.length > 0 ? infoSpans.eq(0).text().trim() : '';
          const timeAgo = infoSpans.length > 2 ? infoSpans.eq(2).text().trim() : '';

          // More robust image extraction
          let imgSrc = '';
          const imgEl = card.find("img");
          if (imgEl.length) {
            imgSrc = imgEl.attr("src") || imgEl.attr("data-src") || imgEl.attr("data-lazy-src") || '';
          }

          if (imgSrc.startsWith("//")) imgSrc = "https:" + imgSrc;
          if (!imgSrc && imgEl.length) {
            // Try to extract from style attribute if src is empty
            const style = imgEl.attr("style") || '';
            const match = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/i);
            if (match && match[1]) {
              imgSrc = match[1];
            }
          }

          const href = card.attr("href");
          if (!href) return; // Skip if no product link

          const productUrl = href.startsWith('http') ? href : (this.baseUrl + href);

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
        } catch (itemError) {
          console.error("Error processing Junggonara item:", itemError);
        }
      });

      if (this.debug) {
        // Log extracted products for debugging
        fs.writeFileSync(
          path.join(this.debugDir, `junggonara_products_${Date.now()}.json`),
          JSON.stringify(products, null, 2)
        );
      }

      return products;
    } catch (err) {
      console.error("Junggonara scrape error:", err);

      if (this.debug) {
        try {
          // Save error screenshot
          await this.saveDebugInfo(page, 'error');
          // Save error details
          fs.writeFileSync(
            path.join(this.debugDir, `junggonara_error_${Date.now()}.txt`),
            err.toString() + '\n' + (err.stack || '')
          );
        } catch (debugErr) {
          console.error("Failed to save debug info:", debugErr);
        }
      }

      return [];
    } finally {
      // Ensure page is always closed
      try {
        await page.close();
      } catch (closeErr) {
        console.error("Error closing Junggonara page:", closeErr);
      }
    }
  }
}
