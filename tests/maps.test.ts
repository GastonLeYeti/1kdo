import { describe, expect, it } from 'vitest';
import { mapsUrl } from '../src/lib/maps';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9)';

describe('mapsUrl', () => {
  it('opens Apple Plans on Apple devices', () => {
    expect(mapsUrl('12 rue Fictive, Villeimaginaire', IPHONE)).toBe('https://maps.apple.com/?q=12%20rue%20Fictive%2C%20Villeimaginaire');
  });

  it('opens Google Maps elsewhere', () => {
    expect(mapsUrl(' Chez Alpha ', ANDROID)).toBe('https://www.google.com/maps/search/?api=1&query=Chez%20Alpha');
  });
});
