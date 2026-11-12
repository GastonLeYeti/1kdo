// Generates one style-guide screen per theme of "Un kdo pour qui ?" (pop / asymmetric-grid style).
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

/**
 * A theme = colours + vocabulary. `giver` gives the "Tu es … de" title for il / elle / iel,
 * `boss` the organiser's title (same three forms), `glyphs` the header decorations.
 */
const THEMES = [
  {
    id: 'noel', name: 'Noël', example: 'Secret Santa 2026', emoji: '🎄',
    ink: '#1e3a2f', bg: '#fff8ea', head: '#d93a3a', headText: '#fff8ea', accent: '#ffd84e', cta: '#ffd84e', strong: '#1f7a4d',
    blocks: ['#d6f0dc', '#ffd6d3', '#ffeeb0'], glyphs: ['✦', '❄', '★'],
    giver: ['le Père Noël', 'la Mère Noël', "l'Esprit de Noël"],
    boss: ['le Père Noël Suprême', 'la Mère Noël Supérieure', "l'Esprit de Noël Suprême"],
  },
  {
    id: 'anniv', name: 'Anniversaire', example: 'Les 30 ans de Alex', emoji: '🎂',
    ink: '#2d1b4e', bg: '#fff7f0', head: '#ff6b4a', headText: '#fff7f0', accent: '#ffe45c', cta: '#ffe45c', strong: '#7a4fd6',
    blocks: ['#e6dcff', '#cfe8ff', '#ffe0d6'], glyphs: ['✺', '♪', '✦'],
    giver: ['le Bon Génie', 'la Bonne Fée', "l'Âme généreuse"],
    boss: ['le Roi de la fête', 'la Reine de la fête', 'la Star de la fête'],
  },
  {
    id: 'paques', name: 'Pâques', example: 'Chasse aux kdos de Pâques', emoji: '🐣',
    ink: '#3a2d5c', bg: '#fbfaf2', head: '#9b7ed9', headText: '#fbfaf2', accent: '#ffe066', cta: '#ffe066', strong: '#4fa36b',
    blocks: ['#dff3d8', '#ffe3ef', '#fff4bf'], glyphs: ['✿', '●', '✦'],
    giver: ['le Lapin', 'la Cloche', "l'Œuf surprise"],
    boss: ['le Grand Lapin', 'la Grande Cloche', "l'Œuf en chef"],
  },
  {
    id: 'love', name: 'Saint-Valentin', example: "Galentine's day entre potes", emoji: '💘',
    ink: '#4a1530', bg: '#fff5f7', head: '#e83e8c', headText: '#fff5f7', accent: '#ffc2d6', cta: '#ffc2d6', strong: '#c2185b',
    blocks: ['#ffe0ea', '#ffe9d6', '#f3e0ff'], glyphs: ['♥', '✦', '♡'],
    giver: ['le Cupidon', 'la Cupidonne', "l'Ange Cupidon"],
    boss: ['le Cupidon en chef', 'la Cupidonne en chef', "l'Archange de l'amour"],
  },
  {
    id: 'bureau', name: 'Bureau', example: 'Kdos de fin d’année du bureau', emoji: '💼',
    ink: '#1b2a44', bg: '#f6f7fb', head: '#2b4c8c', headText: '#f6f7fb', accent: '#f4b740', cta: '#f4b740', strong: '#2b4c8c',
    blocks: ['#dbe6ff', '#fdecc8', '#e2f1ea'], glyphs: ['■', '●', '▲'],
    giver: ['le Collègue mystère', 'la Collègue mystère', "l'Agent·e mystère"],
    boss: ['le Boss des kdos', 'la Boss des kdos', 'le·la Boss des kdos'],
  },
  {
    id: 'pop', name: 'Pop (neutre)', example: 'Un kdo pour qui ?', emoji: '🎁',
    ink: '#34244f', bg: '#fff8ea', head: '#ffd84e', headText: '#34244f', accent: '#c7ed85', cta: '#c7ed85', strong: '#7739b5',
    blocks: ['#e9ddf9', '#ffd4bf', '#ffffff'], glyphs: ['✦', '●', '★'],
    giver: ['le Lutin du kdo', 'la Lutine du kdo', "l'Esprit du kdo"],
    boss: ['le Grand Chef des kdos', 'la Grande Cheffe des kdos', 'le·la Grand·e Chef·fe des kdos'],
  },
];

/** Style-guide screen for one theme. */
function guide(t) {
  const swatches = [['Encre', t.ink], ['Fond', t.bg], ['Bandeau', t.head], ['Bouton', t.cta], ['Fort', t.strong], ...t.blocks.map((b, i) => [`Bloc ${i + 1}`, b])]
    .map(([n, c]) => `<div class="sw"><div style="background:${c}"></div><span>${n}<br>${c}</span></div>`).join('');
  const pron = ['il', 'elle', 'iel'];
  return `<section class="screen" style="--ink:${t.ink};--bg:${t.bg};--head:${t.head};--headText:${t.headText};--accent:${t.accent};--cta:${t.cta};--strong:${t.strong};--b1:${t.blocks[0]};--b2:${t.blocks[1]};--b3:${t.blocks[2]}">
  <header class="hd">
    <div class="status"><span>9:41</span><span>●●● ▮</span></div>
    <span class="g" style="right:18px;top:46px">${t.glyphs[0]}</span><span class="g s" style="right:52px;top:70px">${t.glyphs[1]}</span><span class="g s" style="right:22px;top:96px">${t.glyphs[2]}</span>
    <div class="kicker">Thème</div>
    <div class="ht">${t.emoji} ${t.name}</div>
    <div class="hs">Ex. de titre choisi par l'admin : « ${t.example} »</div>
  </header>
  <div class="pad">
    <div class="lbl">Couleurs</div>
    <div class="sws">${swatches}</div>

    <div class="lbl">Le vocabulaire</div>
    <div class="blk b1" style="width:94%">
      <div class="voc-h">À la découverte du nom</div>
      ${pron.map((p, i) => `<div class="voc"><span class="pp">${p}</span>Tu es <b>${t.giver[i]}</b> de…</div>`).join('')}
    </div>
    <div class="blk b2" style="margin-top:12px;margin-left:22px">
      <div class="voc-h">Titre de l'admin (onglet QG)</div>
      ${pron.map((p, i) => `<div class="voc"><span class="pp">${p}</span><b>${t.boss[i].charAt(0).toUpperCase() + t.boss[i].slice(1)}</b></div>`).join('')}
    </div>

    <div class="lbl">Boutons</div>
    <div class="row"><div class="btn">Principal</div><div class="btn head">Important</div><div class="btn strong">Valider</div></div>

    <div class="lbl">Aperçu de la découverte</div>
    <div class="reveal">
      <div class="gift">
        <div class="bow l"></div><div class="bow r"></div>
        <div class="gbox"><div class="rib"></div></div><div class="glid"><div class="rib"></div></div>
        <div class="string"></div><div class="gtag"><span>Pour :</span><b>Sam</b></div>
      </div>
      <div class="namecard"><div class="av"></div><div><div class="nm">Sam</div><div class="hd2">@sam.le.vrai</div></div></div>
    </div>

    <div class="lbl">Navigation</div>
    <div class="tabs"><div class="tab on">🎁<br>Mon tirage</div><div class="tab">👯<br>La bande</div><div class="tab">📝<br>Ma fiche</div><div class="tab">👑<br>QG</div></div>
  </div>
</section>`;
}

const css = `
${FONTS}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#e4e8e2;padding:60px;display:flex;flex-wrap:wrap;gap:60px;align-items:flex-start;font-family:'DM Sans',sans-serif}
.screen{width:390px;position:relative;overflow:hidden;border-radius:40px;background:var(--bg);border:2px solid var(--ink);color:var(--ink);padding-bottom:28px}
.hd{position:relative;background:var(--head);color:var(--headText);padding:0 20px 18px;border-bottom:2px solid var(--ink)}
.status{display:flex;justify-content:space-between;padding:14px 8px 10px;font-size:14px;font-weight:700}
.g{position:absolute;font-size:26px;color:var(--accent)}
.g.s{font-size:18px;color:var(--headText);opacity:.85}
.kicker{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;opacity:.85}
.kicker,.ht,.hs{padding-right:64px}
.ht{font-family:'Space Grotesk';font-weight:700;font-size:34px;line-height:1.1;margin-top:2px}
.hs{margin-top:8px;font-size:14px;font-weight:700}
.pad{padding:4px 16px 0}
.lbl{font-family:'Space Grotesk';font-weight:700;font-size:17px;margin:20px 0 10px}
.sws{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.sw div{height:40px;border-radius:12px;border:2px solid var(--ink)}
.sw span{font-size:11px;line-height:1.3}
.blk{border:2px solid var(--ink);border-radius:20px;padding:14px 16px}
.b1{background:var(--b1)}.b2{background:var(--b2)}.b3{background:var(--b3)}
.voc-h{font-size:13px;font-weight:700;opacity:.8;margin-bottom:8px}
.voc{display:flex;align-items:center;gap:10px;font-size:15px;margin-top:6px}
.pp{flex:none;width:38px;text-align:center;font-size:12px;font-weight:700;border:1.5px solid var(--ink);border-radius:999px;padding:2px 0;background:var(--bg)}
.row{display:flex;gap:12px}
.btn{flex:1;height:46px;display:flex;align-items:center;justify-content:center;border:2px solid var(--ink);border-radius:14px;background:var(--cta);
  font-family:'Space Grotesk';font-weight:700;font-size:15px;color:var(--ink);box-shadow:4px 4px 0 var(--ink)}
.btn.head{background:var(--head);color:var(--headText)}
.btn.strong{background:var(--strong);color:#fff}
.reveal{border:2px solid var(--ink);border-radius:20px;background:var(--b3);padding:12px}
.gift{position:relative;width:230px;height:140px;margin:0 auto}
.gbox{position:absolute;left:30px;top:58px;width:110px;height:80px;border:2px solid var(--ink);border-radius:8px;background:var(--head)}
.glid{position:absolute;left:20px;top:32px;width:130px;height:30px;border:2px solid var(--ink);border-radius:8px;background:var(--head)}
.rib{position:absolute;left:50%;top:-2px;bottom:-2px;width:20px;margin-left:-10px;background:var(--accent);border-left:2px solid var(--ink);border-right:2px solid var(--ink)}
.bow{position:absolute;top:4px;width:40px;height:30px;border:2px solid var(--ink);border-radius:50%;background:var(--accent)}
.bow.l{left:46px;transform:rotate(-20deg)}.bow.r{left:84px;transform:rotate(20deg)}
.string{position:absolute;left:140px;top:80px;width:30px;height:2px;background:var(--ink);transform:rotate(20deg);transform-origin:left center}
.gtag{position:absolute;left:160px;top:80px;width:84px;min-height:54px;background:var(--bg);border:2px solid var(--ink);border-radius:6px 14px 14px 6px;
  display:flex;flex-direction:column;justify-content:center;padding:4px 6px 4px 14px;transform:rotate(8deg)}
.gtag span{font-size:11px;font-weight:700;color:var(--strong)}
.gtag b{font-family:'Space Grotesk';font-size:16px}
.namecard{display:flex;align-items:center;gap:12px;margin-top:10px;background:var(--cta);border:2px solid var(--ink);border-radius:18px;padding:10px 14px;box-shadow:5px 5px 0 var(--ink)}
.av{width:48px;height:48px;border:2px solid var(--ink);border-radius:10px;background:
  linear-gradient(var(--strong),var(--strong)) 8px 8px/10px 10px no-repeat,linear-gradient(var(--strong),var(--strong)) 26px 8px/10px 10px no-repeat,
  linear-gradient(var(--strong),var(--strong)) 17px 22px/10px 10px no-repeat,linear-gradient(var(--strong),var(--strong)) 8px 30px/28px 8px no-repeat,#fff}
.nm{font-family:'Space Grotesk';font-weight:700;font-size:30px;line-height:1.1}
.hd2{font-size:12px}
.tabs{display:flex;gap:6px;border:2px solid var(--ink);border-radius:18px;padding:6px;background:var(--bg)}
.tab{flex:1;text-align:center;font-size:11px;font-weight:700;line-height:1.5;padding:4px 0;border-radius:12px;border:2px solid transparent}
.tab.on{background:var(--cta);border-color:var(--ink)}
`;

mkdirSync(`${DIR}out`, { recursive: true });
writeFileSync(
  `${DIR}out/themes.html`,
  `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>1kdo — thèmes</title><style>${css}</style></head><body>${THEMES.map(guide).join('\n')}</body></html>`,
);
console.log('ok', THEMES.length, 'themes');
