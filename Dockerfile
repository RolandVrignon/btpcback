# Étape de build
FROM node:20-alpine AS build

# Installer pnpm
RUN npm install -g pnpm

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json pnpm-lock.yaml ./

# Installer les dépendances
RUN pnpm install

# Copier le reste des fichiers
COPY . .

RUN rm -rf /app/public/chat/assets/*
RUN rm -rf /app/public/chat/index.html

RUN ls -la /app

# Construire le client iframe
RUN cd chat-iframe-client && pnpm install
RUN cd chat-iframe-client && pnpm build

# Vérifier que les fichiers ont été générés correctement
RUN echo "Vérification des fichiers générés dans /app/public/chat:"
RUN ls -la /app/public/chat || echo "Dossier /app/public/chat non trouvé"
RUN ls -la /app/public/chat/assets || echo "Dossier assets non trouvé"

ENV DATABASE_URL="postgresql://fake:fake@localhost:5432/fake"
RUN npx prisma generate

# Retourner au répertoire principal et construire l'application backend
WORKDIR /app

# Vérifier la structure du package.json et les scripts de build
RUN echo "Contenu du package.json:"
RUN cat package.json | grep -A 10 scripts

RUN echo "Construction de l'application backend..."
RUN pnpm run build

# Vérifier le résultat du build backend
RUN echo "Vérification du résultat du build backend:"
RUN ls -la dist || echo "Dossier dist non trouvé"
RUN ls -la dist/src || echo "Dossier dist/src non trouvé"
RUN find dist -type f -name "*.js" | sort

# Étape de production
FROM node:20-alpine AS production

# Installer poppler-utils pour pdfinfo
RUN apk update && apk add --no-cache poppler-utils

# Installer pnpm, prisma CLI, typescript et ts-node globalement
RUN npm install -g pnpm prisma typescript ts-node

# Installer libreoffice pour la conversion de documents
RUN apk update && apk add --no-cache libreoffice

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json pnpm-lock.yaml ./

# Installer toutes les dépendances
RUN pnpm install

# Copier les fichiers générés depuis l'étape de build
COPY --from=build /app/dist ./dist
# S'assurer que tous les fichiers publics sont copiés, y compris le dossier assets
COPY --from=build /app/public ./public
COPY prisma ./prisma
COPY scripts ./scripts
COPY tsconfig.json ./

# Vérifier que les fichiers sont correctement copiés
RUN echo "Vérification des fichiers copiés:"
RUN ls -la dist || echo "Dossier dist non trouvé"
RUN ls -la dist/src || echo "Dossier dist/src non trouvé"
RUN find dist -type f -name "*.js" | sort

# Créer le répertoire pour les fichiers temporaires
RUN mkdir -p /tmp/document-processing
RUN chmod 777 /tmp/document-processing

# Exposer le port
EXPOSE 8080

# Modifier le script d'entrée pour utiliser le bon chemin
RUN echo "Contenu du script entrypoint.sh:"
RUN cat scripts/entrypoint.sh

# Définir le script d'entrée comme point d'entrée
ENTRYPOINT ["/app/scripts/entrypoint.sh"]