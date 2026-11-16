# Mettre 1kdo en ligne

Ce guide sert à déployer **ta propre copie** de 1kdo sur Vercel, avec ton domaine et ta base Upstash.
Rien de réel (prénoms, @, date, lieu, budget) ne va dans le code : tout se saisit dans le QG une fois en ligne.

Dans les exemples, `kdo.example.com` désigne ton adresse et `ton.insta` ton @ Instagram : remplace-les par les tiens.

## 1. Créer le projet Vercel

1. Fais un fork du dépôt (ou une copie) sur ton compte GitHub.
2. Sur vercel.com : **Add New → Project**, importe ce dépôt.
3. Framework : **Vite** (détecté automatiquement, `vercel.json` le précise). Ne change pas les commandes.
4. Node.js : 26 (lu depuis `package.json`).

Une fois le projet relié à GitHub, **chaque push sur la branche principale redéploie la production**.

## 2. Brancher Upstash Redis

1. Dans le projet Vercel : **Storage → Create Database → Upstash (Redis)**, dans une région proche de tes utilisateurs, plan gratuit.
2. Connecte-la au projet pour **Production** (et Preview si besoin). Vercel ajoute tout seul `KV_REST_API_URL` et `KV_REST_API_TOKEN` (les noms `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` marchent aussi).

Ces valeurs sont des secrets : ne les colle nulle part ailleurs que dans Vercel.

## 3. Variables d'environnement

**Settings → Environment Variables**, pour Production :

| Nom | Valeur |
|---|---|
| `ADMIN_INSTA` | Le @ Instagram de l'admin, sans le @ (ex. `ton.insta`) |
| `ADMIN_INVITE` | Un code secret aléatoire pour la toute première inscription de l'admin (ex. `openssl rand -hex 12`) |
| `SESSION_SECRET` | Une longue chaîne aléatoire, 32 caractères minimum (`openssl rand -base64 48`). Elle signe les sessions et les identifiants des discussions : la changer déconnecte tout le monde et rend les discussions en cours introuvables. |

Puis **Deployments → Redeploy** pour qu'elles soient prises en compte. Sans ces variables, l'API refuse de démarrer en ligne (aucune valeur par défaut en production).

## 4. Domaine (facultatif)

Sans domaine, l'app est servie sur l'adresse `*.vercel.app` du projet. Pour utiliser la tienne :

1. Projet Vercel → **Settings → Domains → Add** `kdo.example.com`.
2. Chez ton registrar, ajoute l'enregistrement DNS que Vercel indique, en général :
   `CNAME  kdo  cname.vercel-dns.com.`
3. Attends la validation : le certificat HTTPS est automatique.

## 5. Première connexion de l'admin

1. Ouvre `https://kdo.example.com/?i=<ADMIN_INVITE>&u=<ADMIN_INSTA>`.
2. Choisis un code à 6 chiffres.
3. Clique sur ton avatar (**Mon profil**) et choisis il, elle ou iel : le titre de l'admin s'accorde (thème Noël : « le Père Noël Suprême », « la Mère Noël Supérieure » ou « l'Esprit de Noël Suprême »).
4. Tu peux ensuite effacer `ADMIN_INVITE` des variables : il ne sert plus qu'à recréer l'accès de l'admin.

## 6. Test avec de faux comptes (avant le vrai événement)

1. Dans le QG : **Créer un événement** de test (date dans le futur, 1 cadeau).
2. Ajoute 4 ou 5 faux participants (prénoms et @ inventés).
3. Copie le **lien de groupe** et ouvre-le dans des fenêtres de navigation privée : inscris chaque faux compte, écris des idées, vérifie qu'on ne voit pas les idées écrites sur soi.
4. Lance le tirage et découvre les noms dans chaque fenêtre.
5. Ouvre **💬 Messages secrets** : écris depuis la personne qui offre, réponds depuis celle qui reçoit (elle ne doit voir que le titre neutre du thème, jamais un prénom).
6. Pour essayer le **tirage visible** : crée un second événement en choisissant « 👀 Visible par moi », lance le tirage, échange deux personnes dans « Qui offre à qui », puis **Ouvrir les enveloppes 🎁**.
7. **Tout supprimer maintenant** sur chaque événement de test.

## 7. Le vrai événement

1. Crée l'événement dans le QG et choisis le mode du tirage :
   - **🙈 100 % anonyme** : personne ne voit qui offre à qui, l'admin non plus ;
   - **👀 Visible par moi** : l'admin vérifie et ajuste le tirage avant d'ouvrir les enveloppes. Les participants ne le savent pas.
2. Ajoute les participants, puis colle le **lien de groupe** dans la conversation du groupe (ou envoie à chacun son lien perso 🔗).
3. Lance le tirage quand tout le monde est prêt. Ceux qui s'inscrivent après découvrent leur nom en s'inscrivant (en mode visible, une fois les enveloppes ouvertes).

## Fin de vie

- 3 jours après la date, le site affiche « C'est fini » et toutes les données de l'événement (tirage, idées, messages) expirent toutes seules dans Redis.
- Le code reste dans le dépôt. Supprime le projet Vercel (et la base Upstash) à la main quand tu veux.
