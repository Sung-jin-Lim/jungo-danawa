// File: backend/api/routes/searchRoutes.js
import express from 'express';
import Product from '../../models/Product.js';

const router = express.Router();

/**
 * @route   POST /api/search
 * @desc    Search for products across Danggeun and Coupang
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { query, limit = 20 } = req.body;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // --- Normalize sources into an array ---
    let sources = req.body.sources;
    if (!Array.isArray(sources)) {
      if (typeof sources === 'string') {
        // allow comma‑separated or single string
        sources = sources.includes(',')
          ? sources.split(',').map(s => s.trim())
          : [sources];
      } else {
        // default to both if missing/invalid
        sources = ['danggeun', 'coupang'];
      }
    }

    // Dynamically import scrapers only if requested
    const imports = await Promise.all([
      sources.includes('danggeun')
        ? import('../../scrapers/danggeunScraper.js')
        : Promise.resolve(null),
      sources.includes('coupang')
        ? import('../../scrapers/coupangScraper.js')
        : Promise.resolve(null),
    ]);

    const DanggeunScraper = imports[0]?.default;
    const CoupangScraper = imports[1]?.default;

    // Launch scrapes
    const tasks = [];
    if (DanggeunScraper) {
      tasks.push(new DanggeunScraper().searchProducts(query, limit));
    }
    if (CoupangScraper) {
      tasks.push(new CoupangScraper().searchProducts(query, limit));
    }

    const results = await Promise.all(tasks);
    const products = results.flat();

    // Save to DB (ignoring duplicates)
    await Product.insertMany(products, { ordered: false }).catch(() => { });

    res.json({
      query,
      sources: sources.filter(s => ['danggeun', 'coupang'].includes(s)),
      count: products.length,
      products,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/search/compare
 * @desc    Compare prices across Danggeun and Coupang for a specific query
 * @access  Public
 */
router.get('/compare', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Always import both scrapers for comparison
    const [{ default: DanggeunScraper }, { default: CoupangScraper }] =
      await Promise.all([
        import('../../scrapers/danggeunScraper.js'),
        import('../../scrapers/coupangScraper.js'),
      ]);

    const dangProducts = await new DanggeunScraper().searchProducts(query, 5);
    const coupProducts = await new CoupangScraper().searchProducts(query, 5);

    const avg = arr => {
      const vals = arr.filter(p => p.price).map(p => p.price);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    const dangAvg = avg(dangProducts);
    const coupAvg = avg(coupProducts);
    const marketPrice = coupAvg;

    let bestDeal = null;
    let platform = null;
    if (dangAvg !== null && (coupAvg === null || dangAvg <= coupAvg)) {
      bestDeal = dangAvg;
      platform = 'danggeun';
    } else if (coupAvg !== null) {
      bestDeal = coupAvg;
      platform = 'coupang';
    }

    const disparity =
      bestDeal !== null && marketPrice !== null
        ? marketPrice - bestDeal
        : null;
    const disparityPct =
      disparity !== null && marketPrice
        ? (disparity / marketPrice) * 100
        : null;

    // Persist items
    const allProducts = [...dangProducts, ...coupProducts];
    await Product.insertMany(allProducts, { ordered: false }).catch(() => { });

    res.json({
      query,
      comparison: {
        danggeun: { averagePrice: dangAvg, products: dangProducts },
        coupang: { averagePrice: coupAvg, products: coupProducts },
        marketPrice,
        bestDeal: { price: bestDeal, platform },
        disparity,
        disparityPercentage: disparityPct,
      },
    });
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
