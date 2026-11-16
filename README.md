# Un kdo pour qui ? (1kdo)

Web app mobile pour organiser des chaînes de cadeaux entre amis (Secret Santa, anniversaire…).
Chacun découvre à qui il offre, la bande remplit des post-its d'idées sur la fiche de chacun, et tout s'efface 3 jours après l'événement.

## Fonctionnalités

- **Connexion simple** : @ Instagram + code à 6 chiffres choisi à la première visite. Un seul **lien de groupe** par événement (ou un lien perso par personne).
- **Tirage secret** : chacun offre et reçoit X cadeaux, jamais à soi-même. Deux modes :
  - **100 % anonyme** : personne ne voit le tirage, l'admin non plus ;
  - **visible par l'admin** : les enveloppes restent fermées le temps que l'admin vérifie « Qui offre à qui » et échange des personnes, puis les ouvre. Rien dans l'app n'indique aux participants que le tirage est visible.
- **Messages secrets** : une discussion par paire « qui offre → qui reçoit ». La personne qui reçoit ne sait jamais qui écrit (titre neutre du thème, pas d'heure, identifiant de fil opaque).
- **Fiches et idées** : un post-it anonyme par personne et par fiche ; on ne voit jamais les idées écrites sur soi. Chacun choisit son pronom (il, elle, iel), affiché sur sa fiche.
- **6 thèmes** (Noël, Anniversaire, Pâques, Saint-Valentin, Bureau, Pop) avec leurs couleurs et leur vocabulaire.
- **Fin de vie** : les données expirent 3 jours après la date ; l'admin peut tout supprimer avant.
- Mobile first, avec une vraie mise en page sur ordinateur (barre latérale).

## Technique

- Front : Vite + React + TypeScript (`src/`), style « pop / grille asymétrique ».
- API : une seule fonction serverless Vercel (`api/router.ts`) qui sert le code de `server/`.
- Données : Upstash Redis avec expiration automatique ; en local, un stockage en mémoire.
- Sécurité : codes hachés (scrypt), blocage après 5 essais, session en cookie httpOnly signé, visibilité calculée côté serveur, CSP stricte (`vercel.json`).

## Lancer en local

Node 26 (`nvm use`).

```bash
npm install
npm run dev                 # http://localhost:5173, stockage en mémoire
node scripts/demo.mjs       # (autre terminal) crée un événement de démo avec des faux comptes
npm test                    # tests vitest
npm run build               # vérification des types + build de production
npm run preview             # build servi avec l'API et les en-têtes de sécurité de prod
```

Sans variables d'environnement, l'admin locale est `@admin.demo` ; sa première inscription se fait avec le lien `/?i=dev-admin&u=admin.demo`. Le stockage en mémoire se vide à chaque redémarrage du serveur de dev.

## Mise en ligne

Voir [DEPLOY.md](DEPLOY.md).

## Organisation

| Dossier | Contenu |
|---|---|
| `shared/` | Thèmes (couleurs + vocabulaire) et types partagés front / API |
| `server/` | Logique : comptes et sessions (`auth.ts`, `session.ts`), événements (`events.ts`), tirage (`draw.ts`), tirage visible (`draw-board.ts`), messages secrets (`chat.ts`), idées, fin de vie, stockage (`store/`) |
| `api/` | Point d'entrée Vercel (toutes les routes `/api/*` y sont réécrites) |
| `src/` | Écrans (`screens/`), composants (`components/`) et utilitaires (`lib/`) de l'app |
| `tests/` | Tirage, visibilité des idées, blocage des codes, fin de vie, tirage visible, anonymat des messages |
| `scripts/` | `demo.mjs` : données fictives pour essayer l'app en local |

`HANDOFF.md` garde les décisions de conception et les choix par défaut.
