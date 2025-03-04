# Variables
DOCKER_NAME = btpc-postgres
DB_PORT = 5433
DB_USER = postgres
DB_PASSWORD = postgres
DB_NAME = btpc

# Commandes Docker
.PHONY: docker-start
docker-start:
	@echo "Démarrage du conteneur PostgreSQL avec pgvector..."
	@docker start $(DOCKER_NAME) || docker run --name $(DOCKER_NAME) -e POSTGRES_PASSWORD=$(DB_PASSWORD) -e POSTGRES_USER=$(DB_USER) -e POSTGRES_DB=$(DB_NAME) -p $(DB_PORT):5432 -d ankane/pgvector
	@echo "Conteneur PostgreSQL démarré sur le port $(DB_PORT)"

.PHONY: docker-stop
docker-stop:
	@echo "Arrêt du conteneur PostgreSQL..."
	@docker stop $(DOCKER_NAME)
	@echo "Conteneur PostgreSQL arrêté"

.PHONY: docker-logs
docker-logs:
	@docker logs $(DOCKER_NAME)

.PHONY: docker-psql
docker-psql:
	@docker exec -it $(DOCKER_NAME) psql -U $(DB_USER) -d $(DB_NAME)

# Commandes Prisma
.PHONY: prisma-studio
prisma-studio:
	@echo "Lancement de Prisma Studio..."
	@pnpm prisma studio

.PHONY: prisma-generate
prisma-generate:
	@echo "Génération du client Prisma..."
	@pnpm prisma generate

.PHONY: prisma-migrate-dev
prisma-migrate-dev:
	@echo "Création d'une nouvelle migration..."
	@read -p "Nom de la migration: " name; \
	pnpm prisma migrate dev --name $$name

.PHONY: prisma-migrate-reset
prisma-migrate-reset:
	@echo "Réinitialisation de la base de données..."
	@pnpm prisma migrate reset

.PHONY: prisma-db-push
prisma-db-push:
	@echo "Application du schéma sans migration..."
	@pnpm prisma db push

# Commandes NestJS
.PHONY: dev
dev:
	@echo "Lancement du serveur en mode développement..."
	@pnpm start:dev

.PHONY: build
build:
	@echo "Construction de l'application..."
	@pnpm build

.PHONY: start
start:
	@echo "Lancement du serveur en mode production..."
	@pnpm start

.PHONY: test
test:
	@echo "Exécution des tests..."
	@pnpm test

# Commande Prettier
.PHONY: prettier
prettier:
	@echo "Formatage du code avec Prettier..."
	@pnpm prettier --write "src/**/*.ts"
	@echo "Formatage terminé"

# Commandes combinées
.PHONY: setup
setup:
	@echo "Installation des dépendances..."
	@pnpm install
	@make docker-start
	@make prisma-generate
	@echo "Configuration terminée"

.PHONY: reset-db
reset-db:
	@make docker-start
	@make prisma-migrate-reset

.PHONY: clear-db
clear-db:
	@echo "Nettoyage de la base de données (conservation des tables Organization et ApiKey)..."
	@pnpm ts-node src/scripts/clear-db.ts

.PHONY: init-db
init-db:
	@echo "Initialisation de la base de données..."
	@make docker-start
	@echo "Application des migrations..."
	@pnpm prisma migrate deploy
	@echo "Génération du client Prisma..."
	@pnpm prisma generate
	@echo "Base de données initialisée avec succès"

.PHONY: seed-db
seed-db:
	@echo "Création des données de base..."
	@pnpm seed
	@echo "Données de base créées avec succès"

.PHONY: init-with-seed
init-with-seed:
	@make init-db
	@make seed-db

.PHONY: help
help:
	@echo "Commandes disponibles:"
	@echo "  make docker-start        - Démarrer le conteneur PostgreSQL"
	@echo "  make docker-stop         - Arrêter le conteneur PostgreSQL"
	@echo "  make docker-logs         - Afficher les logs du conteneur PostgreSQL"
	@echo "  make docker-psql         - Se connecter à PostgreSQL en ligne de commande"
	@echo "  make prisma-studio       - Lancer Prisma Studio"
	@echo "  make prisma-generate     - Générer le client Prisma"
	@echo "  make prisma-migrate-dev  - Créer une nouvelle migration"
	@echo "  make prisma-migrate-reset- Réinitialiser la base de données"
	@echo "  make prisma-db-push      - Appliquer le schéma sans migration"
	@echo "  make dev                 - Lancer le serveur en mode développement"
	@echo "  make build               - Construire l'application"
	@echo "  make start               - Lancer le serveur en mode production"
	@echo "  make test                - Exécuter les tests"
	@echo "  make prettier            - Formater le code avec Prettier"
	@echo "  make setup               - Installer les dépendances et configurer le projet"
	@echo "  make reset-db            - Réinitialiser la base de données"
	@echo "  make clear-db            - Nettoyer la base de données (conserver Organization et ApiKey)"
	@echo "  make init-db             - Initialiser la base de données"
	@echo "  make seed-db             - Créer des données de base (organisation et clé API)"
	@echo "  make init-with-seed      - Initialiser la base de données et créer des données de base"

# Commande par défaut
.DEFAULT_GOAL := help