// File: backend/scrapers/test-junggonara.js
import puppeteer from 'puppeteer';
import JunggonaraScraper from './junggonaraScraper.js';

async function testJunggonaraScraper() {
  console.log('Starting Junggonara scraper test...');

  let browser;
  try {
    // Launch a new browser instance with more debugging options
    browser = await puppeteer.launch({
      headless: false, // Set to false to see the browser in action
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
      defaultViewport: { width: 1920, height: 1080 },
      slowMo: 100, // Slow down Puppeteer operations by 100ms
    });

    // Initialize the scraper with debug mode enabled
    const scraper = new JunggonaraScraper(browser, {
      debug: true,
      debugDir: './debug/junggonara',
      useCache: true,
      cacheDir: './cache/junggonara',
      cacheTTL: 30 * 60 * 1000, // 30 minutes cache
    });

    // Test with a common search term
    const query = 'galaxy';
    console.log(`Searching for "${query}"...`);

    // First search - should scrape the website
    console.time('First search (no cache)');
    const results = await scraper.searchProducts(query, 10);
    console.timeEnd('First search (no cache)');

    console.log(`Found ${results.length} products in first search`);

    // Print the first 3 results
    if (results.length > 0) {
      console.log('First 3 results:');
      results.slice(0, 3).forEach((product, index) => {
        console.log(`\nProduct ${index + 1}:`);
        console.log(`Title: ${product.title}`);
        console.log(`Price: ${product.priceText}`);
        console.log(`Location: ${product.location}`);
        console.log(`Time: ${product.timeAgo}`);
        console.log(`Image URL: ${product.imageUrl}`);
        console.log(`Product URL: ${product.productUrl}`);
      });
    } else {
      console.log('No products found. Check debug files for details.');
    }

    // Second search - should use the cache
    console.log('\n--- Second search (should use cache) ---');
    console.time('Second search (with cache)');
    const cachedResults = await scraper.searchProducts(query, 10);
    console.timeEnd('Second search (with cache)');

    console.log(`Found ${cachedResults.length} products in cached search`);

    // Test with force refresh
    console.log('\n--- Third search (force refresh, bypass cache) ---');
    console.time('Third search (force refresh)');
    const refreshedResults = await scraper.searchProducts(query, 10, true);
    console.timeEnd('Third search (force refresh)');

    console.log(`Found ${refreshedResults.length} products in forced refresh search`);

    // Test cache management methods
    console.log('\n--- Cache management test ---');
    // Remove specific cache entry
    scraper.removeCacheEntry(query, 10);

    // Test after removing specific entry
    console.log('\n--- Fourth search (after removing cache entry) ---');
    console.time('Fourth search (after cache removal)');
    await scraper.searchProducts(query, 10);
    console.timeEnd('Fourth search (after cache removal)');

    // Test clear all cache
    console.log('\n--- Clearing all cache ---');
    scraper.clearCache();

  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
    console.log('Test completed');
  }
}

// Run the test
testJunggonaraScraper().catch(console.error); 