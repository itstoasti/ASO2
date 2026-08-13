// In-memory cache for keyword research queries
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SimpleLRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxAgeMs = 60 * 60 * 1000; // 1 hour TTL

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.maxAgeMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T): void {
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const researchCache = new SimpleLRUCache<any>();
