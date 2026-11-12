import { upstashCredentials } from '../config.js';
import type { KeyValueStore } from './kv.js';
import { MemoryStore } from './memory.js';
import { UpstashStore } from './upstash.js';

let store: KeyValueStore | null = null;

/** The app's store: Upstash when configured, memory otherwise (one per process). */
export function getStore(): KeyValueStore {
  if (!store) {
    const credentials = upstashCredentials();
    store = credentials ? new UpstashStore(credentials.url, credentials.token) : new MemoryStore();
  }
  return store;
}

export type { KeyValueStore } from './kv.js';
