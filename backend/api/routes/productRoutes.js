// File: backend/routes/products.js
import express from 'express';
import Product from '../../models/Product.js';
const router = express.Router();

/**
 * @route   GET /api/products/:id
 * @desc    Get a product by ID + similar + market analysis
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // 1) Similar products: same source, different ID, limit 3
    const similarProducts = await Product.find({
      source: product.source,
      _id: { $ne: product._id }
    })
      .sort({ timestamp: -1 })
      .limit(3)
      .lean();

    // 2) Market analysis: you can replace this stub with a real aggregation
    //    e.g. average price across all sources, plus a few “market” listings.
    const marketProducts = await Product.find({ /* your coupang filter */ })
      .sort({ price: 1 })
      .limit(2)
      .lean();

    const marketPrices = marketProducts.map((p) => p.price);
    const marketPrice = marketPrices.length
      ? Math.round(marketPrices.reduce((a, b) => a + b, 0) / marketPrices.length)
      : product.price;

    const disparity = product.price - marketPrice;
    const disparityPercentage = marketPrice
      ? (disparity / marketPrice) * 100
      : 0;

    const marketAnalysis = {
      marketPrice,
      disparity: Math.abs(disparity),
      disparityPercentage: Math.abs(disparityPercentage),
      marketProducts: marketProducts.map((p) => ({
        id: p._id,
        title: p.title,
        price: p.price,
        priceText: new Intl.NumberFormat('ko-KR', {
          style: 'currency',
          currency: 'KRW'
        })
          .format(p.price)
          .replace('₩', '') + '원',
        source: p.source,
        imageUrl: p.imageUrl
      }))
    };

    res.json({
      product,
      similarProducts,
      marketAnalysis
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
