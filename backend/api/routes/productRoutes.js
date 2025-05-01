// File: backend/routes/products.js
import express from 'express';
import Product from '../../models/Product.js';
import marketAnalysisService from '../../services/marketAnalysisService.js';

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

    // 2) Market analysis: get detailed market comparison using our service
    const marketAnalysis = await marketAnalysisService.getMarketAnalysis(product);

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
