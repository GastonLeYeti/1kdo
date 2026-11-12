import { createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keyLength: number) => Promise<Buffer>;
const KEY_LENGTH = 32;
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/** Hashes a sign-in code with scrypt and a random salt, as "salt:hash" in base64url. */
export async function hashCode(code: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(code, salt, KEY_LENGTH);
  return `${salt.toString('base64url')}:${hash.toString('base64url')}`;
}

/** Checks a sign-in code against a stored "salt:hash", in constant time. */
export async function verifyCode(code: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = await scryptAsync(code, Buffer.from(salt, 'base64url'), expected.length);
  return timingSafeEqual(actual, expected);
}

/** A random identifier of `length` unambiguous lowercase letters and digits. */
export function randomId(length: number): string {
  let id = '';
  for (let i = 0; i < length; i++) id += ALPHABET[randomInt(ALPHABET.length)];
  return id;
}

/** HMAC-SHA256 signature of `payload`, in base64url. */
export function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Compares two strings in constant time. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
