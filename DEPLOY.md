# Mise en ligne de 1kdo

Étapes à faire à la main par l'admin. Rien de réel (prénoms, @, date, lieu, budget) ne va dans le code : tout se saisit dans le QG une fois en ligne.

## 1. Créer le projet Vercel

1. Sur vercel.com : **Add New → Project**, importer le dépôt GitHub `1kdo`.
2. Framework : **Vite** (détecté automatiquement, `vercel.json` le précise). Ne rien changer aux commandes.
3. Node.js : 24 (lu depuis `package.json`).

## 2. Brancher Upstash Redis

1. Dans le projet Vercel : **Storage → Create Database → Upstash (Redis)**, région proche (ex. Francfort), plan gratuit.
2. Le connecter au projet pour **Production** (et Preview si besoin). Vercel ajoute tout seul `KV_REST_API_URL` et `KV_REST_API_TOKEN` (ou `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` : les deux noms marchent).

## 3. Variables d'environnement

**Settings → Environment Variables**, pour Production :

| Nom | Valeur |
|---|---|
| `ADMIN_INSTA` | Ton @ Instagram, sans le @ |
| `ADMIN_INVITE` | Un code secret aléatoire pour ta toute première inscription (ex. `openssl rand -hex 12`) |
| `SESSION_SECRET` | Une longue chaîne aléatoire, 32 caractères minimum (`openssl rand -base64 48`) |

Puis **Deployments → Redeploy** pour qu'elles soient prises en compte. Sans ces variables, l'API refuse de démarrer en ligne (pas de valeur par défaut en production).

## 4. Domaine `1kdo.gaston.monster`

1. Projet Vercel → **Settings → Domains → Add** `1kdo.gaston.monster`.
2. Chez le registrar de `gaston.monster`, ajouter l'enregistrement que Vercel indique, en général :
   `CNAME  1kdo  cname.vercel-dns.com.`
3. Attendre la validation (le certificat HTTPS est automatique).

## 5. Première connexion de l'admin

1. Ouvrir `https://1kdo.gaston.monster/?i=<ADMIN_INVITE>&u=<ADMIN_INSTA>`.
2. Choisir ton code à 6 chiffres. Dans **Ma fiche**, choisir « elle » pour que le titre s'accorde (« la Mère Noël Supérieure »).
3. Tu peux ensuite effacer `ADMIN_INVITE` des variables (il ne sert plus qu'à recréer ton accès si tu le réinitialises).

## 6. Test avec de faux comptes (avant le vrai événement)

1. Dans le QG : **Créer un événement** de test (date dans le futur, thème Noël, 1 cadeau).
2. Ajouter 3 ou 4 faux participants (prénoms et @ inventés).
3. Avec 🔗, copier leurs liens perso et les ouvrir dans des fenêtres de navigation privée : s'inscrire, écrire des idées, vérifier qu'on ne voit pas les idées écrites sur soi.
4. Lancer le tirage, découvrir les noms dans chaque fenêtre.
5. **Tout supprimer maintenant** pour effacer le test.

## 7. Le vrai événement

Créer l'événement dans le QG, ajouter les participants, envoyer à chacun son lien perso 🔗 en DM Instagram. Le tirage se lance quand tout le monde est prêt (ceux qui s'inscrivent après découvrent leur nom à l'inscription).

## Fin de vie

- 3 jours après la date, le site affiche « C'est fini » et les données expirent toutes seules dans Redis.
- Le code reste dans le dépôt. Supprimer le projet Vercel (et la base Upstash) à la main quand tu veux.
