# JCPMS — MVP course à pied

Application composée d’une API Express/MySQL et d’un client Nuxt 3 installable en PWA.

## Architecture

```text
.
├── backend
│   ├── config/db.js
│   ├── controllers/{auth,runner,admin}.controller.js
│   ├── database/{schema,seed}.sql
│   ├── middlewares/auth.middleware.js
│   ├── routes/api.js
│   ├── scripts/create-admin.js
│   ├── utils/validation.js
│   └── server.js
└── frontend
    ├── components
    │   ├── admin/CrudTable.vue
    │   └── runner/{ActiveSession,PlanHierarchy,ProgressTracker}.vue
    ├── composables/{useAuth,useWakeLock}.js
    ├── middleware/auth.global.js
    ├── pages
    │   ├── admin/index.vue
    │   ├── session/[id].vue
    │   ├── index.vue
    │   ├── login.vue
    │   └── register.vue
    ├── public/icons
    └── nuxt.config.ts
```

## Schéma MySQL

```text
users
  └── user_session_progress ── training_sessions
                                  ├── exercises
                                  └── weeks ── seasons
```

La suppression d’un élément pédagogique cascade uniquement sur ses enfants et les progressions liées. Les mots de passe sont hachés avec bcrypt et aucun compte ne peut s’inscrire comme administrateur via l’API publique.

## Installation locale

Prérequis : Node.js 20+, npm et MySQL 8+.

```bash
mysql -u root -p -e "CREATE DATABASE jcpms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -u root -p jcpms < backend/database/schema.sql
mysql -u root -p jcpms < backend/database/seed.sql

cd backend
cp .env.example .env
npm install
npm run create-admin -- --email=admin@example.com --username=admin --password=mot-de-passe-solide
npm run dev
```

Dans un second terminal :

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend : `http://localhost:3000` — API : `http://localhost:4000` — santé API : `GET /health`.

## Variables d’environnement

Backend :

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET` : secret aléatoire d’au moins 32 caractères
- `JWT_EXPIRES_IN` : durée du token, `8h` par défaut
- `FRONTEND_URL` : une ou plusieurs origines séparées par des virgules

Frontend :

- `NUXT_PUBLIC_API_BASE` : URL publique complète de l’API, terminée par `/api`

## Endpoints REST du MVP

Toutes les routes protégées utilisent `Authorization: Bearer <token>`.

### Authentification

| Méthode | Endpoint | Rôle |
|---|---|---|
| POST | `/api/auth/register` | Inscription coureur |
| POST | `/api/auth/login` | Connexion par e-mail ou nom d’utilisateur |
| GET | `/api/auth/me` | Profil de la session courante |

### Coureur

| Méthode | Endpoint | Rôle |
|---|---|---|
| GET | `/api/runner/plan` | Plan complet et progression |
| GET | `/api/runner/sessions/:id` | Détail d’une session et exercices |
| PUT | `/api/runner/sessions/:id/start` | Démarrer ou recommencer une session |
| PATCH | `/api/runner/sessions/:id/progress` | Enregistrer l’exercice courant |
| PUT | `/api/runner/sessions/:id/complete` | Enregistrer distance/pas et terminer |
| DELETE | `/api/runner/progress/session/:id` | Reset d’une session |
| DELETE | `/api/runner/progress/week/:id` | Reset d’une semaine |
| DELETE | `/api/runner/progress/season/:id` | Reset d’une saison |
| DELETE | `/api/runner/progress/all` | Reset complet du coureur |

### Administration

| Méthode | Endpoint | Rôle |
|---|---|---|
| GET | `/api/admin/content/:resource` | Liste CMS |
| POST | `/api/admin/content/:resource` | Création CMS |
| PUT | `/api/admin/content/:resource/:id` | Modification CMS |
| DELETE | `/api/admin/content/:resource/:id` | Suppression CMS |
| GET | `/api/admin/users` | Liste et synthèse des coureurs |
| GET | `/api/admin/users/:id/progress` | Détail de progression d’un coureur |

Les valeurs de `:resource` autorisées sont `seasons`, `weeks`, `sessions` et `exercises`.

## Déploiement

- Frontend Vercel/Netlify : déployer le dossier `frontend`, définir `NUXT_PUBLIC_API_BASE`, commande de build `npm run build`.
- Backend Hostinger : déployer `backend`, importer les deux fichiers SQL dans la base fournie, définir les variables d’environnement, puis exécuter `npm start`.
- Les URLs de production doivent être en HTTPS pour que Wake Lock et l’installation PWA fonctionnent correctement.

Le Service Worker est volontairement configuré sans cache offline métier pour ce MVP.
