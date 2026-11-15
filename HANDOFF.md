# 1kdo — « Un kdo pour qui ? » : point de reprise

Ce fichier résume tout ce qui a été décidé dans la première conversation (cloud) pour pouvoir reprendre ailleurs, par exemple dans VS Code.

## Le projet

Une web app mobile pour organiser des **chaînes de cadeaux** entre amis (Secret Santa, anniversaire, etc.).
Premier usage réel : un Secret Santa de Noël 2026 entre amis (10 à 12 personnes). La date, le lieu, le budget et la liste des participants sont saisis par l'admin dans le QG : **ils ne vont jamais dans le code** (repo public).

- Adresse : **`1kdo.gaston.monster`**, projet indépendant avec son propre projet Vercel.
- Maquettes Figma (fichier privé, accessible seulement à son propriétaire) : https://www.figma.com/design/lsXrBACRvaunRsrq1utviX (page « Maquettes » : 15 écrans v3 + 3 cadres de référence de style en haut). Les prénoms des maquettes Figma sont à remplacer par des prénoms fictifs ; dans `design/`, c'est déjà fait.
- Guides de style des thèmes : `design/themes-apercu.png` (pas encore dans Figma : limite d'appels Figma Starter atteinte).

## Décisions validées

### Événements
- **Seule l'admin (l'organisatrice) crée les événements.** Pas de création par les autres.
- **Plusieurs événements en même temps**, une même personne peut être dans plusieurs.
- Un événement = **titre libre** (ex. « Secret Santa 2026 »), **thème**, date, lieu, budget, participants, **X cadeaux par personne** (même X pour tout le monde).

### Connexion
- L'admin ajoute les gens (prénom + @insta) dans le QG. Un bouton « Copier le lien de groupe » donne **un seul lien** pour tout le monde (à coller dans le groupe ; chacun tape son @). Le bouton 🔗 de chaque ligne copie aussi son **lien perso** (@ pré-rempli), si on préfère un DM.
- Première visite : on crée un **code à 6 chiffres**. Ensuite @ + code. Code haché côté serveur, 5 essais puis blocage 15 min.
- @ absent de la liste → « n'est pas dans la liste des participants ».
- Code oublié → l'admin le réinitialise depuis le QG (🔑).

### Tirage
- L'admin clique **« Lancer le tirage »** (avec confirmation) : la liste est **figée**.
- Algorithme : ordre secret aléatoire en **un seul cercle** (Sattolo). Avec X cadeaux, chacun offre aux **X personnes suivantes** dans le cercle → chacun offre X et reçoit X, jamais soi-même, jamais deux fois la même personne. Il faut au moins X + 1 participants.
- Pas de formule devinable (type `id + k mod n`). Le serveur ne renvoie à chacun **que ses propres cibles**. Même l'admin ne voit pas qui a tiré qui.
- Côté écran : cadeau avec étiquette « Pour : \*\*\*\*\*\*\* » → bouton « Découvrir le nom » → animation → « Tu es la Mère Noël de… Sam ». Bouton « Masquer » pour cacher le nom.

### Fiches et idées
- Chaque fiche = mur d'**idées** (post-its). Chacun a **son** post-it par personne, modifiable par lui seul, **sans nom affiché**.
- On peut écrire sur sa propre fiche (« Ce que tu aimes »).
- **La personne ne voit pas les idées des autres sur elle** (vérifié côté serveur) : « Les autres ont écrit 3 idées sur toi. Surprise ! ».
- **Pas de wishlist**, pas de liens, pas de photos de produits.
- Choix **il / elle / iel** uniquement sur « Ma fiche » (pas à la première visite). Le texte s'accorde (voir thèmes).

### Profils
- Avatar **généré à partir du @** (identicon 5×5 façon GitHub). Bouton « Voir son Insta ». Pas de photos.

### Fin de vie
- **J+3 après l'événement** : le site affiche « C'est fini » (le serveur ne répond plus), les données expirent automatiquement (TTL). Bouton « Tout supprimer maintenant » dans le QG.
- **Le code reste dans le repo** (pas de suppression du dossier). Le projet Vercel est supprimé à la main par l'admin.

### Vocabulaire
- Jamais « l'organisatrice » : le titre de l'admin dépend du thème (Noël : **la Mère Noël Supérieure**). Onglet admin = **« QG 👑 »**.
- Onglets : Mon tirage · La bande · Ma fiche · QG.
- C'est la personne qui **offre** : jamais « ton cadeau t'attend ».

### Style
- Style **« Pop / asymmetric grid »** : fond crème, contours épais couleur encre, blocs pastel, ombres dures décalées, Space Grotesk (titres) + DM Sans (texte).
- 6 thèmes (couleurs + mots) : Noël, Anniversaire, Pâques, Saint-Valentin, Bureau, Pop (neutre). Détails dans `design/gen-themes.mjs` (objet `THEMES`).
- **Pour Noël 2026, seul le thème Noël doit être finalisé** ; les autres viennent après.

## Stack prévue

- Front : Vite + React + TypeScript, mobile first, sans la 3D du portfolio.
- API : fonctions serverless Vercel (`api/`), base **Upstash Redis** (intégration Vercel), données avec TTL.
- Session : cookie httpOnly signé. Code invitation dans le lien.
- Tests (vitest) : tirage (pas de soi-même, X cibles distinctes, X reçus), visibilité des idées, blocage des essais de code.

## Choix par défaut (tranchés pour travailler sans poser de questions)

| Sujet | Choix |
|---|---|
| Thèmes | Les 6 thèmes de `design/gen-themes.mjs` sont validés tels quels (couleurs + mots). Noël est soigné en priorité, les 5 autres doivent fonctionner. |
| Référence visuelle | `design/gen-screens.mjs` (→ `out/screens.html`) est la **source de vérité** des écrans. Figma n'est qu'un complément (la limite d'appels peut bloquer). |
| Compte | Un compte par @insta, **commun à tous les événements** (même code partout). Si la personne est dans plusieurs événements : écran « Mes événements » après connexion. |
| Admin | Identifiée par la variable d'environnement `ADMIN_INSTA` (son @). Elle se connecte comme tout le monde (@ + code). Seule elle voit le QG et peut créer des événements. |
| QG | Liste des événements + « Créer un événement » (titre, thème, date, lieu, budget, X cadeaux). Dans un événement : participants, liens perso, lancer le tirage, réglages, suppression. |
| Lieu | Dans le bandeau 📍, le lieu est un lien : Plans sur iPhone/iPad/Mac, Google Maps ailleurs (nouvel onglet). |
| Lien de groupe | `/e/{eventId}?i={codeInvitation}` : un code d'invitation par événement, le même lien pour tous. Seuls les @ de la liste peuvent s'inscrire. |
| Lien perso | `/e/{eventId}?i={codeInvitation}&u={handle}` : le même, avec le @ pré-rempli. Le code à 6 chiffres reste demandé. |
| Sans pronom choisi | Formule « iel » du thème par défaut (ex. « l'Esprit de Noël »). |
| Fin de vie | Par événement : TTL Redis = date de l'événement + 3 jours ; ensuite la page de l'événement affiche « C'est fini ». Un compte expire quand il n'a plus d'événement actif. |
| Sécurité | Code haché (scrypt), 5 essais puis blocage 15 min (compteur Redis), session = cookie httpOnly signé (`SESSION_SECRET`), 30 jours. Le serveur ne renvoie que les cibles de la personne connectée. Idées sur soi filtrées côté serveur. En-têtes de sécurité (CSP stricte) dans `vercel.json`. |
| Polices | Auto-hébergées via `@fontsource` (pas de Google Fonts). |
| Animations | Respecter `prefers-reduced-motion`. |
| Stockage en local | Adaptateur mémoire quand les variables Upstash sont absentes (dev + tests). |
| Données d'exemple | Uniquement des prénoms et @ fictifs (repo public). |
| Node | Node 26 (`.nvmrc`, `engines`), comme le projet Vercel. |
| Première inscription | Elle exige le code d'invitation de l'événement (dans le lien perso). Sans lien : écran « Ouvre ton lien perso ». Un mauvais code d'invitation compte comme un essai raté. |
| Première inscription de l'admin | Lien `/?i={ADMIN_INVITE}&u={ADMIN_INSTA}` : variable `ADMIN_INVITE` pour qu'on ne puisse pas prendre le @ de l'admin avant elle. |
| Sessions | Le cookie porte une version du code : changer de code ou une réinitialisation par l'admin déconnecte les anciennes sessions. |
| Titre de l'admin | S'accorde avec le pronom choisi par l'admin dans « Ma fiche » (« iel » tant qu'elle n'a rien choisi). |
| Idées | Une seule idée par auteur et par fiche (modifiable, effaçable). Les idées des autres sont triées par ordre alphabétique pour que leur ordre ne trahisse pas l'auteur. Ce que la personne écrit sur sa propre fiche apparaît à part (« ❤️ Sam aime : »). |
| Admin non participante | Elle peut ouvrir tous les événements (La bande, QG) mais n'a ni tirage ni post-it si elle n'est pas dans la liste. |
| Masquer | Après la première découverte, le nom est masqué par défaut à chaque visite (« Revoir le nom 👀 »), sans rejouer l'animation. |
| Après le tirage | La liste, le nombre de cadeaux sont figés ; titre, thème, date, heure, lieu et budget restent modifiables. Le lien 🔗 reste disponible pour les personnes pas encore inscrites. |
| Retrait d'un participant | Avant le tirage seulement ; ses idées (écrites par lui et sur lui) sont supprimées. |
| Fermeture | À 00:00 UTC du jour J+3 (ex. événement le 20/12 → fermé le 23/12). Une route publique `/api/events/:id/status` permet d'afficher « C'est fini » même déconnecté. |
| Neige du bandeau | Seulement pour le thème Noël. |
| Écriture concurrente | Les enregistrements sont des documents JSON lus puis réécrits ; suffisant pour 10 à 12 personnes. |

## État (13/11/2026)

Les étapes 1 à 8 du plan sont faites : app complète, 20 tests verts, `npm run build` sans erreur, écrans vérifiés à 360 et 390 px (aucun défilement horizontal), build de production testé avec la CSP stricte. En ligne sur `1kdo.gaston.monster` depuis le 13/11/2026 (Vercel, Node 26, Upstash Redis à Francfort). Reste à l'admin : sa première connexion et un test avec de faux comptes (`DEPLOY.md`, étapes 5 et 6).

## Plan d'exécution

1. Squelette Vite + React + TS à la racine, `api/` pour les fonctions Vercel, thème Noël + système de thèmes (tokens CSS + vocabulaire).
2. Stockage (Upstash + adaptateur mémoire), modèle de données, sessions, inscription / connexion / code.
3. Événements, participants, liens perso, QG.
4. Tirage (cercle secret + X cibles), écran « Mon tirage » + animation de découverte.
5. La bande, fiches, idées (règles de visibilité), Ma fiche (pronom, ses goûts).
6. Fin de vie (TTL, page « C'est fini », « Tout supprimer »).
7. Tests vitest + `npm run build` sans erreur, vérification visuelle mobile (Playwright, 390 px).
8. `DEPLOY.md` : étapes manuelles pour l'admin (créer le projet Vercel, brancher Upstash, variables `ADMIN_INSTA` et `SESSION_SECRET`, domaine `1kdo.gaston.monster` chez le registrar), puis test avec de faux comptes.

## Ce que l'admin fera elle-même à la fin

- Créer le projet Vercel et brancher Upstash, renseigner les variables d'environnement, ajouter le domaine.
- Saisir son vrai événement et ses participants dans le QG (jamais dans le code).

## Régénérer les maquettes

```bash
cd design
npm install
npm run screens   # → out/screens.html (15 écrans, thème Noël)
npm run themes    # → out/themes.html (6 guides de style)
```

Les fichiers `out/*.html` s'importent dans Figma avec l'outil `html_to_figma` du serveur MCP Figma (sélecteur CSS `.screen`).
