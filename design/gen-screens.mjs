// Generates the static HTML mockups (v3) of the Secret Santa app: "pop / asymmetric grid" style in Christmas colours.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const DIR = new URL('.', import.meta.url).pathname;
const FONT_DIR = `${DIR}node_modules/@fontsource`;

/** Returns an @font-face rule embedding a fontsource woff2 file as base64. */
function fontFace(family, pkg, file, weight = 400) {
  const data = readFileSync(`${FONT_DIR}/${pkg}/files/${file}`).toString('base64');
  return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${data}) format('woff2');}`;
}

const FONTS = [
  fontFace('Space Grotesk', 'space-grotesk', 'space-grotesk-latin-700-normal.woff2', 700),
  fontFace('DM Sans', 'dm-sans', 'dm-sans-latin-400-normal.woff2'),
  fontFace('DM Sans', 'dm-sans', 'dm-sans-latin-700-normal.woff2', 700),
].join('\n');

const C = {
  ink: '#1e3a2f', cream: '#fff8ea', red: '#d93a3a', green: '#1f7a4d', gold: '#ffd84e',
  mint: '#d6f0dc', rose: '#ffd6d3', butter: '#ffeeb0', muted: '#6b8a7c',
};

/** FNV-1a hash of a string. */
function hash(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

const AVATAR_COLORS = [C.red, C.green, '#e0a800', '#e86a8a', '#2a9d8f'];

/** GitHub-style 5x5 symmetric identicon derived from an Instagram handle. */
function identicon(handle, size = 56) {
  const h = hash(handle);
  const color = AVATAR_COLORS[h % AVATAR_COLORS.length];
  const inner = size - 4;
  const cell = inner / 6;
  let cells = '';
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      if (!((h >> (row * 3 + col)) & 1)) continue;
      for (const c of new Set([col, 4 - col])) {
        cells += `<div style="position:absolute;left:${cell / 2 + c * cell}px;top:${cell / 2 + row * cell}px;width:${cell}px;height:${cell}px;background:${color}"></div>`;
      }
    }
  }
  return `<div class="avatar" style="width:${size}px;height:${size}px">${cells}</div>`;
}

/** Red header band with the status bar, a title and a few festive glyphs. */
function header(title, { sub = '', big = false, color = 'red', deco = true } = {}) {
  const glyphs = deco
    ? `<span class="g" style="right:22px;top:46px">✦</span><span class="g s" style="right:${big ? 70 : 160}px;top:${big ? 84 : 58}px">❄</span><span class="g s" style="right:${big ? 34 : 110}px;top:${big ? 150 : 50}px">★</span>`
    : '';
  return `<header class="hd ${color}${big ? ' big' : ''}">
    <div class="status"><span>9:41</span><span>●●● ▮</span></div>${glyphs}
    <div class="ht">${title}</div>${sub ? `<div class="hs">${sub}</div>` : ''}
  </header>`;
}

/** Strip with the event's practical info, shown under the header once logged in. */
const infoStrip = `<div class="strip"><span>📅 Sam. 20 déc.</span><span>📍 Chez Alex</span><span>💰 25 € max</span></div>`;

/** Bottom navigation; the QG tab only exists for the Mère Noël Supérieure. */
function tabBar(active) {
  const tabs = [['🎁', 'Mon tirage'], ['👯', 'La bande'], ['📝', 'Ma fiche'], ['👑', 'QG']];
  return `<nav class="tabs">${tabs
    .map(([icon, label], i) => `<div class="tab${i === active ? ' on' : ''}"><div class="ti">${icon}</div><div>${label}</div></div>`)
    .join('')}</nav>`;
}

const blk = (body, cls = '', style = '') => `<div class="blk ${cls}" style="${style}">${body}</div>`;
const btn = (label, cls = '', style = '') => `<div class="btn ${cls}" style="${style}">${label}</div>`;
const pin = (filled, total = 6) => `<div class="pin">${'<i class="f"></i>'.repeat(filled)}${'<i></i>'.repeat(total - filled)}</div>`;

/** Flat outlined gift box with a hanging tag; `tag` null means no tag yet. */
function gift(tag, { hidden = false, grey = false } = {}) {
  const box = grey ? '#cfdcd5' : C.red;
  const rib = grey ? '#eef3f0' : C.gold;
  const tagHtml = tag
    ? `<div class="string"></div><div class="gtag${hidden ? ' hidden' : ''}"><div class="hole"></div><span>Pour :</span><b>${tag}</b></div>`
    : '';
  return `<div class="gift">
    <div class="bow l" style="background:${rib}"></div><div class="bow r" style="background:${rib}"></div>
    <div class="gbox" style="background:${box}"><div class="rib v" style="background:${rib}"></div></div>
    <div class="glid" style="background:${box}"><div class="rib v" style="background:${rib}"></div></div>
    ${tagHtml}
  </div>`;
}

const countdown = `<div class="lbl">⏰ Échange des cadeaux dans</div>
<div class="count">
  <div class="cbox red"><b>38</b><span>jours</span></div>
  <div class="cbox"><b>06</b><span>heures</span></div>
  <div class="cbox"><b>13</b><span>min</span></div>
  <div class="cbox"><b>52</b><span>s</span></div>
</div>`;

const PEOPLE = [
  ['Camille', 'camille.puzzle', true, true],
  ['Alex', 'alex.paillettes', true, true],
  ['Sam', 'sam.le.vrai', true, true],
  ['Sacha', 'sacha_skate', true, false],
  ['Inès', 'ines.en.voyage', true, true],
  ['Hugo', 'hugo.cuisine', false, false],
  ['Léa', 'lea.lit.trop', true, true],
  ['Tom', 'tom.bricole', true, false],
];
const IDEAS = [1, 4, 3, 2, 5, 0, 3, 2];
const CARD_COLORS = ['butter', 'mint', 'rose', 'white', 'mint', 'rose', 'butter', 'white'];

// ---------------------------------------------------------------- screens

const screens = [];
const screen = (name, inner, cls = '') => screens.push(`<section class="screen ${cls}" data-name="${name}">${inner}</section>`);

screen('01 · Connexion (lien perso)', `
  ${header('Secret<br>Santa', { sub: 'Édition 2026 · la bande', big: true })}
  <div class="pad">
    ${blk(`<p class="lead">Ho ho ho ! 🎅<br>Connecte-toi pour découvrir à qui tu vas offrir un cadeau.</p>`, 'mint', 'width:88%')}
    ${blk(`
      <label>Ton @ Instagram</label>
      <div class="input"><span class="at">@</span>camille.puzzle</div>
      <div class="hint">✓ Rempli grâce à ton lien perso</div>`, '', 'margin-top:16px;margin-left:24px')}
    ${btn('Continuer →', '', 'margin-top:22px')}
  </div>`);

screen('02 · Première visite', `
  ${header('Bienvenue !')}
  <div class="pad">
    ${blk(`<p class="lead">Coucou <b>@camille.puzzle</b> 👋<br>Choisis un code à 6 chiffres : il te servira à te reconnecter.</p>`, 'mint', 'width:90%')}
    <div class="two">
      ${blk(`<label>Ton code</label>${pin(6)}`, '', 'margin-top:16px')}
      ${blk(`<label>Confirme ton code</label>${pin(4)}`, 'rose', 'margin-top:16px;margin-left:28px')}
    </div>
    ${btn('Créer mon accès →', '', 'margin-top:24px')}
  </div>`);

screen('03 · Pas dans la liste', `
  ${header('Oups !')}
  <div class="pad">
    <div class="bigemoji">🧝</div>
    ${blk(`<p class="lead"><b>@inconnu.du.47</b> n'est pas dans la liste des participants.</p>`, 'rose')}
    ${blk(`<p class="small">Vérifie l'orthographe de ton @, ou demande à <b>la Mère Noël Supérieure</b> de t'ajouter.</p>`, '', 'margin-top:14px;margin-left:30px')}
    ${btn('Réessayer', '', 'margin-top:22px')}
  </div>`);

screen('04 · Reconnexion', `
  ${header('Re-bonjour<br>Camille !', { big: true })}
  <div class="pad">
    <div class="avfloat">${identicon('camille.puzzle', 76)}</div>
    ${blk(`
      <label>Ton code</label>
      ${pin(3)}
      <div class="keys">${['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k) => `<span${k ? '' : ' class="none"'}>${k}</span>`).join('')}</div>`)}
    ${blk(`<p class="small">Code oublié ? <b>La Mère Noël Supérieure</b> peut le réinitialiser.</p>`, 'butter', 'margin-top:14px;margin-left:40px')}
    <div class="link">Ce n'est pas toi ? Changer de @</div>
  </div>`);

const hello = (handle) => `<div class="hello">${identicon(handle, 40)}<div><b>Salut Camille</b><span>@camille.puzzle</span></div></div>`;

screen('05 · Mon tirage — en attente', `
  ${header('Mon tirage', { deco: true })}
  ${infoStrip}
  <div class="pad">
    ${hello('camille.puzzle')}
    ${blk(`${gift(null, { grey: true })}
      <div class="bt">⏳ Patience…</div>
      <p class="small c">Le Père Noël n'a pas encore fait son tirage.</p>`, 'white center')}
    ${countdown}
  </div>
  ${tabBar(0)}`);

screen('06 · Mon tirage — à découvrir', `
  ${header('Mon tirage')}
  ${infoStrip}
  <div class="pad">
    ${hello('camille.puzzle')}
    ${blk(`<div class="new">NOUVEAU</div>${gift('*******', { hidden: true })}
      <div class="bt">Le tirage est fait !</div>
      <p class="small c">Découvre à qui tu vas offrir un cadeau.<br>Personne d'autre ne le saura 🤫</p>`, 'butter center')}
    ${btn('Découvrir le nom 🎁', 'red', 'margin-top:20px')}
  </div>
  ${tabBar(0)}`);

screen('07 · Mon tirage — révélé', `
  ${header('Tu es la Mère<br>Noël de…', { big: true, color: 'green' })}
  <div class="pad">
    <div class="confetti"><i style="left:10px;top:0;background:${C.gold}"></i><i style="left:300px;top:6px;background:${C.red}"></i><i style="left:150px;top:-6px;background:${C.rose}"></i><span style="left:60px;top:10px">✦</span><span style="left:250px;top:-4px">❄</span></div>
    ${gift('Sam')}
    ${blk(`${identicon('sam.le.vrai', 64)}<div><div class="bigname">Sam</div><div class="small">@sam.le.vrai</div></div>`, 'gold row shadow')}
    <div class="row" style="margin-top:20px">
      ${btn('💡 Ses idées', 'red')}
      ${btn('🙈 Masquer', 'white')}
    </div>
    <p class="small c" style="margin-top:14px">Chut, c'est un secret 🤐</p>
  </div>
  ${tabBar(0)}`);

screen('08 · La bande', `
  ${header('La bande <span class="count-pill">11</span>')}
  <div class="pad">
    <p class="small">Ajoute des idées sur la fiche de chacun pour aider son Père Noël secret.</p>
    <div class="grid">
      ${PEOPLE.map(([name, handle], i) => `<div class="pcard ${CARD_COLORS[i]}"${i % 2 ? ' style="margin-top:14px"' : ''}>${i === 0 ? '<div class="me">C\'est toi</div>' : ''}${identicon(handle, 44)}<div class="cn">${name}</div><div class="ch">@${handle}</div><div class="cp">💡 ${IDEAS[i]} idée${IDEAS[i] > 1 ? 's' : ''}</div></div>`).join('')}
    </div>
  </div>
  ${tabBar(1)}`);

const postit = (text, color, rot, offset) =>
  `<div class="postit ${color}" style="transform:rotate(${rot}deg);margin-left:${offset}px">${text}</div>`;

screen('09 · Fiche de Sam', `
  ${header('Sam', { sub: '‹ La bande' })}
  <div class="pad">
    <div class="prof">${identicon('sam.le.vrai', 64)}${btn('📸 Voir son Insta', 'white sm', 'margin:0')}</div>
    <div class="lbl">💡 Idées pour Sam</div>
    <p class="small" style="margin:-4px 0 10px">Sam ne voit pas ce qui est écrit ici.</p>
    ${postit('Fan de jeux de société, surtout les coopératifs 🎲', 'butter', -1.5, 0)}
    ${postit("A cassé sa gourde au ski l'hiver dernier 😅", 'rose', 1.5, 26)}
    ${postit('Couleur préférée : vert sapin 🌲', 'mint', -1, 8)}
    ${blk(`<div class="tagpill">✏️ Ton idée</div><div class="ta">Adore le café de spécialité ☕ Il cherche un moulin manuel|</div>${btn('Enregistrer', 'green sm')}`, 'white', 'margin-top:18px')}
  </div>
  ${tabBar(1)}`);

screen('10 · Ma fiche', `
  ${header('Ma fiche', { sub: 'Camille · @camille.puzzle' })}
  <div class="pad">
    ${blk(`<label>On parle de toi au…</label><div class="seg"><span>il</span><span class="on">elle</span><span>iel</span></div>`, 'mint', 'width:92%')}
    ${blk(`<div class="tagpill">✏️ Ce que tu aimes</div><div class="ta">Les puzzles (1000 pièces, je gère) et les Pokémon ⚡</div>${btn('Enregistrer', 'green sm')}`, 'white', 'margin-top:18px;margin-left:20px')}
    <div class="secret">
      <div class="ghost butter" style="transform:rotate(-4deg)">?</div>
      <div class="ghost rose" style="transform:rotate(3deg);left:120px">?</div>
      <div class="ghost mint" style="transform:rotate(-2deg);left:220px">?</div>
    </div>
    <p class="small c"><b>Les autres ont écrit 3 idées sur toi.</b><br>Surprise ! 🤫</p>
    <div class="links"><span>🔑 Changer mon code</span><span>🚪 Me déconnecter</span></div>
  </div>
  ${tabBar(2)}`);

const adminRow = ([name, handle, registered, revealed], drawDone) => {
  let cls = 'ok', label = 'Inscrit·e';
  if (!registered) [cls, label] = ['no', 'Pas inscrit·e'];
  else if (drawDone) [cls, label] = revealed ? ['ok', 'Nom découvert'] : ['wait', 'Pas encore vu'];
  const actions = drawDone ? '<div class="ax">🔑</div>' : '<div class="ax">🔗</div><div class="ax">✕</div>';
  return `<div class="arow">${identicon(handle, 32)}<div class="an"><b>${name}</b><span>@${handle}</span></div><div class="st ${cls}">${label}</div>${actions}</div>`;
};

screen('11 · QG — avant tirage', `
  ${header('Le QG 👑', { sub: 'Réservé à la Mère Noël Supérieure' })}
  <div class="pad">
    ${blk(`<label>Ajouter un·e participant·e</label>
      <div class="row2"><div class="input sm">Prénom</div><div class="input sm"><span class="at">@</span>instagram</div></div>
      ${btn('Ajouter', 'green sm')}`, 'mint')}
    ${blk(`<div class="lh">11 participants · 9 inscrits</div><div class="legend">🔗 copier son lien perso · ✕ retirer</div>
      ${PEOPLE.slice(0, 4).map((p) => adminRow(p, false)).join('')}<div class="more">+ 7 autres</div>`, 'white', 'margin-top:14px;margin-left:16px')}
    ${btn('🎲 Lancer le tirage', 'red', 'margin-top:18px')}
  </div>
  ${tabBar(3)}`);

screen('12 · QG — confirmer le tirage', `
  ${header('Le QG 👑', { sub: 'Réservé à la Mère Noël Supérieure' })}
  <div class="dim"></div>
  <div class="pad modal">
    ${blk(`<div class="bt" style="text-align:left">🎲 Lancer le tirage ?</div>
      <ul class="warn">
        <li><b>Hugo et Zoé</b> ne sont pas encore inscrits. Ils découvriront leur nom en s'inscrivant.</li>
        <li>La liste sera <b>figée</b> : plus d'ajout ni de retrait.</li>
        <li>Toi non plus, tu ne sauras pas qui a tiré qui 🙈</li>
      </ul>
      <div class="row">${btn('Annuler', 'white sm')}${btn('Lancer', 'red sm')}</div>`, 'cream shadow')}
  </div>
  ${tabBar(3)}`);

screen('13 · QG — après tirage', `
  ${header('Le QG 👑', { sub: 'Réservé à la Mère Noël Supérieure' })}
  <div class="pad">
    <div class="locked">🔒 Tirage fait le 14/11 · liste figée</div>
    ${blk(`<div class="lh">7 noms découverts sur 11</div><div class="legend">🔑 réinitialiser son code (en cas d'oubli)</div>
      ${PEOPLE.slice(2, 6).map((p) => adminRow(p, true)).join('')}<div class="more">+ 7 autres</div>`, 'white')}
    ${blk(`<label>L'échange des cadeaux</label>
      <div class="row2"><div class="input sm">💰 25 €</div><div class="input sm">📅 20/12/2026</div></div>
      <div class="input sm">📍 Chez Alex</div>${btn('Enregistrer', 'green sm')}`, 'butter', 'margin-top:14px;margin-left:16px')}
    <p class="small c" style="margin-top:12px">Le site ferme et les données sont supprimées le 23/12.</p>
    <div class="danger">Tout supprimer maintenant</div>
  </div>
  ${tabBar(3)}`);

screen('14 · Site fermé', `
  ${header("C'est fini !", { big: true, color: 'green' })}
  <div class="pad">
    <div class="bigemoji">🎄</div>
    ${blk(`<p class="lead">Merci et joyeux Noël à toute la bande 🥂</p>`, 'butter', 'width:90%')}
    ${blk(`<p class="small">Le Secret Santa 2026 est terminé : toutes les données ont été supprimées.</p>`, 'white', 'margin-top:14px;margin-left:30px')}
  </div>`);

// ---------------------------------------------------------------- style guide

const swatch = (c, n) => `<div class="sw"><div style="background:${c}"></div><span>${n}<br>${c}</span></div>`;
screens.unshift(`<section class="screen guide" data-name="00 · Guide de style">
  ${header('Guide de style', { deco: true })}
  <div class="pad">
    <div class="lbl">Couleurs</div>
    <div class="sws">${swatch(C.ink, 'Sapin foncé')}${swatch(C.red, 'Rouge')}${swatch(C.green, 'Vert')}${swatch(C.gold, 'Or')}${swatch(C.cream, 'Crème')}${swatch(C.mint, 'Menthe')}${swatch(C.rose, 'Rose')}${swatch(C.butter, 'Beurre')}</div>
    <div class="lbl">Typos</div>
    <div class="ty1">Space Grotesk — titres</div>
    <div class="ty2">DM Sans — texte courant</div>
    <div class="lbl">Boutons (ombre dure décalée)</div>
    <div class="row wrap">${btn('Principal', 'sm')}${btn('Important', 'red sm')}${btn('Valider', 'green sm')}${btn('Secondaire', 'white sm')}</div>
    <div class="lbl">Blocs</div>
    <div class="row wrap">${['white', 'mint', 'rose', 'butter'].map((c) => blk(c, c + ' tiny')).join('')}</div>
    <div class="lbl">Avatars (générés depuis le @)</div>
    <div class="row wrap">${PEOPLE.slice(0, 6).map(([, h]) => identicon(h, 40)).join('')}</div>
    <div class="lbl">Animations</div>
    <ul class="anim">
      <li>Neige légère derrière le bandeau rouge</li>
      <li>Découverte du nom : le cadeau tremble, l'étiquette se retourne, confettis</li>
      <li>Les blocs arrivent en « pop » (léger rebond)</li>
    </ul>
  </div>
</section>`);

// ---------------------------------------------------------------- page

const css = `
${FONTS}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#e4e8e2;padding:60px;display:flex;flex-wrap:wrap;gap:60px;font-family:'DM Sans',sans-serif;color:${C.ink}}
.screen{width:390px;height:844px;position:relative;overflow:hidden;border-radius:40px;background:${C.cream};border:2px solid ${C.ink}}
.screen.guide{height:auto;min-height:844px}
.hd{position:relative;padding:0 20px 18px;color:${C.cream};border-bottom:2px solid ${C.ink}}
.hd.red{background:${C.red}}
.hd.green{background:${C.green}}
.hd .status{display:flex;justify-content:space-between;padding:14px 8px 10px;font-size:14px;font-weight:700}
.hd .ht{font-family:'Space Grotesk';font-weight:700;font-size:34px;line-height:1.05;display:flex;align-items:center;gap:10px}
.hd.big .ht{font-size:48px;display:block;margin-top:6px}
.hd .hs{margin-top:6px;font-size:15px;font-weight:700;color:${C.gold}}
.hd .g{position:absolute;font-size:26px;color:${C.gold}}
.hd .g.s{font-size:18px;color:${C.cream}}
.count-pill{font-family:'DM Sans';font-size:14px;background:${C.gold};color:${C.ink};border:2px solid ${C.ink};border-radius:999px;padding:2px 10px}
.strip{display:flex;justify-content:space-between;background:${C.gold};border-bottom:2px solid ${C.ink};padding:8px 16px;font-size:13px;font-weight:700}
.pad{position:relative;padding:18px 16px 0}
.blk{position:relative;border:2px solid ${C.ink};border-radius:20px;padding:16px;background:#fff}
.blk.mint{background:${C.mint}}
.blk.rose{background:${C.rose}}
.blk.butter{background:${C.butter}}
.blk.gold{background:${C.gold}}
.blk.cream{background:${C.cream}}
.blk.white{background:#fff}
.blk.shadow{box-shadow:6px 6px 0 ${C.ink}}
.blk.center{display:flex;flex-direction:column;align-items:center}
.blk.row{display:flex;align-items:center;gap:14px}
.blk.tiny{padding:10px 14px;font-size:13px;font-weight:700}
.lead{font-size:17px;line-height:1.45}
.small{font-size:14px;line-height:1.45;color:#3d5a4e}
.c{text-align:center}
label{display:block;font-weight:700;font-size:14px;margin-bottom:8px}
.lbl{font-weight:700;font-size:15px;margin:18px 0 8px}
.input{height:50px;border:2px solid ${C.ink};border-radius:14px;background:${C.cream};padding:0 14px;display:flex;align-items:center;font-size:17px}
.input.sm{height:42px;font-size:14px;color:${C.muted};flex:1;margin-bottom:8px}
.at{color:${C.red};font-weight:700;margin-right:4px}
.hint{margin-top:8px;font-size:13px;font-weight:700;color:${C.green}}
.btn{display:flex;justify-content:center;align-items:center;height:56px;padding:0 18px;border:2px solid ${C.ink};border-radius:18px;background:${C.gold};
  font-family:'Space Grotesk';font-weight:700;font-size:19px;color:${C.ink};box-shadow:5px 5px 0 ${C.ink}}
.btn.red{background:${C.red};color:${C.cream}}
.btn.green{background:${C.green};color:${C.cream}}
.btn.white{background:#fff}
.btn.sm{height:42px;font-size:15px;border-radius:14px;box-shadow:3px 3px 0 ${C.ink};margin-top:12px}
.pin{display:flex;gap:6px}
.pin i{flex:1;height:44px;border:2px solid ${C.muted};border-radius:10px;background:${C.cream};position:relative}
.pin i.f::after{content:'';position:absolute;left:50%;top:50%;width:12px;height:12px;margin:-6px;border-radius:50%;background:${C.green}}
.two .blk{width:calc(100% - 28px)}
.seg{display:flex;gap:8px}
.seg span{flex:1;text-align:center;padding:10px 0;border:2px solid ${C.green};border-radius:999px;font-weight:700;background:#fff}
.seg span.on{background:${C.green};color:${C.cream}}
.keys{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
.keys span{height:44px;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk';font-weight:700;font-size:20px;
  background:${C.cream};border:2px solid ${C.ink};border-radius:12px}
.keys span.none{visibility:hidden}
.avatar{position:relative;flex:none;background:#fff;border:2px solid ${C.ink};border-radius:12px}
.avfloat{position:absolute;right:24px;top:-52px;z-index:2}
.link{margin-top:16px;font-size:14px;font-weight:700;color:${C.red};text-decoration:underline}
.bigemoji{font-size:64px;margin:0 0 10px 6px}
.hello{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.hello b{display:block;font-family:'Space Grotesk';font-size:20px}
.hello span{font-size:13px;color:${C.muted}}
.gift{position:relative;width:230px;height:150px;margin:0 auto}
.gbox{position:absolute;left:30px;top:62px;width:110px;height:84px;border:2px solid ${C.ink};border-radius:8px}
.glid{position:absolute;left:20px;top:36px;width:130px;height:30px;border:2px solid ${C.ink};border-radius:8px}
.rib.v{position:absolute;left:50%;top:-2px;bottom:-2px;width:20px;margin-left:-10px;border-left:2px solid ${C.ink};border-right:2px solid ${C.ink}}
.bow{position:absolute;top:8px;width:40px;height:30px;border:2px solid ${C.ink};border-radius:50% 50% 50% 50%}
.bow.l{left:46px;transform:rotate(-20deg)}
.bow.r{left:84px;transform:rotate(20deg)}
.string{position:absolute;left:140px;top:84px;width:30px;height:2px;background:${C.ink};transform:rotate(20deg);transform-origin:left center}
.gtag{position:absolute;left:160px;top:84px;width:84px;min-height:56px;background:${C.cream};border:2px solid ${C.ink};border-radius:6px 14px 14px 6px;
  display:flex;flex-direction:column;justify-content:center;padding:4px 6px 4px 16px;transform:rotate(8deg)}
.gtag .hole{position:absolute;left:5px;top:50%;width:7px;height:7px;margin-top:-4px;border-radius:50%;border:2px solid ${C.ink}}
.gtag span{font-size:11px;font-weight:700;color:${C.red}}
.gtag b{font-family:'Space Grotesk';font-size:16px;line-height:1.1}
.gtag.hidden b{letter-spacing:1px;color:${C.green}}
.bt{font-family:'Space Grotesk';font-weight:700;font-size:24px;margin-top:6px;text-align:center}
.new{position:absolute;right:-10px;top:-14px;background:${C.red};color:${C.cream};border:2px solid ${C.ink};border-radius:999px;padding:4px 10px;
  font-size:12px;font-weight:700;transform:rotate(8deg)}
.count{display:flex;gap:8px}
.cbox{flex:1;background:#fff;border:2px solid ${C.ink};border-radius:14px;padding:8px 0;text-align:center}
.cbox.red{background:${C.red};color:${C.cream}}
.cbox b{display:block;font-family:'Space Grotesk';font-size:26px}
.cbox span{font-size:12px}
.confetti{position:relative;height:18px}
.confetti i{position:absolute;width:14px;height:14px;border:2px solid ${C.ink};border-radius:3px;transform:rotate(20deg)}
.confetti span{position:absolute;font-size:20px;color:${C.red}}
.bigname{font-family:'Space Grotesk';font-weight:700;font-size:40px;line-height:1.1}
.row{display:flex;gap:12px}
.row .btn{flex:1}
.row.wrap{flex-wrap:wrap}
.row.wrap .btn,.row.wrap .blk{flex:none}
.tabs{position:absolute;left:0;right:0;bottom:0;height:84px;display:flex;gap:6px;padding:8px 10px 22px;background:${C.cream};border-top:2px solid ${C.ink}}
.tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12px;font-weight:700;border-radius:14px;border:2px solid transparent}
.tab .ti{font-size:20px}
.tab.on{background:${C.gold};border-color:${C.ink}}
.grid{display:grid;grid-template-columns:1fr 1fr;column-gap:12px;row-gap:12px;margin-top:12px}
.pcard{position:relative;border:2px solid ${C.ink};border-radius:18px;padding:10px;display:flex;flex-direction:column;align-items:flex-start;height:130px}
.pcard.butter{background:${C.butter}}.pcard.mint{background:${C.mint}}.pcard.rose{background:${C.rose}}.pcard.white{background:#fff}
.me{position:absolute;right:-6px;top:-10px;background:${C.green};color:${C.cream};border:2px solid ${C.ink};border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;transform:rotate(6deg)}
.cn{font-family:'Space Grotesk';font-weight:700;font-size:17px;margin-top:6px}
.ch{font-size:12px;color:#3d5a4e}
.cp{font-size:12px;font-weight:700;margin-top:4px}
.prof{display:flex;align-items:center;gap:14px}
.postit{border:2px solid ${C.ink};border-radius:14px;padding:12px 14px;font-size:16px;line-height:1.35;margin-bottom:10px;width:calc(100% - 26px)}
.postit.butter{background:${C.butter}}.postit.rose{background:${C.rose}}.postit.mint{background:${C.mint}}
.tagpill{position:absolute;top:-13px;left:14px;background:${C.red};color:${C.cream};border:2px solid ${C.ink};border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700}
.ta{font-size:16px;line-height:1.4;min-height:44px;margin-top:4px}
.secret{position:relative;height:96px;margin-top:22px}
.ghost{position:absolute;left:20px;top:6px;width:110px;height:80px;border:2px dashed ${C.ink};border-radius:14px;display:flex;align-items:center;justify-content:center;
  font-family:'Space Grotesk';font-weight:700;font-size:34px;opacity:.7}
.ghost.butter{background:${C.butter}}.ghost.rose{background:${C.rose}}.ghost.mint{background:${C.mint}}
.links{display:flex;justify-content:space-between;margin-top:14px;font-size:14px;font-weight:700;color:${C.red}}
.row2{display:flex;gap:8px}
.lh{font-family:'Space Grotesk';font-weight:700;font-size:16px}
.legend{font-size:12px;color:#3d5a4e;margin:2px 0 8px}
.arow{display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1.5px solid #e2e8e4}
.arow .avatar{border-radius:8px}
.an{flex:1;display:flex;flex-direction:column;font-size:14px;line-height:1.2}
.an span{font-size:11px;color:#3d5a4e}
.st{font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;border:1.5px solid ${C.ink};white-space:nowrap}
.st.ok{background:${C.mint}}
.st.no{background:${C.rose}}
.st.wait{background:${C.butter}}
.ax{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:1.5px solid ${C.ink};background:${C.cream};font-size:12px}
.more{padding-top:8px;font-size:12px;color:#3d5a4e;text-align:center}
.dim{position:absolute;inset:0;background:rgba(30,58,47,.55);z-index:2}
.modal{z-index:3;margin-top:120px}
.warn{margin:12px 0 16px 18px;font-size:15px;line-height:1.45}
.warn li{margin-bottom:8px}
.locked{display:inline-block;margin-bottom:12px;background:${C.ink};color:${C.cream};font-size:13px;font-weight:700;padding:6px 12px;border-radius:999px}
.danger{margin-top:8px;text-align:center;font-weight:700;color:${C.red};text-decoration:underline;font-size:14px}
.sws{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.sw div{height:44px;border-radius:12px;border:2px solid ${C.ink}}
.sw span{font-size:11px;line-height:1.3}
.ty1{font-family:'Space Grotesk';font-weight:700;font-size:24px}
.ty2{font-size:16px;margin-top:4px}
.guide .avatar{margin-right:4px}
.anim{margin:0 0 30px 18px;font-size:14px;line-height:1.5}
`;

mkdirSync(`${DIR}out`, { recursive: true });
writeFileSync(
  `${DIR}out/screens.html`,
  `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Secret Santa — maquettes</title><style>${css}</style></head><body>${screens.join('\n')}</body></html>`,
);
console.log('ok', screens.length, 'screens');
