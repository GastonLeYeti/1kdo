// Links that open an address in the device's map app.

/** True on iPhone, iPad and Mac, where Apple Plans is the default map app. */
export function isAppleDevice(userAgent: string): boolean {
  return /iPhone|iPad|iPod|Macintosh/.test(userAgent);
}

/** A search link for `place`: Apple Plans on Apple devices, Google Maps elsewhere. */
export function mapsUrl(place: string, userAgent: string): string {
  const query = encodeURIComponent(place.trim());
  return isAppleDevice(userAgent)
    ? `https://maps.apple.com/?q=${query}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;
}
