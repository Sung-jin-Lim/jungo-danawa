/**
 * Common utilities for web scrapers
 */

/**
 * Helper function to auto-scroll the page to load lazy-loaded content
 * @param {import('puppeteer').Page} page - Puppeteer page
 * @param {Object} options - Scroll options
 * @param {number} options.distance - Distance to scroll each time in pixels (default: 300)
 * @param {number} options.delay - Milliseconds between scrolls (default: 100)
 * @returns {Promise<void>}
 */
export async function autoScroll(page, options = {}) {
  const { distance = 300, delay = 100 } = options;

  await page.evaluate(async (scrollDistance, scrollDelay) => {
    await new Promise((resolve) => {
      let total = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, scrollDistance);
        total += scrollDistance;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, scrollDelay);
    });
  }, distance, delay);
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<any>} - Result of the function
 */
export async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      // Exponential backoff
      const delay = 1000 * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after error: ${err.message}. Waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Extract image URL from various element attributes
 * @param {cheerio.Element} el - Cheerio element
 * @param {cheerio.CheerioAPI} $ - Cheerio instance
 * @returns {string|null} - Image URL or null if not found
 */
export function extractImageUrl(el, $) {
  // Check for img tags
  const img = $(el).find('img');
  if (img.length) {
    // Check various attributes where image URLs might be stored
    for (const attr of ['src', 'data-src', 'data-original', 'data-lazy-src', 'data-srcset', 'data-lazy', 'data-url']) {
      const val = img.attr(attr);
      if (val && val.trim() !== '' && !val.includes('data:image')) {
        return val.split(' ')[0]; // Handle srcset format
      }
    }
  }

  // Check <picture> elements
  const picture = $(el).find('picture');
  if (picture.length) {
    // Check source elements inside picture
    const source = picture.find('source');
    if (source.length) {
      for (const attr of ['srcset', 'data-srcset']) {
        const val = source.attr(attr);
        if (val && val.trim() !== '') {
          return val.split(' ')[0]; // Take first URL from srcset
        }
      }
    }
    // Check img inside picture
    const pictureImg = picture.find('img');
    if (pictureImg.length) {
      const src = pictureImg.attr('src');
      if (src && src.trim() !== '') {
        return src;
      }
    }
  }

  // Check for background image in style attribute
  const elementsWithStyle = $(el).find('[style*="background"]');
  elementsWithStyle.push($(el)[0]); // Also check the element itself

  for (let i = 0; i < elementsWithStyle.length; i++) {
    const style = $(elementsWithStyle[i]).attr('style');
    if (style) {
      const match = style.match(/background(?:-image)?:\s*url\(['"]?(.*?)['"]?\)/i);
      if (match && match[1]) {
        return match[1];
      }
    }
  }

  // Check for div with background-image computed style
  const divs = $(el).find('div');
  for (let i = 0; i < divs.length; i++) {
    for (const attr of ['data-bg', 'data-background', 'data-bgset']) {
      const val = $(divs[i]).attr(attr);
      if (val && val.trim() !== '') {
        return val.split(' ')[0];
      }
    }
  }

  return null;
}

/**
 * Format price string to number
 * @param {string} priceStr - Price string (e.g., "₩10,000" or "10,000원")
 * @returns {number} - Price as number or 0 if invalid
 */
export function formatPrice(priceStr) {
  if (!priceStr) return 0;

  // Remove currency symbols and commas
  const cleaned = priceStr.replace(/[₩,원\s]/g, '');
  const number = parseInt(cleaned, 10);
  return isNaN(number) ? 0 : number;
}

/**
 * Get a random proxy from a list
 * @param {string[]} proxyList - List of proxies
 * @returns {string|null} - Random proxy or null if list is empty
 */
export function getRandomProxy(proxyList = []) {
  if (!proxyList.length) return null;
  return proxyList[Math.floor(Math.random() * proxyList.length)];
}

/**
 * Set a random user agent for the page
 * @param {import('puppeteer').Page} page - Puppeteer page
 */
export async function setRandomUserAgent(page) {
  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0'
  ];

  const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
  await page.setUserAgent(randomUserAgent);
}

/**
 * Manually wait for a specified time
 * @param {import('puppeteer').Page} page - Puppeteer page
 * @param {number} milliseconds - Time to wait in milliseconds
 * @returns {Promise<void>}
 */
export async function wait(page, milliseconds) {
  await new Promise(resolve => setTimeout(resolve, milliseconds));
}

/**
 * Wait for network to be idle
 * @param {import('puppeteer').Page} page - Puppeteer page
 * @param {Object} options - Options
 * @param {number} options.timeout - Timeout in ms (default: 30000)
 * @param {number} options.idleTime - Network idle time in ms (default: 500)
 * @returns {Promise<void>}
 */
export async function waitForNetworkIdle(page, options = {}) {
  const { timeout = 30000, idleTime = 500 } = options;

  try {
    // Try using the built-in method first
    await page.waitForNavigation({
      waitUntil: 'networkidle2',
      timeout
    }).catch(() => {
      // Ignore error, we'll use our fallback
    });
  } catch (err) {
    console.warn('Network did not reach idle state within timeout, continuing anyway');
  }

  // Add a short manual wait as fallback
  await wait(page, idleTime);
}

export default {
  autoScroll,
  withRetry,
  extractImageUrl,
  formatPrice,
  getRandomProxy,
  setRandomUserAgent,
  waitForNetworkIdle,
  wait
}; 