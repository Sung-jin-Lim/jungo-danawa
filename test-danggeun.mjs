import puppeteer from 'puppeteer';
import DanggeunScraper from './backend/scrapers/danggeunScraper.js';
import fs from 'fs';

(async () => {
  console.log('Initializing browser...');
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,800',
      '--disable-features=site-per-process' // Helps with some anti-scraping measures
    ],
    defaultViewport: null
  });

  console.log('Creating scraper instance...');
  const scraper = new DanggeunScraper(browser);

  try {
    console.log('Starting search...');
    const query = 'iphone';
    console.log(`Searching for: ${query}`);
    const results = await scraper.searchProducts(query);

    console.log(`\nFound ${results.length} results`);
    const imageResults = results.filter(r => r.imageUrl);
    console.log(`${imageResults.length} products have images (${(imageResults.length / results.length * 100).toFixed(1)}%)`);

    console.log('\nFirst 3 results:');
    console.log(JSON.stringify(results.slice(0, 3), null, 2));

    // Save full results to a file for analysis
    fs.writeFileSync('danggeun-results.json', JSON.stringify(results, null, 2));
    console.log('\nFull results saved to danggeun-results.json');
  } catch (e) {
    console.error('Error during search:', e);
  } finally {
    console.log('Closing browser...');
    await browser.close();
  }
})(); 