const CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
let hits = 0;
let misses = 0;

function key(prefix: string, id: string): string {
  return `${prefix}::${id}`;
}

export const cache = {
  get<T>(prefix: string, id: string): T | undefined {
    const k = key(prefix, id);
    const entry = store.get(k) as CacheEntry<T> | undefined;
    if (!entry) { misses++; return undefined; }
    if (Date.now() > entry.expiresAt) {
      store.delete(k);
      misses++;
      return undefined;
    }
    hits++;
    return entry.value;
  },

  set<T>(prefix: string, id: string, value: T, ttlMs = CACHE_TTL_MS): void {
    store.set(key(prefix, id), { value, expiresAt: Date.now() + ttlMs });
  },

  clear(prefix?: string): void {
    if (!prefix) { store.clear(); hits = 0; misses = 0; return; }
    for (const k of store.keys()) {
      if (k.startsWith(prefix + '::')) store.delete(k);
    }
  },

  stats(): { size: number; hits: number; misses: number; hitRate: string } {
    const total = hits + misses;
    return {
      size: store.size,
      hits,
      misses,
      hitRate: total === 0 ? '0%' : `${((hits / total) * 100).toFixed(1)}%`,
    };
  },
};
