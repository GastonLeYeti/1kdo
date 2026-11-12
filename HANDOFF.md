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
- L'admin ajoute les gens (prénom + @insta) dans le QG. Un bouton 🔗 copie le **lien perso** de chacun (code d'invitation + @ pré-rempli), envoyé en DM Insta.
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

## Reste à faire

1. Relire les **commentaires Figma** non traités (la limite d'appels Figma a empêché de les lire en fin de conversation).
2. Valider les thèmes et leurs mots (`design/themes-apercu.png`), puis les ajouter dans Figma.
3. Construire l'app : squelette + thème Noël → API + Redis → tirage + animation → QG → fin de vie.
4. Mise en ligne : projet Vercel, Upstash, domaine `1kdo.gaston.monster`, variables d'environnement, test avec de faux comptes, puis vraie liste.
5. Infos à fournir par l'admin : liste (prénom + @insta) — saisie directement dans le QG, pas dans le code.

## Régénérer les maquettes

```bash
cd design
npm install
npm run screens   # → out/screens.html (15 écrans, thème Noël)
npm run themes    # → out/themes.html (6 guides de style)
```

Les fichiers `out/*.html` s'importent dans Figma avec l'outil `html_to_figma` du serveur MCP Figma (sélecteur CSS `.screen`).
