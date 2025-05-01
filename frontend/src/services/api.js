// File: frontend/src/services/api.js
/**
 * API Service for Jungo-Danawa
 * Handles communication with the backend API only
 */

// Use Vite env var or proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Search for products across platforms
 * @param {string} query - Search query string
 * @param {Array<string>} sources - List of marketplaces to search ['danggeun', 'coupang', 'bunjang', 'junggonara']
 * @param {number} minPrice - Minimum price filter
 * @param {number} maxPrice - Maximum price filter
 * @param {number} limit - Maximum number of results per marketplace
 * @returns {Promise<Object>} Search results with products array
 */
export async function searchProducts(
  query,
  sources = ['danggeun', 'coupang', 'bunjang', 'junggonara'],
  minPrice = 0,
  maxPrice = 1000000,
  limit = 20
) {
  const response = await fetch(`${API_BASE_URL}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      sources,
      limit,
      filters: {
        price: { min: minPrice, max: maxPrice }
      }
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Search API error: ${response.status} – ${text}`);
  }

  return response.json();
}

/**
 * Get product details by ID
 * @param {string} id
 */
export async function getProductById(id) {
  const res = await fetch(`${API_BASE_URL}/products/${id}`);
  if (!res.ok) throw new Error(`Fetch product failed: ${res.status}`);
  return res.json();
}

/**
 * Compare tech products via AI
 * @param {Array<string>} ids
 * @param {string|null} [priceRange=null]
 */
export async function compareTechProducts(ids, priceRange = null) {
  const res = await fetch(`${API_BASE_URL}/comparison/tech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productIds: ids, priceRange }),
  });
  if (!res.ok) throw new Error(`Compare failed: ${res.status}`);
  return res.json();
}
