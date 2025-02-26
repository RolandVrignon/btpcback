# API Backend BTPC

Backend API pour le projet BTPC, développé avec NestJS, TypeScript et PostgreSQL avec Prisma ORM.

## Technologies utilisées

- **Backend**: Node.js v20.13.0 avec NestJS
- **Base de données**: PostgreSQL avec extension pgvector
- **ORM**: Prisma
- **Authentification**: API Keys
- **Stockage de fichiers**: AWS S3
- **Documentation API**: Swagger

## Prérequis

- Node.js v20.13.0 ou supérieur
- pnpm
- PostgreSQL avec extension pgvector
- Docker (optionnel, pour exécuter PostgreSQL)

## Installation

1. Cloner le dépôt
```bash
git clone <url-du-repo>
cd back
```

2. Installer les dépendances
```bash
pnpm install
```

3. Configurer les variables d'environnement
```bash
cp .env.example .env
```
Puis modifiez le fichier `.env` avec vos propres valeurs.

4. Démarrer la base de données PostgreSQL (avec Docker)
```bash
make docker-start
```

5. Exécuter les migrations Prisma
```bash
npx prisma migrate dev
```

6. Générer le client Prisma
```bash
npx prisma generate
```

7. Initialiser les données de base
```bash
npx prisma db seed
```

8. Démarrer le serveur en mode développement
```bash
pnpm run start:dev
```

## Structure du projet

```
src/
├── apikeys/            # Module de gestion des clés API
├── chunks/             # Module de gestion des chunks de documents
├── decorators/         # Décorateurs personnalisés
├── documents/          # Module de gestion des documents
├── embeddings/         # Module de gestion des embeddings vectoriels
├── middleware/         # Middleware d'authentification par API Key
├── organizations/      # Module de gestion des organisations
├── prisma/             # Service Prisma et migrations
├── projects/           # Module de gestion des projets
├── storage/            # Module de gestion du stockage S3
└── main.ts             # Point d'entrée de l'application
```

## Modèles de données

- **Organization**: Représente une organisation avec un scope (ADMIN ou REGULAR)
- **Apikey**: Clés API associées à une organisation
- **Project**: Projets appartenant à une organisation
- **Document**: Documents associés à un projet
- **Chunk**: Fragments de texte extraits des documents
- **Embedding**: Vecteurs d'embedding associés aux chunks

## Fonctionnalités principales

### Authentification par API Key

Toutes les routes de l'API nécessitent une clé API valide, transmise via l'en-tête HTTP `x-api-key`. Deux niveaux d'accès sont disponibles:
- **Standard**: Pour les opérations régulières
- **Admin**: Pour les opérations administratives

### Gestion des organisations

- Création, lecture et suppression d'organisations
- Gestion des scopes (ADMIN, REGULAR)

### Gestion des projets

- Création, lecture, mise à jour et suppression de projets
- Association des projets à une organisation
- Filtrage des projets par organisation

### Gestion des documents

- Upload de documents associés à un projet
- Récupération des documents par projet ou par organisation
- Suppression de documents

### Chunking et Embeddings

- Découpage des documents en chunks de texte
- Génération et stockage d'embeddings vectoriels
- Recherche sémantique via pgvector

### Stockage S3

- Génération d'URLs présignées pour l'upload de fichiers
- Téléchargement de fichiers depuis S3
- Gestion des buckets S3

## Documentation API

La documentation Swagger de l'API est disponible à l'adresse:
```
http://localhost:3083/api
```

## Commandes utiles

- Démarrer le serveur en développement: `pnpm run start:dev`
- Compiler le projet: `pnpm run build`
- Lancer les tests: `pnpm run test`
- Formater le code: `pnpm run format`
- Linter: `pnpm run lint`
- Démarrer la base de données: `make docker-start`
- Arrêter la base de données: `make docker-stop`

## Sécurité

- Toutes les routes sont protégées par authentification API Key
- Vérification des accès basée sur l'organisation
- Validation des entrées avec class-validator
- Gestion des erreurs robuste

## Licence

Propriétaire - Tous droits réservés
