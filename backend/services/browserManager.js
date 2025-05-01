import puppeteer from 'puppeteer';

/**
 * Browser pool manager for handling Puppeteer instances
 * Implements singleton pattern and connection pooling
 */
class BrowserManager {
  constructor() {
    this.browsers = [];
    this.maxInstances = 3; // Max concurrent browser instances
    this.defaultArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ];
  }

  /**
   * Get an available browser from the pool or create a new one
   * @param {Object} options Custom browser launch options
   * @returns {Promise<import('puppeteer').Browser>}
   */
  async getBrowser(options = {}) {
    // Remove crashed browsers from pool
    this.browsers = this.browsers.filter(browser => {
      try {
        return browser.process() != null;
      } catch (e) {
        return false;
      }
    });

    // Return existing browser if available
    if (this.browsers.length > 0) {
      return this.browsers[Math.floor(Math.random() * this.browsers.length)];
    }

    // Create new browser if under max limit
    if (this.browsers.length < this.maxInstances) {
      try {
        const browser = await puppeteer.launch({
          headless: 'new',
          args: [...this.defaultArgs, ...(options.args || [])],
          ...(options.executablePath && { executablePath: options.executablePath }),
          defaultViewport: { width: 1366, height: 768 },
        });

        // Handle disconnection
        browser.on('disconnected', () => {
          this.browsers = this.browsers.filter(b => b !== browser);
        });

        this.browsers.push(browser);
        return browser;
      } catch (err) {
        console.error('Failed to launch browser:', err);
        throw err;
      }
    }

    // Wait for a browser to become available
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (this.browsers.length < this.maxInstances) {
          clearInterval(checkInterval);
          this.getBrowser(options).then(resolve);
        }
      }, 500);
    });
  }

  /**
   * Close all browser instances
   */
  async closeAll() {
    await Promise.all(
      this.browsers.map(browser => browser.close())
    );
    this.browsers = [];
  }
}

// Create a singleton instance
const browserManagerInstance = new BrowserManager();

// Export both the instance and the class
export { browserManagerInstance as browserManager };
export default browserManagerInstance; 