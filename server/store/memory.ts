import type { KeyValueStore, WriteOptions } from './kv.js';

interface Entry {
  json: string;
  expireAt: number | null;
}

/** In-memory store used for local development and tests (data is lost on restart). */
export class MemoryStore implements KeyValueStore {
  private readonly entries = new Map<string, Entry>();

  /** Returns the live entry of a key, dropping it when expired. */
  private live(key: string): Entry | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expireAt !== null && entry.expireAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.live(key);
    return entry ? (JSON.parse(entry.json) as T) : null;
  }

  async set(key: string, value: unknown, options: WriteOptions = {}): Promise<void> {
    this.entries.set(key, { json: JSON.stringify(value), expireAt: options.expireAt ?? null });
  }

  async del(...keys: string[]): Promise<void> {
    for (const key of keys) this.entries.delete(key);
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const entry = this.live(key);
    const count = entry ? Number(JSON.parse(entry.json)) + 1 : 1;
    const expireAt = entry?.expireAt ?? Date.now() + ttlSeconds * 1000;
    this.entries.set(key, { json: String(count), expireAt });
    return count;
  }
}
