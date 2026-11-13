// Fills a running dev server (npm run dev) with a fictional event, to try the app by hand.
// Usage: node scripts/demo.mjs [baseUrl]   — every name and @ here is made up.
const BASE = process.argv[2] ?? 'http://localhost:5173';
const ADMIN = { handle: 'admin.demo', invite: 'dev-admin', code: '000000' };
const PEOPLE = [
  ['Camille', 'camille.puzzle'], ['Alex', 'alex.paillettes'], ['Sam', 'sam.le.vrai'], ['Sacha', 'sacha_skate'],
  ['Inès', 'ines.en.voyage'], ['Hugo', 'hugo.cuisine'], ['Léa', 'lea.lit.trop'], ['Tom', 'tom.bricole'],
];
const CODE = '123456';

/** Calls the API; returns the JSON body and the session cookie it set, if any. */
async function call(method, path, body, cookie) {
  const response = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: `kdo_session=${cookie}` } : {}) },
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${json.message}`);
  const setCookie = response.headers.get('set-cookie');
  return { json, cookie: setCookie ? decodeURIComponent(setCookie.split(';')[0].split('=')[1]) : null };
}

/** Signs a handle up (or in, when it already has a code) and returns its cookie. */
async function signIn(handle, invite, code) {
  const { json } = await call('POST', '/auth/check', { handle, invite });
  const path = json.state === 'login' ? '/auth/login' : '/auth/register';
  return (await call('POST', path, { handle, code, invite })).cookie;
}

const admin = await signIn(ADMIN.handle, ADMIN.invite, ADMIN.code);
await call('PATCH', '/me', { pronoun: 'elle' }, admin);
const nextYear = new Date().getFullYear() + (new Date().getMonth() === 11 && new Date().getDate() > 20 ? 1 : 0);
const { json: event } = await call('POST', '/admin/events', {
  title: 'Secret Santa démo', theme: 'noel', date: `${nextYear}-12-20`, time: '19:00', place: 'Chez Alex', budget: '25 € max', giftsPerPerson: 1,
}, admin);
for (const [name, handle] of PEOPLE) await call('POST', `/admin/events/${event.id}/participants`, { name, handle }, admin);
const { json: full } = await call('GET', `/admin/events/${event.id}`, undefined, admin);
const cookies = {};
for (const [, handle] of PEOPLE.slice(0, 6)) cookies[handle] = await signIn(handle, full.inviteCode, CODE);
await call('PUT', `/events/${event.id}/people/sam.le.vrai/idea`, { text: 'Fan de jeux de société, surtout les coopératifs 🎲' }, cookies['alex.paillettes']);
await call('PUT', `/events/${event.id}/people/sam.le.vrai/idea`, { text: "A cassé sa gourde au ski l'hiver dernier 😅" }, cookies['ines.en.voyage']);
await call('PUT', `/events/${event.id}/people/sam.le.vrai/idea`, { text: 'Couleur préférée : vert sapin 🌲' }, cookies['sam.le.vrai']);
await call('PUT', `/events/${event.id}/people/camille.puzzle/idea`, { text: 'Les puzzles (1000 pièces) et les Pokémon ⚡' }, cookies['camille.puzzle']);
await call('PUT', `/events/${event.id}/people/camille.puzzle/idea`, { text: 'Adore le café de spécialité ☕' }, cookies['sam.le.vrai']);

console.log(`Event:   ${BASE}/e/${event.id}`);
console.log(`Admin:   @${ADMIN.handle}, code ${ADMIN.code}  (first sign-up link: ${BASE}/?i=${ADMIN.invite}&u=${ADMIN.handle})`);
console.log(`Others:  @camille.puzzle … code ${CODE}; @lea.lit.trop and @tom.bricole are not signed up yet:`);
console.log(`         ${BASE}/e/${event.id}?i=${full.inviteCode}&u=lea.lit.trop`);
