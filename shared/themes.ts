/** The three ways the app can talk about someone. */
export type Pronoun = 'il' | 'elle' | 'iel';

export const PRONOUNS: readonly Pronoun[] = ['il', 'elle', 'iel'];

/** A theme words for il / elle / iel, in that order. */
type GenderedWords = readonly [string, string, string];

/** A theme: colours of the "pop / asymmetric grid" style plus its vocabulary. */
export interface Theme {
  id: ThemeId;
  name: string;
  example: string;
  emoji: string;
  ink: string;
  bg: string;
  head: string;
  headText: string;
  accent: string;
  cta: string;
  strong: string;
  blocks: readonly [string, string, string];
  glyphs: readonly [string, string, string];
  /** "Tu es … de" title of the person who gives. */
  giver: GenderedWords;
  /** Title of the admin. */
  boss: GenderedWords;
  /** Closing message shown once the event is over. */
  farewell: string;
}

export type ThemeId = 'noel' | 'anniv' | 'paques' | 'love' | 'bureau' | 'pop';

export const THEMES: readonly Theme[] = [
  {
    id: 'noel', name: 'Noël', example: 'Secret Santa 2026', emoji: '🎄',
    ink: '#1e3a2f', bg: '#fff8ea', head: '#d93a3a', headText: '#fff8ea', accent: '#ffd84e', cta: '#ffd84e', strong: '#1f7a4d',
    blocks: ['#d6f0dc', '#ffd6d3', '#ffeeb0'], glyphs: ['✦', '❄', '★'],
    giver: ['le Père Noël', 'la Mère Noël', "l'Esprit de Noël"],
    boss: ['le Père Noël Suprême', 'la Mère Noël Supérieure', "l'Esprit de Noël Suprême"],
    farewell: 'Merci et joyeux Noël à toute la bande 🥂',
  },
  {
    id: 'anniv', name: 'Anniversaire', example: 'Les 30 ans de Alex', emoji: '🎂',
    ink: '#2d1b4e', bg: '#fff7f0', head: '#ff6b4a', headText: '#fff7f0', accent: '#ffe45c', cta: '#ffe45c', strong: '#7a4fd6',
    blocks: ['#e6dcff', '#cfe8ff', '#ffe0d6'], glyphs: ['✺', '♪', '✦'],
    giver: ['le Bon Génie', 'la Bonne Fée', "l'Âme généreuse"],
    boss: ['le Roi de la fête', 'la Reine de la fête', 'la Star de la fête'],
    farewell: 'Merci et joyeux anniversaire 🥳',
  },
  {
    id: 'paques', name: 'Pâques', example: 'Chasse aux kdos de Pâques', emoji: '🐣',
    ink: '#3a2d5c', bg: '#fbfaf2', head: '#9b7ed9', headText: '#fbfaf2', accent: '#ffe066', cta: '#ffe066', strong: '#4fa36b',
    blocks: ['#dff3d8', '#ffe3ef', '#fff4bf'], glyphs: ['✿', '●', '✦'],
    giver: ['le Lapin', 'la Cloche', "l'Œuf surprise"],
    boss: ['le Grand Lapin', 'la Grande Cloche', "l'Œuf en chef"],
    farewell: 'Merci et joyeuses Pâques à toute la bande 🐰',
  },
  {
    id: 'love', name: 'Saint-Valentin', example: "Galentine's day entre potes", emoji: '💘',
    ink: '#4a1530', bg: '#fff5f7', head: '#e83e8c', headText: '#fff5f7', accent: '#ffc2d6', cta: '#ffc2d6', strong: '#c2185b',
    blocks: ['#ffe0ea', '#ffe9d6', '#f3e0ff'], glyphs: ['♥', '✦', '♡'],
    giver: ['le Cupidon', 'la Cupidonne', "l'Ange Cupidon"],
    boss: ['le Cupidon en chef', 'la Cupidonne en chef', "l'Archange de l'amour"],
    farewell: 'Merci et plein d’amour à toute la bande 💕',
  },
  {
    id: 'bureau', name: 'Bureau', example: 'Kdos de fin d’année du bureau', emoji: '💼',
    ink: '#1b2a44', bg: '#f6f7fb', head: '#2b4c8c', headText: '#f6f7fb', accent: '#f4b740', cta: '#f4b740', strong: '#2b4c8c',
    blocks: ['#dbe6ff', '#fdecc8', '#e2f1ea'], glyphs: ['■', '●', '▲'],
    giver: ['le Collègue mystère', 'la Collègue mystère', "l'Agent·e mystère"],
    boss: ['le Boss des kdos', 'la Boss des kdos', 'le·la Boss des kdos'],
    farewell: 'Merci à toute l’équipe 🥂',
  },
  {
    id: 'pop', name: 'Pop (neutre)', example: 'Un kdo pour qui ?', emoji: '🎁',
    ink: '#34244f', bg: '#fff8ea', head: '#ffd84e', headText: '#34244f', accent: '#c7ed85', cta: '#c7ed85', strong: '#7739b5',
    blocks: ['#e9ddf9', '#ffd4bf', '#ffffff'], glyphs: ['✦', '●', '★'],
    giver: ['le Lutin du kdo', 'la Lutine du kdo', "l'Esprit du kdo"],
    boss: ['le Grand Chef des kdos', 'la Grande Cheffe des kdos', 'le·la Grand·e Chef·fe des kdos'],
    farewell: 'Merci à toute la bande 🎉',
  },
];

export const DEFAULT_THEME_ID: ThemeId = 'noel';

/** True when `value` names one of the known themes. */
export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

/** Returns the theme with this id, or the default theme. */
export function getTheme(id: string | undefined): Theme {
  return THEMES.find((theme) => theme.id === id) ?? (THEMES[0] as Theme);
}

/** Index of a pronoun in a theme's gendered words; no pronoun means "iel". */
function pronounIndex(pronoun: Pronoun | null | undefined): 0 | 1 | 2 {
  if (pronoun === 'il') return 0;
  if (pronoun === 'elle') return 1;
  return 2;
}

/** "la Mère Noël" for a giver with this pronoun. */
export function giverTitle(theme: Theme, pronoun: Pronoun | null | undefined): string {
  return theme.giver[pronounIndex(pronoun)];
}

/** "la Mère Noël Supérieure" for an admin with this pronoun. */
export function bossTitle(theme: Theme, pronoun: Pronoun | null | undefined): string {
  return theme.boss[pronounIndex(pronoun)];
}

/** Uppercases the first letter: "la Mère…" → "La Mère…". */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Tu es la Mère Noël de…", the title shown when a name is revealed. */
export function revealSentence(theme: Theme, pronoun: Pronoun | null | undefined): string {
  return `Tu es ${giverTitle(theme, pronoun)} de…`;
}
