# JCPMF — MVP course à pied

Application composée d’une API Express, d’un stockage JSON temporaire ou MySQL, et d’un client Nuxt 3 installable en PWA.

## Fonctionnalités de la V1

- Création de compte coureur, connexion JWT et déconnexion ; accès administrateur séparé.
- Consultation du programme hiérarchique : saisons, semaines, sessions et exercices.
- Saison 1 « De 0 à 5 km » transcrite depuis les 36 cartes JCPMF : 12 semaines, 3 jours par semaine et durées exactes en course, marche ou marche/trot.
- Indicateur de progression global et statut de chaque session.
- Exécution d’une séance avec minuteur circulaire, état explicite « en cours » ou « en pause », passage manuel ou automatique à l’exercice suivant et Wake Lock.
- Consignes audio pour l’échauffement, la course, la marche, le sprint et les étirements ; bouton pour répéter la consigne et synthèse vocale de secours.
- Mesure automatique pendant la séance : distance GPS et estimation des pas par capteur de mouvement, avec bilan prérempli sans saisie.
- Mode hors-ligne : programme et séances conservés dans IndexedDB, actions mises en attente puis synchronisées au retour du réseau.
- Reprise locale du chrono et de l’exercice courant après une fermeture ou une coupure ; retour à l’échauffement disponible pendant la pause.
- Réinitialisation de la progression par session, semaine, saison ou programme complet.
- CMS administrateur : CRUD des saisons, semaines, sessions et exercices ; suivi de l’avancement des coureurs.
- Manifeste et Service Worker PWA pour une application installable, avec cache des écrans visités et des ressources statiques.
- Mode JSON de développement couvrant les mêmes endpoints que MySQL, afin de tester l’application sans base distante.

Les exercices utilisent les types `warmup`, `run`, `walk`, `sprint` et `stretching`. Si la base a été créée avant l’ajout de `stretching`, importer `backend/database/migrations/002_add_stretching_type.sql` une seule fois.

## Architecture

```text
.
├── backend
│   ├── config/db.js
│   ├── controllers/{auth,runner,admin}.controller.js
│   ├── controllers/json/{auth,runner,admin}.controller.js
│   ├── database/{schema,seed}.sql
│   ├── database/data.json
│   ├── middlewares/auth.middleware.js
│   ├── routes/api.js
│   ├── scripts/create-admin.js
│   ├── storage/json-store.js
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
    │   ├── profil.vue
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

## Démarrage rapide avec la base JSON

Le stockage JSON est le mode par défaut pendant la phase de test. Il ne nécessite ni MySQL ni phpMyAdmin.

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Dans un second terminal :

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Comptes de démonstration réservés au développement :

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Coureur | `demo` | `RunnerJCPMF2026!` |
| Administrateur | `admin` | `AdminJCPMF2026!` |

Les données sont enregistrées dans `backend/database/data.json`. Pour repartir des données initiales, restaurer ce fichier depuis Git. Ne jamais conserver ces identifiants lors de la mise en production réelle.

La transcription contrôlée des cartes se trouve dans `backend/database/season1-program.js`. Après une modification de ces cartes, régénérer la base JSON avec :

```bash
cd backend
npm run rebuild-season-one
```

## Tester le mode hors-ligne et les capteurs

Le Service Worker est désactivé avec `npm run dev`. Pour tester le cache PWA localement :

```bash
cd frontend
npm run build
npm run preview
```

Connectez-vous une première fois avec du réseau et ouvrez le tableau de bord. Le programme, le profil, les fichiers audio et les séances consultées deviennent alors disponibles hors ligne. Les actions hors ligne sont conservées dans IndexedDB et une bannière indique leur état de synchronisation.

La localisation et les capteurs de mouvement nécessitent l’autorisation de l’utilisateur. En dehors de `localhost`, la page doit être servie en HTTPS. La distance est calculée à partir des positions GPS filtrées ; les pas restent une estimation dépendant du téléphone et de la manière dont il est porté.

## Installation locale avec MySQL

Prérequis : Node.js 20+, npm et MySQL 8+.

```bash
mysql -u root -p -e "CREATE DATABASE jcpms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -u root -p jcpms < backend/database/schema.sql
mysql -u root -p jcpms < backend/database/seed.sql

cd backend
cp .env.example .env
# Dans backend/.env, définir DATA_STORE=mysql
npm install
npm run create-admin -- --email=admin@jcpfm.local --username=admin --password=mot-de-passe-solide
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

- `DATA_STORE` : `json` pendant les tests, `mysql` pour la base MySQL finale
- `JSON_DATA_PATH` : chemin facultatif vers un autre fichier JSON
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
- Backend Vercel de test : déployer `backend` avec `DATA_STORE=json`, `JWT_SECRET` et `FRONTEND_URL`. Le fichier est copié dans l’espace temporaire de la fonction ; inscriptions, CRUD et progressions peuvent être perdus lors d’un redémarrage à froid ou d’un redéploiement.
- Backend Hostinger final : déployer `backend`, définir `DATA_STORE=mysql`, importer les deux fichiers SQL dans la base fournie, définir les variables d’environnement, puis exécuter `npm start`.
- Les URLs de production doivent être en HTTPS pour que Wake Lock et l’installation PWA fonctionnent correctement.

Le Service Worker utilise une stratégie Network First pour les écrans et Cache First pour les ressources statiques. IndexedDB conserve séparément les données personnalisées et la file des actions à synchroniser.
