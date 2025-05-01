import Product from '../models/Product.js';
import browserManager from './browserManager.js';
import cacheManager from './cacheManager.js';
import { load } from 'cheerio';

/**
 * Service for analyzing market prices
 */
class MarketAnalysisService {
  constructor() {
    this.coupangBaseUrl = 'https://www.coupang.com';
    this.coupangSearchUrl = 'https://www.coupang.com/np/search?component=&q=';
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours

    // Category-based price factors (used for fallback estimates)
    this.priceFallbackFactors = {
      // Maps keywords to estimated markup percentages
      'phone': 0.85,    // Second-hand phones typically 85% of retail
      'iphone': 0.80,   // iPhones have better resale value
      'galaxy': 0.75,   // Samsung Galaxy phones
      'laptop': 0.75,   // Laptops
      'macbook': 0.85,  // MacBooks hold value well
      'tablet': 0.80,   // Tablets
      'ipad': 0.85,     // iPads
      'camera': 0.70,   // Cameras
      'lens': 0.80,     // Camera lenses
      'tv': 0.65,       // TVs
      'monitor': 0.70,  // Monitors
      'console': 0.80,  // Gaming consoles
      'playstation': 0.85, // PlayStation consoles
      'nintendo': 0.90, // Nintendo products hold value
      'default': 0.75   // Default factor for unknown categories
    };
  }

  /**
   * Get cache key for market analysis
   * @param {string} productTitle 
   * @returns {string}
   */
  getCacheKey(productTitle) {
    return `market_analysis:${productTitle}`;
  }

  /**
   * Get market analysis for a product
   * @param {Object} product - Product to analyze
   * @returns {Promise<Object>} Market analysis
   */
  async getMarketAnalysis(product) {
    if (!product || !product.price) {
      return this.getEstimatedAnalysis(product);
    }

    // Check cache first
    const cacheKey = this.getCacheKey(product.title);
    const cachedAnalysis = cacheManager.get(cacheKey);
    if (cachedAnalysis) {
      console.log(`Using cached market analysis for ${product.title}`);
      return cachedAnalysis;
    }

    try {
      // First try to get market products from DB
      let marketProducts = await this.getMarketProductsFromDB(product);

      // If no products in DB, try to scrape Coupang
      if (marketProducts.length < 2) {
        const scrapedProducts = await this.scrapeMarketProducts(product);
        if (scrapedProducts.length > 0) {
          // Save scraped products to DB
          try {
            await Product.insertMany(scrapedProducts, { ordered: false });
          } catch (err) {
            console.log('Some market products already exist in DB:', err.message);
          }

          // Combine DB and scraped products
          const productUrls = marketProducts.map(p => p.productUrl);
          const uniqueScraped = scrapedProducts.filter(p => !productUrls.includes(p.productUrl));
          marketProducts.push(...uniqueScraped);
        }
      }

      // If still no market products, try a broader search
      if (marketProducts.length < 2) {
        const broadSearchProducts = await this.getBroadMarketProducts(product);
        if (broadSearchProducts.length > 0) {
          const productUrls = marketProducts.map(p => p.productUrl);
          const uniqueBroad = broadSearchProducts.filter(p => !productUrls.includes(p.productUrl));
          marketProducts.push(...uniqueBroad);
        }
      }

      // Calculate market analysis
      let analysis;
      if (marketProducts.length > 0) {
        analysis = this.calculateMarketAnalysis(product, marketProducts);
      } else {
        analysis = this.getEstimatedAnalysis(product);
      }

      // Cache the result
      cacheManager.set(cacheKey, analysis, this.cacheTTL);

      return analysis;
    } catch (err) {
      console.error('Market analysis error:', err);
      // Return estimated analysis
      return this.getEstimatedAnalysis(product);
    }
  }

  /**
   * Get market products from database
   * @param {Object} product - Product to get market products for
   * @returns {Promise<Array>} Market products
   */
  async getMarketProductsFromDB(product) {
    // Normalize the product title to create search terms
    const searchTerms = this.extractSearchTerms(product.title);

    if (searchTerms.length === 0) {
      return [];
    }

    // Create search regex pattern with at least 2 significant terms
    // This ensures we find relevant products without being too strict
    const significantTerms = searchTerms.filter(term => term.length > 2)
      .slice(0, 3); // Use at most 3 terms

    if (significantTerms.length === 0) {
      return [];
    }

    // Create a more lenient search query - match any of the terms instead of all
    // This will find more products but potentially less relevant
    const searchPattern = significantTerms.map(term =>
      new RegExp(term, 'i')
    );

    // Search for similar products in DB, prioritizing Coupang products
    const marketProducts = await Product.find({
      source: 'coupang',
      title: { $in: searchPattern }, // Match any of the terms
      _id: { $ne: product._id },
      price: { $gt: 1000 } // Ensure we only get products with valid prices
    })
      .sort({ price: 1 })
      .limit(5)
      .lean();

    return marketProducts;
  }

  /**
   * Get broader market products when no specific matches are found
   * @param {Object} product - Product to get market products for
   * @returns {Promise<Array>} Broad market products
   */
  async getBroadMarketProducts(product) {
    // Get category keywords from the product title
    const categoryKeywords = this.extractCategoryKeywords(product.title);

    if (categoryKeywords.length === 0) {
      return [];
    }

    // Create broader search pattern based on product category
    const categoryPatterns = categoryKeywords.map(term =>
      new RegExp(term, 'i')
    );

    // Search for similar category products in DB
    const broadProducts = await Product.find({
      source: 'coupang',
      title: { $in: categoryPatterns },
      _id: { $ne: product._id },
      price: { $gt: 1000 }
    })
      .sort({ price: 1 })
      .limit(10)
      .lean();

    return broadProducts;
  }

  /**
   * Scrape market products from Coupang
   * @param {Object} product - Product to get market products for
   * @returns {Promise<Array>} Scraped market products
   */
  async scrapeMarketProducts(product) {
    // Extract search terms from product title
    const searchTerms = this.extractSearchTerms(product.title);

    // If no meaningful search terms, return empty
    if (searchTerms.length === 0) {
      return [];
    }

    // Take the first 2-3 most relevant terms for the search
    const searchQuery = searchTerms.slice(0, 3).join(' ');

    // Get a browser instance
    const browser = await browserManager.getBrowser();
    const page = await browser.newPage();

    try {
      // Set up page
      await page.setViewport({ width: 1366, height: 768 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'max-age=0'
      });

      // Navigate to Coupang search
      const url = `${this.coupangSearchUrl}${encodeURIComponent(searchQuery)}`;
      console.log('Market analysis searching:', url);

      // Try different navigation strategies
      try {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });
      } catch (e) {
        console.log('Navigation timeout, trying with networkidle0:', e.message);
        try {
          await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 30000
          });
        } catch (e2) {
          console.log('Second navigation attempt failed:', e2.message);
        }
      }

      // Wait for search results or timeout
      try {
        await Promise.race([
          page.waitForSelector('.search-product', { timeout: 10000 }),
          new Promise(r => setTimeout(r, 10000))
        ]);
      } catch (e) {
        console.log('Timeout waiting for search results:', e.message);
      }

      // Scroll to load lazy images
      await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get page content
      const html = await page.content();
      const $ = load(html);
      const scrapedProducts = [];

      // Extract product data
      $('.search-product').each((i, el) => {
        if (i >= 10) return false; // Limit to 10 products

        const card = $(el);
        const title = card.find('.name').text().trim();
        const priceText = card.find('.price-value').text().trim();
        const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || null;

        // Only include if price is available and not zero
        if (!price || price < 1000) return;

        // Get image URL
        const imgEl = card.find('img.search-product-wrap-img');
        let imageUrl = imgEl.attr('src') || imgEl.attr('data-img-src') || imgEl.attr('img-src') || '';
        if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;

        // Get product URL
        const relUrl = card.find('a.search-product-link').attr('href') || '';
        const productUrl = this.coupangBaseUrl + relUrl;

        if (title && productUrl) {
          scrapedProducts.push({
            source: 'coupang',
            title,
            price,
            priceText: new Intl.NumberFormat('ko-KR', {
              style: 'currency',
              currency: 'KRW'
            })
              .format(price)
              .replace('₩', '') + '원',
            imageUrl,
            productUrl,
            timestamp: new Date().toISOString(),
          });
        }
      });

      return scrapedProducts;
    } catch (err) {
      console.error('Error scraping market products:', err);
      return [];
    } finally {
      await page.close();
    }
  }

  /**
   * Calculate market analysis from product and market products
   * @param {Object} product - Product to analyze
   * @param {Array} marketProducts - Market products to compare with
   * @returns {Object} Market analysis
   */
  calculateMarketAnalysis(product, marketProducts) {
    // Filter out market products with zero or invalid prices
    const validMarketProducts = marketProducts.filter(p => p.price && p.price > 1000);

    if (validMarketProducts.length === 0) {
      return this.getEstimatedAnalysis(product);
    }

    // Calculate average market price
    const marketPrices = validMarketProducts.map(p => p.price);

    // Use median price instead of average to avoid outliers
    const sortedPrices = [...marketPrices].sort((a, b) => a - b);
    const medianIndex = Math.floor(sortedPrices.length / 2);
    const marketPrice = sortedPrices.length % 2 === 0
      ? Math.round((sortedPrices[medianIndex - 1] + sortedPrices[medianIndex]) / 2)
      : sortedPrices[medianIndex];

    // Calculate price disparity
    const disparity = product.price - marketPrice;
    const disparityPercentage = marketPrice ? (disparity / marketPrice) * 100 : 0;

    // Sort market products by price similarity to the product price
    const sortedProducts = [...validMarketProducts].sort((a, b) =>
      Math.abs(a.price - product.price) - Math.abs(b.price - product.price)
    );

    return {
      marketPrice,
      disparity: Math.abs(disparity),
      disparityPercentage: disparityPercentage,
      isLowerThanMarket: disparity < 0,
      marketProducts: sortedProducts.slice(0, 3).map(p => ({
        id: p._id,
        title: p.title,
        price: p.price,
        priceText: p.priceText,
        source: p.source,
        imageUrl: p.imageUrl,
        productUrl: p.productUrl
      }))
    };
  }

  /**
   * Get estimated market analysis when no product matches found
   * Based on product category and typical resale value patterns
   * @param {Object} product - Product to analyze
   * @returns {Object} Estimated market analysis
   */
  getEstimatedAnalysis(product) {
    if (!product || !product.price) {
      return {
        marketPrice: 0,
        disparity: 0,
        disparityPercentage: 0,
        isLowerThanMarket: false,
        marketProducts: []
      };
    }

    // Determine product category from title
    const lowerTitle = product.title.toLowerCase();

    // Find the best matching category for price estimation
    let bestFactor = this.priceFallbackFactors.default;
    let bestCategory = 'default';

    for (const [category, factor] of Object.entries(this.priceFallbackFactors)) {
      if (category !== 'default' && lowerTitle.includes(category)) {
        // Use the most specific category match (usually longer category names)
        if (category.length > bestCategory.length || bestCategory === 'default') {
          bestFactor = factor;
          bestCategory = category;
        }
      }
    }

    // Calculate estimated market price based on category factor
    // For second-hand items, we estimate retail prices are typically higher
    // For retail items (Coupang), we estimate second-hand prices are typically lower
    let marketPrice;
    let isLowerThanMarket;

    if (product.source === 'coupang') {
      // For retail items, second-hand value is typically lower
      marketPrice = Math.round(product.price * bestFactor);
      isLowerThanMarket = false; // Retail is usually higher than second-hand
    } else {
      // For second-hand items, retail value is typically higher
      marketPrice = Math.round(product.price / bestFactor);
      isLowerThanMarket = true; // Second-hand is usually lower than retail
    }

    const disparity = Math.abs(product.price - marketPrice);
    const disparityPercentage = (disparity / marketPrice) * 100;

    console.log(`Using estimated market price for ${product.title} (${bestCategory}): ` +
      `${product.price} → ${marketPrice} (factor: ${bestFactor})`);

    return {
      marketPrice,
      disparity,
      disparityPercentage,
      isLowerThanMarket,
      marketProducts: []
    };
  }

  /**
   * Extract search terms from product title
   * @param {string} title - Product title
   * @returns {Array<string>} Search terms
   */
  extractSearchTerms(title) {
    if (!title) return [];

    // Remove special characters and numbers
    const cleanTitle = title.replace(/[^\w\s가-힣]/g, ' ');

    // Split into words and filter out short terms
    const words = cleanTitle.split(/\s+/).filter(word => word.length > 1);

    // Get model numbers if present (pattern like "SM-A536")
    const modelMatch = title.match(/([A-Z0-9]+-[A-Z0-9]+)/g);
    const models = modelMatch ? modelMatch : [];

    // Get numeric patterns that might be memory/storage sizes
    const numericPatterns = title.match(/(\d+[Gg][Bb]|\d+[Tt][Bb])/g) || [];

    // Combine important terms
    const terms = [...models, ...numericPatterns, ...words];

    // Remove duplicates and return
    return [...new Set(terms)];
  }

  /**
   * Extract category keywords from product title
   * @param {string} title - Product title
   * @returns {Array<string>} Category keywords
   */
  extractCategoryKeywords(title) {
    if (!title) return [];

    const lowerTitle = title.toLowerCase();
    const categories = [];

    // Check for common product categories
    const categoryKeywords = [
      'phone', 'smartphone', '폰', '스마트폰',
      'iphone', '아이폰',
      'galaxy', '갤럭시',
      'laptop', 'notebook', '노트북', '랩탑',
      'macbook', '맥북',
      'tablet', '태블릿',
      'ipad', '아이패드',
      'camera', '카메라',
      'lens', '렌즈',
      'tv', 'television', '티비', '텔레비전',
      'monitor', '모니터',
      'console', '콘솔',
      'playstation', '플레이스테이션', 'ps4', 'ps5',
      'nintendo', '닌텐도', 'switch', '스위치'
    ];

    for (const keyword of categoryKeywords) {
      if (lowerTitle.includes(keyword)) {
        categories.push(keyword);
      }
    }

    return categories;
  }
}

export default new MarketAnalysisService(); 