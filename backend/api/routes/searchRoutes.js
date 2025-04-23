import express from 'express';
import Product from '../../models/Product.js';

const router = express.Router();

/**
 * @route   POST /api/search
 * @desc    Search for products across Danggeun, Coupang, Bunjang & Junggonara
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { query, limit = 20 } = req.body;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // normalize sources
    let sources = req.body.sources;
    if (!Array.isArray(sources)) {
      if (typeof sources === 'string') {
        sources = sources.includes(',')
          ? sources.split(',').map(s => s.trim())
          : [sources];
      } else {
        sources = ['danggeun', 'coupang', 'bunjang', 'junggonara'];
      }
    }

    // import only the scrapers we need
    const [
      dangMod,
      coupMod,
      bunMod,
      jungMod
    ] = await Promise.all([
      sources.includes('danggeun') ? import('../../scrapers/danggeunScraper.js') : Promise.resolve(null),
      sources.includes('coupang') ? import('../../scrapers/coupangScraper.js') : Promise.resolve(null),
      sources.includes('bunjang') ? import('../../scrapers/bunjangScraper.js') : Promise.resolve(null),
      sources.includes('junggonara') ? import('../../scrapers/junggonaraScraper.js') : Promise.resolve(null),
    ]);

    const DanggeunScraper = dangMod?.default;
    const CoupangScraper = coupMod?.default;
    const BunjangScraper = bunMod?.default;
    const JunggonaraScraper = jungMod?.default;

    // grab our one-and-only browser instance
    const browser = req.app.locals.browser;

    // spin up all pages in parallel
    const tasks = [];
    if (DanggeunScraper) tasks.push(new DanggeunScraper(browser).searchProducts(query, limit));
    if (CoupangScraper) tasks.push(new CoupangScraper(browser).searchProducts(query, limit));
    if (BunjangScraper) tasks.push(new BunjangScraper(browser).searchProducts(query, limit));
    if (JunggonaraScraper) tasks.push(new JunggonaraScraper(browser).searchProducts(query, limit));

    const results = await Promise.all(tasks);
    const products = results.flat();

    // save them
    await Product.insertMany(products, { ordered: false }).catch(() => { });

    res.json({
      query,
      sources: sources.filter(s => ['danggeun', 'coupang', 'bunjang', 'junggonara'].includes(s)),
      count: products.length,
      products
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
