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
      debugDir: './debug/junggonara'
    });

    // Test with a common search term
    const query = 'galaxy';
    console.log(`Searching for "${query}"...`);

    const results = await scraper.searchProducts(query, 10);

    console.log(`Found ${results.length} products`);

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