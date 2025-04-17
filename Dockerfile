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

RUN cd chat-iframe-client && pnpm install
RUN cd chat-iframe-client && pnpm build

ENV DATABASE_URL="postgresql://fake:fake@localhost:5432/fake"
RUN npx prisma generate

RUN ls -la /app/public/chat/assets || echo "Dossier assets non trouvé"

# Retourner au répertoire principal et construire l'application backend
WORKDIR /app
RUN pnpm run build

# Étape de production
FROM node:20-alpine AS production

# Installer poppler-utils pour pdfinfo
RUN apk update && apk add --no-cache poppler-utils

# Installer pnpm, prisma CLI, typescript et ts-node globalement
RUN npm install -g pnpm prisma typescript ts-node

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

# Créer le répertoire pour les fichiers temporaires
RUN mkdir -p /tmp/document-processing
RUN chmod 777 /tmp/document-processing

# Exposer le port
EXPOSE 8080

# Définir le script d'entrée comme point d'entrée
ENTRYPOINT ["/app/scripts/entrypoint.sh"]