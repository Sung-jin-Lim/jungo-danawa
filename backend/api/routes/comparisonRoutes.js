// File: backend/api/routes/comparisonRoutes.js
import express from 'express';
import Product from '../../models/Product.js';
import { generateContent } from '../../geminiClient.js';

const router = express.Router();

/**
 * @route   POST /api/comparison/tech
 * @desc    Compare tech products using Gemini API
 * @access  Public
 */
router.post('/tech', async (req, res) => {
  try {
    const { productIds, priceRange } = req.body;
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: 'Product IDs are required' });
    }

    // Fetch products from the database
    const products = await Product.find({ _id: { $in: productIds } });
    if (products.length === 0) {
      return res.status(404).json({ message: 'No products found with the provided IDs' });
    }

    // Prepare product data for prompt
    const productData = products.map((p, idx) => ({
      number: idx + 1,
      id: p._id.toString(),
      title: p.title,
      price: p.price,
      source: p.source,
      specs: p.specs || {},
      description: p.description || ''
    }));

    // Build prompt string
    const productLines = productData.map(pd =>
      `Product ${pd.number} (ID: ${pd.id}):\n` +
      `- Title: ${pd.title}\n` +
      `- Price: ${pd.price}\n` +
      `- Source: ${pd.source}\n` +
      `- Specs: ${JSON.stringify(pd.specs)}\n` +
      `- Description: ${pd.description}\n`
    ).join('\n');

    const rangeLine = priceRange ? `The buyer's price range is ${priceRange}.\n\n` : '';

    const prompt =
      `I need to compare these tech products and determine which one offers the best value:\n\n` +
      productLines +
      `\n` +
      rangeLine +
      `Please analyze these products and provide:\n` +
      `1. A comparison of key specifications\n` +
      `2. Pros and cons of each product\n` +
      `3. Value rating for each product (1-10)\n` +
      `4. Which product offers the best value for money and why\n` +
      `5. Any recommendations based on the comparison\n\n` +
      `Format your answer as JSON with the following structure:\n` +
      `{\n` +
      `  "comparison": {},\n` +
      `  "products": [\n` +
      `    { "id": "product_id", "pros": [], "cons": [], "valueRating": 0, "analysis": "" }\n` +
      `  ],\n` +
      `  "bestValue": { "id": "product_id", "reason": "" },\n` +
      `  "recommendations": ""\n` +
      `}`;

    // Call Gemini and get the generated text directly
    const generatedText = await generateContent(prompt);

    // Extract JSON from generated text
    let analysisResult;
    try {
      const match = generatedText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON found in AI response');
      analysisResult = JSON.parse(match[0]);
    } catch (err) {
      console.error('Error parsing AI JSON:', err);
      return res.status(500).json({
        message: 'Error parsing AI analysis',
        error: err.message,
        rawResponse: generatedText
      });
    }

    // Return structured result
    return res.json({
      query: { productIds, priceRange },
      products: productData,
      analysis: analysisResult
    });
  } catch (error) {
    console.error('Tech comparison error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
