import { Redis } from '@upstash/redis';
import type { KeyValueStore, WriteOptions } from './kv.js';

/** Store backed by Upstash Redis over its REST API. */
export class UpstashStore implements KeyValueStore {
  private readonly redis: Redis;

  constructor(url: string, token: string) {
    this.redis = new Redis({ url, token });
  }

  async get<T>(key: string): Promise<T | null> {
    return (await this.redis.get<T>(key)) ?? null;
  }

  async set(key: string, value: unknown, options: WriteOptions = {}): Promise<void> {
    if (options.expireAt === undefined) {
      await this.redis.set(key, value);
      return;
    }
    // A date already in the past would make Redis refuse the write: keep it a second.
    await this.redis.set(key, value, { pxat: Math.max(options.expireAt, Date.now() + 1000) });
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) await this.redis.del(...keys);
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, ttlSeconds);
    return count;
  }
}
