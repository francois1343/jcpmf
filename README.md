# JCPMF — MVP course à pied

Application composée d’une API Express, d’un stockage JSON temporaire ou MySQL, et d’un frontend classique en HTML, CSS et JavaScript natifs.

## Fonctionnalités de la V1

- Création de compte coureur, connexion JWT et déconnexion ; accès administrateur séparé.
- Consultation du programme hiérarchique : saisons, semaines, sessions et exercices.
- Saison 1 « De 0 à 5 km » transcrite depuis les 36 cartes JCPMF : 12 semaines, 3 jours par semaine et durées exactes en course, marche ou marche/trot.
- Indicateur de progression global et statut de chaque session.
- Exécution d’une séance avec minuteur circulaire, état explicite « en cours » ou « en pause » et passage manuel ou automatique à l’exercice suivant.
- Consignes audio pour l’échauffement, la course, la marche, le sprint et les étirements ; bouton pour répéter la consigne et synthèse vocale de secours.
- Mesure automatique pendant la séance : distance GPS et estimation des pas par capteur de mouvement, avec bilan prérempli sans saisie.
- Reprise locale du chrono et de l’exercice courant après un rechargement de la page.
- Réinitialisation de la progression par session, semaine, saison ou programme complet.
- CMS administrateur : CRUD des saisons, semaines, sessions et exercices ; suivi de l’avancement des coureurs.
- Installation sur l’écran d’accueil grâce au manifeste et au Service Worker écrits en JavaScript natif.
- Tableau de bord d’engagement local : séances terminées, temps de course/marche cumulé, séries quotidiennes et hebdomadaires, et meilleure journée.
- Rappels d’inactivité facultatifs via l’API Notification et le Service Worker.
- Photo de profil locale avec prévisualisation, compression Canvas, galerie d’avatars SVG et affichage dans la navigation.
- Export local de l’historique des séances en CSV compatible Excel et sauvegarde complète du `localStorage` en JSON.
- Apparence locale claire, sombre ou automatique, avec couleurs d’effort facultatives pendant les séances.
- Widget météo géolocalisé avec repli sur Bruxelles et conseil de course adapté aux conditions actuelles.
- Parcours running sur carte Leaflet/OpenStreetMap avec position directe, trace locale, pause, allure et progression.
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
├── frontend
│   ├── assets/avatars/*.svg
│   ├── css/styles.css
│   ├── api/config.js
│   ├── js/{api,appearance,appearance-init,avatar,common,config,data-export}.js
│   ├── js/{login,register,dashboard,session,profile,admin}.js
│   ├── js/{gamification,engagement,reminders,reminder-ui,weather}.js
│   ├── js/{routes-core,route-planner,routes}.js
│   ├── parcours.json
│   ├── {index,login,register,session,profile,routes,admin}.html
│   ├── manifest.webmanifest
│   ├── sw.js
│   ├── dev-server.js
│   └── package.json
└── frontend-nuxt-backup
    └── ancienne version Nuxt conservée temporairement
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

## Tester les capteurs

La localisation et les capteurs de mouvement nécessitent l’autorisation de l’utilisateur. En dehors de `localhost`, la page doit être servie en HTTPS. La distance est calculée à partir des positions GPS filtrées ; les pas restent une estimation dépendant du téléphone et de la manière dont il est porté.

L’application est installable après son déploiement en HTTPS. Sur Android, le bouton `Installer` ouvre la demande du navigateur. Sur iPhone, utiliser Safari puis `Partager` → `Sur l’écran d’accueil`. Le Service Worker conserve les fichiers de l’interface, mais les données personnalisées et leur synchronisation nécessitent toujours l’accès au backend.

## Engagement, statistiques et rappels locaux

Le module de gamification est entièrement exécuté dans le navigateur et ne demande aucun serveur multijoueur :

- `frontend/js/gamification.js` conserve au maximum 1 000 séances dans la clé `localStorage` `jcpmf_gamification_v1`, calcule les statistiques et émet un événement à chaque changement ;
- `frontend/js/engagement.js` met à jour les cartes de statistiques sans recharger la page ;
- `frontend/js/reminders.js` conserve les préférences dans `jcpmf_reminders_v1` et demande l’autorisation avant toute notification ; la fenêtre de proposition n’apparaît qu’une fois et le réglage reste modifiable depuis « Mon profil » ;
- `frontend/sw.js` affiche la notification et ramène l’utilisateur au tableau de bord lorsqu’il la touche.

Une séance validée met immédiatement le stockage à jour ; les statistiques se recalculent dès leur affichage et aussi dans tout autre onglet ouvert.

Les statistiques sont liées au navigateur et à l’appareil : supprimer les données du site efface cet historique. Sans serveur Push, une PWA web ne peut pas garantir l’exécution d’un minuteur arbitraire lorsqu’elle est totalement fermée. Le rappel est donc vérifié au lancement, au retour dans l’application et toutes les heures tant qu’elle reste active, puis affiché par le Service Worker.

## Exporter les données locales

Depuis « Mon profil », le coureur peut télécharger ses séances terminées dans `mes_courses_YYYY-MM-DD.csv`. Le fichier utilise le séparateur point-virgule et un BOM UTF-8 pour conserver correctement les accents dans Excel.

Depuis l’administration, « Sauvegarder la base JSON » génère `jcpmf_backup_YYYY-MM-DD.json` avec une copie fidèle de toutes les clés et valeurs du `localStorage` du navigateur courant. Ce fichier peut contenir le jeton de connexion et la photo de profil : il doit rester privé. Cette sauvegarde locale ne remplace pas une sauvegarde du fichier `backend/database/data.json` ou d’une base MySQL distante.

## Apparence

La section « Apparence » du profil applique immédiatement le thème clair, sombre ou automatique. Le choix est conservé dans `localStorage` sous la clé `app_theme`. L’option facultative de couleurs d’effort est enregistrée sous `dynamic_colors_enabled` : lorsqu’elle est active, l’écran de séance adapte son fond à la course, la marche, l’échauffement, le sprint ou les étirements. Désactivée, la séance conserve le fond vert par défaut.

## Parcours et suivi GPS

La page `routes.html` charge trois modèles de distance depuis `parcours.json`. Après une localisation GPS ou la saisie volontaire d’une adresse, elle calcule trois boucles pédestres autour de ce départ avec le serveur public OSRM « foot » d’OpenStreetMap, avec Valhalla comme repli, puis estime leur dénivelé avec Open-Meteo. La saisie d’adresse utilise Nominatim uniquement lors de l’envoi du formulaire, sans auto-complétion ; les résultats récents sont mis en cache localement pour éviter les requêtes répétées.

Le GPS est suivi avec `watchPosition()` seulement après l’action « Démarrer ». La trace réelle, le chronomètre, la distance, l’allure et la progression restent en mémoire dans le navigateur et sont supprimés au rechargement ; aucune coordonnée n’est envoyée au backend JCPMF. La position ou l’adresse de départ est toutefois transmise directement aux services cartographiques nécessaires au calcul, comme indiqué dans l’interface.

Les tuiles cartographiques, le calcul des parcours, l’altitude et la recherche d’adresse nécessitent une connexion réseau. Les services publics utilisés conviennent au MVP et au test ; une application à fort trafic doit employer des instances dédiées ou un fournisseur avec contrat. Aucun téléchargement massif ou mode hors ligne des tuiles OpenStreetMap n’est effectué.

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
npm run dev
```

Frontend : `http://127.0.0.1:3000` — API : `http://127.0.0.1:4000` — santé API : `GET /health`.

## Variables d’environnement

Backend :

- `DATA_STORE` : `json` pendant les tests, `mysql` pour la base MySQL finale
- `JSON_DATA_PATH` : chemin facultatif vers un autre fichier JSON
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET` : secret aléatoire d’au moins 32 caractères
- `JWT_EXPIRES_IN` : durée du token, `8h` par défaut
- `FRONTEND_URL` : une ou plusieurs origines séparées par des virgules

Frontend Vercel : `BACKEND_API_URL` doit contenir l’adresse HTTPS du projet backend, sans port (par exemple `https://mon-backend.vercel.app`). La fonction `frontend/api/config.js` transmet cette valeur publique au frontend Vanilla. En local, l’adresse reste automatiquement `http://127.0.0.1:4000/api`.

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

- Frontend Vercel : créer un projet dont le dossier racine est `frontend`, sans commande de build, puis définir `BACKEND_API_URL` avec l’adresse HTTPS du backend.
- Backend Vercel de test : créer un second projet dont le dossier racine est `backend`, puis définir `DATA_STORE=json`, `JWT_SECRET` et `FRONTEND_URL=https://jcpmf.vercel.app`. Le fichier est copié dans l’espace temporaire de la fonction ; inscriptions, CRUD et progressions peuvent être perdus lors d’un redémarrage à froid ou d’un redéploiement.
- Backend Hostinger final : déployer `backend`, définir `DATA_STORE=mysql`, importer les deux fichiers SQL dans la base fournie, définir les variables d’environnement, puis exécuter `npm start`.
- Les URLs de production doivent être en HTTPS pour la localisation et les capteurs du téléphone.
