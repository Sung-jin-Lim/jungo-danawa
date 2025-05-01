import puppeteer from 'puppeteer';
import JunggonaraScraper from './junggonaraScraper.js';
import DanggeunScraper from './danggeunScraper.js';
import CoupangScraper from './coupangScraper.js';
import BunjangScraper from './bunjangScraper.js';

async function runTest() {
  console.log('Starting multi-scraper cache test');
  console.log('--------------------------------');

  let browser;
  try {
    // Launch a shared browser instance
    browser = await puppeteer.launch({
      headless: 'new', // Use headless for faster tests
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      defaultViewport: { width: 1280, height: 800 },
    });

    // Initialize all scrapers with caching enabled
    const scrapers = {
      junggonara: new JunggonaraScraper(browser, {
        useCache: true,
        cacheDir: './cache/junggonara',
        cacheTTL: 30 * 60 * 1000, // 30 minutes
      }),
      danggeun: new DanggeunScraper(browser, {
        useCache: true,
        cacheDir: './cache/danggeun',
        cacheTTL: 30 * 60 * 1000,
      }),
      coupang: new CoupangScraper(browser, {
        useCache: true,
        cacheDir: './cache/coupang',
        cacheTTL: 30 * 60 * 1000,
      }),
      bunjang: new BunjangScraper(browser, {
        useCache: true,
        cacheDir: './cache/bunjang',
        cacheTTL: 30 * 60 * 1000,
      }),
    };

    // We'll test with these search terms
    const searchTerms = [
      'keyboard',
      'monitor',
      'headphone',
    ];

    // Testing each scraper with each search term
    for (const term of searchTerms) {
      console.log(`\n===== Testing search term: ${term} =====`);

      for (const [name, scraper] of Object.entries(scrapers)) {
        console.log(`\n>> Testing ${name} scraper <<`);

        // First search - should hit the network
        console.time(`${name} - first search (network)`);
        const results = await scraper.searchProducts(term, 5);
        console.timeEnd(`${name} - first search (network)`);
        console.log(`Found ${results.length} results from ${name}`);

        // Second search - should use cache
        console.time(`${name} - second search (cached)`);
        const cachedResults = await scraper.searchProducts(term, 5);
        console.timeEnd(`${name} - second search (cached)`);
        console.log(`Found ${cachedResults.length} results from cache for ${name}`);

        // Print cache stats
        const stats = scraper.getCacheStats();
        console.log(`Cache stats for ${name}: ${stats.count} entries, size: ${stats.humanSize}`);
      }
    }

    // Test force refresh on one scraper
    console.log('\n===== Testing force refresh =====');
    const term = searchTerms[0];
    console.time('Force refresh search');
    const refreshedResults = await scrapers.junggonara.searchProducts(term, 5, true);
    console.timeEnd('Force refresh search');
    console.log(`Found ${refreshedResults.length} results with force refresh`);

    // Test cache clearing
    console.log('\n===== Testing cache clearing =====');
    for (const [name, scraper] of Object.entries(scrapers)) {
      const cleared = scraper.clearCache();
      console.log(`Cleared ${cleared} entries from ${name} cache`);
    }

  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\nBrowser closed');
    }
    console.log('Test completed');
  }
}

// Run the test
runTest().catch(console.error); 