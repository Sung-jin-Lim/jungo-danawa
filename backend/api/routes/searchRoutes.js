// File: backend/api/routes/searchRoutes.js
import express from 'express';
import { DanggeunScraper, CoupangScraper, BunjangScraper, JunggonaraScraper } from '../../scrapers/index.js';
import { browserManager } from '../../services/browserManager.js';

const router = express.Router();

/**
 * Search across all platforms
 * 
 * @route POST /api/search
 * @param {string} query - Search query
 * @param {Array<string>} sources - List of sources to search ['danggeun', 'coupang', 'bunjang', 'junggonara']
 * @param {number} limit - Maximum results per source
 * @param {Object} filters - Filter options (e.g., price range)
 * @returns {Object} Search results with products array
 */
router.post('/', async (req, res) => {
  try {
    // Extract parameters from request body
    const {
      query,
      sources = ['danggeun', 'coupang', 'bunjang', 'junggonara'],
      limit = 20,
      filters = {}
    } = req.body;

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log(`Searching for: ${query}`);
    console.log(`Sources: ${sources.join(', ')}`);
    console.log(`Limit per source: ${limit}`);

    // Get the browser instance for scrapers
    const browser = await browserManager.getBrowser();

    // Initialize scrapers for selected sources
    const scrapers = [];

    if (sources.includes('danggeun')) {
      const danggeunScraper = new DanggeunScraper(browser);
      scrapers.push(danggeunScraper);
    }

    if (sources.includes('coupang')) {
      const coupangScraper = new CoupangScraper(browser);
      scrapers.push(coupangScraper);
    }

    if (sources.includes('bunjang')) {
      const bunjangScraper = new BunjangScraper(browser);
      scrapers.push(bunjangScraper);
    }

    if (sources.includes('junggonara')) {
      const junggonaraScraper = new JunggonaraScraper(browser);
      scrapers.push(junggonaraScraper);
    }

    // Execute searches in parallel with individual error handling
    const searchPromises = scrapers.map(scraper => {
      console.log(`Starting ${scraper.source} scraper...`);
      return scraper.searchProducts(query, limit)
        .then(products => {
          console.log(`${scraper.source} found ${products.length} products`);
          return {
            source: scraper.source,
            products,
            error: null
          };
        })
        .catch(error => {
          console.error(`${scraper.source} scraper error:`, error.message);
          return {
            source: scraper.source,
            products: [],
            error: error.message
          };
        });
    });

    const results = await Promise.all(searchPromises);

    // Combine all products
    let allProducts = [];
    let errors = {};

    results.forEach(result => {
      if (result.products && result.products.length > 0) {
        // Apply any filters if provided
        let filteredProducts = result.products;

        // Apply price filter if provided
        if (filters.price) {
          const { min, max } = filters.price;
          if (min !== undefined || max !== undefined) {
            filteredProducts = filteredProducts.filter(product => {
              if (min !== undefined && product.price < min) return false;
              if (max !== undefined && product.price > max) return false;
              return true;
            });
          }
        }

        allProducts = [...allProducts, ...filteredProducts];
      }

      if (result.error) {
        errors[result.source] = result.error;
      }
    });

    // Return the combined results
    res.json({
      query,
      sources: sources,
      total: allProducts.length,
      products: allProducts,
      errors: Object.keys(errors).length > 0 ? errors : null
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'An error occurred during the search process' });
  }
});

export default router;
