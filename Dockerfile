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

# Générer le client Prisma avec une URL factice pour la compilation
# Cette URL n'est utilisée que pour la génération des types, pas pour la connexion
ENV DATABASE_URL="postgresql://fake:fake@localhost:5432/fake"
RUN npx prisma generate

# Construire l'application
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