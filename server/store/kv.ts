/** Options of a write: when the value disappears, as a Unix time in milliseconds. */
export interface WriteOptions {
  expireAt?: number;
}

/** The small key-value API the app needs, backed by Upstash Redis or by memory. */
export interface KeyValueStore {
  /** Reads a JSON value, or null when the key is missing or expired. */
  get<T>(key: string): Promise<T | null>;
  /** Writes a JSON value, optionally with an expiry. */
  set(key: string, value: unknown, options?: WriteOptions): Promise<void>;
  /** Deletes keys; missing keys are ignored. */
  del(...keys: string[]): Promise<void>;
  /** Increments a counter and returns its new value; a new counter expires after `ttlSeconds`. */
  incr(key: string, ttlSeconds: number): Promise<number>;
}
