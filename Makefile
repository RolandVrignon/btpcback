# Variables
DOCKER_NAME = btpc-postgres
DB_PORT = 5433
DB_USER = postgres
DB_PASSWORD = postgres
DB_NAME = btpc
API_PORT = 8080
API_SUBDOMAIN = aec-agents-api-dev
DOCKER_HUB_USERNAME = roland.vrignon@iadopt.fr
DOCKER_HUB_PREFIX = iadopt
DOCKER_IMAGE_NAME = btpc-api
DOCKER_IMAGE_TAG = latest
ECR_REGISTRY = 929387410269.dkr.ecr.eu-north-1.amazonaws.com
ECR_REPO = ynor/core

# Commandes Docker
.PHONY: docker-start
docker-start:
	@echo "Démarrage du conteneur PostgreSQL avec pgvector..."
	@docker start $(DOCKER_NAME) || docker run --name $(DOCKER_NAME) -e POSTGRES_PASSWORD=$(DB_PASSWORD) -e POSTGRES_USER=$(DB_USER) -e POSTGRES_DB=$(DB_NAME) -p $(DB_PORT):5432 -d ankane/pgvector
	@echo "Conteneur PostgreSQL démarré sur le port $(DB_PORT)"

# Commandes pour la base de données locale avec Docker Compose
.PHONY: db-up
db-up:
	@echo "\033[1;36m=== Démarrage de la base de données PostgreSQL 17.3 ===\033[0m"
	@docker-compose up -d postgres
	@echo "\033[1;32mBase de données PostgreSQL démarrée sur le port 5433\033[0m"
	@echo "Pour se connecter: psql -h localhost -p 5433 -U postgres -d btpc"

.PHONY: db-migrate
db-migrate:
	@echo "\033[1;36m=== Exécution des migrations Prisma ===\033[0m"
	@npx prisma migrate dev
	@echo "\033[1;32mMigrations exécutées avec succès\033[0m"

.PHONY: db-generate
db-generate:
	@echo "\033[1;36m=== Génération du client Prisma ===\033[0m"
	@npx prisma generate
	@echo "\033[1;32mClient Prisma généré avec succès\033[0m"

.PHONY: db-seed
db-seed:
	@echo "\033[1;36m=== Alimentation de la base de données avec des données de test ===\033[0m"
	@npx prisma db seed
	@echo "\033[1;32mDonnées de test insérées avec succès\033[0m"

.PHONY: db-setup
db-setup: db-up db-migrate db-generate
	@echo "\033[1;32m=== Configuration de la base de données terminée ===\033[0m"
	@echo "Base de données démarrée, migrations appliquées et client généré"

.PHONY: db-init-all
db-init-all: db-up db-migrate db-generate db-seed
	@echo "\033[1;32m=== Initialisation complète de la base de données teminée ===\033[0m"
	@echo "Base de données démarrée, migrations appliquées, client généré et données initiales créées"

.PHONY: db-reset
db-reset:
	@echo "\033[1;36m=== Réinitialisation de la base de données ===\033[0m"
	@npx prisma migrate reset --force
	@echo "\033[1;32mBase de données réinitialisée avec succès\033[0m"

# Commandes Docker pour le déploiement
.PHONY: deploy
deploy:
	@echo "\033[1;36m=== Déploiement de l'application avec Docker ===\033[0m"
	@if [ ! -f .env.docker ]; then \
		echo "\033[1;31mErreur: Le fichier .env.docker n'existe pas.\033[0m"; \
		echo "Veuillez créer ce fichier avec les variables d'environnement nécessaires."; \
		exit 1; \
	fi
	@echo "\033[1;33mArrêt des conteneurs existants...\033[0m"
	@docker-compose down || true
	@echo "\033[1;33mConstruction de l'image Docker...\033[0m"
	@docker-compose build
	@echo "\033[1;33mDémarrage du conteneur avec les variables d'environnement de .env.docker...\033[0m"
	@docker-compose up -d
	@echo "\033[1;33mExécution des migrations Prisma...\033[0m"
	@docker-compose exec -T api npx prisma migrate deploy || echo "\033[1;31mAttention: Échec de l'exécution des migrations. Vérifiez la connexion à la base de données.\033[0m"
	@echo "\033[1;32mDéploiement terminé avec succès !\033[0m"
	@echo "Pour voir les logs de l'API, exécutez: docker-compose logs -f api"
	@echo "\033[1;33mConteneurs en cours d'exécution:\033[0m"
	@docker-compose ps

# Commande pour pousser l'image sur Docker Hub
.PHONY: push-image
push-image:
	@echo "\033[1;36m=== Préparation et envoi de l'image Docker vers Docker Hub ===\033[0m"
	@echo "\033[1;33mConstruction de l'image Docker...\033[0m"
	@docker-compose build
	@echo "\033[1;33mConnexion au Registery ECR...\033[0m"
	@aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin $(ECR_REGISTRY)
	@echo "\033[1;33mTaggage de l'image avec $(ECR_REGISTRY)/$(ECR_REPO):$(DOCKER_IMAGE_TAG)...\033[0m"
	@docker tag btpc-api:latest $(ECR_REGISTRY)/$(ECR_REPO):$(DOCKER_IMAGE_TAG)
	@echo "\033[1;33mEnvoi de l'image vers l'ECR...\033[0m"
	@docker push $(ECR_REGISTRY)/$(ECR_REPO):$(DOCKER_IMAGE_TAG)
	@echo "\033[1;32mImage envoyée avec succès vers l'ECR !\033[0m"
	@echo "L'image est disponible à l'adresse: $(ECR_REGISTRY)/$(ECR_REPO):$(DOCKER_IMAGE_TAG)"

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
	@echo "Migrations en cours..."
	@pnpm prisma migrate dev

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

.PHONY: build-chat
build-chat:
	@echo "\033[1;36m=== Construction de l'application Chat Iframe ===\033[0m"
	@cd chat-iframe-client && pnpm build
	@echo "\033[1;32mApplication Chat Iframe construite avec succès dans le dossier public/chat/\033[0m"

.PHONY: build-all
build-all: build build-chat
	@echo "\033[1;32m=== Construction de toutes les applications terminée ===\033[0m"

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
	@echo "  make deploy              - Déployer l'application avec Docker en utilisant .env.docker"
	@echo "  make push-image          - Tagger et pousser l'image Docker sur Docker Hub"
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
	@echo "  make build-chat          - Construire l'application Chat Iframe"
	@echo "  make build-all           - Construire le backend et l'application Chat Iframe"

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

chat:
	cd chat-iframe-client && pnpm install && pnpm build