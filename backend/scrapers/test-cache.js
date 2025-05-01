// File: backend/scrapers/test-cache.js
import CacheManager from './cacheManager.js';

async function testCacheManager() {
  console.log('Testing CacheManager...');

  // Create a cache manager with default settings
  const cache = new CacheManager({
    cacheDir: './cache/test',
    defaultTTL: 10 * 1000 // 10 seconds for testing
  });

  // Generate a key for testing
  const key1 = cache.generateKey('test', 'search', { query: 'macbook' });
  const key2 = cache.generateKey('test', 'search', { query: 'iphone' });

  console.log('Generated keys:');
  console.log('Key 1:', key1);
  console.log('Key 2:', key2);

  // Store some test data
  console.log('\nStoring test data...');
  const testData1 = {
    results: [
      { id: 1, title: 'Macbook Pro', price: 2000 },
      { id: 2, title: 'Macbook Air', price: 1200 }
    ],
    count: 2
  };

  const testData2 = {
    results: [
      { id: 3, title: 'iPhone 13', price: 800 },
      { id: 4, title: 'iPhone 12', price: 600 }
    ],
    count: 2
  };

  cache.set(key1, testData1);
  cache.set(key2, testData2);

  // Test retrieval
  console.log('\nRetrieving data from cache:');
  const cached1 = cache.get(key1);
  console.log('Data for key1:', cached1 ? 'Found' : 'Not found');
  if (cached1) {
    console.log(`Found ${cached1.count} items for 'macbook'`);
  }

  // Test cache validation
  console.log('\nValidating cache:');
  console.log('Key1 valid:', cache.isValid(key1));
  console.log('Invalid key valid:', cache.isValid('nonexistent-key'));

  // Test cache stats
  console.log('\nCache stats:');
  const stats = cache.getStats();
  console.log(`Cache has ${stats.count} entries`);
  console.log(`Total size: ${stats.humanSize}`);

  // Test deleting single entry
  console.log('\nDeleting key1 from cache...');
  cache.delete(key1);
  console.log('Key1 valid after deletion:', cache.isValid(key1));
  console.log('Key2 valid after deletion:', cache.isValid(key2));

  // Test cache expiration
  console.log('\nTesting cache expiration (waiting 11 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 11000));
  console.log('Key2 valid after TTL expired:', cache.isValid(key2));
  const expired = cache.get(key2);
  console.log('Data for key2 after expiration:', expired ? 'Still cached (unexpected)' : 'Expired as expected');

  // Test clearing all cache
  console.log('\nStoring new data and clearing cache...');
  cache.set(key1, testData1);
  cache.set(key2, testData2);

  const clearedCount = cache.clear();
  console.log(`Cleared ${clearedCount} cache entries`);

  // Verify cache is empty
  const statsAfterClear = cache.getStats();
  console.log(`Cache now has ${statsAfterClear.count} entries`);

  console.log('\nCache Manager test completed');
}

// Run the test
testCacheManager().catch(console.error); 