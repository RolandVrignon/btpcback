# Variables
DOCKER_NAME = btpc-postgres
DB_PORT = 5433
DB_USER = postgres
DB_PASSWORD = postgres
DB_NAME = btpc
API_PORT = 8080
API_SUBDOMAIN = aec-agents-api-dev

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

.PHONY: prisma-format
prisma-format:
	@echo "Formatage des fichiers Prisma..."
	@pnpm prisma format
	@echo "Formatage des fichiers Prisma terminé"

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
	@pnpm ts-node scripts/clear-db.ts

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

.PHONY: expose-api
expose-api:
	@echo "Installation de cloudflared si nécessaire..."
	@which cloudflared || (echo "Installation de cloudflared..." && curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared.deb && rm cloudflared.deb)
	@echo "Exposition de l'API via Cloudflare Tunnel sur le port $(API_PORT)..."
	@cloudflared tunnel --url http://localhost:$(API_PORT)

# Commandes de gestion des connexions à la base de données
.PHONY: check-db-connections
check-db-connections:
	@echo "Vérification des connexions à la base de données..."
	@chmod +x scripts/check-connections.sh
	@./scripts/check-connections.sh

.PHONY: monitor-db
monitor-db:
	@echo "Démarrage du moniteur de connexions à la base de données..."
	@chmod +x scripts/monitor-connections.sh
	@./scripts/monitor-connections.sh

.PHONY: optimize-db-pool
optimize-db-pool:
	@echo "Optimisation du pool de connexions à la base de données..."
	@chmod +x scripts/optimize-pool.sh
	@./scripts/optimize-pool.sh

# Mise à jour de l'aide
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
	@echo "  make prisma-migrate-reset - Réinitialiser la base de données"
	@echo "  make prisma-db-push      - Appliquer le schéma sans migration"
	@echo "  make prisma-format       - Formater les fichiers Prisma"
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
	@echo "  make expose-api-lt       - Exposer l'API locale via localtunnel"
	@echo "  make expose-api-lt-persistent - Exposer l'API locale via localtunnel avec reconnexion automatique"
	@echo "  make expose-api-ngrok    - Exposer l'API locale via ngrok"
	@echo "  make expose-api 		  - Exposer l'API locale via Cloudflare Tunnel"
	@echo "  make check-db-connections - Vérifier les connexions à la base de données"
	@echo "  make monitor-db          - Surveiller les connexions à la base de données en temps réel"
	@echo "  make optimize-db-pool    - Optimiser le pool de connexions à la base de données"
	@echo "  make script              - Sélectionner et exécuter un script avec explication"

# Commande par défaut
.DEFAULT_GOAL := help

# Commande pour exécuter des scripts
.PHONY: script
script:
	@echo "\033[1;36m=== Sélection d'un script à exécuter ===\033[0m"
	@echo ""
	@echo "\033[1;33mScripts de gestion de base de données:\033[0m"
	@echo "  1) check-db-connections   - Vérifier les connexions à la base de données PostgreSQL"
	@echo "  2) monitor-connections    - Surveiller les connexions à la base de données en temps réel"
	@echo "  3) optimize-pool          - Optimiser le pool de connexions à la base de données"
	@echo "  4) clear-db               - Nettoyer la base de données (conserver Organization et ApiKey)"
	@echo ""
	@echo "\033[1;33mScripts AWS RDS:\033[0m"
	@echo "  5) get-rds-endpoint       - Récupérer les endpoints des instances RDS"
	@echo "  6) create-rds-instance_back  - Créer une instance RDS pour le backend"
	@echo "  7) create-rds-instance_front - Créer une instance RDS pour le frontend"
	@echo "  8) configure-rds-security_back  - Configurer la sécurité RDS pour le backend"
	@echo "  9) configure-rds-security_front - Configurer la sécurité RDS pour le frontend"
	@echo ""
	@echo "\033[1;33mAutres scripts:\033[0m"
	@echo "  10) add-n8n-org           - Ajouter une organisation n8n"
	@echo ""
	@read -p "Entrez le numéro du script à exécuter: " script_num; \
	case $$script_num in \
		1) make check-db-connections ;; \
		2) make monitor-db ;; \
		3) make optimize-db-pool ;; \
		4) echo "Exécution de clear-db..." && pnpm ts-node scripts/clear-db.ts ;; \
		5) echo "Récupération des endpoints RDS..." && pnpm ts-node scripts/get-rds-endpoint.ts ;; \
		6) echo "Création d'une instance RDS pour le backend..." && pnpm ts-node scripts/create-rds-instance_back.ts ;; \
		7) echo "Création d'une instance RDS pour le frontend..." && pnpm ts-node scripts/create-rds-instance_front.ts ;; \
		8) echo "Configuration de la sécurité RDS pour le backend..." && pnpm ts-node scripts/configure-rds-security_back.ts ;; \
		9) echo "Configuration de la sécurité RDS pour le frontend..." && pnpm ts-node scripts/configure-rds-security_front.ts ;; \
		10) echo "Ajout d'une organisation n8n..." && pnpm ts-node scripts/add-n8n-org.ts ;; \
		*) echo "\033[1;31mOption invalide\033[0m" ;; \
	esac