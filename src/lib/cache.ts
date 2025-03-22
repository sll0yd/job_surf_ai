import { JobData } from './types';

// Cache interface with expiration
interface CacheEntry {
  data: JobData;
  timestamp: number;
}

// Cache TTL in milliseconds (24 hours)
const CACHE_TTL = 24 * 60 * 60 * 1000;

// Maximum number of entries to store in the cache
const MAX_CACHE_SIZE = 100;

class JobCache {
  private cache: Map<string, CacheEntry>;
  private keys: string[];

  constructor() {
    this.cache = new Map<string, CacheEntry>();
    this.keys = [];
  }

  /**
   * Set a value in the cache
   */
  set(key: string, data: JobData): void {
    // If cache is at capacity, remove oldest entry
    if (this.keys.length >= MAX_CACHE_SIZE && !this.cache.has(key)) {
      const oldestKey = this.keys.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    // Add new key to the end of the keys array (most recent)
    if (!this.cache.has(key)) {
      this.keys.push(key);
    }

    // Store the data with a timestamp
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get a value from the cache if it exists and is not expired
   */
  get(key: string): JobData | null {
    const entry = this.cache.get(key);
    
    // Return null if not in cache or expired
    if (!entry || Date.now() - entry.timestamp > CACHE_TTL) {
      if (entry) {
        // Remove expired entry
        this.cache.delete(key);
        this.keys = this.keys.filter(k => k !== key);
      }
      return null;
    }
    
    return entry.data;
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.keys = [];
  }

  /**
   * Get the number of items in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    this.keys = this.keys.filter(key => {
      const entry = this.cache.get(key);
      if (entry && now - entry.timestamp > CACHE_TTL) {
        this.cache.delete(key);
        return false;
      }
      return true;
    });
  }
}

// Export a singleton instance
export const jobCache = new JobCache();

// Optional: Run cleanup periodically
if (typeof window === 'undefined') { // Server-side only
  // Clean up every hour
  setInterval(() => {
    jobCache.cleanup();
  }, 60 * 60 * 1000);
}