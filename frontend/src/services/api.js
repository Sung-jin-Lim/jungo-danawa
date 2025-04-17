// File: frontend/src/services/api.js
/**
 * API Service for Jungo-Danawa
 * Handles communication with the backend API only
 */

// Use Vite env var or proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Search for products across platforms
 * @param {string} query
 * @param {number} [limit=3]
 * @param {Array<string>} [sources=['danggeun','coupang']]
 */
export async function searchProducts(
  query,
  limit = 3,
  sources = ['danggeun', 'coupang']
) {
  const response = await fetch(`${API_BASE_URL}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, sources, limit }),
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
