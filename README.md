# Un kdo pour qui ? (1kdo)

Web app mobile pour organiser des chaînes de cadeaux entre amis (Secret Santa, anniversaire…).
Chacun découvre à qui il offre, la bande remplit des post-its d'idées sur la fiche de chacun, et tout s'efface 3 jours après l'événement.

- Front : Vite + React + TypeScript (`src/`), style « pop / grille asymétrique », 6 thèmes (`shared/themes.ts`).
- API : une fonction serverless Vercel (`api/router.ts`) qui sert le code de `server/`.
- Données : Upstash Redis avec expiration automatique ; en local, un stockage en mémoire.

## Lancer en local

Node 24 (`nvm use`).

```bash
npm install
npm run dev                 # http://localhost:5173, stockage en mémoire
node scripts/demo.mjs       # (autre terminal) crée un événement de démo avec des faux comptes
npm test                    # tests vitest
npm run build               # vérification des types + build de production
npm run preview             # build servi avec l'API et les en-têtes de sécurité de prod
```

Sans variables d'environnement, l'admin locale est `@admin.demo` ; sa première inscription se fait avec le lien `/?i=dev-admin&u=admin.demo`.

## Mise en ligne

Voir [DEPLOY.md](DEPLOY.md).

## Organisation

| Dossier | Contenu |
|---|---|
| `shared/` | Thèmes (couleurs + vocabulaire) et types partagés front / API |
| `server/` | Logique : comptes, sessions, événements, tirage (`draw.ts`), idées, fin de vie, stockage |
| `api/` | Point d'entrée Vercel (toutes les routes `/api/*` y sont réécrites) |
| `src/` | Écrans et composants de l'app |
| `tests/` | Tests du tirage, de la visibilité des idées, du blocage des codes, de la fin de vie |
