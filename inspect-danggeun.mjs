import puppeteer from 'puppeteer';
import { load } from 'cheerio';
import fs from 'fs';

(async () => {
  console.log('Initializing browser...');
  const browser = await puppeteer.launch({
    headless: false, // Non-headless mode to see what's happening
    defaultViewport: null, // Use default viewport of the browser
    args: ['--window-size=1280,800']
  });

  try {
    const page = await browser.newPage();
    await page.setDefaultTimeout(30000);

    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/120.0.0.0 Safari/537.36'
    );

    // Log navigation events
    page.on('console', msg => console.log('Page console:', msg.text()));

    const query = 'iphone';
    const url = `https://www.daangn.com/search/${encodeURIComponent(query)}`;
    console.log('Navigating to:', url);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded');

    // Take a screenshot
    await page.screenshot({ path: 'danggeun-full.png', fullPage: true });
    console.log('Full page screenshot saved');

    // Get page title and URL
    const title = await page.title();
    const currentUrl = page.url();
    console.log('Page title:', title);
    console.log('Current URL:', currentUrl);

    // Get page content
    const content = await page.content();
    console.log('Page content length:', content.length);

    // Save the HTML for inspection
    fs.writeFileSync('danggeun-html.txt', content);
    console.log('HTML saved to danggeun-html.txt');

    // Parse with Cheerio
    const $ = load(content);

    // Look for all link elements
    console.log('\nExamining links...');
    const links = $('a');
    console.log(`Found ${links.length} links`);

    // Show the first 5 links
    links.slice(0, 5).each((i, el) => {
      const href = $(el).attr('href') || 'no href';
      const text = $(el).text().trim() || 'no text';
      console.log(`Link ${i + 1}: ${text.substring(0, 30)}... -> ${href.substring(0, 50)}...`);
    });

    // Look for all images
    console.log('\nExamining images...');
    const images = $('img');
    console.log(`Found ${images.length} images`);

    // Show the first 5 images
    images.slice(0, 5).each((i, el) => {
      const src = $(el).attr('src') || 'no src';
      const alt = $(el).attr('alt') || 'no alt';
      console.log(`Image ${i + 1}: ${alt.substring(0, 30)}... -> ${src.substring(0, 50)}...`);
    });

    // Identify possible product containers
    console.log('\nLooking for likely product containers...');

    // Find elements with classes that might indicate they're product cards
    const productContainers = $('*').filter((i, el) => {
      const className = $(el).attr('class') || '';
      return className.includes('card') ||
        className.includes('item') ||
        className.includes('product') ||
        className.includes('article');
    });

    console.log(`Found ${productContainers.length} elements with product-related class names`);

    if (productContainers.length > 0) {
      // Show sample class names
      console.log('Sample element classes:');
      productContainers.slice(0, 10).each((i, el) => {
        const className = $(el).attr('class') || 'no class';
        const tagName = el.tagName;
        const text = $(el).text().trim().replace(/\s+/g, ' ').substring(0, 50);
        console.log(`${i + 1}. <${tagName}> class="${className}" - ${text}...`);
      });
    }

    // Test different selectors to find product elements
    console.log('\nTesting common selectors...');
    const selectorsToTest = [
      '.article-card',
      '.article-listing-item',
      '.item-card',
      '.product-item',
      '[data-testid="card-container"]',
      '.search-result-item',
      '.item',
      '.card',
      '.e1d86ne99', // Look for custom class names
      '.e1iibd6v0',
      '.e1r1t7ug0',
      // Try component-style class names
      '[class*="CardBase"]',
      '[class*="ItemCard"]',
      '[class*="ProductCard"]',
      '[class*="SearchItem"]',
      // Try attributes
      '[data-testid*="item"]',
      '[data-testid*="card"]',
      '[data-testid*="product"]'
    ];

    for (const selector of selectorsToTest) {
      const count = $(selector).length;
      console.log(`${selector}: ${count} elements found`);

      if (count > 0) {
        // Show first match
        const firstElement = $(selector).first();
        const html = firstElement.html()?.substring(0, 100) || 'no html';
        console.log(`First match HTML snippet: ${html}...`);
      }
    }

    // Check for dynamically loaded content
    console.log('\nChecking for React or other framework signatures...');
    const reactRoots = $('[id="root"], [id="app"], [id="__next"]');
    if (reactRoots.length > 0) {
      console.log('Possible React/SPA app detected. Content might be loaded dynamically.');
    }

    // Look for product listings by searching for specific content patterns
    console.log('\nSearching for price patterns...');
    const pricePatterns = $('*').filter((i, el) => {
      const text = $(el).text().trim();
      // Look for price patterns like "10,000원" or "10만원"
      return /\d{1,3}(,\d{3})*원/.test(text) || /\d+만원/.test(text);
    });

    console.log(`Found ${pricePatterns.length} elements with price-like text`);

    if (pricePatterns.length > 0) {
      // Show sample elements with price patterns
      console.log('Sample elements with price patterns:');
      pricePatterns.slice(0, 5).each((i, el) => {
        const tagName = el.tagName;
        const className = $(el).attr('class') || 'no class';
        const text = $(el).text().trim();
        console.log(`${i + 1}. <${tagName}> class="${className}" - "${text}"`);

        // Look for parent elements that might be product cards
        let parent = $(el).parent();
        let depth = 1;
        while (parent.length && depth <= 3) {
          console.log(`  Parent ${depth}: <${parent[0].tagName}> class="${parent.attr('class') || 'no class'}"`);
          parent = parent.parent();
          depth++;
        }
      });
    }

    // Try executing JavaScript in the page to get product data
    console.log('\nAttempting to extract data from page JavaScript...');

    // Try to access window._PRELOADED_STATE_ or similar data structures
    const pageData = await page.evaluate(() => {
      // Look for common data structures in modern web apps
      const data = {
        reactData: window.__PRELOADED_STATE__, // Redux store
        nextData: window.__NEXT_DATA__, // Next.js data
        apolloData: window.__APOLLO_STATE__, // Apollo GraphQL client
        windowProps: Object.keys(window).filter(key =>
          key.includes('data') ||
          key.includes('store') ||
          key.includes('state') ||
          key.includes('props')
        ),
        // Look for global variables with product data
        possibleDataVars: Object.keys(window).filter(key => {
          try {
            const value = window[key];
            return value && typeof value === 'object' && (
              (Array.isArray(value) && value.length > 0) ||
              (typeof value === 'object' && Object.keys(value).some(k =>
                k.includes('product') ||
                k.includes('item') ||
                k.includes('card') ||
                k.includes('search')
              ))
            );
          } catch (e) {
            return false;
          }
        })
      };

      return data;
    });

    console.log('Page JavaScript data:', pageData);

    // Wait for user input before closing
    console.log('\nPress Enter to close the browser...');
    await new Promise(resolve => {
      process.stdin.once('data', () => {
        resolve();
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})(); 